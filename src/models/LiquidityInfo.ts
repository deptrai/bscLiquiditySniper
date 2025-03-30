import mongoose, { Document } from 'mongoose';
import { LiquidityInfo } from '../types/liquidity';

export interface ILiquidityInfo extends Document, LiquidityInfo {}

const LiquidityInfoSchema = new mongoose.Schema<ILiquidityInfo>({
    token0Amount: { type: String, required: true }, // Store as string since it's bigint
    token1Amount: { type: String, required: true }, // Store as string since it's bigint
    totalLiquidityUSD: { type: Number, required: true },
    token0Price: { type: Number, required: true },
    token1Price: { type: Number, required: true },
    token0Decimals: { type: Number, required: true },
    token1Decimals: { type: Number, required: true },
    token0Symbol: { type: String, required: true },
    token1Symbol: { type: String, required: true },
    pairAddress: { type: String, required: true, index: true },
    token0Address: { type: String, required: true },
    token1Address: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
LiquidityInfoSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export const LiquidityInfoModel = mongoose.model<ILiquidityInfo>('LiquidityInfo', LiquidityInfoSchema); 