import { config } from '../config';
import { logger } from '../utils/logger';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

interface TelegramError {
	description: string;
	error_code: number;
	ok: boolean;
}

export const tgMessage = async (message: string) => {
	try {
		if (!config.TELEGRAM.BOT_TOKEN || !config.TELEGRAM.CHAT_ID) {
			throw new Error('Telegram bot token or chat ID not found');
		}

		const formattedMsg = normalizeMessage(message);
		const url = `${TELEGRAM_API_URL}${config.TELEGRAM.BOT_TOKEN}/sendMessage`;
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				chat_id: config.TELEGRAM.CHAT_ID,
				text: formattedMsg,
				parse_mode: 'MarkdownV2'
			})
		});

		if (!response.ok) {
			const error = await response.json() as TelegramError;
			throw new Error(error.description || 'Failed to send message');
		}

		logger.info('Message sent successfully');
		return 'Message sent successfully';
	} catch (error: any) {
		logger.error('Error sending message:', error);
		return 'Error sending message';
	}
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
		.replaceAll('#', '\\#');
};
