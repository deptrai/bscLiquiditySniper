import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { ProviderPool } from './services/providerPool';

// Load environment variables
dotenv.config();

export interface Config {
    VERSION: string;
    MONGO_URI: string;
    TELEGRAM_BOT_TOKEN: string;
    TELEGRAM_CHAT_ID: string;
    HTTP_RPC_URLS: string[];
    WS_RPC_URLS: string[];
    SECRET_KEY: string;
    RPC: {
        QUICKNODE: string;
        INFURA: string;
    };
    APP: {
        PORT: number;
    };
    DEX_ADDRESSES: {
        PANCAKESWAP: {
            V2_FACTORY?: string;
            V2_ROUTER?: string;
            V3_FACTORY?: string;
            V3_ROUTER?: string;
        };
        MDEX: {
            FACTORY?: string;
            ROUTER?: string;
        };
        JULSWAP: {
            FACTORY?: string;
            ROUTER?: string;
        };
        WAULTSWAP: {
            FACTORY?: string;
            ROUTER?: string;
        };
        APESWAP: {
            FACTORY?: string;
            ROUTER?: string;
        };
        BISWAP: {
            FACTORY?: string;
            ROUTER?: string;
        };
        BABYSWAP: {
            FACTORY?: string;
            ROUTER?: string;
        };
        BAKERYSWAP: {
            FACTORY?: string;
            ROUTER?: string;
        };
        KNIGHTSWAP: {
            FACTORY?: string;
            ROUTER?: string;
        };
    };
    SMART_ROUTER_METHODS: {
        buyMemeToken: string;
        swapV3ExactIn: string;
    };
    BSCSCAN_API_KEY: string;
}

// Example config object with dummy values - to be populated from environment variables
export const config: Config = {
    VERSION: '1.0.0',
    MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/bscLiquiditySniper',
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
    HTTP_RPC_URLS: (process.env.RPC_URL || 'https://bsc-dataseed1.binance.org,https://bsc-dataseed2.binance.org').split(','),
    WS_RPC_URLS: process.env.WSS_URL ? [process.env.WSS_URL] : ['wss://bsc-ws-node.nariox.org:443'],
    SECRET_KEY: process.env.SECRET_KEY || '',
    RPC: {
        QUICKNODE: process.env.QUICKNODE_RPC_URL || '',
        INFURA: process.env.INFURA_RPC_URL || ''
    },
    APP: {
        PORT: parseInt(process.env.PORT || '3000', 10)
    },
    DEX_ADDRESSES: {
        PANCAKESWAP: {
            V2_FACTORY: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
            V2_ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
            V3_FACTORY: '0x0BFbCF4fa2d940bAD5F6B38B57F5a1E8610B0f0c',
            V3_ROUTER: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'
        },
        MDEX: {
            FACTORY: '0x3CD1C46068dAEa5Ebb0d3f8F70c410a172CE1d6C',
            ROUTER: '0x0384E9ad329396F3eb5b4F8Dc1481a4be55B2096'
        },
        JULSWAP: {
            FACTORY: '0x553990F2bba902748907B775DBa8B147bAc24c00',
            ROUTER: '0xbd67d4107226f430b1E21D819a34D57B72B8F5f1'
        },
        WAULTSWAP: {
            FACTORY: '0xd7DdECFAf068ca3e0a4bA3652A9ED6D1e20a5071',
            ROUTER: '0x3a1D87f206D12415f5b0A33Ef668Cdd9de27657d'
        },
        APESWAP: {
            FACTORY: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
            ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E'
        },
        BISWAP: {
            FACTORY: '0x858E3312ed3A876947EA49d572A7C42DE08af7EE',
            ROUTER: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8'
        },
        BABYSWAP: {
            FACTORY: '0x86407bEa2078ea5f5EB5A52B2caA963bC1F889Da',
            ROUTER: '0x325E343f1dE6B5F6F4B2B9fB2B3B4B5B6B7B8B9'
        },
        BAKERYSWAP: {
            FACTORY: '0x01bF7C66c6BD861915CdaaE475042d3c4BaE16A7',
            ROUTER: '0xCDe540d7eAFE93aC5fE6233Bee57E1270D3E330F'
        },
        KNIGHTSWAP: {
            FACTORY: '0x8c4b866f3c9f9cc5ef62a3a6ced8f12a0a8a8c8c',
            ROUTER: '0x9d9d9d9d9d9d9d9d9d9d9d9d9d9d9d9d9d9d9d9d'
        }
    },
    SMART_ROUTER_METHODS: {
        buyMemeToken: '0x7ff36ab5',
        swapV3ExactIn: '0x04e45aaf'
    },
    BSCSCAN_API_KEY: process.env.BSCSCAN_API_KEY || 'ZFNKIN5P1VFDA4IPN5NEHD3C7ZGSXZ75FY'
};

// Create provider pools
let httpProviderPool: ProviderPool | null = null;
let wsProviderPool: ProviderPool | null = null;

// Initialize the provider pools
export async function initialize() {
    httpProviderPool = new ProviderPool();
    return { httpProviderPool, wsProviderPool };
}

// Get the provider pools
export function getProviders() {
    if (!httpProviderPool) {
        throw new Error('Provider pools not initialized. Call initialize() first.');
    }
    return { httpProviderPool, wsProviderPool };
} 