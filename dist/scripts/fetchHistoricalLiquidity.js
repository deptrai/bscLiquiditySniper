"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHistoricalLiquidity = fetchHistoricalLiquidity;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const TokenHistory_1 = require("../models/TokenHistory");
const tokenService_1 = require("../services/tokenService");
const logger_1 = require("../utils/logger");
// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
// Helper function to fetch events with retry and provider rotation
async function fetchEventsWithRetry(provider, filter, fromBlock, toBlock, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await provider.getLogs(filter, fromBlock, toBlock);
        }
        catch (error) {
            if (error.message.includes('rate limit') || error.message.includes('429')) {
                const waitTime = (i + 1) * 10000; // 10s, 20s, 30s
                logger_1.logger.info(`Rate limit hit, waiting ${waitTime / 1000}s before retry...`);
                await sleep(waitTime);
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries reached');
}
async function fetchHistoricalLiquidity() {
    try {
        const provider = config_1.config.PROVIDER;
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = currentBlock - 1000; // Fetch last 1000 blocks
        // Split block range into smaller chunks to avoid rate limits
        const chunkSize = 50;
        const chunks = Math.ceil((currentBlock - fromBlock) / chunkSize);
        logger_1.logger.info(`Fetching historical liquidity events from block ${fromBlock} to ${currentBlock}`);
        logger_1.logger.info(`Split into ${chunks} chunks of ${chunkSize} blocks each`);
        const tokenService = tokenService_1.TokenService.getInstance();
        for (let i = 0; i < chunks; i++) {
            const chunkFromBlock = fromBlock + (i * chunkSize);
            const chunkToBlock = Math.min(chunkFromBlock + chunkSize - 1, currentBlock);
            try {
                // V2 Events
                const v2Events = await fetchEventsWithRetry(provider, config_1.config.PANCAKESWAP.V2_FILTER, chunkFromBlock, chunkToBlock);
                logger_1.logger.info(`Found ${v2Events.length} V2 PairCreated events in blocks ${chunkFromBlock}-${chunkToBlock}`);
                for (const event of v2Events) {
                    try {
                        const [tokenA, tokenB, pair] = ethers_1.ethers.AbiCoder.defaultAbiCoder().decode(['address', 'address', 'address'], event.data);
                        // Get token info
                        const [tokenAInfo, tokenBInfo] = await Promise.all([
                            tokenService.getTokenInfo(tokenA),
                            tokenService.getTokenInfo(tokenB)
                        ]);
                        await TokenHistory_1.TokenHistory.create({
                            tokenA: tokenAInfo,
                            tokenB: tokenBInfo,
                            version: 'V2',
                            transactionHash: event.transactionHash,
                            createdAt: new Date(event.timeStamp * 1000),
                            blockNumber: event.blockNumber,
                            pairAddress: pair
                        });
                        logger_1.logger.info(`Processed V2 event: ${tokenAInfo.symbol}/${tokenBInfo.symbol} pair created`);
                    }
                    catch (error) {
                        logger_1.logger.error('Error processing V2 event:', error);
                    }
                }
                // V3 Events
                const v3Events = await fetchEventsWithRetry(provider, config_1.config.PANCAKESWAP.V3_FILTER, chunkFromBlock, chunkToBlock);
                logger_1.logger.info(`Found ${v3Events.length} V3 PoolCreated events in blocks ${chunkFromBlock}-${chunkToBlock}`);
                for (const event of v3Events) {
                    try {
                        const [tokenA, tokenB, fee, tickLower, tickUpper, pool] = ethers_1.ethers.AbiCoder.defaultAbiCoder().decode(['address', 'address', 'uint24', 'int24', 'int24', 'address'], event.data);
                        // Get token info
                        const [tokenAInfo, tokenBInfo] = await Promise.all([
                            tokenService.getTokenInfo(tokenA),
                            tokenService.getTokenInfo(tokenB)
                        ]);
                        await TokenHistory_1.TokenHistory.create({
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
                        logger_1.logger.info(`Processed V3 event: ${tokenAInfo.symbol}/${tokenBInfo.symbol} pool created with fee ${fee}`);
                    }
                    catch (error) {
                        logger_1.logger.error('Error processing V3 event:', error);
                    }
                }
                // Wait between chunks to avoid rate limits
                await sleep(2000);
            }
            catch (error) {
                logger_1.logger.error(`Error processing blocks ${chunkFromBlock}-${chunkToBlock}:`, error);
                // Continue with next chunk even if this one fails
                continue;
            }
        }
        logger_1.logger.info('Finished fetching historical liquidity events');
    }
    catch (error) {
        logger_1.logger.error('Error fetching historical liquidity:', error);
        throw error;
    }
}
