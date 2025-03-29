import { config } from './config';
import { connectDB } from './db';
import { fetchHistoricalLiquidity } from './scripts/fetchHistoricalLiquidity';
import express from 'express';
import { appRouter } from './routes';
import { sendTelegramMessage } from './utils/telegram';

// Khởi tạo express app
const app = express();
app.use(express.json());
app.use(appRouter);

// Hàm khởi động server
async function startServer() {
	const port = config.APP.PORT || 3000;
	return app.listen(port, () => {
		console.log(`Server started on port ${port}`);
	});
}

async function main() {
	try {
		// Connect to MongoDB
		await connectDB();
		console.log('Connected to MongoDB');

		// Fetch historical liquidity events
		await fetchHistoricalLiquidity();
		console.log('Fetched historical liquidity events');

		// Start server
		await startServer();
		console.log('Server started successfully');

		// Send Telegram notification
		await sendTelegramMessage('Bot started successfully');
	} catch (error) {
		console.error('Error starting bot:', error);
		try {
			await sendTelegramMessage(`Error starting bot: ${error}`);
		} catch (telegramError) {
			console.error('Error sending Telegram message:', telegramError);
		}
		process.exit(1);
	}
}

main();
