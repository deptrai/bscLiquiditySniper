import { ethers } from 'ethers';
import { config, getProviders } from '../config';
import { logger } from '../utils/logger';
import { tgMessage } from '../TG/tgBot';
import fs from 'fs';
import path from 'path';

// Helper function to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to save block data to file
async function saveBlockData(blockNumber: number, data: any) {
    const dir = path.join(__dirname, '../../data/blocks');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, `block_${blockNumber}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Helper function to fetch block data
async function fetchBlockData(provider: any, blockNumber: number) {
    try {
        // Get block with transactions
        const block = await provider.getBlock(blockNumber, true);
        
        // Get block timestamp
        const timestamp = new Date(block.timestamp * 1000).toISOString();
        
        // Get V2 events
        const v2Events = await provider.getLogs({
            ...config.PANCAKESWAP.V2_FILTER,
            fromBlock: blockNumber,
            toBlock: blockNumber
        });

        // Get V3 events
        const v3Events = await provider.getLogs({
            ...config.PANCAKESWAP.V3_FILTER,
            fromBlock: blockNumber,
            toBlock: blockNumber
        });

        // Get Smart Router transactions
        const smartRouterTxs = block.transactions.filter((tx: any) => 
            tx.to === config.PANCAKESWAP.SMART_ROUTER
        );

        // Prepare block data
        const blockData = {
            blockNumber,
            timestamp,
            hash: block.hash,
            parentHash: block.parentHash,
            number: block.number,
            timestamp: block.timestamp,
            nonce: block.nonce,
            difficulty: block.difficulty,
            gasLimit: block.gasLimit.toString(),
            gasUsed: block.gasUsed.toString(),
            miner: block.miner,
            extraData: block.extraData,
            baseFeePerGas: block.baseFeePerGas?.toString(),
            withdrawals: block.withdrawals,
            transactions: block.transactions.map((tx: any) => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                data: tx.data,
                nonce: tx.nonce,
                gasLimit: tx.gasLimit.toString(),
                gasPrice: tx.gasPrice?.toString(),
                maxFeePerGas: tx.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
                type: tx.type
            })),
            v2Events,
            v3Events,
            smartRouterTxs: smartRouterTxs.map((tx: any) => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value.toString(),
                data: tx.data,
                nonce: tx.nonce,
                gasLimit: tx.gasLimit.toString(),
                gasPrice: tx.gasPrice?.toString(),
                maxFeePerGas: tx.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
                type: tx.type
            }))
        };

        // Save block data
        await saveBlockData(blockNumber, blockData);
        logger.info(`Saved data for block ${blockNumber}`);

        return blockData;
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

// Helper function to process multiple blocks
async function processBlocks(fromBlock: number, toBlock: number, providerPool: any): Promise<boolean> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        try {
            const provider = providerPool.getProvider();
            logger.info(`Processing blocks ${fromBlock} to ${toBlock} with provider ${providerPool.getCurrentProviderIndex() + 1}/${providerPool.getProviderCount()}`);

            for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
                await fetchBlockData(provider, blockNumber);
                // Wait 1s between blocks to avoid rate limits
                await sleep(1000);
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
        }
    }

    logger.error(`Failed to process blocks ${fromBlock} to ${toBlock} after ${maxAttempts} attempts`);
    return false;
}

export async function fetchAllBlocks() {
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

        // Get the last processed block from files
        const dir = path.join(__dirname, '../../data/blocks');
        let lastProcessedBlock = 0;
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            const blockNumbers = files.map(file => parseInt(file.split('_')[1]));
            lastProcessedBlock = Math.max(...blockNumbers, 0);
        }

        const startBlock = lastProcessedBlock + 1;
        logger.info(`Starting from block ${startBlock} to ${currentBlock}`);

        // Process blocks in batches of 10
        for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber += 10) {
            const toBlock = Math.min(blockNumber + 9, currentBlock);
            await processBlocks(blockNumber, toBlock, httpProviderPool);
            
            // Wait 2s between batches to avoid rate limits
            await sleep(2000);
        }

        logger.info('Finished fetching all blocks');
        await tgMessage('Finished fetching all blocks');
    } catch (error) {
        logger.error('Error fetching all blocks:', error);
        await tgMessage(`Error fetching all blocks: ${error}`);
        throw error;
    }
} 