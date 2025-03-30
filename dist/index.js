"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const swap_1 = require("./ERC20/swap");
const database_1 = require("./config/database");
const fetchHistoricalLiquidity_1 = require("./scripts/fetchHistoricalLiquidity");
const server_1 = require("./server");
const tgBot_1 = require("./TG/tgBot");
async function main() {
    try {
        // Initialize providers
        logger_1.logger.info('Initializing providers and load balancing system...');
        await (0, config_1.initialize)();
        // Initialize provider and contract for swaps
        logger_1.logger.info('Initializing provider and contract for swaps...');
        await (0, swap_1.initializeProvider)();
        // Connect to MongoDB
        logger_1.logger.info('Connecting to MongoDB...');
        await (0, database_1.connectDB)();
        logger_1.logger.info('Connected to MongoDB');
        // Send startup notification
        await (0, tgBot_1.tgMessage)('🚀 BscLiquiditySniper Bot Started!');
        // Fetch historical liquidity events
        logger_1.logger.info('Starting to fetch historical liquidity events...');
        await (0, fetchHistoricalLiquidity_1.fetchHistoricalLiquidity)();
        // Start API server
        logger_1.logger.info('Starting API server...');
        await (0, server_1.startServer)();
        // Handle graceful shutdown
        const signals = ['SIGINT', 'SIGTERM'];
        signals.forEach((signal) => {
            process.on(signal, async () => {
                logger_1.logger.info(`Received ${signal}, shutting down gracefully...`);
                await (0, tgBot_1.tgMessage)('🛑 BscLiquiditySniper Bot Stopped!');
                process.exit(0);
            });
        });
    }
    catch (error) {
        logger_1.logger.error('Error in main:', error);
        await (0, tgBot_1.tgMessage)('❌ Error in BscLiquiditySniper Bot!');
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map