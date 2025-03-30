"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Token = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const tokenSchema = new mongoose_1.default.Schema({
    address: {
        type: String,
        required: true,
        unique: true
    },
    symbol: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    decimals: {
        type: Number,
        required: true
    },
    totalSupply: {
        type: String,
        default: '0'
    },
    owner: {
        type: String,
        default: ''
    },
    pools: [{
            address: String,
            type: {
                type: String,
                enum: ['V2', 'V3']
            },
            tokenA: {
                type: String,
                ref: 'Token'
            },
            tokenB: {
                type: String,
                ref: 'Token'
            },
            fee: {
                type: Number,
                default: 0
            },
            createdAt: {
                type: Date,
                default: Date.now
            },
            blockNumber: Number,
            transactionHash: String
        }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});
exports.Token = mongoose_1.default.model('Token', tokenSchema);
//# sourceMappingURL=Token.js.map