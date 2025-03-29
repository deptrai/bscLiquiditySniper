"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenHistory = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const tokenInfoSchema = new mongoose_1.default.Schema({
    address: String,
    symbol: String,
    amount: String,
    decimals: Number,
    name: String
});
const tokenHistorySchema = new mongoose_1.default.Schema({
    tokenA: tokenInfoSchema,
    tokenB: tokenInfoSchema,
    version: {
        type: String,
        enum: ['V2', 'V3']
    },
    transactionHash: String,
    createdAt: {
        type: Date,
        default: Date.now
    },
    blockNumber: Number,
    pairAddress: String,
    poolAddress: String,
    fee: Number,
    tickLower: Number,
    tickUpper: Number
});
exports.TokenHistory = mongoose_1.default.model('TokenHistory', tokenHistorySchema);
