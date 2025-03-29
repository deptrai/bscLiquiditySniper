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
    v2: string;
    v3?: string;
}

// Helper function to fetch transactions for multiple blocks
async function fetchBlockTransactions(provider: any, fromBlock: number, toBlock: number) {
    try {
        // Wait 5s before making request to stay within rate limit
        await sleep(5000);

        // Get events from all DEXes
        const allEvents: DexEvent[] = [];

        // Define DEX configurations
        const dexConfigs: DexConfig[] = [
            { name: 'PANCAKESWAP', v2: config.DEX_ADDRESSES.PANCAKESWAP.V2_FACTORY, v3: config.DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY },
            { name: 'BISWAP', v2: config.DEX_ADDRESSES.BISWAP.FACTORY },
            { name: 'MDEX', v2: config.DEX_ADDRESSES.MDEX.FACTORY },
            { name: 'BABYSWAP', v2: config.DEX_ADDRESSES.BABYSWAP.FACTORY },
            { name: 'APESWAP', v2: config.DEX_ADDRESSES.APESWAP.FACTORY },
            { name: 'JULSWAP', v2: config.DEX_ADDRESSES.JULSWAP.FACTORY },
            { name: 'BAKERYSWAP', v2: config.DEX_ADDRESSES.BAKERYSWAP.FACTORY },
            { name: 'KNIGHTSWAP', v2: config.DEX_ADDRESSES.KNIGHTSWAP.FACTORY },
            { name: 'WAULTSWAP', v2: config.DEX_ADDRESSES.WAULTSWAP.FACTORY }
        ];

        // Fetch events from each DEX
        for (const dex of dexConfigs) {
            try {
                // Fetch V2 events
                const v2Events = await provider.getLogs({
                    address: dex.v2,
                    topics: [ethers.id('PairCreated(address,address,address,uint256)')],
                    fromBlock: fromBlock,
                    toBlock: toBlock
                });
                allEvents.push(...v2Events.map((event: any) => ({ ...event, dex: dex.name, type: 'V2' })));

                // Wait 1s between requests
                await sleep(1000);

                // Fetch V3 events if available
                if (dex.v3) {
                    const v3Events = await provider.getLogs({
                        address: dex.v3,
                        topics: [ethers.id('PoolCreated(address,address,uint24,bytes32)')],
                        fromBlock: fromBlock,
                        toBlock: toBlock
                    });
                    allEvents.push(...v3Events.map((event: any) => ({ ...event, dex: dex.name, type: 'V3' })));
                    await sleep(1000);
                }
            } catch (error) {
                logger.error(`Error fetching events for ${dex.name}:`, error);
                continue;
            }
        }

        // Get all transactions in the block range
        const transactions = [];
        for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
            const block = await provider.getBlock(blockNumber, true);
            for (const tx of block.transactions) {
                // Check transactions to all DEX routers
                const isDexTransaction = Object.values(config.DEX_ADDRESSES).some(dex => {
                    if ('V2_ROUTER' in dex && 'V3_ROUTER' in dex) {
                        return tx.to === dex.V2_ROUTER || tx.to === dex.V3_ROUTER;
                    }
                    return tx.to === dex.ROUTER;
                });
                
                if (isDexTransaction) {
                    const methodId = tx.data.slice(0, 10);
                    if (methodId === config.SMART_ROUTER_METHODS.buyMemeToken ||
                        methodId === config.SMART_ROUTER_METHODS.swapV3ExactIn) {
                        transactions.push(tx);
                    }
                }
            }
        }

        logger.info(`Found ${allEvents.length} events and ${transactions.length} transactions from block ${fromBlock} to ${toBlock}`);
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
    for (const event of events) {
        try {
            // Check if event exists and has required properties
            if (!event || !event.topics || !event.data) {
                logger.warn(`Skipping invalid event in block ${blockNumber}`);
                continue;
            }

            // Extract addresses from topics and data
            const tokenA = '0x' + event.topics[1].slice(26); // Get last 40 chars
            const tokenB = '0x' + event.topics[2].slice(26); // Get last 40 chars
            const pair = '0x' + event.data.slice(26, 66); // Get pair address from data (40 chars after 0x)

            // Convert addresses to checksum format
            const checksumTokenA = ethers.getAddress(tokenA);
            const checksumTokenB = ethers.getAddress(tokenB);
            const checksumPair = ethers.getAddress(pair);

            // Get token info
            const tokenService = TokenService.getInstance();
            const [tokenAInfo, tokenBInfo] = await Promise.all([
                tokenService.getTokenInfo(checksumTokenA),
                tokenService.getTokenInfo(checksumTokenB)
            ]);

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
            logger.info(`Saved ${event.dex} ${event.type} event for block ${blockNumber}, pair: ${checksumPair}`);

            // Send Telegram notification for new token
            if (tokenAInfo.symbol === 'WBNB' || tokenBInfo.symbol === 'WBNB') {
                const newToken = tokenAInfo.symbol === 'WBNB' ? tokenBInfo : tokenAInfo;
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
            logger.error(`Error processing event in block ${blockNumber}:`, error);
            logger.error('Event data:', event);
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
                await sleep(10000);
            }
        }

        if (!currentBlock) {
            throw new Error('Failed to get current block number after multiple attempts');
        }

        // Get the last processed block
        const lastProcessedBlock = await getLastProcessedBlock();
        const startBlock = lastProcessedBlock ? lastProcessedBlock + 1 : currentBlock - 1000; // Start from 1000 blocks ago if no last processed block

        logger.info(`Starting from block ${startBlock} to ${currentBlock}`);

        // Process blocks in batches of 10
        for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber += 10) {
            const toBlock = Math.min(blockNumber + 9, currentBlock);
            await processBlocks(blockNumber, toBlock, httpProviderPool);
            
            // Wait 2s between batches to avoid rate limits
            await sleep(2000);
        }

        // Start monitoring new blocks continuously
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const provider = httpProviderPool.getProvider();
                const latestBlock = await provider.getBlockNumber();
                
                if (latestBlock > currentBlock) {
                    logger.info(`New blocks detected: ${currentBlock + 1} to ${latestBlock}`);
                    await processBlocks(currentBlock + 1, latestBlock, httpProviderPool);
                    currentBlock = latestBlock;
                }
                
                // Wait 5s before checking for new blocks
                await sleep(5000);
            } catch (error) {
                logger.error('Error monitoring new blocks:', error);
                httpProviderPool.switchProvider();
                await sleep(10000);
            }
        }
    } catch (error) {
        logger.error('Error fetching historical liquidity:', error);
        throw error;
    }
} 