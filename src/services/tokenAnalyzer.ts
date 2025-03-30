import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { config } from '../config';
import { Token } from '../models/Token';
import { TokenMetadata } from '../models/TokenMetadata';
import { TokenHistory } from '../models/TokenHistory';
import { TokenPrice } from '../models/TokenPrice';
import { TokenLiquidity } from '../models/TokenLiquidity';
import { TokenomicsAnalysisModel } from '../models/TokenomicsAnalysis';
import { ContractAnalysisModel } from '../models/ContractAnalysis';
import { LiquidityAnalysisModel } from '../models/LiquidityAnalysis';
import { ContractAnalyzer } from './contractAnalyzer';
import { TokenomicsAnalyzer } from './tokenomicsAnalyzer';
import { LiquidityAnalyzer } from './liquidityAnalyzer';
import { ERC20_ABI, PAIR_ABI } from '../constants/abis';

export class TokenAnalyzer {
    private static instance: TokenAnalyzer;
    private provider: ethers.Provider;
    private contractAnalyzer: ContractAnalyzer;
    private tokenomicsAnalyzer: TokenomicsAnalyzer;
    private liquidityAnalyzer: LiquidityAnalyzer;

    private constructor() {
        this.provider = new ethers.JsonRpcProvider(config.HTTP_RPC_URLS[0]);
        this.contractAnalyzer = ContractAnalyzer.getInstance();
        this.tokenomicsAnalyzer = TokenomicsAnalyzer.getInstance();
        this.liquidityAnalyzer = LiquidityAnalyzer.getInstance();
    }

    public static getInstance(): TokenAnalyzer {
        if (!TokenAnalyzer.instance) {
            TokenAnalyzer.instance = new TokenAnalyzer();
        }
        return TokenAnalyzer.instance;
    }

    public async analyzeToken(tokenAddress: string, pairAddress: string): Promise<void> {
        try {
            // Get token contract
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);

            // Get basic token info
            const [symbol, name, decimals, totalSupply, owner] = await Promise.all([
                tokenContract.symbol(),
                tokenContract.name(),
                tokenContract.decimals(),
                tokenContract.totalSupply(),
                tokenContract.owner().catch(() => '')
            ]);

            // Create or update token in Token collection
            const token = await Token.findOneAndUpdate(
                { address: tokenAddress },
                {
                    symbol,
                    name,
                    decimals,
                    totalSupply: totalSupply.toString(),
                    owner,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

            // Create or update token metadata
            const metadata = await TokenMetadata.findOneAndUpdate(
                { address: tokenAddress },
                {
                    symbol,
                    name,
                    decimals,
                    totalSupply: totalSupply.toString(),
                    owner,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );

            // Perform contract analysis
            const contractAnalysis = await this.contractAnalyzer.analyzeContract(tokenAddress);
            await ContractAnalysisModel.create(contractAnalysis);

            // Perform tokenomics analysis
            const tokenomicsAnalysis = await this.tokenomicsAnalyzer.analyzeTokenomics(tokenAddress);
            await TokenomicsAnalysisModel.create(tokenomicsAnalysis);

            // Perform liquidity analysis
            const liquidityAnalysis = await this.liquidityAnalyzer.analyzeLiquidity(pairAddress);
            await LiquidityAnalysisModel.create(liquidityAnalysis);

            // Get current price and liquidity
            const [price, liquidity] = await this.getCurrentPriceAndLiquidity(tokenAddress, pairAddress);

            // Update metadata with current stats
            await TokenMetadata.findOneAndUpdate(
                { address: tokenAddress },
                {
                    lastPrice: price,
                    lastPriceUSD: price * 1, // WBNB price is 1
                    marketCap: Number(totalSupply) * price * 1, // WBNB price is 1
                    volume24h: 0, // Will be updated by a separate service
                    holders: 0, // Will be updated by a separate service
                    updatedAt: new Date()
                }
            );

            // Save price and liquidity history
            await Promise.all([
                TokenPrice.create({
                    tokenAddress,
                    pairAddress,
                    price,
                    priceUSD: price * 1, // WBNB price is 1
                    timestamp: new Date(),
                    blockNumber: await this.provider.getBlockNumber(),
                    version: 'v2',
                    token0Reserve: '0', // Will be updated by a separate service
                    token1Reserve: '0', // Will be updated by a separate service
                    token0Decimals: decimals,
                    token1Decimals: 18,
                    token0Symbol: symbol,
                    token1Symbol: 'WBNB'
                }),
                TokenLiquidity.create({
                    tokenAddress,
                    pairAddress,
                    liquidity: liquidity,
                    liquidityUSD: liquidity * 1, // WBNB price is 1
                    timestamp: new Date(),
                    blockNumber: await this.provider.getBlockNumber(),
                    version: 'v2',
                    token0Reserve: '0', // Will be updated by a separate service
                    token1Reserve: '0', // Will be updated by a separate service
                    token0Decimals: decimals,
                    token1Decimals: 18,
                    token0Symbol: symbol,
                    token1Symbol: 'WBNB'
                })
            ]);

            // Save token history
            await TokenHistory.create({
                tokenA: {
                    address: tokenAddress,
                    symbol,
                    amount: totalSupply.toString(),
                    decimals,
                    name
                },
                tokenB: {
                    address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB address
                    symbol: 'WBNB',
                    amount: '0',
                    decimals: 18,
                    name: 'Wrapped BNB'
                },
                version: 'V2',
                transactionHash: '', // Will be updated by event listener
                blockNumber: await this.provider.getBlockNumber(),
                pairAddress,
                poolAddress: pairAddress,
                fee: 0.003 // 0.3% fee for V2
            });

        } catch (error) {
            logger.error('Error analyzing token:', error);
            throw error;
        }
    }

    private async getCurrentPriceAndLiquidity(tokenAddress: string, pairAddress: string): Promise<[number, number]> {
        try {
            const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
            const [reserve0, reserve1] = await pairContract.getReserves();
            
            // Assuming token0 is the token we're analyzing
            const price = Number(reserve1) / Number(reserve0);
            const liquidity = Number(reserve0) * price + Number(reserve1);
            
            return [price, liquidity];
        } catch (error) {
            logger.error('Error getting current price and liquidity:', error);
            return [0, 0];
        }
    }
} 