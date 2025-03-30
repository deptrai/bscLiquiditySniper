"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramMessage = sendTelegramMessage;
const config_1 = require("../config");
async function sendTelegramMessage(message) {
    try {
        if (!config_1.config.TELEGRAM.BOT_TOKEN || !config_1.config.TELEGRAM.CHAT_ID) {
            console.error('Telegram configuration is missing');
            return;
        }
        const response = await fetch(`https://api.telegram.org/bot${config_1.config.TELEGRAM.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: config_1.config.TELEGRAM.CHAT_ID,
                text: message,
                parse_mode: 'HTML',
            }),
        });
        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }
    }
    catch (error) {
        console.error('Error sending Telegram message:', error);
        throw error;
    }
}
//# sourceMappingURL=telegram.js.map