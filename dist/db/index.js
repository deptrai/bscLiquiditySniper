"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("../config");
let isConnected = false;
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds
const connectDB = async () => {
    try {
        if (!config_1.config.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }
        await mongoose_1.default.connect(config_1.config.MONGODB_URI);
        console.log('Connected to MongoDB');
    }
    catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
};
exports.connectDB = connectDB;
// Handle MongoDB connection errors
mongoose_1.default.connection.on('error', (error) => {
    console.error('MongoDB connection error:', error);
    isConnected = false;
});
mongoose_1.default.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
    isConnected = false;
});
mongoose_1.default.connection.on('connected', () => {
    console.log('MongoDB connected');
    isConnected = true;
});
