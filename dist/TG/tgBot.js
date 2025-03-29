"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tgMessage = void 0;
const telegraf_1 = require("telegraf");
const config_1 = require("../config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
if (!config_1.config.TELEGRAM.BOT_TOKEN) {
    throw new Error('Telegram bot token not found');
}
console.log(`*****`.repeat(5));
console.log(`TG BscLiquiditySniper Bot Notifications Started at: ${new Date().toLocaleTimeString()}`);
const bot = new telegraf_1.Telegraf(config_1.config.TELEGRAM.BOT_TOKEN);
// Kiểm tra người dùng được phép
const isAuthorized = (userId) => {
    if (!config_1.config.TELEGRAM.CHAT_ID) {
        return false;
    }
    return config_1.config.TELEGRAM.CHAT_ID.toString() === userId.toString();
};
bot.use(async (ctx, next) => {
    try {
        const userId = ctx.message?.from?.id;
        if (!userId) {
            return ctx.reply('Invalid user ID');
        }
        if (isAuthorized(userId)) {
            await next();
            return;
        }
        else {
            return ctx.reply(`You are not allowed to use this bot! Contact the Dev @https://t.me/The_Bug_Around`);
        }
    }
    catch (error) {
        console.log(`Error in Telegram Bot user Auth:`, error);
    }
});
const tgMessage = async (message, photoBuffer) => {
    try {
        const randomIndex = Math.floor(Math.random() * 3) + 1;
        console.log('Random Index:', randomIndex);
        const randomImage = bufferImage(`../images/img${randomIndex}.png`);
        if (!config_1.config.TELEGRAM.CHAT_ID) {
            throw new Error('Telegram chat ID not found');
        }
        const frtedMsg = normalizeMessage(message);
        const photo = photoBuffer ? photoBuffer : randomImage;
        const msg = await bot.telegram
            .sendPhoto(config_1.config.TELEGRAM.CHAT_ID, { source: photo }, {
            caption: frtedMsg,
            parse_mode: 'MarkdownV2',
        })
            .then(() => {
            console.log('Message sent successfully');
            return 'Message sent successfully';
        })
            .catch((error) => {
            // ERROR HANDLING
            console.log('Error sending message:', error);
            const errorCode = error.response?.error_code;
            const errorDescription = error.response?.description;
            if (errorCode === 400 && errorDescription === 'Bad Request: chat not found') {
                console.error('Chat not found. User has not started the bot yet');
                return 'Chat not found';
            }
            else if (errorCode === 400 && errorDescription.includes("can't parse entities")) {
                console.error('Message contains invalid entities');
                return 'Message contains invalid entities';
            }
            else {
                console.error('Error sending message:', error.message || errorDescription);
                return 'Error sending message';
            }
        });
        return msg;
    }
    catch (error) {
        console.log('Error sending message with photo', error);
        return error;
    }
};
exports.tgMessage = tgMessage;
const normalizeMessage = (message) => {
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
const bufferImage = (imagePath) => {
    try {
        const image = fs_1.default.readFileSync(path_1.default.resolve(__dirname, imagePath));
        console.log('Image loaded to buffer:', image);
        return image;
    }
    catch (error) {
        console.log('Error loading image:', error);
        return null;
    }
};
