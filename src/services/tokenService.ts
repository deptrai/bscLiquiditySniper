import { ethers } from 'ethers';
import { config, getProviders } from '../config';
import { logger } from '../utils/logger';
import { TokenInfo, Token, TokenPair } from '../types/token';
import { ProviderPool } from './providerPool';
import { sleep } from '../utils/helper';

const ERC20_ABI = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)'
];

export class TokenService {
    private static instance: TokenService;
    private tokenCache: Map<string, Token>;
    private pairCache: Map<string, TokenPair>;
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private constructor(private provider: ProviderPool) {
        this.tokenCache = new Map();
        this.pairCache = new Map();
    }

    public static getInstance(provider: ProviderPool): TokenService {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService(provider);
        }
        return TokenService.instance;
    }

    async getToken(address: string): Promise<Token> {
        // Check cache first
        const cachedToken = this.tokenCache.get(address);
        if (cachedToken) {
            return cachedToken;
        }

        try {
            const tokenContract = new ethers.Contract(
                address,
                [
                    'function name() view returns (string)',
                    'function symbol() view returns (string)',
                    'function decimals() view returns (uint8)',
                    'function totalSupply() view returns (uint256)'
                ],
                this.provider.getProvider()
            );

            const [name, symbol, decimals, totalSupply] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol(),
                tokenContract.decimals(),
                tokenContract.totalSupply()
            ]);

            const token: Token = {
                address,
                name,
                symbol,
                decimals,
                totalSupply,
                owner: '0x0000000000000000000000000000000000000000', // Default to zero address
                isVerified: false, // TODO: Implement verification check
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Cache the token
            this.tokenCache.set(address, token);

            return token;
        } catch (error) {
            logger.error(`Error fetching token ${address}:`, error);
            throw error;
        }
    }

    async getPair(pairAddress: string, dex: string): Promise<TokenPair> {
        // Check cache first
        const cachedPair = this.pairCache.get(pairAddress);
        if (cachedPair) {
            return cachedPair;
        }

        try {
            const pairContract = new ethers.Contract(
                pairAddress,
                [
                    'function token0() view returns (address)',
                    'function token1() view returns (address)',
                    'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                    'function totalSupply() view returns (uint256)'
                ],
                this.provider.getProvider()
            );

            const [token0Address, token1Address, reserves] = await Promise.all([
                pairContract.token0(),
                pairContract.token1(),
                pairContract.getReserves()
            ]);

            const [token0, token1] = await Promise.all([
                this.getToken(token0Address),
                this.getToken(token1Address)
            ]);

            const pair: TokenPair = {
                token0,
                token1,
                pairAddress,
                dex,
                createdAt: new Date(),
                updatedAt: new Date(),
                liquidity: {
                    token0: reserves.reserve0,
                    token1: reserves.reserve1,
                    usd: 0 // TODO: Calculate USD value
                },
                volume24h: BigInt(0), // TODO: Implement volume tracking
                price: 0, // TODO: Calculate price
                priceChange24h: 0 // TODO: Calculate price change
            };

            // Cache the pair
            this.pairCache.set(pairAddress, pair);

            return pair;
        } catch (error) {
            logger.error(`Error fetching pair ${pairAddress}:`, error);
            throw error;
        }
    }

    async updateTokenStats(address: string): Promise<void> {
        try {
            const token = await this.getToken(address);
            // TODO: Implement stats update logic
            token.updatedAt = new Date();
            this.tokenCache.set(address, token);
        } catch (error) {
            logger.error(`Error updating token stats for ${address}:`, error);
            throw error;
        }
    }

    async updatePairStats(pairAddress: string): Promise<void> {
        try {
            const pair = await this.getPair(pairAddress, ''); // TODO: Get DEX from pair
            // TODO: Implement stats update logic
            pair.updatedAt = new Date();
            this.pairCache.set(pairAddress, pair);
        } catch (error) {
            logger.error(`Error updating pair stats for ${pairAddress}:`, error);
            throw error;
        }
    }

    // Clean up expired cache entries
    private cleanupCache(): void {
        const now = Date.now();
        for (const [address, token] of this.tokenCache.entries()) {
            if (now - token.updatedAt.getTime() > this.CACHE_TTL) {
                this.tokenCache.delete(address);
            }
        }
        for (const [address, pair] of this.pairCache.entries()) {
            if (now - pair.updatedAt.getTime() > this.CACHE_TTL) {
                this.pairCache.delete(address);
            }
        }
    }

    public async getTokenInfo(address: string, amount: string = '0'): Promise<TokenInfo> {
        try {
            // Check cache first
            if (this.tokenCache.has(address)) {
                const cachedInfo = this.tokenCache.get(address)!;
                return {
                    ...cachedInfo,
                    amount,
                    balance: BigInt(0),
                    allowance: BigInt(0),
                    price: 0,
                    value: 0
                };
            }

            const { httpProviderPool } = getProviders();
            const provider = httpProviderPool.getProvider();
            
            // Add retry logic for rate limits
            let retries = 0;
            const maxRetries = 3;
            
            while (retries < maxRetries) {
                try {
                    const contract = new ethers.Contract(address, ERC20_ABI, provider);
                    const [symbol, decimals, name, balance, allowance] = await Promise.all([
                        contract.symbol(),
                        contract.decimals(),
                        contract.name(),
                        contract.balanceOf(address),
                        contract.allowance(address, config.DEX_ADDRESSES.PANCAKESWAP.V2_ROUTER || '')
                    ]);

                    const tokenInfo: TokenInfo = {
                        address,
                        symbol,
                        decimals: Number(decimals),
                        name,
                        amount,
                        balance: BigInt(balance),
                        allowance: BigInt(allowance),
                        price: 0, // TODO: Implement price calculation
                        value: 0  // TODO: Implement value calculation
                    };

                    // Cache the token info
                    this.tokenCache.set(address, {
                        address,
                        symbol,
                        decimals: Number(decimals),
                        name,
                        totalSupply: BigInt(0),
                        owner: '0x0000000000000000000000000000000000000000',
                        isVerified: false,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                    return tokenInfo;
                } catch (error: any) {
                    if (error.info?.error?.code === -32007) {
                        retries++;
                        if (retries < maxRetries) {
                            logger.info(`Rate limit hit, retrying (${retries}/${maxRetries})...`);
                            await sleep(1000); // Wait 1 second before retry
                            continue;
                        }
                    }
                    throw error;
                }
            }
            
            throw new Error('Max retries reached for token info fetch');
        } catch (error) {
            logger.error(`Error fetching token info for ${address}:`, error);
            throw error;
        }
    }

    public async getTokenAmount(address: string, owner: string): Promise<string> {
        try {
            const contract = new ethers.Contract(address, ERC20_ABI, this.provider.getProvider());
            const balance = await contract.balanceOf(owner);
            return balance.toString();
        } catch (error) {
            logger.error(`Error fetching token amount for ${address}:`, error);
            throw error;
        }
    }

    public clearCache(): void {
        this.tokenCache.clear();
        this.pairCache.clear();
    }
} 