"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
async function connectDB() {
    try {
        await mongoose_1.default.connect(config_1.config.MONGODB_URI || '');
        logger_1.logger.info('Connected to MongoDB');
    }
    catch (error) {
        logger_1.logger.error('MongoDB connection error:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=database.js.map