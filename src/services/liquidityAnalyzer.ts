import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { config } from '../config';
import { LiquidityAnalysis, LockContract, LiquidityInfo } from '../types/liquidity';
import { LiquidityAnalysisModel } from '../models/LiquidityAnalysis';
import { LockContractModel } from '../models/LockContract';
import { LiquidityInfoModel } from '../models/LiquidityInfo';
import { ERC20_ABI, PAIR_ABI, LOCK_ABI } from '../constants/abis';
import { ContractAnalyzer } from '../services/contractAnalyzer';
import { TokenomicsAnalyzer } from '../services/tokenomicsAnalyzer';
import { ContractAnalysisModel } from '../models/ContractAnalysis';
import { tgMessage } from '../TG/tgBot';

export class LiquidityAnalyzer {
    private static instance: LiquidityAnalyzer;
    private provider: ethers.Provider;
    private erc20Interface: ethers.Interface;
    private pairInterface: ethers.Interface;
    private lockInterface: ethers.Interface;

    private constructor() {
        this.provider = new ethers.JsonRpcProvider(config.HTTP_RPC_URLS[0]);
        this.erc20Interface = new ethers.Interface(ERC20_ABI);
        this.pairInterface = new ethers.Interface(PAIR_ABI);
        this.lockInterface = new ethers.Interface(LOCK_ABI);
    }

    public static getInstance(): LiquidityAnalyzer {
        if (!LiquidityAnalyzer.instance) {
            LiquidityAnalyzer.instance = new LiquidityAnalyzer();
        }
        return LiquidityAnalyzer.instance;
    }

    public async analyzeLiquidity(pairAddress: string): Promise<LiquidityAnalysis> {
        try {
            // Check if analysis already exists
            const existingAnalysis = await LiquidityAnalysisModel.findOne({ pairAddress });
            if (existingAnalysis) {
                return existingAnalysis;
            }

            const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, this.provider);
            
            // Get token addresses and info
            const [token0Address, token1Address] = await Promise.all([
                pairContract.token0(),
                pairContract.token1()
            ]);

            const [token0Contract, token1Contract] = [
                new ethers.Contract(token0Address, ERC20_ABI, this.provider),
                new ethers.Contract(token1Address, ERC20_ABI, this.provider)
            ];

            const [token0Symbol, token1Symbol] = await Promise.all([
                token0Contract.symbol(),
                token1Contract.symbol()
            ]);

            // Get liquidity info
            const liquidityInfo = await this.getLiquidityInfo(pairContract, token0Contract, token1Contract);
            await LiquidityInfoModel.create(liquidityInfo);

            // Check for locked liquidity
            const lockInfo = await this.checkLockedLiquidity(pairAddress, token0Address, token1Address);

            // Create analysis object with all required properties
            const analysis: LiquidityAnalysis = {
                address: pairAddress,
                pairAddress,
                token0Address,
                token1Address,
                token0Symbol,
                token1Symbol,
                liquidityLocked: lockInfo.locked,
                lockAmount: lockInfo.lockAmount,
                lockPercentage: lockInfo.lockPercentage,
                createdAt: new Date(),
                updatedAt: new Date(),
                // Optional properties
                ...(lockInfo.lockContract && { lockContract: lockInfo.lockContract }),
                ...(lockInfo.lockEndTime && { lockEndTime: lockInfo.lockEndTime }),
                ...(lockInfo.lockStartTime && { lockStartTime: lockInfo.lockStartTime })
            };

            // Save to database
            await LiquidityAnalysisModel.create(analysis);

            // Perform complete analysis and send Telegram notification
            await this.performCompleteAnalysis(token0Address, token1Address, pairAddress, analysis);

            return analysis;
        } catch (error) {
            logger.error('Error analyzing liquidity:', error);
            throw error;
        }
    }

    private async getLiquidityInfo(
        pairContract: ethers.Contract,
        token0Contract: ethers.Contract,
        token1Contract: ethers.Contract
    ): Promise<LiquidityInfo> {
        try {
            // Get reserves
            const [reserve0, reserve1] = await pairContract.getReserves();
            
            // Get token decimals
            const [decimals0, decimals1] = await Promise.all([
                token0Contract.decimals(),
                token1Contract.decimals()
            ]);

            // Get token symbols
            const [symbol0, symbol1] = await Promise.all([
                token0Contract.symbol(),
                token1Contract.symbol()
            ]);

            // Get token addresses
            const [token0Address, token1Address] = await Promise.all([
                pairContract.token0(),
                pairContract.token1()
            ]);

            // Calculate prices (assuming token1 is WBNB)
            const token0Price = Number(reserve1) / Number(reserve0);
            const token1Price = 1; // WBNB price is 1

            // Calculate total liquidity in USD
            const totalLiquidityUSD = Number(reserve0) * token0Price + Number(reserve1);

            return {
                token0Amount: reserve0,
                token1Amount: reserve1,
                totalLiquidityUSD,
                token0Price,
                token1Price,
                token0Decimals: decimals0,
                token1Decimals: decimals1,
                token0Symbol: symbol0,
                token1Symbol: symbol1,
                pairAddress: await pairContract.getAddress(),
                token0Address,
                token1Address,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        } catch (error) {
            logger.error('Error getting liquidity info:', error);
            throw error;
        }
    }

    private async checkLockedLiquidity(
        pairAddress: string,
        token0Address: string,
        token1Address: string
    ): Promise<{
        locked: boolean;
        lockContract?: string;
        lockAmount: bigint;
        lockPercentage: number;
        lockEndTime?: Date;
        lockStartTime?: Date;
    }> {
        try {
            // Check common lock contracts
            const lockContracts = await this.findLockContracts(pairAddress);
            
            if (lockContracts.length > 0) {
                // Get the most recent lock contract
                const latestLock = lockContracts[0];
                
                // Check if lock is still active
                const now = Math.floor(Date.now() / 1000);
                if (Number(latestLock.endTime) > now) {
                    return {
                        locked: true,
                        lockContract: latestLock.address,
                        lockAmount: latestLock.amount,
                        lockPercentage: latestLock.percentage,
                        lockEndTime: new Date(Number(latestLock.endTime) * 1000),
                        lockStartTime: new Date(Number(latestLock.startTime) * 1000)
                    };
                }
            }

            // Check for LP token locks
            const lpTokenContract = new ethers.Contract(pairAddress, ERC20_ABI, this.provider);
            const lpBalance = await lpTokenContract.balanceOf(pairAddress);
            
            if (lpBalance > BigInt(0)) {
                return {
                    locked: true,
                    lockAmount: lpBalance,
                    lockPercentage: 100, // If LP tokens are in the pair contract, they're locked
                    lockStartTime: new Date(),
                    lockEndTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Assume 1 year lock
                };
            }

            return {
                locked: false,
                lockAmount: BigInt(0),
                lockPercentage: 0
            };
        } catch (error) {
            logger.error('Error checking locked liquidity:', error);
            return {
                locked: false,
                lockAmount: BigInt(0),
                lockPercentage: 0
            };
        }
    }

    private async findLockContracts(pairAddress: string): Promise<LockContract[]> {
        try {
            // Common lock contract addresses
            const commonLockAddresses = [
                '0x407993575c91ce7643a4d4cCACc9A98c36eE1BBE', // Team Finance
                '0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214', // Unicrypt
                '0x1AAE6D37Fec8EEFD97eDf6B5624D7C5A1c97e1D5', // PinkLock
                '0x7ee058420e5937496F5A2096f04caA7721cF70cc', // TrustSwap
                '0x9b5F7F912eB480353e6Fc1F6B7B2A0c0c2B7A2E1'  // Add more as needed
            ];

            const lockContracts: LockContract[] = [];

            for (const lockAddress of commonLockAddresses) {
                try {
                    const lockContract = new ethers.Contract(lockAddress, LOCK_ABI, this.provider);
                    
                    // Get lock info for this pair
                    const lockInfo = await lockContract.getLockInfo(pairAddress);
                    
                    if (lockInfo && lockInfo.amount > BigInt(0)) {
                        lockContracts.push({
                            address: lockAddress,
                            tokenAddress: pairAddress,
                            pairAddress,
                            amount: lockInfo.amount,
                            percentage: Number(lockInfo.percentage),
                            startTime: new Date(Number(lockInfo.startTime) * 1000),
                            endTime: new Date(Number(lockInfo.endTime) * 1000),
                            owner: lockInfo.owner,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                } catch (error) {
                    // Skip if contract doesn't exist or doesn't have the required function
                    continue;
                }
            }

            // Sort by end time (most recent first)
            return lockContracts.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
        } catch (error) {
            logger.error('Error finding lock contracts:', error);
            return [];
        }
    }

    private async performCompleteAnalysis(
        token0Address: string, 
        token1Address: string, 
        pairAddress: string,
        liquidityAnalysis: LiquidityAnalysis
    ): Promise<void> {
        try {
            const [token0Contract, token1Contract] = [
                new ethers.Contract(token0Address, ERC20_ABI, this.provider),
                new ethers.Contract(token1Address, ERC20_ABI, this.provider)
            ];

            // Get basic token info
            const [
                token0Symbol, token0Name, token0Decimals, token0TotalSupply,
                token1Symbol, token1Name, token1Decimals, token1TotalSupply
            ] = await Promise.all([
                token0Contract.symbol().catch(() => 'Unknown'),
                token0Contract.name().catch(() => 'Unknown'),
                token0Contract.decimals().catch(() => 18),
                token0Contract.totalSupply().catch(() => '0'),
                token1Contract.symbol().catch(() => 'Unknown'),
                token1Contract.name().catch(() => 'Unknown'),
                token1Contract.decimals().catch(() => 18),
                token1Contract.totalSupply().catch(() => '0')
            ]);

            // Initialize analyzers
            const contractAnalyzer = ContractAnalyzer.getInstance();
            const tokenomicsAnalyzer = TokenomicsAnalyzer.getInstance();

            // Perform analyses
            const [token0Analysis, token1Analysis, token0Tokenomics, token1Tokenomics] = await Promise.all([
                contractAnalyzer.analyzeContract(token0Address),
                contractAnalyzer.analyzeContract(token1Address),
                tokenomicsAnalyzer.analyzeTokenomics(token0Address),
                tokenomicsAnalyzer.analyzeTokenomics(token1Address)
            ]);

            // Save analyses to database
            await Promise.all([
                ContractAnalysisModel.create(token0Analysis),
                ContractAnalysisModel.create(token1Analysis)
            ]);

            // Format analysis results for message
            const formatAnalysis = (analysis: any, tokenomics: any) => {
                return `
🔍 Security Analysis:
• Risk Score: ${analysis.riskScore}/100
• Honeypot: ${analysis.isHoneypot ? '⚠️ Yes' : '✅ No'}
• Dangerous Functions: ${analysis.functions.filter((f: any) => f.isDangerous).length}
• Vulnerabilities: ${analysis.vulnerabilities.length}
• Events: ${analysis.events.length}

💰 Tokenomics:
• Buy Tax: ${(tokenomics.buyTax * 100).toFixed(2)}%
• Sell Tax: ${(tokenomics.sellTax * 100).toFixed(2)}%
• Anti-Whale: ${tokenomics.antiWhale ? '✅ Yes' : '❌ No'}
• Anti-Whale Mechanisms: ${tokenomics.antiWhaleMechanisms.join(', ') || 'None'}
• Max Transaction: ${ethers.formatUnits(tokenomics.maxTransactionAmount, tokenomics.decimals)}
• Max Wallet: ${ethers.formatUnits(tokenomics.maxWalletAmount, tokenomics.decimals)}
• Burn Mechanism: ${tokenomics.burnMechanism ? '✅ Yes' : '❌ No'}
${tokenomics.burnRate ? `• Burn Rate: ${(tokenomics.burnRate * 100).toFixed(2)}%` : ''}
${tokenomics.totalBurned ? `• Total Burned: ${ethers.formatUnits(tokenomics.totalBurned, tokenomics.decimals)}` : ''}`;
            };

            // Send Telegram notification with analysis
            const message = `
🚨 New Token Analysis!

Token 0:
• Name: ${token0Name}
• Symbol: ${token0Symbol}
• Address: ${token0Address}
• Decimals: ${token0Decimals}
• Total Supply: ${ethers.formatUnits(token0TotalSupply, token0Decimals)}
${formatAnalysis(token0Analysis, token0Tokenomics)}

Token 1:
• Name: ${token1Name}
• Symbol: ${token1Symbol}
• Address: ${token1Address}
• Decimals: ${token1Decimals}
• Total Supply: ${ethers.formatUnits(token1TotalSupply, token1Decimals)}
${formatAnalysis(token1Analysis, token1Tokenomics)}

Pair:
• Address: ${pairAddress}

🔒 Liquidity Status:
• Locked: ${liquidityAnalysis.liquidityLocked ? '✅ Yes' : '❌ No'}
${liquidityAnalysis.lockContract ? `• Lock Contract: ${liquidityAnalysis.lockContract}` : ''}
• Lock Amount: ${ethers.formatUnits(liquidityAnalysis.lockAmount, 18)} LP
• Lock Percentage: ${liquidityAnalysis.lockPercentage}%
${liquidityAnalysis.lockEndTime ? `• Lock End Time: ${liquidityAnalysis.lockEndTime.toLocaleString()}` : ''}
${liquidityAnalysis.lockStartTime ? `• Lock Start Time: ${liquidityAnalysis.lockStartTime.toLocaleString()}` : ''}`;

            await tgMessage(message);
        } catch (error) {
            logger.error('Error performing complete analysis:', error);
            // Don't throw the error to prevent disrupting the main flow
        }
    }
} 