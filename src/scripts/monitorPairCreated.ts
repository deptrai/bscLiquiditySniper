import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import { tgMessage } from '../TG/tgBot';
import { Token } from '../models/Token';
import { TokenHistory } from '../models/TokenHistory';
import { formatNumber } from '../utils/helper';
import { PAIR_ABI } from '../constants/abis';
import { ProcessedBlock } from '../models/ProcessedBlock';
import { getProviders } from '../config';
import { ContractAnalyzer } from '../services/contractAnalyzer';
import { ContractAnalysisModel } from '../models/ContractAnalysis';

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Store seen transaction hashes to prevent duplicate processing
const processedTransactions = new Set<string>();

// Interface for WebSocket provider with reconnection information
interface WebSocketProviderWithMeta {
  provider: ethers.WebSocketProvider;
  url: string;
  isConnected: boolean;
  reconnectAttempts: number;
  lastReconnectTime: number;
}

// Store all WebSocket providers
const wsProviders: WebSocketProviderWithMeta[] = [];

// Add interfaces
interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  amount?: string;
  balance?: bigint;
  allowance?: bigint;
  price?: number;
  value?: number;
  totalSupply?: bigint;
}

interface PairInfo {
  reserve0: bigint;
  reserve1: bigint;
  price0: number;
  price1: number;
}

// ERC20 ABI for basic token info
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)'
];

// Constants for WebSocket management
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000; // 5 seconds between reconnection attempts
const MAX_RECONNECT_DELAY = 60000; // 1 minute maximum reconnection delay
const PING_INTERVAL = 30000; // 30 seconds ping to keep connection alive

/**
 * Create a WebSocket provider and add it to the pool
 */
async function createWebSocketProvider(url: string): Promise<WebSocketProviderWithMeta | null> {
  try {
    logger.info(`Creating WebSocket provider for ${url}...`);
    const provider = new ethers.WebSocketProvider(url);
    
    // Wait for provider to be ready
    await provider.ready;
    
    const wsProvider: WebSocketProviderWithMeta = {
      provider,
      url,
      isConnected: true,
      reconnectAttempts: 0,
      lastReconnectTime: 0
    };
    
    // Set up provider event handlers
    setupProviderEventHandlers(wsProvider);
    
    logger.info(`✅ WebSocket provider connected to ${url}`);
    return wsProvider;
  } catch (error) {
    logger.error(`❌ Failed to create WebSocket provider for ${url}:`, error);
    return null;
  }
}

/**
 * Set up event handlers for a WebSocket provider
 */
function setupProviderEventHandlers(wsProvider: WebSocketProviderWithMeta) {
  const provider = wsProvider.provider;
  
  // Handle provider errors
  provider.on('error', async (error) => {
    logger.error(`WebSocket provider error (${wsProvider.url}):`, error);
    await handleDisconnect(wsProvider);
  });
  
  // WebSocket specific events
  const websocket = provider.websocket as any;
  
  if (websocket) {
    websocket.onclose = async () => {
      logger.warn(`WebSocket connection closed (${wsProvider.url})`);
      wsProvider.isConnected = false;
      await handleDisconnect(wsProvider);
    };
    
    // Set up a ping interval to keep the connection alive
    setInterval(() => {
      if (websocket.readyState === 1) { // 1 = OPEN
        websocket.send(JSON.stringify({ id: Date.now(), jsonrpc: '2.0', method: 'net_version', params: [] }));
      }
    }, PING_INTERVAL);
  }
}

/**
 * Handle WebSocket disconnection and reconnection
 */
async function handleDisconnect(wsProvider: WebSocketProviderWithMeta) {
  if (!wsProvider.isConnected) {
    // Already handling disconnect for this provider
    return;
  }
  
  wsProvider.isConnected = false;
  wsProvider.reconnectAttempts++;
  
  // Calculate backoff delay
  const now = Date.now();
  const timeSinceLastReconnect = now - wsProvider.lastReconnectTime;
  let delay = Math.min(RECONNECT_DELAY * Math.pow(1.5, wsProvider.reconnectAttempts - 1), MAX_RECONNECT_DELAY);
  
  // If we've recently tried to reconnect, wait longer
  if (timeSinceLastReconnect < RECONNECT_DELAY) {
    delay = RECONNECT_DELAY * 2;
  }
  
  logger.info(`Will try to reconnect to ${wsProvider.url} in ${delay / 1000} seconds (attempt ${wsProvider.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
  
  if (wsProvider.reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
    await sleep(delay);
    wsProvider.lastReconnectTime = Date.now();
    
    try {
      // Create a new provider with the same URL
      const newProvider = await createWebSocketProvider(wsProvider.url);
      
      if (newProvider) {
        // Remove old provider from the pool
        const index = wsProviders.findIndex(p => p.url === wsProvider.url);
        if (index !== -1) {
          // Clean up old provider
          try {
            await wsProviders[index].provider.destroy();
          } catch (e) {
            logger.error(`Error destroying old WebSocket provider:`, e);
          }
          
          // Replace with new provider
          wsProviders[index] = newProvider;
          
          // Set up event listeners again
          await setupPairCreatedListeners(newProvider);
          
          logger.info(`✅ Successfully reconnected to ${wsProvider.url}`);
        }
      }
    } catch (error) {
      logger.error(`❌ Failed to reconnect to ${wsProvider.url}:`, error);
      // Try again later
      setTimeout(() => handleDisconnect(wsProvider), RECONNECT_DELAY);
    }
  } else {
    logger.error(`❌ Giving up on reconnecting to ${wsProvider.url} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
    
    // Remove from providers array
    const index = wsProviders.findIndex(p => p.url === wsProvider.url);
    if (index !== -1) {
      wsProviders.splice(index, 1);
    }
    
    // Try to find an alternative WS URL if available
    await addFallbackProvider();
  }
}

/**
 * Try to add a fallback WebSocket provider if we have any configured
 */
async function addFallbackProvider() {
  // Assumes WS_RPC_URLS is an array in config
  const wsUrls = config.WS_RPC_URLS as string[] || [];
  
  // Find a WS URL that's not already in our pool
  for (const url of wsUrls) {
    if (!wsProviders.some(p => p.url === url)) {
      const newProvider = await createWebSocketProvider(url);
      if (newProvider) {
        wsProviders.push(newProvider);
        await setupPairCreatedListeners(newProvider);
        logger.info(`✅ Added fallback WebSocket provider: ${url}`);
        return;
      }
    }
  }
  
  logger.warn(`⚠️ No more fallback WebSocket providers available`);
}

/**
 * Set up listeners for PairCreated events on PancakeSwap V2/V3
 */
async function setupPairCreatedListeners(wsProvider: WebSocketProviderWithMeta) {
  const provider = wsProvider.provider;
  
  try {
    // PancakeSwap V2 Factory
    if (config.DEX_ADDRESSES.PANCAKESWAP.V2_FACTORY) {
      const v2FactoryAddress = config.DEX_ADDRESSES.PANCAKESWAP.V2_FACTORY;
      const v2PairCreatedTopic = ethers.id('PairCreated(address,address,address,uint256)');
      
      logger.info(`Setting up PairCreated listener for PancakeSwap V2: ${v2FactoryAddress}`);
      
      // Listen for PancakeSwap V2 PairCreated events
      provider.on({
        address: v2FactoryAddress,
        topics: [v2PairCreatedTopic]
      }, async (log) => {
        if (processedTransactions.has(log.transactionHash)) {
          return;
        }
        
        processedTransactions.add(log.transactionHash);
        logger.info(`🚨 PancakeSwap V2 PairCreated event detected in tx: ${log.transactionHash}`);
        
        await processPairCreatedEvent(log, provider);
      });
    }
    
    // PancakeSwap V3 Factory
    if (config.DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY) {
      const v3FactoryAddress = config.DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY;
      const v3PoolCreatedTopic = ethers.id('PoolCreated(address,address,uint24,uint24,address)');
      
      logger.info(`Setting up PoolCreated listener for PancakeSwap V3: ${v3FactoryAddress}`);
      
      // Listen for PancakeSwap V3 PoolCreated events
      provider.on({
        address: v3FactoryAddress,
        topics: [v3PoolCreatedTopic]
      }, async (log) => {
        if (processedTransactions.has(log.transactionHash)) {
          return;
        }
        
        processedTransactions.add(log.transactionHash);
        logger.info(`🚨 PancakeSwap V3 PoolCreated event detected in tx: ${log.transactionHash}`);
        
        await processPairCreatedEvent(log, provider);
      });
    }
    
    logger.info(`✅ Successfully set up all PairCreated listeners for ${wsProvider.url}`);
  } catch (error) {
    logger.error(`❌ Error setting up PairCreated listeners for ${wsProvider.url}:`, error);
  }
}

/**
 * Get basic token information directly from the contract
 */
async function getBasicTokenInfo(tokenAddress: string, providerUrl: string): Promise<TokenInfo> {
  try {
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    
    // Get basic token info with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let lastError;
    
    while (attempts < maxAttempts) {
      try {
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.totalSupply()
        ]);
        
        return {
          address: tokenAddress,
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: totalSupply
        };
      } catch (error) {
        lastError = error;
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retrying
        await sleep(1000);
      }
    }
    
    throw lastError;
  } catch (error) {
    logger.error(`Error getting basic token info for ${tokenAddress}:`, error);
    throw error;
  }
}

/**
 * Process a PairCreated event
 */
async function processPairCreatedEvent(event: ethers.Log, provider: ethers.Provider) {
  try {
    // Decode event data
    const iface = new ethers.Interface([
      'event PairCreated(address indexed token0, address indexed token1, address pair, uint256)',
      'event PoolCreated(address indexed token0, address indexed token1, uint24 indexed fee, uint24 tickSpacing, address pool)'
    ]);

    let decodedData;
    if (event.topics[0] === ethers.id('PairCreated(address,address,address,uint256)')) {
      decodedData = iface.parseLog({
        topics: event.topics,
        data: event.data
      });
    } else if (event.topics[0] === ethers.id('PoolCreated(address,address,uint24,uint24,address)')) {
      decodedData = iface.parseLog({
        topics: event.topics,
        data: event.data
      });
    } else {
      logger.error('Unknown event type:', event.topics[0]);
      return;
    }

    if (!decodedData) {
      logger.error('Failed to decode event data');
      return;
    }

    const args = decodedData.args;
    if (!args) {
      logger.error('No event arguments found');
      return;
    }

    // Get token addresses based on event type
    let token0, token1, pair, pairCount;
    if (event.topics[0] === ethers.id('PairCreated(address,address,address,uint256)')) {
      [token0, token1, pair, pairCount] = args;
    } else {
      [token0, token1, , , pair] = args;
      pairCount = BigInt(0); // V3 pools don't have pair count
    }

    if (!token0 || !token1 || !pair) {
      logger.error('Invalid event data:', event);
      return;
    }

    // Get token addresses
    const token0Address = token0.toLowerCase();
    const token1Address = token1.toLowerCase();
    const pairAddress = pair.toLowerCase();

    // Get token information
    const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);

    const [token0Symbol, token0Name, token0Decimals, token0TotalSupply] = await Promise.all([
      token0Contract.symbol().catch(() => 'Unknown'),
      token0Contract.name().catch(() => 'Unknown'),
      token0Contract.decimals().catch(() => 18),
      token0Contract.totalSupply().catch(() => '0')
    ]);

    const [token1Symbol, token1Name, token1Decimals, token1TotalSupply] = await Promise.all([
      token1Contract.symbol().catch(() => 'Unknown'),
      token1Contract.name().catch(() => 'Unknown'),
      token1Contract.decimals().catch(() => 18),
      token1Contract.totalSupply().catch(() => '0')
    ]);

    // Analyze both tokens
    const analyzer = ContractAnalyzer.getInstance();
    const [token0Analysis, token1Analysis] = await Promise.all([
      analyzer.analyzeContract(token0Address),
      analyzer.analyzeContract(token1Address)
    ]);

    // Save analyses to database
    await Promise.all([
      ContractAnalysisModel.create(token0Analysis),
      ContractAnalysisModel.create(token1Analysis)
    ]);

    // Format analysis results for message
    const formatAnalysis = (analysis: any) => {
      return `
🔍 Security Analysis:
• Risk Score: ${analysis.riskScore}/100
• Honeypot: ${analysis.isHoneypot ? '⚠️ Yes' : '✅ No'}
• Dangerous Functions: ${analysis.functions.filter((f: any) => f.isDangerous).length}
• Vulnerabilities: ${analysis.vulnerabilities.length}
• Events: ${analysis.events.length}`;
    };

    // Send Telegram notification with analysis
    const message = `
🚨 New Pair Created!

Token 0:
• Name: ${token0Name}
• Symbol: ${token0Symbol}
• Address: ${token0Address}
• Decimals: ${token0Decimals}
• Total Supply: ${ethers.formatUnits(token0TotalSupply, token0Decimals)}
${formatAnalysis(token0Analysis)}

Token 1:
• Name: ${token1Name}
• Symbol: ${token1Symbol}
• Address: ${token1Address}
• Decimals: ${token1Decimals}
• Total Supply: ${ethers.formatUnits(token1TotalSupply, token1Decimals)}
${formatAnalysis(token1Analysis)}

Pair:
• Address: ${pairAddress}
• Pair Count: ${pairCount.toString()}

DEX: ${event.address === config.DEX_ADDRESSES.PANCAKESWAP.V2_FACTORY ? 'PancakeSwap V2' : 'PancakeSwap V3'}`;

    await tgMessage(message);

    logger.info('Processed pair created event:', {
      token0: { address: token0Address, symbol: token0Symbol },
      token1: { address: token1Address, symbol: token1Symbol },
      pair: pairAddress
    });
  } catch (error) {
    logger.error('Error processing pair created event:', error);
  }
}

/**
 * Initialize WebSocket monitoring
 */
export async function initializeWebSocketMonitoring() {
  logger.info('Initializing WebSocket monitoring for PancakeSwap V2/V3 pair creation events...');
  
  // Clean up processed transactions periodically (every hour)
  setInterval(() => {
    const beforeSize = processedTransactions.size;
    processedTransactions.clear();
    logger.info(`Cleared ${beforeSize} processed transactions from memory`);
  }, 60 * 60 * 1000);
  
  // Get all configured WebSocket URLs
  const wsUrls = config.WS_RPC_URLS as string[] || [];
  
  if (wsUrls.length === 0) {
    logger.error('❌ No WebSocket RPC URLs configured. Please add WS_RPC_URLS to your config.');
    return;
  }
  
  logger.info(`Found ${wsUrls.length} WebSocket RPC URLs in config`);
  
  // Create WebSocket providers for each URL
  for (const url of wsUrls) {
    const provider = await createWebSocketProvider(url);
    if (provider) {
      wsProviders.push(provider);
      await setupPairCreatedListeners(provider);
    }
  }
  
  if (wsProviders.length === 0) {
    logger.error('❌ Failed to create any WebSocket providers. Real-time monitoring will not work.');
    return;
  }
  
  logger.info(`✅ Successfully initialized ${wsProviders.length} WebSocket providers`);
}

// Clean up function to be called when shutting down
export async function cleanupWebSocketProviders() {
  logger.info('Cleaning up WebSocket providers...');
  
  for (const wsProvider of wsProviders) {
    try {
      await wsProvider.provider.destroy();
      logger.info(`✅ Successfully closed WebSocket connection to ${wsProvider.url}`);
    } catch (error) {
      logger.error(`❌ Error closing WebSocket connection to ${wsProvider.url}:`, error);
    }
  }
  
  // Clear the array
  wsProviders.length = 0;
  
  logger.info('✅ All WebSocket providers cleaned up');
} 