import { logger } from './utils/logger';
import { initialize } from './config';
import { initializeProvider } from './ERC20/swap';
import { connectDB } from './config/database';
import { fetchHistoricalLiquidity } from './scripts/fetchHistoricalLiquidity';
import { startServer } from './server';
import { tgMessage } from './TG/tgBot';

async function main() {
	try {
		// Initialize providers
		logger.info('Initializing providers and load balancing system...');
		await initialize();

		// Initialize provider and contract for swaps
		logger.info('Initializing provider and contract for swaps...');
		await initializeProvider();

		// Connect to MongoDB
		logger.info('Connecting to MongoDB...');
		await connectDB();
		logger.info('Connected to MongoDB');

		// Send startup notification
		await tgMessage('🚀 BscLiquiditySniper Bot Started!');

		// Fetch historical liquidity events
		logger.info('Starting to fetch historical liquidity events...');
		await fetchHistoricalLiquidity();

		// Start API server
		logger.info('Starting API server...');
		await startServer();

		// Handle graceful shutdown
		const signals = ['SIGINT', 'SIGTERM'] as const;
		signals.forEach((signal) => {
			process.on(signal, async () => {
				logger.info(`Received ${signal}, shutting down gracefully...`);
				await tgMessage('🛑 BscLiquiditySniper Bot Stopped!');
				process.exit(0);
			});
		});
	} catch (error) {
		logger.error('Error in main:', error);
		await tgMessage('❌ Error in BscLiquiditySniper Bot!');
		process.exit(1);
	}
}

main();