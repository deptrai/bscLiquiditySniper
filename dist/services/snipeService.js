"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnipeService = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const tokenService_1 = require("./tokenService");
const PANCAKESWAP_ROUTER_ABI = [
    'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];
class SnipeService {
    constructor() {
        const { httpProviderPool } = (0, config_1.getProviders)();
        const provider = httpProviderPool.getProvider();
        this.router = new ethers_1.ethers.Contract(config_1.config.PANCAKESWAP.V2_ROUTER, PANCAKESWAP_ROUTER_ABI, provider);
        this.tokenService = tokenService_1.TokenService.getInstance();
        this.wallet = new ethers_1.ethers.Wallet(config_1.config.PRIVATE_KEY, provider);
    }
    static getInstance() {
        if (!SnipeService.instance) {
            SnipeService.instance = new SnipeService();
        }
        return SnipeService.instance;
    }
    async snipeToken(tokenAddress, amountInETH = '0.1') {
        try {
            // Get token info
            const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
            logger_1.logger.info(`Snipping token: ${tokenInfo.symbol} (${tokenAddress})`);
            // Convert ETH amount to Wei
            const amountInWei = ethers_1.ethers.parseEther(amountInETH);
            // Prepare transaction
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
            const path = [config_1.config.WBNB, tokenAddress];
            const amountOutMin = 0; // No slippage protection for now
            // Create transaction
            const tx = await this.router.swapExactETHForTokens(amountOutMin, path, this.wallet.address, deadline, {
                value: amountInWei,
                gasLimit: 300000
            });
            // Wait for transaction
            const receipt = await tx.wait();
            logger_1.logger.info(`Snipe transaction successful: ${receipt.hash}`);
            return receipt;
        }
        catch (error) {
            logger_1.logger.error(`Error sniping token ${tokenAddress}:`, error);
            throw error;
        }
    }
    async sellToken(tokenAddress, amount) {
        try {
            // Get token info
            const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
            logger_1.logger.info(`Selling token: ${tokenInfo.symbol} (${tokenAddress})`);
            // Approve router to spend tokens
            const tokenContract = new ethers_1.ethers.Contract(tokenAddress, ['function approve(address spender, uint256 amount) returns (bool)'], this.wallet);
            const approveTx = await tokenContract.approve(config_1.config.PANCAKESWAP.V2_ROUTER, ethers_1.ethers.MaxUint256);
            await approveTx.wait();
            // Prepare transaction
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
            const path = [tokenAddress, config_1.config.WBNB];
            const amountOutMin = 0; // No slippage protection for now
            // Create transaction
            const tx = await this.router.swapExactTokensForETH(amount, amountOutMin, path, this.wallet.address, deadline);
            // Wait for transaction
            const receipt = await tx.wait();
            logger_1.logger.info(`Sell transaction successful: ${receipt.hash}`);
            return receipt;
        }
        catch (error) {
            logger_1.logger.error(`Error selling token ${tokenAddress}:`, error);
            throw error;
        }
    }
}
exports.SnipeService = SnipeService;
//# sourceMappingURL=snipeService.js.map