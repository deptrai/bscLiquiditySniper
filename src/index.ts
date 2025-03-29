import express from 'express';
import mongoose from 'mongoose';
import { config, initialize } from './config';
import { appRouter } from './routes';
import { fetchHistoricalLiquidity } from './scripts/fetchHistoricalLiquidity';
import { logger } from './utils/logger';
import { tgMessage } from './TG/tgBot';
import { connectDB } from './config/database';
import { Telegraf } from 'telegraf';

// Khởi tạo express app
const app = express();
app.use(express.json());
app.use('/api', appRouter);

// Initialize Telegram bot
if (!config.TELEGRAM.BOT_TOKEN) {
	throw new Error('Telegram bot token is required');
}

const bot = new Telegraf(config.TELEGRAM.BOT_TOKEN);
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

async function main() {
	try {
		// Initialize providers first
		await initialize();
		logger.info('Providers initialized successfully');

		// Connect to MongoDB
		if (!config.MONGODB_URI) {
			throw new Error('MongoDB URI is not defined');
		}
		await mongoose.connect(config.MONGODB_URI);
		logger.info('Connected to MongoDB successfully');

		// Fetch historical liquidity events
		await fetchHistoricalLiquidity();
		logger.info('Finished fetching historical liquidity events');

		// Start server
		const port = config.APP.PORT;
		app.listen(port, () => {
			logger.info(`Server is running on port ${port}`);
		});
	} catch (error) {
		logger.error('Error in main process:', error);
		await tgMessage(`Error starting application: ${error}`);
		process.exit(1);
	}
}

main();
