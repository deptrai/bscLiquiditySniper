import mongoose, { Document } from 'mongoose';
import { LiquidityAnalysis } from '../types/liquidity';

export interface ILiquidityAnalysis extends Document, LiquidityAnalysis {}

const LiquidityAnalysisSchema = new mongoose.Schema<ILiquidityAnalysis>({
    address: { type: String, required: true, index: true },
    pairAddress: { type: String, required: true },
    token0Address: { type: String, required: true },
    token1Address: { type: String, required: true },
    token0Symbol: { type: String, required: true },
    token1Symbol: { type: String, required: true },
    liquidityLocked: { type: Boolean, required: true },
    lockContract: { type: String },
    lockAmount: { type: String, required: true }, // Store as string since it's bigint
    lockPercentage: { type: Number, required: true },
    lockEndTime: { type: Date },
    lockStartTime: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
LiquidityAnalysisSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export const LiquidityAnalysisModel = mongoose.model<ILiquidityAnalysis>('LiquidityAnalysis', LiquidityAnalysisSchema); 