import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenLiquidity extends Document {
    tokenAddress: string;
    pairAddress: string;
    liquidity: number;
    liquidityUSD: number;
    timestamp: Date;
    blockNumber: number;
    version: 'v2' | 'v3';
    token0Reserve: string;
    token1Reserve: string;
    token0Decimals: number;
    token1Decimals: number;
    token0Symbol: string;
    token1Symbol: string;
    fee?: number;
    tickLower?: number;
    tickUpper?: number;
    sqrtPriceX96?: string;
    liquidityX96?: string;
}

const tokenLiquiditySchema = new Schema<ITokenLiquidity>({
    tokenAddress: { type: String, required: true, index: true },
    pairAddress: { type: String, required: true, index: true },
    liquidity: { type: Number, required: true },
    liquidityUSD: { type: Number, required: true },
    timestamp: { type: Date, required: true, index: true },
    blockNumber: { type: Number, required: true, index: true },
    version: { type: String, enum: ['v2', 'v3'], required: true },
    token0Reserve: { type: String, required: true },
    token1Reserve: { type: String, required: true },
    token0Decimals: { type: Number, required: true },
    token1Decimals: { type: Number, required: true },
    token0Symbol: { type: String, required: true },
    token1Symbol: { type: String, required: true },
    fee: { type: Number },
    tickLower: { type: Number },
    tickUpper: { type: Number },
    sqrtPriceX96: { type: String },
    liquidityX96: { type: String }
});

// Indexes
tokenLiquiditySchema.index({ tokenAddress: 1, timestamp: -1 });
tokenLiquiditySchema.index({ pairAddress: 1, timestamp: -1 });
tokenLiquiditySchema.index({ blockNumber: -1 });

export const TokenLiquidity = mongoose.model<ITokenLiquidity>('TokenLiquidity', tokenLiquiditySchema); 