"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testHistoricalData = testHistoricalData;
exports.processBlockRange = processBlockRange;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const helper_1 = require("../utils/helper");
const providerPool_1 = require("../services/providerPool");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Constants for rate limiting and batching
const DELAY_BETWEEN_BLOCKS = 10000; // 10 seconds between blocks
const ERROR_DELAY = 30000; // 30 seconds after errors
const MAX_RETRIES = 3;
const CACHE_DIR = path.join(__dirname, '../../cache');
const PROGRESS_FILE = path.join(CACHE_DIR, 'historical_progress.json');
// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}
function loadProgress() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        logger_1.logger.warn('Failed to load progress cache:', error);
    }
    return { lastProcessedBlock: 0, events: [] };
}
function saveProgress(progress) {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
    }
    catch (error) {
        logger_1.logger.error('Failed to save progress:', error);
    }
}
async function processBlock(blockNumber, provider, dex, progress) {
    try {
        logger_1.logger.info(`\n📦 Processing block ${blockNumber}`);
        // Get factory addresses for the DEX
        const factoryAddresses = [];
        if (config_1.config.DEX_ADDRESSES[dex].V2_FACTORY) {
            factoryAddresses.push(config_1.config.DEX_ADDRESSES[dex].V2_FACTORY);
        }
        if (config_1.config.DEX_ADDRESSES[dex].FACTORY) {
            factoryAddresses.push(config_1.config.DEX_ADDRESSES[dex].FACTORY);
        }
        // Process each factory address
        for (const factoryAddress of factoryAddresses) {
            const filter = {
                address: factoryAddress,
                fromBlock: blockNumber,
                toBlock: blockNumber,
                topics: [
                    ethers_1.ethers.id("PairCreated(address,address,address,uint256)")
                ]
            };
            const logs = await provider.getLogs(filter);
            if (logs.length > 0) {
                logger_1.logger.info(`Found ${logs.length} pair creation events in block ${blockNumber}`);
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
        await (0, helper_1.sleep)(DELAY_BETWEEN_BLOCKS);
    }
    catch (error) {
        logger_1.logger.error(`Error processing block ${blockNumber}:`, error);
        await (0, helper_1.sleep)(ERROR_DELAY);
        throw error;
    }
}
async function processBlockRange(fromBlock, toBlock, provider, dex) {
    const progress = loadProgress();
    const startBlock = progress.lastProcessedBlock > 0 ? progress.lastProcessedBlock + 1 : fromBlock;
    const totalBlocks = toBlock - startBlock;
    logger_1.logger.info(`Resuming from block ${startBlock}`);
    logger_1.logger.info(`Total blocks to process: ${totalBlocks}`);
    for (let blockNumber = startBlock; blockNumber < toBlock; blockNumber++) {
        let retries = 0;
        let success = false;
        while (!success && retries < MAX_RETRIES) {
            try {
                await processBlock(blockNumber, provider, dex, progress);
                success = true;
            }
            catch (error) {
                retries++;
                if (retries >= MAX_RETRIES) {
                    logger_1.logger.error(`Failed to process block ${blockNumber} after ${MAX_RETRIES} retries`);
                    // Skip this block and continue with the next one
                    continue;
                }
                // Exponential backoff with very long delays
                const backoffDelay = ERROR_DELAY * Math.pow(3, retries);
                logger_1.logger.warn(`Retrying block ${blockNumber} in ${backoffDelay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
                await (0, helper_1.sleep)(backoffDelay);
            }
        }
        // Log progress every 5 blocks
        if ((blockNumber - startBlock + 1) % 5 === 0) {
            const progress = ((blockNumber - startBlock + 1) / totalBlocks * 100).toFixed(2);
            logger_1.logger.info(`Progress: ${progress}% (${blockNumber - startBlock + 1}/${totalBlocks} blocks)`);
        }
    }
}
async function testHistoricalData(args) {
    try {
        const provider = new providerPool_1.ProviderPool();
        const currentBlock = await provider.getBlockNumber();
        logger_1.logger.info(`Current block number: ${currentBlock}`);
        // Calculate block range
        const blocksToProcess = parseInt(args[0] || '1000');
        const fromBlock = currentBlock - blocksToProcess;
        const toBlock = currentBlock;
        // Process blocks for each DEX
        for (const dex of Object.keys(config_1.config.DEX_ADDRESSES)) {
            logger_1.logger.info(`\n🔍 Processing blocks for ${dex}`);
            await processBlockRange(fromBlock, toBlock, provider, dex);
            logger_1.logger.info(`\n🎯 Finished processing blocks for ${dex}`);
        }
    }
    catch (error) {
        logger_1.logger.error('Error in historical data test:', error);
        process.exit(1);
    }
}
// Parse command line arguments
const args = process.argv.slice(2);
const blocksArg = args.find(arg => arg.startsWith('--blocks='));
const blocks = blocksArg ? blocksArg.split('=')[1] : '1000';
testHistoricalData([blocks]);
//# sourceMappingURL=historical.test.js.map