"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessedBlock = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const processedBlockSchema = new mongoose_1.default.Schema({
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
exports.ProcessedBlock = mongoose_1.default.model('ProcessedBlock', processedBlockSchema);
//# sourceMappingURL=ProcessedBlock.js.map