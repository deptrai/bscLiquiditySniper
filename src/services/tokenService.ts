import { ethers } from 'ethers';
import { config } from '../config';
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
        // Check cache first
        if (this.tokenCache.has(address)) {
            const cachedInfo = this.tokenCache.get(address)!;
            return {
                ...cachedInfo,
                amount
            };
        }

        try {
            const contract = new ethers.Contract(address, ERC20_ABI, config.PROVIDER);
            const [symbol, decimals, name] = await Promise.all([
                contract.symbol(),
                contract.decimals(),
                contract.name()
            ]);

            const tokenInfo: TokenInfo = {
                address,
                symbol,
                amount,
                decimals,
                name
            };

            // Cache the token info
            this.tokenCache.set(address, tokenInfo);

            return tokenInfo;
        } catch (error) {
            console.error(`Error fetching token info for ${address}:`, error);
            throw error;
        }
    }

    public async getTokenAmount(address: string, owner: string): Promise<string> {
        try {
            const contract = new ethers.Contract(address, ERC20_ABI, config.PROVIDER);
            const balance = await contract.balanceOf(owner);
            return balance.toString();
        } catch (error) {
            console.error(`Error fetching token amount for ${address}:`, error);
            throw error;
        }
    }

    public clearCache() {
        this.tokenCache.clear();
    }
} 