"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const ERC20_ABI = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address,address) view returns (uint256)'
];
class TokenService {
    constructor(provider) {
        this.provider = provider;
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
        this.tokenCache = new Map();
        this.pairCache = new Map();
    }
    static getInstance(provider) {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService(provider);
        }
        return TokenService.instance;
    }
    async getToken(address) {
        // Check cache first
        const cachedToken = this.tokenCache.get(address);
        if (cachedToken) {
            return cachedToken;
        }
        try {
            const tokenContract = new ethers_1.ethers.Contract(address, [
                'function name() view returns (string)',
                'function symbol() view returns (string)',
                'function decimals() view returns (uint8)',
                'function totalSupply() view returns (uint256)'
            ], this.provider.getProvider());
            const [name, symbol, decimals, totalSupply] = await Promise.all([
                tokenContract.name(),
                tokenContract.symbol(),
                tokenContract.decimals(),
                tokenContract.totalSupply()
            ]);
            const token = {
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
        }
        catch (error) {
            logger_1.logger.error(`Error fetching token ${address}:`, error);
            throw error;
        }
    }
    async getPair(pairAddress, dex) {
        // Check cache first
        const cachedPair = this.pairCache.get(pairAddress);
        if (cachedPair) {
            return cachedPair;
        }
        try {
            const pairContract = new ethers_1.ethers.Contract(pairAddress, [
                'function token0() view returns (address)',
                'function token1() view returns (address)',
                'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
                'function totalSupply() view returns (uint256)'
            ], this.provider.getProvider());
            const [token0Address, token1Address, reserves] = await Promise.all([
                pairContract.token0(),
                pairContract.token1(),
                pairContract.getReserves()
            ]);
            const [token0, token1] = await Promise.all([
                this.getToken(token0Address),
                this.getToken(token1Address)
            ]);
            const pair = {
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
        }
        catch (error) {
            logger_1.logger.error(`Error fetching pair ${pairAddress}:`, error);
            throw error;
        }
    }
    async updateTokenStats(address) {
        try {
            const token = await this.getToken(address);
            // TODO: Implement stats update logic
            token.updatedAt = new Date();
            this.tokenCache.set(address, token);
        }
        catch (error) {
            logger_1.logger.error(`Error updating token stats for ${address}:`, error);
            throw error;
        }
    }
    async updatePairStats(pairAddress) {
        try {
            const pair = await this.getPair(pairAddress, ''); // TODO: Get DEX from pair
            // TODO: Implement stats update logic
            pair.updatedAt = new Date();
            this.pairCache.set(pairAddress, pair);
        }
        catch (error) {
            logger_1.logger.error(`Error updating pair stats for ${pairAddress}:`, error);
            throw error;
        }
    }
    // Clean up expired cache entries
    cleanupCache() {
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
    async getTokenInfo(address, amount = '0') {
        try {
            const token = await this.getToken(address);
            const contract = new ethers_1.ethers.Contract(address, ERC20_ABI, this.provider.getProvider());
            // Get balance and allowance
            const [balance, allowance] = await Promise.all([
                contract.balanceOf(address),
                contract.allowance(address, config_1.config.DEX_ADDRESSES.PANCAKESWAP.V2_ROUTER || '')
            ]);
            // TODO: Implement price calculation
            const price = 0;
            const value = Number(amount) * price;
            const tokenInfo = {
                address: token.address,
                symbol: token.symbol,
                decimals: token.decimals,
                name: token.name,
                amount,
                balance,
                allowance,
                price,
                value
            };
            return tokenInfo;
        }
        catch (error) {
            logger_1.logger.error(`Error fetching token info for ${address}:`, error);
            throw error;
        }
    }
    async getTokenAmount(address, owner) {
        try {
            const contract = new ethers_1.ethers.Contract(address, ERC20_ABI, this.provider.getProvider());
            const balance = await contract.balanceOf(owner);
            return balance.toString();
        }
        catch (error) {
            logger_1.logger.error(`Error fetching token amount for ${address}:`, error);
            throw error;
        }
    }
    clearCache() {
        this.tokenCache.clear();
        this.pairCache.clear();
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=tokenService.js.map