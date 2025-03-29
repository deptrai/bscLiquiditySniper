"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const ERC20_ABI = [
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function name() view returns (string)',
    'function balanceOf(address) view returns (uint256)'
];
class TokenService {
    constructor() {
        this.tokenCache = new Map();
    }
    static getInstance() {
        if (!TokenService.instance) {
            TokenService.instance = new TokenService();
        }
        return TokenService.instance;
    }
    async getTokenInfo(address, amount = '0') {
        // Check cache first
        if (this.tokenCache.has(address)) {
            const cachedInfo = this.tokenCache.get(address);
            return {
                ...cachedInfo,
                amount
            };
        }
        try {
            const contract = new ethers_1.ethers.Contract(address, ERC20_ABI, config_1.config.PROVIDER);
            const [symbol, decimals, name] = await Promise.all([
                contract.symbol(),
                contract.decimals(),
                contract.name()
            ]);
            const tokenInfo = {
                address,
                symbol,
                amount,
                decimals,
                name
            };
            // Cache the token info
            this.tokenCache.set(address, tokenInfo);
            return tokenInfo;
        }
        catch (error) {
            console.error(`Error fetching token info for ${address}:`, error);
            throw error;
        }
    }
    async getTokenAmount(address, owner) {
        try {
            const contract = new ethers_1.ethers.Contract(address, ERC20_ABI, config_1.config.PROVIDER);
            const balance = await contract.balanceOf(owner);
            return balance.toString();
        }
        catch (error) {
            console.error(`Error fetching token amount for ${address}:`, error);
            throw error;
        }
    }
    clearCache() {
        this.tokenCache.clear();
    }
}
exports.TokenService = TokenService;
