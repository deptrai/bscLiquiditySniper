import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenPrice extends Document {
    tokenAddress: string;
    pairAddress: string;
    price: number;
    priceUSD: number;
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
}

const tokenPriceSchema = new Schema<ITokenPrice>({
    tokenAddress: { type: String, required: true, index: true },
    pairAddress: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    priceUSD: { type: Number, required: true },
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
    tickUpper: { type: Number }
});

// Indexes
tokenPriceSchema.index({ tokenAddress: 1, timestamp: -1 });
tokenPriceSchema.index({ pairAddress: 1, timestamp: -1 });
tokenPriceSchema.index({ blockNumber: -1 });

export const TokenPrice = mongoose.model<ITokenPrice>('TokenPrice', tokenPriceSchema); 