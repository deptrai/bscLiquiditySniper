"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const ethers_1 = require("ethers");
const dotenv_1 = __importDefault(require("dotenv"));
const providerPool_1 = require("./providerPool");
dotenv_1.default.config();
// Validate environment variables
const requiredEnvVars = [
    'RPC_URL',
    'WSS_URL',
    'SECRET_KEY',
    'MONGODB_URI',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID'
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}
// Validate V2_ROUTER
const V2_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
if (!V2_ROUTER) {
    throw new Error('V2 Router address is required');
}
// Initialize providers
const httpProviders = [new ethers_1.ethers.JsonRpcProvider(process.env.RPC_URL)];
const wssProviders = [new ethers_1.ethers.WebSocketProvider(process.env.WSS_URL || '')];
// Initialize provider pools
const httpProviderPool = new providerPool_1.HttpProviderPool(httpProviders);
const wssProviderPool = new providerPool_1.WssProviderPool(wssProviders);
// Export configuration
exports.config = {
    PROVIDER: httpProviders[0],
    WSS_PROVIDER_POOL: wssProviderPool,
    HTTP_PROVIDER_POOL: httpProviderPool,
    RPC_URL: process.env.RPC_URL,
    WSS_URL: process.env.WSS_URL,
    PANCAKESWAP: {
        V2_ROUTER,
        V3_ROUTER: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
        V2_FACTORY: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        V3_FACTORY: '0x0BFbCF4fa2dEEaC5e3a1A5E6E5B0f0a5E6E5B0f0',
        V2_FILTER: {
            fromBlock: 0,
            toBlock: 'latest'
        },
        V3_FILTER: {
            fromBlock: 0,
            toBlock: 'latest'
        }
    },
    APP: {
        PORT: process.env.PORT || 3000,
        NODE_ENV: process.env.NODE_ENV || 'development'
    },
    WALLET: {
        secretKey: process.env.SECRET_KEY
    },
    TELEGRAM: {
        BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        CHAT_ID: process.env.TELEGRAM_CHAT_ID
    },
    TOKENS_TO_WATCH: [
        '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', // CAKE
        '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH
        '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', // USDC
        '0x55d398326f99059fF775485246999027B3197955', // USDT
        '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', // BTCB
        '0x0D8Ce2A99Bb6e3A7L3aD3F3Df3a7L3aD3F3Df3a7' // BUSD
    ],
    MONGODB_URI: process.env.MONGODB_URI
};
