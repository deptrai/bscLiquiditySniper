import { config } from '../config';
import { logger } from '../utils/logger';
import { sleep } from '../utils/helper';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const REQUEST_TIMEOUT = 10000; // 10 seconds

interface TelegramError {
	description: string;
	error_code: number;
	ok: boolean;
}

export const tgMessage = async (message: string) => {
	let attempts = 0;
	
	while (attempts < MAX_RETRIES) {
		try {
			if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) {
				throw new Error('Telegram bot token or chat ID not found');
			}

			const formattedMsg = normalizeMessage(message);
			const url = `${TELEGRAM_API_URL}${config.TELEGRAM_BOT_TOKEN}/sendMessage`;
			
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					chat_id: config.TELEGRAM_CHAT_ID,
					text: formattedMsg,
					parse_mode: 'MarkdownV2'
				}),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const error = await response.json() as TelegramError;
				throw new Error(error.description || 'Failed to send message');
			}

			logger.info('Message sent successfully');
			return 'Message sent successfully';
		} catch (error: any) {
			attempts++;
			
			if (error.name === 'AbortError') {
				logger.error(`Attempt ${attempts}/${MAX_RETRIES}: Request timeout`);
			} else {
				logger.error(`Attempt ${attempts}/${MAX_RETRIES}: Error sending message:`, error);
			}

			if (attempts < MAX_RETRIES) {
				logger.info(`Retrying in ${RETRY_DELAY/1000} seconds...`);
				await sleep(RETRY_DELAY);
			} else {
				logger.error('Max retries reached, giving up');
				return 'Error sending message';
			}
		}
	}

	return 'Error sending message';
};

const normalizeMessage = (message: string) => {
	return message
		.replaceAll('_', '\\_')
		.replaceAll('|', '\\|')
		.replaceAll('.', '\\.')
		.replaceAll('{', '\\{')
		.replaceAll('}', '\\}')
		.replaceAll('=', '\\=')
		.replaceAll('+', '\\+')
		.replaceAll('>', '\\>')
		.replaceAll('<', '\\<')
		.replaceAll('-', '\\-')
		.replaceAll('/', '\\/')
		.replaceAll('!', '\\!')
		.replaceAll('[', '\\[')
		.replaceAll(']', '\\]')
		.replaceAll('`', '\\`')
		.replaceAll('~', '\\~')
		.replaceAll('#', '\\#')
		.replaceAll('(', '\\(')
		.replaceAll(')', '\\)');
};
