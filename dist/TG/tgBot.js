"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tgMessage = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const TELEGRAM_API_URL = 'https://api.telegram.org/bot';
const tgMessage = async (message) => {
    try {
        if (!config_1.config.TELEGRAM.BOT_TOKEN || !config_1.config.TELEGRAM.CHAT_ID) {
            throw new Error('Telegram bot token or chat ID not found');
        }
        const formattedMsg = normalizeMessage(message);
        const url = `${TELEGRAM_API_URL}${config_1.config.TELEGRAM.BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: config_1.config.TELEGRAM.CHAT_ID,
                text: formattedMsg,
                parse_mode: 'MarkdownV2'
            })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.description || 'Failed to send message');
        }
        logger_1.logger.info('Message sent successfully');
        return 'Message sent successfully';
    }
    catch (error) {
        logger_1.logger.error('Error sending message:', error);
        return 'Error sending message';
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
//# sourceMappingURL=tgBot.js.map