import mongoose, { Schema, Document } from 'mongoose';

export interface ITokenMetadata extends Document {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    owner: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    github?: string;
    logo?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    lastPrice?: number;
    lastPriceUSD?: number;
    marketCap?: number;
    volume24h?: number;
    holders?: number;
    verified?: boolean;
}

const tokenMetadataSchema = new Schema<ITokenMetadata>({
    address: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    decimals: { type: Number, required: true },
    totalSupply: { type: String, required: true },
    owner: { type: String, required: true },
    website: { type: String },
    twitter: { type: String },
    telegram: { type: String },
    discord: { type: String },
    github: { type: String },
    logo: { type: String },
    description: { type: String },
    createdAt: { type: Date, required: true, default: Date.now },
    updatedAt: { type: Date, required: true, default: Date.now },
    lastPrice: { type: Number },
    lastPriceUSD: { type: Number },
    marketCap: { type: Number },
    volume24h: { type: Number },
    holders: { type: Number },
    verified: { type: Boolean, default: false }
});

// Indexes
tokenMetadataSchema.index({ symbol: 1 });
tokenMetadataSchema.index({ createdAt: -1 });
tokenMetadataSchema.index({ updatedAt: -1 });

// Update timestamp on save
tokenMetadataSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export const TokenMetadata = mongoose.model<ITokenMetadata>('TokenMetadata', tokenMetadataSchema); 