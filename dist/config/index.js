"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.initialize = initialize;
exports.getProviders = getProviders;
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
// DEX Addresses
const DEX_ADDRESSES = {
    PANCAKESWAP: {
        V2_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        V3_ROUTER: '0x13f4EA83D0bd40E75C822D5FcB2D585c699aAd94',
        V2_FACTORY: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
        V3_FACTORY: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
        SMART_ROUTER: '0x13f4EA83D0bd40E75C822D5FcB2D585c699aAd94'
    },
    BISWAP: {
        ROUTER: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
        FACTORY: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE'
    },
    MDEX: {
        ROUTER: '0x3CD1C46068dAEa5Eab0A3c2Af9b8cd7F56E7B4Ca',
        FACTORY: '0x0dFee1e4D7f2E10D9043B97d9b56A41f83901d54'
    },
    BABYSWAP: {
        ROUTER: '0x325E343f1dE2263961D3D6cB1c7B9563cF4Dc3B1',
        FACTORY: '0x86407bEa2078ea5f5EB5A52B2caA963bC1F889Da'
    },
    APESWAP: {
        ROUTER: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
        FACTORY: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6'
    },
    JULSWAP: {
        ROUTER: '0xbd67d157502A23309Db761c41965600c2c788895',
        FACTORY: '0x553990F2CbA90260AcD95372F6A7E9A01dEe78Fd'
    },
    BAKERYSWAP: {
        ROUTER: '0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F',
        FACTORY: '0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7'
    },
    KNIGHTSWAP: {
        ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
    },
    WAULTSWAP: {
        ROUTER: '0xD48745E39BbED76e7c0917839A6B7d9A2Bc2015d',
        FACTORY: '0xB42E3FE66B1BDc3857413c73daDFa5bDc9152873'
    }
};
// Wrapped BNB address
const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
// Method IDs for Smart Router functions
const SMART_ROUTER_METHODS = {
    buyMemeToken: '0x' + ethers_1.ethers.id('buyMemeToken(address,address,address,uint256,uint256)').slice(0, 8),
    swapV3ExactIn: '0x' + ethers_1.ethers.id('swapV3ExactIn(tuple(address,address,address,address,uint256,address,uint256,uint256,uint256,uint256))').slice(0, 8)
};
// Event filters for V2 and V3
const V2_FILTER = {
    address: DEX_ADDRESSES.PANCAKESWAP.V2_FACTORY,
    topics: [
        ethers_1.ethers.id('PairCreated(address,address,address,uint256)')
    ],
    fromBlock: 0,
    toBlock: 'latest'
};
const V3_FILTER = {
    address: DEX_ADDRESSES.PANCAKESWAP.V3_FACTORY,
    topics: [
        ethers_1.ethers.id('PoolCreated(address,address,uint24,uint24,address)')
    ],
    fromBlock: 0,
    toBlock: 'latest'
};
// Smart Router filter
const SMART_ROUTER_FILTER = {
    address: DEX_ADDRESSES.PANCAKESWAP.SMART_ROUTER,
    topics: [
        SMART_ROUTER_METHODS.buyMemeToken,
        SMART_ROUTER_METHODS.swapV3ExactIn
    ],
    fromBlock: 0,
    toBlock: 'latest'
};
// Function to check if a provider is working
async function checkProvider(provider) {
    try {
        const blockNumber = await provider.getBlockNumber();
        console.log(`Provider is working, current block: ${blockNumber}`);
        return true;
    }
    catch (error) {
        console.error('Provider check failed:', error);
        return false;
    }
}
// Function to initialize providers
async function initializeProviders() {
    const rpcUrls = process.env.RPC_URL?.split(',').map(url => url.trim()).filter(url => url) || [];
    if (rpcUrls.length === 0) {
        throw new Error('No valid RPC URLs found');
    }
    console.log(`Initializing ${rpcUrls.length} RPC providers...`);
    // Initialize and check providers
    const httpProviders = [];
    for (const url of rpcUrls) {
        try {
            console.log(`Initializing provider: ${url}`);
            const provider = new ethers_1.ethers.JsonRpcProvider(url);
            const isWorking = await checkProvider(provider);
            if (isWorking) {
                console.log(`Provider ${url} is working`);
                httpProviders.push(provider);
            }
            else {
                console.log(`Provider ${url} is not working`);
            }
        }
        catch (error) {
            console.error(`Failed to initialize provider for URL: ${url}`, error);
        }
    }
    if (httpProviders.length === 0) {
        throw new Error('Failed to initialize any working RPC providers');
    }
    console.log(`Successfully initialized ${httpProviders.length} working RPC providers`);
    const wssProviders = [new ethers_1.ethers.WebSocketProvider(process.env.WSS_URL || '')];
    // Initialize provider pools
    const httpProviderPool = new providerPool_1.HttpProviderPool(httpProviders);
    const wssProviderPool = new providerPool_1.WssProviderPool(wssProviders);
    return {
        httpProviderPool,
        wssProviderPool,
        httpProviders
    };
}
// Initialize providers and export them
let initializedProviders = null;
async function initialize() {
    if (!initializedProviders) {
        initializedProviders = await initializeProviders();
    }
    return initializedProviders;
}
function getProviders() {
    if (!initializedProviders) {
        throw new Error('Providers not initialized. Call initialize() first.');
    }
    return initializedProviders;
}
// Export configuration
exports.config = {
    DEX_ADDRESSES,
    WBNB,
    SMART_ROUTER_METHODS,
    V2_FILTER,
    V3_FILTER,
    SMART_ROUTER_FILTER,
    SECRET_KEY: process.env.SECRET_KEY || '',
    MONGODB_URI: process.env.MONGODB_URI,
    TELEGRAM: {
        BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        CHAT_ID: process.env.TELEGRAM_CHAT_ID
    },
    APP: {
        PORT: process.env.PORT || 3000,
        NODE_ENV: process.env.NODE_ENV || 'development'
    },
    RPC: {
        QUICKNODE: process.env.QUICKNODE_URL || 'https://bsc-dataseed1.binance.org',
        INFURA: process.env.INFURA_URL || 'https://bsc-dataseed2.binance.org'
    }
};
//# sourceMappingURL=index.js.map