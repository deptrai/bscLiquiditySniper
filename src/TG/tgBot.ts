import { Context, Telegraf } from 'telegraf';
import { config } from '../config';
import fs from 'fs';
import path from 'path';

if (!config.TELEGRAM.BOT_TOKEN) {
	throw new Error('Telegram bot token not found');
}

console.log(`*****`.repeat(5));
console.log(
	`TG BscLiquiditySniper Bot Notifications Started at: ${new Date().toLocaleTimeString()}`
);

const bot = new Telegraf(config.TELEGRAM.BOT_TOKEN);

// Kiểm tra người dùng được phép
const isAuthorized = (userId: number) => {
	if (!config.TELEGRAM.CHAT_ID) {
		return false;
	}
	return config.TELEGRAM.CHAT_ID.toString() === userId.toString();
};

bot.use(async (ctx: Context, next) => {
	try {
		const userId = ctx.message?.from?.id;
		if (!userId) {
			return ctx.reply('Invalid user ID');
		}
		
		if (isAuthorized(userId)) {
			await next();
			return;
		} else {
			return ctx.reply(
				`You are not allowed to use this bot! Contact the Dev @https://t.me/The_Bug_Around`
			);
		}
	} catch (error) {
		console.log(`Error in Telegram Bot user Auth:`, error);
	}
});

export const tgMessage = async (message: string, photoBuffer?: Buffer) => {
	try {
		const randomIndex = Math.floor(Math.random() * 3) + 1;
		console.log('Random Index:', randomIndex);

		const randomImage = bufferImage(`../images/img${randomIndex}.png`);

		if (!config.TELEGRAM.CHAT_ID) {
			throw new Error('Telegram chat ID not found');
		}

		const frtedMsg = normalizeMessage(message);
		const photo = photoBuffer ? photoBuffer : randomImage;

		const msg = await bot.telegram
			.sendPhoto(
				config.TELEGRAM.CHAT_ID,
				{ source: photo! },
				{
					caption: frtedMsg,
					parse_mode: 'MarkdownV2',
				}
			)
			.then(() => {
				console.log('Message sent successfully');
				return 'Message sent successfully';
			})
			.catch((error: any) => {
				// ERROR HANDLING
				console.log('Error sending message:', error);
				const errorCode = error.response?.error_code;
				const errorDescription = error.response?.description;

				if (errorCode === 400 && errorDescription === 'Bad Request: chat not found') {
					console.error('Chat not found. User has not started the bot yet');
					return 'Chat not found';
				} else if (errorCode === 400 && errorDescription.includes("can't parse entities")) {
					console.error('Message contains invalid entities');
					return 'Message contains invalid entities';
				} else {
					console.error('Error sending message:', error.message || errorDescription);
					return 'Error sending message';
				}
			});
		return msg;
	} catch (error) {
		console.log('Error sending message with photo', error);
		return error;
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

// LOAD Image to Buffer

const bufferImage = (imagePath: string) => {
	try {
		const image = fs.readFileSync(path.resolve(__dirname, imagePath));
		console.log('Image loaded to buffer:', image);
		return image;
	} catch (error) {
		console.log('Error loading image:', error);
		return null;
	}
};
