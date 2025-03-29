import mongoose from 'mongoose';
import { TokenInfo } from '../types/token';

const tokenInfoSchema = new mongoose.Schema({
    address: String,
    symbol: String,
    amount: String,
    decimals: Number,
    name: String
});

const tokenHistorySchema = new mongoose.Schema({
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

export const TokenHistory = mongoose.model('TokenHistory', tokenHistorySchema); 