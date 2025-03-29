import { ethers } from 'ethers';
import { config, getProviders } from '../config';
import { logger } from '../utils/logger';
import { TokenInfo } from '../types/token';

const ERC20_ABI = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
    'function balanceOf(address) view returns (uint256)'
];

export class TokenService {
    private static instance: TokenService;
    private tokenCache: Map<string, TokenInfo> = new Map();

    private constructor() {}

    public static getInstance(): TokenService {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService();
        }
        return TokenService.instance;
    }

    public async getTokenInfo(address: string, amount: string = '0'): Promise<TokenInfo> {
        try {
            // Check cache first
            if (this.tokenCache.has(address)) {
                const cachedInfo = this.tokenCache.get(address)!;
                return {
                    ...cachedInfo,
                    amount
                };
            }

            const { httpProviderPool } = getProviders();
            const provider = httpProviderPool.getProvider();
            const contract = new ethers.Contract(address, ERC20_ABI, provider);
            const [symbol, decimals, name] = await Promise.all([
                contract.symbol(),
                contract.decimals(),
                contract.name()
            ]);

            const tokenInfo: TokenInfo = {
                address,
                symbol,
                decimals: Number(decimals), // Convert bigint to number
                name,
                amount
            };

            // Cache the token info
            this.tokenCache.set(address, tokenInfo);

            return tokenInfo;
        } catch (error) {
            logger.error(`Error fetching token info for ${address}:`, error);
            throw error;
        }
    }

    public async getTokenAmount(address: string, owner: string): Promise<string> {
        try {
            const { httpProviderPool } = getProviders();
            const provider = httpProviderPool.getProvider();
            const contract = new ethers.Contract(address, ERC20_ABI, provider);
            const balance = await contract.balanceOf(owner);
            return balance.toString();
        } catch (error) {
            logger.error(`Error fetching token amount for ${address}:`, error);
            throw error;
        }
    }

    public clearCache() {
        this.tokenCache.clear();
    }
} 