import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sleep } from '../utils/helper';
import { ProviderPool } from '../services/providerPool';
import * as fs from 'fs';
import * as path from 'path';

// Constants for rate limiting and batching
const DELAY_BETWEEN_BLOCKS = 10000; // 10 seconds between blocks
const ERROR_DELAY = 30000; // 30 seconds after errors
const MAX_RETRIES = 3;
const CACHE_DIR = path.join(__dirname, '../../cache');
const PROGRESS_FILE = path.join(CACHE_DIR, 'historical_progress.json');

interface ProgressCache {
    lastProcessedBlock: number;
    events: Array<{
        blockNumber: number;
        dex: string;
        factoryAddress: string;
        pairAddress: string;
        token0: string;
        token1: string;
    }>;
}

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

function loadProgress(): ProgressCache {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        logger.warn('Failed to load progress cache:', error);
    }
    return { lastProcessedBlock: 0, events: [] };
}

function saveProgress(progress: ProgressCache): void {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    } catch (error) {
        logger.error('Failed to save progress:', error);
    }
}

async function processBlock(
    blockNumber: number,
    provider: ProviderPool,
    dex: string,
    progress: ProgressCache
): Promise<void> {
    try {
        logger.info(`\n📦 Processing block ${blockNumber}`);
        
        // Get factory addresses for the DEX
        const factoryAddresses = [];
        if (config.DEX_ADDRESSES[dex].V2_FACTORY) {
            factoryAddresses.push(config.DEX_ADDRESSES[dex].V2_FACTORY);
        }
        if (config.DEX_ADDRESSES[dex].FACTORY) {
            factoryAddresses.push(config.DEX_ADDRESSES[dex].FACTORY);
        }

        // Process each factory address
        for (const factoryAddress of factoryAddresses) {
            const filter = {
                address: factoryAddress,
                fromBlock: blockNumber,
                toBlock: blockNumber,
                topics: [
                    ethers.id("PairCreated(address,address,address,uint256)")
                ]
            };

            const logs = await provider.getLogs(filter);
            
            if (logs.length > 0) {
                logger.info(`Found ${logs.length} pair creation events in block ${blockNumber}`);
                
                // Process and cache events
                for (const log of logs) {
                    const event = {
                        blockNumber: log.blockNumber,
                        dex,
                        factoryAddress: log.address,
                        pairAddress: `0x${log.topics[3].slice(-40)}`,
                        token0: `0x${log.topics[1].slice(-40)}`,
                        token1: `0x${log.topics[2].slice(-40)}`
                    };
                    progress.events.push(event);
                }
            }
        }

        // Update progress
        progress.lastProcessedBlock = blockNumber;
        saveProgress(progress);

        // Add delay after successful processing
        await sleep(DELAY_BETWEEN_BLOCKS);
    } catch (error) {
        logger.error(`Error processing block ${blockNumber}:`, error);
        await sleep(ERROR_DELAY);
        throw error;
    }
}

async function processBlockRange(
    fromBlock: number,
    toBlock: number,
    provider: ProviderPool,
    dex: string
): Promise<void> {
    const progress = loadProgress();
    const startBlock = progress.lastProcessedBlock > 0 ? progress.lastProcessedBlock + 1 : fromBlock;
    const totalBlocks = toBlock - startBlock;
    
    logger.info(`Resuming from block ${startBlock}`);
    logger.info(`Total blocks to process: ${totalBlocks}`);

    for (let blockNumber = startBlock; blockNumber < toBlock; blockNumber++) {
        let retries = 0;
        let success = false;

        while (!success && retries < MAX_RETRIES) {
            try {
                await processBlock(blockNumber, provider, dex, progress);
                success = true;
            } catch (error) {
                retries++;
                if (retries >= MAX_RETRIES) {
                    logger.error(`Failed to process block ${blockNumber} after ${MAX_RETRIES} retries`);
                    // Skip this block and continue with the next one
                    continue;
                }
                // Exponential backoff with very long delays
                const backoffDelay = ERROR_DELAY * Math.pow(3, retries);
                logger.warn(`Retrying block ${blockNumber} in ${backoffDelay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
                await sleep(backoffDelay);
            }
        }

        // Log progress every 5 blocks
        if ((blockNumber - startBlock + 1) % 5 === 0) {
            const progress = ((blockNumber - startBlock + 1) / totalBlocks * 100).toFixed(2);
            logger.info(`Progress: ${progress}% (${blockNumber - startBlock + 1}/${totalBlocks} blocks)`);
        }
    }
}

async function testHistoricalData(args: string[]) {
    try {
        const provider = new ProviderPool();
        const currentBlock = await provider.getBlockNumber();
        logger.info(`Current block number: ${currentBlock}`);

        // Calculate block range
        const blocksToProcess = parseInt(args[0] || '1000');
        const fromBlock = currentBlock - blocksToProcess;
        const toBlock = currentBlock;

        // Process blocks for each DEX
        for (const dex of Object.keys(config.DEX_ADDRESSES)) {
            logger.info(`\n🔍 Processing blocks for ${dex}`);
            await processBlockRange(fromBlock, toBlock, provider, dex);
            logger.info(`\n🎯 Finished processing blocks for ${dex}`);
        }

    } catch (error) {
        logger.error('Error in historical data test:', error);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const blocksArg = args.find(arg => arg.startsWith('--blocks='));
const blocks = blocksArg ? blocksArg.split('=')[1] : '1000';

testHistoricalData([blocks]);

export { testHistoricalData, processBlockRange }; 