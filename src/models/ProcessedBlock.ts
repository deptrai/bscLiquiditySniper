import mongoose from 'mongoose';

const processedBlockSchema = new mongoose.Schema({
    blockNumber: {
        type: Number,
        required: true,
        unique: true
    },
    processedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        required: true
    }
});

export const ProcessedBlock = mongoose.model('ProcessedBlock', processedBlockSchema); 