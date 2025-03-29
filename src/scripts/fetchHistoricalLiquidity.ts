import { ethers } from 'ethers';
import { config, getProviders } from '../config';
import { TokenHistory } from '../models/TokenHistory';
import { ProcessedBlock } from '../models/ProcessedBlock';
import { Token } from '../models/Token';
import { TokenService } from '../services/tokenService';
import { logger } from '../utils/logger';
import { tgMessage } from '../TG/tgBot';

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
    factory: string;
    router: string;
    events: string[];
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
                factory: config.DEX_ADDRESSES.PANCAKESWAP.V2_FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.PANCAKESWAP.V2_ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'PANCAKESWAP_V3',
                factory: config.DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.PANCAKESWAP.V3_ROUTER.toLowerCase(),
                events: ['PoolCreated']
            },
            {
                name: 'MDEX',
                factory: config.DEX_ADDRESSES.MDEX.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.MDEX.ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'JULSWAP',
                factory: config.DEX_ADDRESSES.JULSWAP.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.JULSWAP.ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'WAULTSWAP',
                factory: config.DEX_ADDRESSES.WAULTSWAP.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.WAULTSWAP.ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'APESWAP',
                factory: config.DEX_ADDRESSES.APESWAP.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.APESWAP.ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'BISWAP',
                factory: config.DEX_ADDRESSES.BISWAP.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.BISWAP.ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'BABYSWAP',
                factory: config.DEX_ADDRESSES.BABYSWAP.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.BABYSWAP.ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'BAKERYSWAP',
                factory: config.DEX_ADDRESSES.BAKERYSWAP.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.BAKERYSWAP.ROUTER.toLowerCase(),
                events: ['PairCreated']
            },
            {
                name: 'KNIGHTSWAP',
                factory: config.DEX_ADDRESSES.KNIGHTSWAP.FACTORY.toLowerCase(),
                router: config.DEX_ADDRESSES.KNIGHTSWAP.ROUTER.toLowerCase(),
                events: ['PairCreated']
            }
        ];

        // Get all factory addresses and their respective events
        const factoryEvents = new Map<string, string[]>();
        DEX_CONFIGS.forEach(dex => {
            factoryEvents.set(dex.factory, dex.events);
        });

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
                    if (factory === config.DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY.toLowerCase()) {
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

            // Get token info
            logger.info(`    🔍 Fetching token information...`);
            const tokenService = TokenService.getInstance();
            const [tokenAInfo, tokenBInfo] = await Promise.all([
                tokenService.getTokenInfo(checksumTokenA),
                tokenService.getTokenInfo(checksumTokenB)
            ]);

            logger.info(`    ✅ Token A: ${tokenAInfo.symbol} (${tokenAInfo.name})`);
            logger.info(`    ✅ Token B: ${tokenBInfo.symbol} (${tokenBInfo.name})`);

            // Save tokens and create history
            logger.info(`    💾 Saving to database...`);
            
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

            // Send Telegram notification for new token
            if (tokenAInfo.symbol === 'WBNB' || tokenBInfo.symbol === 'WBNB') {
                const newToken = tokenAInfo.symbol === 'WBNB' ? tokenBInfo : tokenAInfo;
                logger.info(`    🚨 New token detected: ${newToken.symbol}`);
                const message = `
🚨 New Token Detected on ${event.dex}!

Token Info:
Symbol: ${newToken.symbol}
Name: ${newToken.name}
Address: ${newToken.address}
Decimals: ${newToken.decimals}

Pool Info:
Type: ${event.type}
DEX: ${event.dex}
Address: ${checksumPair}
Block: ${blockNumber}
Transaction: ${event.transactionHash}

Links:
BSCScan: https://bscscan.com/token/${newToken.address}
PancakeSwap: https://pancakeswap.finance/swap?outputCurrency=${newToken.address}
`;
                await tgMessage(message);
            }
        } catch (error) {
            logger.error(`    ❌ Error processing event:`, error);
            logger.error('    ❌ Event data:', event);
        }
    }
}

// Helper function to process multiple blocks
async function processBlocks(fromBlock: number, toBlock: number, providerPool: any): Promise<boolean> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        try {
            const provider = providerPool.getProvider();
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
            if (error.message === 'RATE_LIMIT') {
                logger.info(`Rate limit hit, switching to next provider`);
                providerPool.switchProvider();
                await sleep(30000); // Wait 30s before trying next provider
            } else if (error.message === 'PROVIDER_ERROR') {
                logger.info(`Provider error, switching to next provider`);
                providerPool.switchProvider();
                await sleep(20000); // Wait 20s before trying next provider
            } else {
                logger.error(`Error processing blocks ${fromBlock} to ${toBlock}:`, error);
                providerPool.switchProvider();
                await sleep(10000); // Wait 10s before retrying
            }

            // Mark blocks as failed if max attempts reached
            if (attempts >= maxAttempts) {
                for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
                    await markBlockAsProcessed(blockNumber, false);
                }
            }
        }
    }

    logger.error(`Failed to process blocks ${fromBlock} to ${toBlock} after ${maxAttempts} attempts`);
    return false;
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
        const BATCH_SIZE = 100; // Process 100 blocks at a time

        // Process historical blocks
        let blockNumber = currentBlock - 1;
        
        while (blockNumber >= startBlock) {
            const fromBlock = Math.max(blockNumber - BATCH_SIZE + 1, startBlock);
            
            try {
                await processBlocks(fromBlock, blockNumber, httpProviderPool);
                logger.info(`✅ Processed blocks ${fromBlock}-${blockNumber}`);
                
                // Move to next batch
                blockNumber = fromBlock - 1;
                
                // Wait 200ms between batches to respect rate limits
                await sleep(200);
            } catch (error) {
                logger.error(`❌ Failed to process blocks ${fromBlock}-${blockNumber}:`, error);
                // On error, wait longer and retry the same batch
                await sleep(1000);
                continue;
            }
        }

    } catch (error) {
        logger.error('Error fetching historical liquidity:', error);
        throw error;
    }
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

// Helper function to get provider by URL
declare module '../config' {
    interface ProviderPool {
        getProviderByUrl: (url: string) => any;
    }
} 