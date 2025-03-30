import { ethers } from 'ethers';
import { config, getProviders } from '../config';
import { TokenHistory } from '../models/TokenHistory';
import { ProcessedBlock } from '../models/ProcessedBlock';
import { Token } from '../models/Token';
import { TokenService } from '../services/tokenService';
import { logger } from '../utils/logger';
import { tgMessage } from '../TG/tgBot';
import { formatNumber } from '../utils/helper';
import { PAIR_ABI, EVENT_SIGNATURES } from '../constants/abis';
import { ProviderPool } from '../services/providerPool';

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to get the last processed block
async function getLastProcessedBlock(): Promise<number | null> {
    const lastBlock = await ProcessedBlock.findOne().sort({ blockNumber: -1 });
    return lastBlock ? lastBlock.blockNumber : null;
}

// Helper function to mark a block as processed
async function markBlockAsProcessed(blockNumber: number, success: boolean) {
    try {
        // Check if block already exists
        const existingBlock = await ProcessedBlock.findOne({ blockNumber });
        if (!existingBlock) {
            await ProcessedBlock.create({
                blockNumber,
                status: success ? 'success' : 'failed',
                processedAt: new Date()
            });
        }
    } catch (error) {
        logger.error(`Error marking block ${blockNumber} as processed:`, error);
    }
}

interface DexEvent {
    topics: string[];
    data: string;
    transactionHash: string;
    dex: string;
    type: 'V2' | 'V3';
    address: string;
    blockNumber: number;
}

interface DexConfig {
    name: string;
    factory?: string;
    router?: string;
    events: string[];
}

// Add interfaces at the top of the file
interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    name: string;
    amount: string;
    balance: bigint;
    allowance: bigint;
    price: number;
    value: number;
    totalSupply?: bigint; // Make totalSupply optional since it might not be available immediately
}

interface PairInfo {
    reserve0: bigint;
    reserve1: bigint;
    price0: number;
    price1: number;
}

interface BlockRange {
    from: number;
    to: number;
}

// Add new interfaces for event filtering
interface EventFilter {
    minLiquidityUSD?: number;
    minVolumeUSD?: number;
    minHolders?: number;
    excludeTokens?: string[];
    includeTokens?: string[];
    minMarketCap?: number;
}

interface EventStats {
    liquidityUSD: number;
    volume24hUSD: number;
    holders: number;
    marketCap: number;
}

// Helper function to fetch transactions for multiple blocks
async function fetchBlockTransactions(provider: any, fromBlock: number, toBlock: number) {
    try {
        logger.info(`🔍 Starting to fetch events from blocks ${fromBlock} to ${toBlock}`);
        await sleep(1000); // Add delay between batches

        // Define DEX configurations with all possible events
        const DEX_CONFIGS: DexConfig[] = [
            {
                name: 'PANCAKESWAP_V2',
                factory: config.DEX_ADDRESSES.PANCAKESWAP.V2_FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.PANCAKESWAP.V2_ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'PANCAKESWAP_V3',
                factory: config.DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.PANCAKESWAP.V3_ROUTER?.toLowerCase(),
                events: ['PoolCreated']
            },
            {
                name: 'MDEX',
                factory: config.DEX_ADDRESSES.MDEX.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.MDEX.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'JULSWAP',
                factory: config.DEX_ADDRESSES.JULSWAP.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.JULSWAP.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'WAULTSWAP',
                factory: config.DEX_ADDRESSES.WAULTSWAP.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.WAULTSWAP.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'APESWAP',
                factory: config.DEX_ADDRESSES.APESWAP.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.APESWAP.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'BISWAP',
                factory: config.DEX_ADDRESSES.BISWAP.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.BISWAP.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'BABYSWAP',
                factory: config.DEX_ADDRESSES.BABYSWAP.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.BABYSWAP.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'BAKERYSWAP',
                factory: config.DEX_ADDRESSES.BAKERYSWAP.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.BAKERYSWAP.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'KNIGHTSWAP',
                factory: config.DEX_ADDRESSES.KNIGHTSWAP.FACTORY?.toLowerCase(),
                router: config.DEX_ADDRESSES.KNIGHTSWAP.ROUTER?.toLowerCase(),
                events: ['PairCreated']
            }
        ].filter(dex => dex.factory && dex.router);

        // Get all factory addresses and their respective events
        const factoryEvents = new Map<string, string[]>();
        for (const dex of DEX_CONFIGS) {
            if (dex.factory) {
                factoryEvents.set(dex.factory, dex.events);
            }
        }

        // Get all events from all factories
        const allEvents: DexEvent[] = [];
        
        // Fetch events for each factory and event combination
        for (const [factory, events] of factoryEvents) {
            const dexConfig = DEX_CONFIGS.find(d => d.factory === factory.toLowerCase());
            logger.info(`\n📊 Processing ${dexConfig?.name || 'Unknown DEX'} at ${factory}`);
            
            for (const eventName of events) {
                logger.info(`  ⮑ Checking for ${eventName} events`);
                const eventTopic = ethers.id(`${eventName}(address,address,address,uint256)`); // V2 format
                const eventTopicV3 = ethers.id(`${eventName}(address,address,uint24,uint24,address)`); // V3 format
                
                try {
                    // Split the block range into smaller chunks
                    const CHUNK_SIZE = 100; // Reduced from default
                    for (let chunk = fromBlock; chunk <= toBlock; chunk += CHUNK_SIZE) {
                        const chunkEnd = Math.min(chunk + CHUNK_SIZE - 1, toBlock);
                        
                        try {
                            // Try V2 format
                            const v2Events = await provider.getLogs({
                                address: factory,
                                topics: [eventTopic],
                                fromBlock: chunk,
                                toBlock: chunkEnd
                            });
                            
                            if (v2Events.length > 0) {
                                logger.info(`    ✅ Found ${v2Events.length} V2 events in blocks ${chunk}-${chunkEnd}`);
                            }
                            
                            // Map events to their DEX
                            const dex = DEX_CONFIGS.find(d => d.factory === factory.toLowerCase());
                            if (dex) {
                                allEvents.push(...v2Events.map((event: { address: string } & DexEvent) => ({
                                    ...event,
                                    dex: dex.name,
                                    type: dex.name.includes('V3') ? 'V3' : 'V2'
                                })));
                            }

                            // If this is PancakeSwap V3, also try V3 format
                            if (factory === config.DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY?.toLowerCase()) {
                                const v3Events = await provider.getLogs({
                                    address: factory,
                                    topics: [eventTopicV3],
                                    fromBlock: chunk,
                                    toBlock: chunkEnd
                                });
                                
                                if (v3Events.length > 0) {
                                    logger.info(`    ✅ Found ${v3Events.length} V3 events in blocks ${chunk}-${chunkEnd}`);
                                }
                                
                                allEvents.push(...v3Events.map((event: { address: string } & DexEvent) => ({
                                    ...event,
                                    dex: 'PANCAKESWAP_V3',
                                    type: 'V3'
                                })));
                            }

                            // Add delay between chunks
                            await sleep(2000);
                        } catch (error: any) {
                            if (error.message?.includes('rate limit')) {
                                logger.warn(`    ⚠️ Rate limit hit, waiting before retrying...`);
                                await sleep(5000);
                                chunk -= CHUNK_SIZE; // Retry this chunk
                                continue;
                            }
                            throw error;
                        }
                    }
                } catch (error) {
                    logger.error(`    ❌ Error fetching ${eventName} events for ${dexConfig?.name}:`, error);
                    continue;
                }
            }
        }

        // Get block with transactions for the range
        logger.info(`\n🔍 Fetching block transactions for block ${toBlock}`);
        const block = await provider.getBlock(toBlock, true);
        
        // Get all router addresses
        const routerAddresses = new Set(DEX_CONFIGS.map(dex => dex.router));

        // Filter DEX transactions
        const transactions = block.transactions.filter((tx: any) => {
            if (!tx.to) return false;
            const toAddress = tx.to.toLowerCase();
            if (!routerAddresses.has(toAddress)) return false;

            const methodId = tx.data.slice(0, 10);
            const isDexTx = methodId === config.SMART_ROUTER_METHODS.buyMemeToken ||
                           methodId === config.SMART_ROUTER_METHODS.swapV3ExactIn;
            
            if (isDexTx) {
                const dex = DEX_CONFIGS.find(d => d.router === toAddress);
                logger.info(`    ✅ Found DEX transaction on ${dex?.name || 'Unknown DEX'}: ${tx.hash}`);
            }
            
            return isDexTx;
        });

        logger.info(`\n📈 Summary for blocks ${fromBlock}-${toBlock}:`);
        logger.info(`  • Total events found: ${allEvents.length}`);
        logger.info(`  • Total DEX transactions: ${transactions.length}`);
        
        // Log breakdown by DEX
        const dexBreakdown = allEvents.reduce((acc: any, event) => {
            acc[event.dex] = (acc[event.dex] || 0) + 1;
            return acc;
        }, {});
        
        Object.entries(dexBreakdown).forEach(([dex, count]) => {
            logger.info(`  • ${dex}: ${count} events`);
        });

        return { events: allEvents, transactions };
    } catch (error) {
        logger.error('Error fetching block transactions:', error);
        throw error;
    }
}

// Add event filtering function
async function shouldProcessEvent(event: DexEvent, tokenInfo: TokenInfo, pairInfo: PairInfo, filter: EventFilter): Promise<boolean> {
    // Skip if token is in exclude list
    if (filter.excludeTokens?.includes(event.address.toLowerCase())) {
        return false;
    }

    // Include if token is in include list
    if (filter.includeTokens?.includes(event.address.toLowerCase())) {
        return true;
    }

    // Calculate liquidity in USD
    const liquidityUSD = Number(pairInfo.reserve0) * tokenInfo.price + Number(pairInfo.reserve1) * tokenInfo.price;
    if (filter.minLiquidityUSD && liquidityUSD < filter.minLiquidityUSD) {
        return false;
    }

    // Calculate market cap
    const marketCap = Number(tokenInfo.totalSupply || 0) * tokenInfo.price;
    if (filter.minMarketCap && marketCap < filter.minMarketCap) {
        return false;
    }

    // Get holder count (this would require additional API calls)
    // For now, we'll skip this check
    // if (filter.minHolders && holders < filter.minHolders) {
    //     return false;
    // }

    return true;
}

// Update processEvents function to handle new events
async function processEvents(events: DexEvent[], blockNumber: number) {
    logger.info(`\n🔄 Processing ${events.length} events for block ${blockNumber}`);
    
    const RATE_LIMIT_DELAY = 100;
    const { httpProviderPool } = getProviders();
    const provider = httpProviderPool.getProvider();
    const tokenService = TokenService.getInstance(httpProviderPool);

    // Define event filters
    const eventFilter: EventFilter = {
        minLiquidityUSD: 1000, // Minimum $1000 liquidity
        minMarketCap: 50000, // Minimum $50k market cap
        excludeTokens: [
            '0x0000000000000000000000000000000000000000', // Zero address
            '0x000000000000000000000000000000000000dead'  // Dead address
        ]
    };
    
    for (const event of events) {
        try {
            if (!event || !event.topics || !event.data) {
                logger.warn(`  ⚠️ Skipping invalid event in block ${blockNumber}`);
                continue;
            }

            // Get event signature
            const eventSignature = event.topics[0];
            const eventType = Object.entries(EVENT_SIGNATURES).find(([_, sig]) => 
                ethers.id(sig) === eventSignature
            )?.[0];

            if (!eventType) {
                logger.warn(`  ⚠️ Unknown event type: ${eventSignature}`);
                continue;
            }

            logger.info(`\n  📝 Processing ${eventType} event on ${event.dex}`);
            
            // Extract addresses and data based on event type
            let tokenAddress: string = '';
            let pairAddress: string = '';
            let amount: bigint = BigInt(0);
            let fromAddress: string = '';
            let toAddress: string = '';

            switch (eventType) {
                case 'TRANSFER':
                    fromAddress = '0x' + event.topics[1].slice(26);
                    toAddress = '0x' + event.topics[2].slice(26);
                    amount = BigInt(event.data);
                    tokenAddress = event.address;
                    break;

                case 'SWAP':
                    fromAddress = '0x' + event.topics[1].slice(26);
                    amount = BigInt(event.data.slice(0, 66));
                    tokenAddress = event.address;
                    break;

                case 'MINT':
                case 'BURN':
                case 'ADD_LIQUIDITY':
                case 'REMOVE_LIQUIDITY':
                    fromAddress = '0x' + event.topics[1].slice(26);
                    amount = BigInt(event.data.slice(0, 66));
                    tokenAddress = event.address;
                    pairAddress = '0x' + event.data.slice(26, 66); // Extract pair address from data
                    break;

                default:
                    logger.warn(`  ⚠️ Unhandled event type: ${eventType}`);
                    continue;
            }

            // Get token info
            await sleep(RATE_LIMIT_DELAY);
            const tokenInfo = await tokenService.getTokenInfo(tokenAddress);
            if (!tokenInfo) {
                logger.error(`  ❌ Invalid token address: ${tokenAddress}`);
                continue;
            }

            // Get pair info if available
            let pairInfo: PairInfo | null = null;
            if (event.dex.includes('V2') || event.dex.includes('V3')) {
                await sleep(RATE_LIMIT_DELAY);
                const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, provider);
                const [reserve0, reserve1] = await Promise.all([
                    pairContract.getReserves().then((reserves: any) => reserves[0]),
                    pairContract.getReserves().then((reserves: any) => reserves[1])
                ]);
                
                pairInfo = {
                    reserve0,
                    reserve1,
                    price0: Number(reserve1) / Number(reserve0),
                    price1: Number(reserve0) / Number(reserve1)
                };
            }

            // Apply event filter
            if (pairInfo && !(await shouldProcessEvent(event, tokenInfo, pairInfo, eventFilter))) {
                logger.info(`  ⚠️ Event filtered out based on criteria`);
                continue;
            }

            // Process event based on type
            switch (eventType) {
                case 'TRANSFER':
                    await processTransferEvent(event, tokenInfo, fromAddress, toAddress, amount);
                    break;

                case 'SWAP':
                    await processSwapEvent(event, tokenInfo, fromAddress, amount);
                    break;

                case 'MINT':
                    await processMintEvent(event, tokenInfo, fromAddress, amount);
                    break;

                case 'BURN':
                    await processBurnEvent(event, tokenInfo, fromAddress, amount);
                    break;

                case 'ADD_LIQUIDITY':
                    await processAddLiquidityEvent(event, tokenInfo, fromAddress, amount, pairInfo);
                    break;

                case 'REMOVE_LIQUIDITY':
                    await processRemoveLiquidityEvent(event, tokenInfo, fromAddress, amount, pairInfo);
                    break;
            }

        } catch (error) {
            logger.error(`  ❌ Error processing event:`, error);
            logger.error('  ❌ Event data:', event);
        }
    }
}

// Add new event processing functions
async function processTransferEvent(event: DexEvent, tokenInfo: TokenInfo, from: string, to: string, amount: bigint) {
    const message = `
🔄 Transfer Event Detected

Token: ${tokenInfo.symbol}
Amount: ${formatNumber(amount, tokenInfo.decimals)} ${tokenInfo.symbol}
From: ${from}
To: ${to}
Block: ${event.blockNumber}
Tx: ${event.transactionHash}
`;
    await tgMessage(message);
}

async function processSwapEvent(event: DexEvent, tokenInfo: TokenInfo, from: string, amount: bigint) {
    const message = `
💱 Swap Event Detected

Token: ${tokenInfo.symbol}
Amount: ${formatNumber(amount, tokenInfo.decimals)} ${tokenInfo.symbol}
From: ${from}
Block: ${event.blockNumber}
Tx: ${event.transactionHash}
`;
    await tgMessage(message);
}

async function processMintEvent(event: DexEvent, tokenInfo: TokenInfo, from: string, amount: bigint) {
    const message = `
🪙 Mint Event Detected

Token: ${tokenInfo.symbol}
Amount: ${formatNumber(amount, tokenInfo.decimals)} ${tokenInfo.symbol}
From: ${from}
Block: ${event.blockNumber}
Tx: ${event.transactionHash}
`;
    await tgMessage(message);
}

async function processBurnEvent(event: DexEvent, tokenInfo: TokenInfo, from: string, amount: bigint) {
    const message = `
🔥 Burn Event Detected

Token: ${tokenInfo.symbol}
Amount: ${formatNumber(amount, tokenInfo.decimals)} ${tokenInfo.symbol}
From: ${from}
Block: ${event.blockNumber}
Tx: ${event.transactionHash}
`;
    await tgMessage(message);
}

async function processAddLiquidityEvent(event: DexEvent, tokenInfo: TokenInfo, from: string, amount: bigint, pairInfo: PairInfo | null) {
    const message = `
💧 Add Liquidity Event Detected

Token: ${tokenInfo.symbol}
Amount: ${formatNumber(amount, tokenInfo.decimals)} ${tokenInfo.symbol}
From: ${from}
Block: ${event.blockNumber}
Tx: ${event.transactionHash}

${pairInfo ? `Liquidity: ${formatNumber(pairInfo.reserve0, tokenInfo.decimals)} ${tokenInfo.symbol}` : ''}
`;
    await tgMessage(message);
}

async function processRemoveLiquidityEvent(event: DexEvent, tokenInfo: TokenInfo, from: string, amount: bigint, pairInfo: PairInfo | null) {
    const message = `
💧 Remove Liquidity Event Detected

Token: ${tokenInfo.symbol}
Amount: ${formatNumber(amount, tokenInfo.decimals)} ${tokenInfo.symbol}
From: ${from}
Block: ${event.blockNumber}
Tx: ${event.transactionHash}

${pairInfo ? `Remaining Liquidity: ${formatNumber(pairInfo.reserve0, tokenInfo.decimals)} ${tokenInfo.symbol}` : ''}
`;
    await tgMessage(message);
}

// Helper function to process blocks with a specific provider
async function processBlocksWithProvider(fromBlock: number, toBlock: number, provider: ethers.Provider, providerPool: ProviderPool): Promise<boolean> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        try {
            logger.info(`Processing blocks ${fromBlock} to ${toBlock} with provider ${providerPool.getCurrentProviderIndex() + 1}/${providerPool.getProviderCount()}`);
            const { events, transactions } = await fetchBlockTransactions(provider, fromBlock, toBlock);
            
            // Process events if any found
            if (events.length > 0) {
                logger.info(`Found ${events.length} events in blocks ${fromBlock} to ${toBlock}`);
                await processEvents(events, fromBlock);
            }
            if (transactions.length > 0) {
                logger.info(`Found ${transactions.length} transactions in blocks ${fromBlock} to ${toBlock}`);
                await processEvents(transactions, fromBlock);
            }
            
            // Mark blocks as processed
            for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
                await markBlockAsProcessed(blockNumber, true);
            }
            
            logger.info(`Successfully processed blocks ${fromBlock} to ${toBlock}`);
            return true;
        } catch (error: any) {
            attempts++;
            
            // Immediately switch provider for RPC errors
            if (error.message === 'RATE_LIMIT' || 
                error.message === 'PROVIDER_ERROR' || 
                error.message.includes('rate limit') || 
                error.message.includes('429') || 
                error.message.includes('limit exceeded') ||
                error.message.includes('timeout') ||
                error.message.includes('network error')) {
                
                logger.info(`RPC error detected, switching to next provider immediately`);
                providerPool.switchProvider();
                
                // Only wait if we're still under max attempts
                if (attempts < maxAttempts) {
                    await sleep(1000); // Short wait before retry
                    continue;
                }
            }
            
            // For other errors, log and wait longer
            logger.error(`Error processing blocks ${fromBlock} to ${toBlock}:`, error);
            providerPool.switchProvider();
            
            if (attempts < maxAttempts) {
                await sleep(5000); // Longer wait for other errors
                continue;
            }
            
            // Mark blocks as failed if max attempts reached
            for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
                await markBlockAsProcessed(blockNumber, false);
            }
        }
    }

    logger.error(`Failed to process blocks ${fromBlock} to ${toBlock} after ${maxAttempts} attempts`);
    return false;
}

// Function to monitor new blocks in real-time
async function monitorNewBlocks(startBlock: number, providerPool: ProviderPool) {
    let currentBlock = startBlock;
    let lastCheckTime = Date.now();

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            // Ensure we don't exceed rate limit
            const now = Date.now();
            const timeSinceLastCheck = now - lastCheckTime;
            if (timeSinceLastCheck < 100) { // Minimum 100ms between requests
                await sleep(100 - timeSinceLastCheck);
            }
            
            const provider = providerPool.getProvider();
            const latestBlock = await provider.getBlockNumber();
            lastCheckTime = Date.now();
            
            if (latestBlock > currentBlock) {
                logger.info(`🚨 New blocks detected: ${currentBlock + 1} to ${latestBlock}`);
                
                // Process blocks in small batches even for real-time
                for (let blockNum = currentBlock + 1; blockNum <= latestBlock; blockNum += 5) {
                    const batchEndBlock = Math.min(blockNum + 4, latestBlock);
                    const { events, transactions } = await fetchBlockTransactions(provider, blockNum, batchEndBlock);
                    
                    if (events.length > 0 || transactions.length > 0) {
                        logger.info(`🔍 Blocks ${blockNum}-${batchEndBlock}: Found ${events.length} events and ${transactions.length} transactions`);
                        await processEvents(events, blockNum);
                        await processEvents(transactions, blockNum);
                    }
                    
                    for (let b = blockNum; b <= batchEndBlock; b++) {
                        await markBlockAsProcessed(b, true);
                    }
                    
                    // Wait 100ms between batches
                    await sleep(100);
                }
                
                currentBlock = latestBlock;
            }
            
            // Check for new blocks every 500ms to stay within rate limits
            await sleep(500);
        } catch (error) {
            logger.error('Error monitoring new blocks:', error);
            providerPool.switchProvider();
            await sleep(1000);
        }
    }
}

export async function fetchHistoricalLiquidity() {
    try {
        const { httpProviderPool } = getProviders();
        const provider = httpProviderPool.getProvider();

        // Get current block number
        let currentBlock;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            try {
                currentBlock = await provider.getBlockNumber();
                break;
            } catch (error) {
                attempts++;
                logger.error(`Failed to get current block (attempt ${attempts}/${maxAttempts}):`, error);
                httpProviderPool.switchProvider();
                await sleep(1000);
            }
        }

        if (!currentBlock) {
            throw new Error('Failed to get current block number after multiple attempts');
        }

        // Get the last processed block
        const lastProcessedBlock = await getLastProcessedBlock();
        const startBlock = lastProcessedBlock ? lastProcessedBlock + 1 : currentBlock - 1000;

        logger.info(`Starting from block ${startBlock} to ${currentBlock}`);

        // Start monitoring new blocks immediately in a separate process
        monitorNewBlocks(currentBlock, httpProviderPool);

        // Calculate batch size based on rate limits
        const BATCH_SIZE = 10; // Process 10 blocks at a time to stay within 15 RPS limit
        
        // Get all available providers for parallel processing
        const providerCount = httpProviderPool.getProviderCount();
        logger.info(`Using ${providerCount} providers for parallel processing`);
        
        // Process blocks in parallel
        const blockRanges: BlockRange[] = [];
        for (let i = startBlock; i <= currentBlock; i += BATCH_SIZE) {
            blockRanges.push({
                from: i,
                to: Math.min(i + BATCH_SIZE - 1, currentBlock)
            });
        }
        
        const results = await Promise.allSettled(
            blockRanges.map(range => 
                processBlocksWithProvider(range.from, range.to, provider, httpProviderPool)
            )
        );
        
        // Log results
        results.forEach((result, index) => {
            const range = blockRanges[index];
            if (result.status === 'fulfilled') {
                logger.info(`✅ Successfully processed blocks ${range.from}-${range.to}`);
            } else {
                logger.error(`❌ Failed to process blocks ${range.from}-${range.to}: ${result.reason}`);
            }
        });

    } catch (error) {
        logger.error('Error fetching historical liquidity:', error);
        throw error;
    }
}

// Helper function to fetch transactions for multiple blocks with a specific provider
async function fetchBlockTransactionsWithProvider(provider: any, fromBlock: number, toBlock: number) {
    return fetchBlockTransactions(provider, fromBlock, toBlock);
}

// Helper function to get provider by URL
// This is already defined in the provider pool implementation
// Add any extra interfaces or functions if needed

async function processBlock(blockNumber: number, dexes: DexConfig[]): Promise<void> {
    logger.info(`🔍 Processing block ${blockNumber}`);

    for (const dex of dexes) {
        if (!dex.factory || !dex.router) {
            logger.warn(`  ⚠️ Skipping ${dex.name} due to undefined addresses`);
            continue;
        }
        // ... existing code ...
    }
} 