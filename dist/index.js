"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const db_1 = require("./db");
const fetchHistoricalLiquidity_1 = require("./scripts/fetchHistoricalLiquidity");
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const telegram_1 = require("./utils/telegram");
// Khởi tạo express app
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(routes_1.appRouter);
// Hàm khởi động server
async function startServer() {
    const port = config_1.config.APP.PORT || 3000;
    return app.listen(port, () => {
        console.log(`Server started on port ${port}`);
    });
}
async function main() {
    try {
        // Connect to MongoDB
        await (0, db_1.connectDB)();
        console.log('Connected to MongoDB');
        // Fetch historical liquidity events
        await (0, fetchHistoricalLiquidity_1.fetchHistoricalLiquidity)();
        console.log('Fetched historical liquidity events');
        // Start server
        await startServer();
        console.log('Server started successfully');
        // Send Telegram notification
        await (0, telegram_1.sendTelegramMessage)('Bot started successfully');
    }
    catch (error) {
        console.error('Error starting bot:', error);
        try {
            await (0, telegram_1.sendTelegramMessage)(`Error starting bot: ${error}`);
        }
        catch (telegramError) {
            console.error('Error sending Telegram message:', telegramError);
        }
        process.exit(1);
    }
}
main();
