import mongoose, { Document } from 'mongoose';
import { LockContract } from '../types/liquidity';

export interface ILockContract extends Document, LockContract {}

const LockContractSchema = new mongoose.Schema<ILockContract>({
    address: { type: String, required: true, index: true },
    tokenAddress: { type: String, required: true },
    pairAddress: { type: String, required: true },
    amount: { type: String, required: true }, // Store as string since it's bigint
    percentage: { type: Number, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    owner: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
LockContractSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export const LockContractModel = mongoose.model<ILockContract>('LockContract', LockContractSchema); 