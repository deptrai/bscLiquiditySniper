import { ethers } from 'ethers';
import { config, getProviders } from '../config';
import { TokenHistory } from '../models/TokenHistory';
import { ProcessedBlock } from '../models/ProcessedBlock';
import { Token } from '../models/Token';
import { TokenService } from '../services/tokenService';
import { logger } from '../utils/logger';
import { tgMessage } from '../TG/tgBot';
import { formatNumber } from '../utils/helper';
import { PAIR_ABI } from '../constants/abis';

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

// Helper function to fetch transactions for multiple blocks
async function fetchBlockTransactions(provider: any, fromBlock: number, toBlock: number) {
    try {
        logger.info(`🔍 Starting to fetch events from blocks ${fromBlock} to ${toBlock}`);
        await sleep(100);

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
        ].filter(dex => dex.factory && dex.router); // Filter out DEXes with undefined addresses

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
                    // Try V2 format first
                    const v2Events = await provider.getLogs({
                        address: factory,
                        topics: [eventTopic],
                        fromBlock: fromBlock,
                        toBlock: toBlock
                    });
                    
                    if (v2Events.length > 0) {
                        logger.info(`    ✅ Found ${v2Events.length} V2 events`);
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
                        logger.info(`    🔄 Checking PancakeSwap V3 format`);
                        const v3Events = await provider.getLogs({
                            address: factory,
                            topics: [eventTopicV3],
                            fromBlock: fromBlock,
                            toBlock: toBlock
                        });
                        
                        if (v3Events.length > 0) {
                            logger.info(`    ✅ Found ${v3Events.length} V3 events`);
                        }
                        
                        allEvents.push(...v3Events.map((event: { address: string } & DexEvent) => ({
                            ...event,
                            dex: 'PANCAKESWAP_V3',
                            type: 'V3'
                        })));
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
    } catch (error: any) {
        if (error.message.includes('rate limit') || error.message.includes('429') || error.message.includes('limit exceeded')) {
            throw new Error('RATE_LIMIT');
        }
        if (error.message.includes('404') || error.message.includes('not found')) {
            throw new Error('PROVIDER_ERROR');
        }
        throw error;
    }
}

// Helper function to process events
async function processEvents(events: DexEvent[], blockNumber: number) {
    logger.info(`\n🔄 Processing ${events.length} events for block ${blockNumber}`);
    
    // Add rate limiting delay between events
    const RATE_LIMIT_DELAY = 100; // 100ms between events
    
    for (const event of events) {
        try {
            // Check if event exists and has required properties
            if (!event || !event.topics || !event.data) {
                logger.warn(`  ⚠️ Skipping invalid event in block ${blockNumber}`);
                continue;
            }

            logger.info(`\n  📝 Processing ${event.dex} ${event.type} event`);
            
            // Extract addresses from topics and data
            const tokenA = '0x' + event.topics[1].slice(26);
            const tokenB = '0x' + event.topics[2].slice(26);
            const pair = '0x' + event.data.slice(26, 66);

            // Convert addresses to checksum format
            const checksumTokenA = ethers.getAddress(tokenA);
            const checksumTokenB = ethers.getAddress(tokenB);
            const checksumPair = ethers.getAddress(pair);

            logger.info(`    • Pair Address: ${checksumPair}`);
            logger.info(`    • Token A: ${checksumTokenA}`);
            logger.info(`    • Token B: ${checksumTokenB}`);

            // Get token info with retry logic
            logger.info(`    🔍 Fetching token information...`);
            const { httpProviderPool } = getProviders();
            const provider = httpProviderPool.getProvider();
            const tokenService = TokenService.getInstance(httpProviderPool);
            
            let tokenAInfo: TokenInfo | null = null;
            let tokenBInfo: TokenInfo | null = null;
            
            try {
                // Add delay between token info fetches
                await sleep(RATE_LIMIT_DELAY);
                tokenAInfo = await tokenService.getTokenInfo(checksumTokenA);
                
                await sleep(RATE_LIMIT_DELAY);
                tokenBInfo = await tokenService.getTokenInfo(checksumTokenB);
                
                if (!tokenAInfo || !tokenBInfo) {
                    logger.error(`    ❌ Invalid token address detected. Skipping pair ${checksumPair}`);
                    return;
                }
                
                logger.info(`    ✅ Token A: ${tokenAInfo.symbol} (${tokenAInfo.name})`);
                logger.info(`    ✅ Token B: ${tokenBInfo.symbol} (${tokenBInfo.name})`);
                
                // Save tokens and create history with delay
                logger.info(`    💾 Saving to database...`);
                await sleep(RATE_LIMIT_DELAY);
                
                // Save token A
                await Token.findOneAndUpdate(
                    { address: checksumTokenA },
                    {
                        $set: {
                            address: checksumTokenA,
                            symbol: tokenAInfo.symbol,
                            name: tokenAInfo.name,
                            decimals: tokenAInfo.decimals,
                            lastUpdated: new Date()
                        },
                        $push: {
                            pools: {
                                address: checksumPair,
                                type: event.type,
                                dex: event.dex,
                                tokenA: checksumTokenA,
                                tokenB: checksumTokenB,
                                blockNumber,
                                transactionHash: event.transactionHash
                            }
                        }
                    },
                    { upsert: true, new: true }
                );

                await sleep(RATE_LIMIT_DELAY);
                // Save token B
                await Token.findOneAndUpdate(
                    { address: checksumTokenB },
                    {
                        $set: {
                            address: checksumTokenB,
                            symbol: tokenBInfo.symbol,
                            name: tokenBInfo.name,
                            decimals: tokenBInfo.decimals,
                            lastUpdated: new Date()
                        },
                        $push: {
                            pools: {
                                address: checksumPair,
                                type: event.type,
                                dex: event.dex,
                                tokenA: checksumTokenA,
                                tokenB: checksumTokenB,
                                blockNumber,
                                transactionHash: event.transactionHash
                            }
                        }
                    },
                    { upsert: true, new: true }
                );

                await sleep(RATE_LIMIT_DELAY);
                // Create token history
                const tokenHistory = new TokenHistory({
                    blockNumber,
                    transactionHash: event.transactionHash,
                    tokenA: tokenAInfo,
                    tokenB: tokenBInfo,
                    pair: checksumPair,
                    type: event.type,
                    dex: event.dex
                });

                await tokenHistory.save();
                logger.info(`    ✅ Successfully saved event data`);

                // Get pair information with delay
                await sleep(RATE_LIMIT_DELAY);
                const pairContract = new ethers.Contract(checksumPair, PAIR_ABI, provider);
                const [reserve0, reserve1] = await Promise.all([
                    pairContract.getReserves().then((reserves: any) => reserves[0]),
                    pairContract.getReserves().then((reserves: any) => reserves[1])
                ]);
                
                const pairInfo: PairInfo = {
                    reserve0,
                    reserve1,
                    price0: Number(reserve1) / Number(reserve0),
                    price1: Number(reserve0) / Number(reserve1)
                };

                await sleep(RATE_LIMIT_DELAY);
                const message = `
🚨 New Token Detected on ${event.dex}!

Token: ${tokenAInfo.symbol} | ${tokenAInfo.name.replace(/[()]/g, '\\$&')}
Address: ${tokenAInfo.address}
Supply: ${formatNumber(tokenAInfo.totalSupply || BigInt(0), tokenAInfo.decimals)} ${tokenAInfo.symbol}
Decimals: ${tokenAInfo.decimals}

Pair: ${tokenAInfo.symbol}/${tokenBInfo.symbol} | ${event.type}
DEX: ${event.dex}
Address: ${checksumPair}
Block: ${blockNumber}
Tx: ${event.transactionHash}

Liquidity: ${formatNumber(pairInfo.reserve0, tokenAInfo.decimals)} ${tokenAInfo.symbol} | ${formatNumber(pairInfo.reserve1, tokenBInfo.decimals)} ${tokenBInfo.symbol}
Price: ${formatNumber(pairInfo.price0, tokenAInfo.decimals)} ${tokenBInfo.symbol}/${tokenAInfo.symbol}

Links: [BSCScan](https://bscscan.com/token/${tokenAInfo.address}) | [PancakeSwap](https://pancakeswap.finance/swap?outputCurrency=${tokenAInfo.address})
`;
                await tgMessage(message);

                // Also notify if token B is new
                if (tokenBInfo.symbol !== 'WBNB') {
                    logger.info(`    🚨 New token detected: ${tokenBInfo.symbol}`);
                    await sleep(RATE_LIMIT_DELAY);
                    const messageB = `
🚨 New Token Detected on ${event.dex}!

Token: ${tokenBInfo.symbol} | ${tokenBInfo.name.replace(/[()]/g, '\\$&')}
Address: ${tokenBInfo.address}
Supply: ${formatNumber(tokenBInfo.totalSupply || BigInt(0), tokenBInfo.decimals)} ${tokenBInfo.symbol}
Decimals: ${tokenBInfo.decimals}

Pair: ${tokenAInfo.symbol}/${tokenBInfo.symbol} | ${event.type}
DEX: ${event.dex}
Address: ${checksumPair}
Block: ${blockNumber}
Tx: ${event.transactionHash}

Liquidity: ${formatNumber(pairInfo.reserve0, tokenAInfo.decimals)} ${tokenAInfo.symbol} | ${formatNumber(pairInfo.reserve1, tokenBInfo.decimals)} ${tokenBInfo.symbol}
Price: ${formatNumber(pairInfo.price1, tokenBInfo.decimals)} ${tokenAInfo.symbol}/${tokenBInfo.symbol}

Links: [BSCScan](https://bscscan.com/token/${tokenBInfo.address}) | [PancakeSwap](https://pancakeswap.finance/swap?outputCurrency=${tokenBInfo.address})
`;
                    await tgMessage(messageB);
                }
            } catch (error: any) {
                if (error.message?.includes('rate limit') || error.message?.includes('429') || error.message?.includes('limit exceeded')) {
                    logger.warn(`    ⚠️ Rate limit hit, switching provider and retrying...`);
                    httpProviderPool.switchProvider();
                    await sleep(1000); // Wait 1s before retry
                    continue;
                }
                logger.error(`    ❌ Error fetching token info for pair ${checksumPair}:`, error);
                return;
            }
        } catch (error) {
            logger.error(`    ❌ Error processing event:`, error);
            logger.error('    ❌ Event data:', event);
        }
    }
}

// Helper function to process blocks with a specific provider
async function processBlocksWithProvider(fromBlock: number, toBlock: number, provider: any, providerPool: any): Promise<boolean> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        try {
            logger.info(`Processing blocks ${fromBlock} to ${toBlock} with provider ${providerPool.getCurrentProviderIndex() + 1}/${providerPool.getProviderCount()}`);
            const { events, transactions } = await fetchBlockTransactionsWithProvider(provider, fromBlock, toBlock);
            
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
async function monitorNewBlocks(startBlock: number, providerPool: any) {
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

        // Get current block number
        let currentBlock;
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            try {
                const provider = httpProviderPool.getProvider();
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
        
        // Create tasks for parallel processing
        let blockNumber = currentBlock - 1;
        const tasks: { fromBlock: number; toBlock: number }[] = [];
        const MAX_PARALLEL_TASKS = providerCount; // Use as many parallel tasks as we have providers
        
        while (blockNumber >= startBlock) {
            // Create batches of blocks for each provider
            for (let i = 0; i < MAX_PARALLEL_TASKS && blockNumber >= startBlock; i++) {
                const fromBlock = Math.max(blockNumber - BATCH_SIZE + 1, startBlock);
                tasks.push({ fromBlock, toBlock: blockNumber });
                blockNumber = fromBlock - 1;
            }
            
            // Process batches in parallel
            logger.info(`Processing ${tasks.length} batches in parallel`);
            const results = await Promise.allSettled(
                tasks.map((task, index) => {
                    // Use a specific provider for each task
                    const providerIndex = index % providerCount;
                    const provider = httpProviderPool.getProvider();
                    return processBlocksWithProvider(task.fromBlock, task.toBlock, provider, httpProviderPool);
                })
            );
            
            // Log results
            results.forEach((result, index) => {
                const task = tasks[index];
                if (result.status === 'fulfilled') {
                    logger.info(`✅ Successfully processed blocks ${task.fromBlock}-${task.toBlock}`);
                } else {
                    logger.error(`❌ Failed to process blocks ${task.fromBlock}-${task.toBlock}: ${result.reason}`);
                }
            });
            
            // Clear tasks for next batch
            tasks.length = 0;
            
            // Wait a bit between large batches to avoid overwhelming the network
            await sleep(2000);
        }

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