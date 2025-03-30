import mongoose, { Document } from 'mongoose';
import { TokenomicsAnalysis } from '../types/tokenomics';

export interface ITokenomicsAnalysis extends Document, TokenomicsAnalysis {}

const TokenomicsAnalysisSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true },
    buyTax: { type: Number, required: true },
    sellTax: { type: Number, required: true },
    maxTransactionAmount: { type: String, required: true }, // Store as string for bigint
    maxWalletAmount: { type: String, required: true }, // Store as string for bigint
    antiWhale: { type: Boolean, required: true },
    antiWhaleMechanisms: [{ type: String }],
    burnMechanism: { type: Boolean, required: true },
    burnAddress: { type: String },
    burnRate: { type: Number },
    totalBurned: { type: String }, // Store as string for bigint
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update updatedAt timestamp before saving
TokenomicsAnalysisSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export const TokenomicsAnalysisModel = mongoose.model<ITokenomicsAnalysis>('TokenomicsAnalysis', TokenomicsAnalysisSchema); 