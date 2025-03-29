import { ethers } from 'ethers';
import { config } from '../config';
import { TokenHistory } from '../models/TokenHistory';
import { TokenService } from '../services/tokenService';
import { logger } from '../utils/logger';

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to fetch events for a single block
async function fetchBlockEvents(provider: any, blockNumber: number) {
    try {
        // V2 Events
        const v2Events = await provider.getLogs(
            config.PANCAKESWAP.V2_FILTER,
            blockNumber,
            blockNumber
        );

        // V3 Events
        const v3Events = await provider.getLogs(
            config.PANCAKESWAP.V3_FILTER,
            blockNumber,
            blockNumber
        );

        return { v2Events, v3Events };
    } catch (error: any) {
        if (error.message.includes('rate limit') || error.message.includes('429')) {
            throw new Error('RATE_LIMIT');
        }
        throw error;
    }
}

// Helper function to process events
async function processEvents(events: any, version: 'V2' | 'V3', tokenService: TokenService) {
    for (const event of events) {
        try {
            if (version === 'V2') {
                const [tokenA, tokenB, pair] = ethers.AbiCoder.defaultAbiCoder().decode(
                    ['address', 'address', 'address'],
                    event.data
                );

                const [tokenAInfo, tokenBInfo] = await Promise.all([
                    tokenService.getTokenInfo(tokenA),
                    tokenService.getTokenInfo(tokenB)
                ]);

                await TokenHistory.create({
                    tokenA: tokenAInfo,
                    tokenB: tokenBInfo,
                    version: 'V2',
                    transactionHash: event.transactionHash,
                    createdAt: new Date(event.timeStamp * 1000),
                    blockNumber: event.blockNumber,
                    pairAddress: pair
                });

                logger.info(`Processed V2 event: ${tokenAInfo.symbol}/${tokenBInfo.symbol} pair created`);
            } else {
                const [tokenA, tokenB, fee, tickLower, tickUpper, pool] = ethers.AbiCoder.defaultAbiCoder().decode(
                    ['address', 'address', 'uint24', 'int24', 'int24', 'address'],
                    event.data
                );

                const [tokenAInfo, tokenBInfo] = await Promise.all([
                    tokenService.getTokenInfo(tokenA),
                    tokenService.getTokenInfo(tokenB)
                ]);

                await TokenHistory.create({
                    tokenA: tokenAInfo,
                    tokenB: tokenBInfo,
                    version: 'V3',
                    transactionHash: event.transactionHash,
                    createdAt: new Date(event.timeStamp * 1000),
                    blockNumber: event.blockNumber,
                    poolAddress: pool,
                    fee: fee,
                    tickLower: tickLower,
                    tickUpper: tickUpper
                });

                logger.info(`Processed V3 event: ${tokenAInfo.symbol}/${tokenBInfo.symbol} pool created with fee ${fee}`);
            }
        } catch (error) {
            logger.error(`Error processing ${version} event:`, error);
        }
    }
}

export async function fetchHistoricalLiquidity() {
    try {
        const providerPool = config.HTTP_PROVIDER_POOL;
        const tokenService = TokenService.getInstance();

        // Get current block number
        const currentBlock = await providerPool.getProvider().getBlockNumber();
        const fromBlock = currentBlock - 1000; // Fetch last 1000 blocks

        logger.info(`Fetching historical liquidity events from block ${fromBlock} to ${currentBlock}`);

        // Process one block at a time
        for (let blockNumber = fromBlock; blockNumber <= currentBlock; blockNumber++) {
            let success = false;
            let attempts = 0;
            const maxAttempts = 10; // Try up to 10 times

            while (!success && attempts < maxAttempts) {
                try {
                    const provider = providerPool.getProvider();
                    logger.info(`Processing block ${blockNumber} with provider ${providerPool.getCurrentProviderIndex() + 1}/${providerPool.getProviderCount()}`);

                    const { v2Events, v3Events } = await fetchBlockEvents(provider, blockNumber);

                    // Process events if any found
                    if (v2Events.length > 0) {
                        await processEvents(v2Events, 'V2', tokenService);
                    }
                    if (v3Events.length > 0) {
                        await processEvents(v3Events, 'V3', tokenService);
                    }

                    success = true;
                    logger.info(`Successfully processed block ${blockNumber}`);
                } catch (error: any) {
                    attempts++;
                    if (error.message === 'RATE_LIMIT') {
                        logger.info(`Rate limit hit, switching to next provider`);
                        providerPool.switchProvider();
                        await sleep(5000); // Wait 5s before trying next provider
                    } else {
                        logger.error(`Error processing block ${blockNumber}:`, error);
                        providerPool.switchProvider();
                    }
                }
            }

            if (!success) {
                logger.error(`Failed to process block ${blockNumber} after ${maxAttempts} attempts`);
            }

            // Small delay between blocks
            await sleep(1000);
        }

        logger.info('Finished fetching historical liquidity events');
    } catch (error) {
        logger.error('Error fetching historical liquidity:', error);
        throw error;
    }
} 