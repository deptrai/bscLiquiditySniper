import { ethers } from 'ethers';
import { config, getProviders } from '../config';
import { logger } from '../utils/logger';
import { TokenService } from './tokenService';

const PANCAKESWAP_ROUTER_ABI = [
    'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)',
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
];

export class SnipeService {
    private static instance: SnipeService;
    private router: ethers.Contract;
    private tokenService: TokenService;
    private wallet: ethers.Wallet;

    private constructor() {
        const { httpProviderPool } = getProviders();
        const provider = httpProviderPool.getProvider();
        this.router = new ethers.Contract(config.PANCAKESWAP.V2_ROUTER, PANCAKESWAP_ROUTER_ABI, provider);
        this.tokenService = TokenService.getInstance();
        this.wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
    }

    public static getInstance(): SnipeService {
        if (!SnipeService.instance) {
            SnipeService.instance = new SnipeService();
        }
        return SnipeService.instance;
    }

    public async snipeToken(tokenAddress: string, amountInETH: string = '0.1') {
        try {
            // Get token info
            const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
            logger.info(`Snipping token: ${tokenInfo.symbol} (${tokenAddress})`);

            // Convert ETH amount to Wei
            const amountInWei = ethers.parseEther(amountInETH);

            // Prepare transaction
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
            const path = [config.WBNB, tokenAddress];
            const amountOutMin = 0; // No slippage protection for now

            // Create transaction
            const tx = await this.router.swapExactETHForTokens(
                amountOutMin,
                path,
                this.wallet.address,
                deadline,
                {
                    value: amountInWei,
                    gasLimit: 300000
                }
            );

            // Wait for transaction
            const receipt = await tx.wait();
            logger.info(`Snipe transaction successful: ${receipt.hash}`);

            return receipt;
        } catch (error) {
            logger.error(`Error sniping token ${tokenAddress}:`, error);
            throw error;
        }
    }

    public async sellToken(tokenAddress: string, amount: string) {
        try {
            // Get token info
            const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
            logger.info(`Selling token: ${tokenInfo.symbol} (${tokenAddress})`);

            // Approve router to spend tokens
            const tokenContract = new ethers.Contract(
                tokenAddress,
                ['function approve(address spender, uint256 amount) returns (bool)'],
                this.wallet
            );

            const approveTx = await tokenContract.approve(
                config.PANCAKESWAP.V2_ROUTER,
                ethers.MaxUint256
            );
            await approveTx.wait();

            // Prepare transaction
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
            const path = [tokenAddress, config.WBNB];
            const amountOutMin = 0; // No slippage protection for now

            // Create transaction
            const tx = await this.router.swapExactTokensForETH(
                amount,
                amountOutMin,
                path,
                this.wallet.address,
                deadline
            );

            // Wait for transaction
            const receipt = await tx.wait();
            logger.info(`Sell transaction successful: ${receipt.hash}`);

            return receipt;
        } catch (error) {
            logger.error(`Error selling token ${tokenAddress}:`, error);
            throw error;
        }
    }
} 