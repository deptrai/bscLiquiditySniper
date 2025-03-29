import { config } from '../config';

export async function sendTelegramMessage(message: string) {
    try {
        if (!config.TELEGRAM.BOT_TOKEN || !config.TELEGRAM.CHAT_ID) {
            console.error('Telegram configuration is missing');
            return;
        }

        const response = await fetch(
            `https://api.telegram.org/bot${config.TELEGRAM.BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: config.TELEGRAM.CHAT_ID,
                    text: message,
                    parse_mode: 'HTML',
                }),
            }
        );

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error sending Telegram message:', error);
        throw error;
    }
} 