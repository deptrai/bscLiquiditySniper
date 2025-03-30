import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { config } from '../config';
import { TokenomicsAnalysis, TransactionLimit, AntiWhaleMechanism, BurnMechanism } from '../types/tokenomics';
import { TokenomicsAnalysisModel } from '../models/TokenomicsAnalysis';
import { ERC20_ABI } from '../constants/abis';

export class TokenomicsAnalyzer {
    private static instance: TokenomicsAnalyzer;
    private provider: ethers.Provider;
    private interface: ethers.Interface;

    private constructor() {
        this.provider = new ethers.JsonRpcProvider(config.HTTP_RPC_URLS[0]);
        this.interface = new ethers.Interface(ERC20_ABI);
    }

    public static getInstance(): TokenomicsAnalyzer {
        if (!TokenomicsAnalyzer.instance) {
            TokenomicsAnalyzer.instance = new TokenomicsAnalyzer();
        }
        return TokenomicsAnalyzer.instance;
    }

    public async analyzeTokenomics(address: string): Promise<TokenomicsAnalysis> {
        try {
            // Check if analysis already exists
            const existingAnalysis = await TokenomicsAnalysisModel.findOne({ address });
            if (existingAnalysis) {
                return existingAnalysis;
            }

            const contract = new ethers.Contract(address, ERC20_ABI, this.provider);
            
            // Get token decimals first
            const decimals = await contract.decimals().catch(() => 18);
            
            // Analyze buy/sell tax
            const [buyTax, sellTax] = await this.analyzeTaxes(contract);
            
            // Analyze anti-whale mechanisms
            const { antiWhale, antiWhaleMechanisms } = await this.analyzeAntiWhale(contract);
            
            // Analyze burn mechanism
            const { burnMechanism, burnAddress, burnRate, totalBurned } = await this.analyzeBurnMechanism(contract);

            // Get max transaction and wallet amounts
            const [maxTransactionAmount, maxWalletAmount] = await this.getTransactionLimits(contract);

            const analysis: TokenomicsAnalysis = {
                address,
                buyTax,
                sellTax,
                maxTransactionAmount,
                maxWalletAmount,
                antiWhale,
                antiWhaleMechanisms,
                burnMechanism,
                burnAddress,
                burnRate,
                totalBurned,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Save to database
            await TokenomicsAnalysisModel.create(analysis);

            return analysis;
        } catch (error) {
            logger.error('Error analyzing tokenomics:', error);
            throw error;
        }
    }

    private async analyzeTaxes(contract: ethers.Contract): Promise<[number, number]> {
        try {
            // Try to get tax from common functions
            const buyTax = await this.getBuyTax(contract);
            const sellTax = await this.getSellTax(contract);
            
            return [buyTax, sellTax];
        } catch (error) {
            logger.warn('Could not determine taxes:', error);
            return [0, 0];
        }
    }

    private async getBuyTax(contract: ethers.Contract): Promise<number> {
        try {
            // Try common buy tax functions
            const tax = await contract.buyTax().catch(() => null);
            if (tax !== null) return Number(tax) / 100;

            // Try reflection fee
            const reflectionFee = await contract.reflectionFee().catch(() => null);
            if (reflectionFee !== null) return Number(reflectionFee) / 100;

            // Try to get tax from transfer event
            const transferFilter = contract.filters.Transfer();
            const transfers = await contract.queryFilter(transferFilter, -1000);
            
            if (transfers.length > 0) {
                // Calculate average tax from transfers
                let totalTax = 0;
                let count = 0;
                
                for (const transfer of transfers) {
                    const receipt = await transfer.getTransactionReceipt();
                    if (receipt) {
                        const gasUsed = receipt.gasUsed;
                        const gasPrice = receipt.gasPrice;
                        const parsedLog = this.interface.parseLog({
                            topics: transfer.topics,
                            data: transfer.data
                        });
                        
                        if (parsedLog && parsedLog.args) {
                            const value = parsedLog.args[2] as bigint; // value is the third argument in Transfer event
                            if (value && gasUsed && gasPrice) {
                                const tax = Number(gasUsed * gasPrice) / Number(value);
                                if (tax > 0 && tax < 1) {
                                    totalTax += tax;
                                    count++;
                                }
                            }
                        }
                    }
                }
                
                if (count > 0) {
                    return totalTax / count;
                }
            }

            return 0;
        } catch (error) {
            return 0;
        }
    }

    private async getSellTax(contract: ethers.Contract): Promise<number> {
        try {
            // Try common sell tax functions
            const tax = await contract.sellTax().catch(() => null);
            if (tax !== null) return Number(tax) / 100;

            // Try reflection fee
            const reflectionFee = await contract.reflectionFee().catch(() => null);
            if (reflectionFee !== null) return Number(reflectionFee) / 100;

            // Try to get tax from transfer event
            const transferFilter = contract.filters.Transfer();
            const transfers = await contract.queryFilter(transferFilter, -1000);
            
            if (transfers.length > 0) {
                // Calculate average tax from transfers
                let totalTax = 0;
                let count = 0;
                
                for (const transfer of transfers) {
                    const receipt = await transfer.getTransactionReceipt();
                    if (receipt) {
                        const gasUsed = receipt.gasUsed;
                        const gasPrice = receipt.gasPrice;
                        const parsedLog = this.interface.parseLog({
                            topics: transfer.topics,
                            data: transfer.data
                        });
                        
                        if (parsedLog && parsedLog.args) {
                            const value = parsedLog.args[2] as bigint; // value is the third argument in Transfer event
                            if (value && gasUsed && gasPrice) {
                                const tax = Number(gasUsed * gasPrice) / Number(value);
                                if (tax > 0 && tax < 1) {
                                    totalTax += tax;
                                    count++;
                                }
                            }
                        }
                    }
                }
                
                if (count > 0) {
                    return totalTax / count;
                }
            }

            return 0;
        } catch (error) {
            return 0;
        }
    }

    private async analyzeAntiWhale(contract: ethers.Contract): Promise<{ antiWhale: boolean; antiWhaleMechanisms: string[] }> {
        const mechanisms: string[] = [];

        try {
            // Check max transaction amount
            const maxTx = await contract.maxTransactionAmount().catch(() => null);
            if (maxTx !== null) {
                mechanisms.push('maxTransaction');
            }

            // Check max wallet amount
            const maxWallet = await contract.maxWalletAmount().catch(() => null);
            if (maxWallet !== null) {
                mechanisms.push('maxWallet');
            }

            // Check cooldown
            const cooldown = await contract.cooldownTime().catch(() => null);
            if (cooldown !== null) {
                mechanisms.push('cooldown');
            }

            // Check blacklist
            const isBlacklisted = await contract.isBlacklisted(ethers.Wallet.createRandom().address).catch(() => null);
            if (isBlacklisted !== null) {
                mechanisms.push('blacklist');
            }

            // Check whitelist
            const isWhitelisted = await contract.isWhitelisted(ethers.Wallet.createRandom().address).catch(() => null);
            if (isWhitelisted !== null) {
                mechanisms.push('whitelist');
            }

            // Check for anti-whale events
            const transferFilter = contract.filters.Transfer();
            const transfers = await contract.queryFilter(transferFilter, -1000);
            
            if (transfers.length > 0) {
                // Check for large transfers
                const decimals = await contract.decimals().catch(() => 18);
                const maxTransfer = Math.max(...transfers.map(t => {
                    const parsedLog = this.interface.parseLog({
                        topics: t.topics,
                        data: t.data
                    });
                    return Number(parsedLog?.args?.[2] as bigint || 0);
                }));
                const totalSupply = await contract.totalSupply().catch(() => BigInt(0));
                
                if (maxTransfer > Number(totalSupply) * 0.01) { // If any transfer is more than 1% of total supply
                    mechanisms.push('largeTransferLimit');
                }
            }

            return {
                antiWhale: mechanisms.length > 0,
                antiWhaleMechanisms: mechanisms
            };
        } catch (error) {
            return {
                antiWhale: false,
                antiWhaleMechanisms: []
            };
        }
    }

    private async analyzeBurnMechanism(contract: ethers.Contract): Promise<{
        burnMechanism: boolean;
        burnAddress?: string;
        burnRate?: number;
        totalBurned?: bigint;
    }> {
        try {
            // Check for burn address
            const burnAddress = await contract.burnAddress().catch(() => null);
            if (burnAddress !== null) {
                return {
                    burnMechanism: true,
                    burnAddress,
                    burnRate: await this.getBurnRate(contract),
                    totalBurned: await this.getTotalBurned(contract)
                };
            }

            // Check for reflection burn
            const reflectionFee = await contract.reflectionFee().catch(() => null);
            if (reflectionFee !== null) {
                return {
                    burnMechanism: true,
                    burnRate: Number(reflectionFee) / 100,
                    totalBurned: await this.getTotalBurned(contract)
                };
            }

            // Check for manual burn events
            const transferFilter = contract.filters.Transfer();
            const transfers = await contract.queryFilter(transferFilter, -1000);
            
            if (transfers.length > 0) {
                const zeroAddress = '0x0000000000000000000000000000000000000000';
                const burnTransfers = transfers.filter(t => {
                    const parsedLog = this.interface.parseLog({
                        topics: t.topics,
                        data: t.data
                    });
                    return parsedLog?.args?.[1] === zeroAddress; // to address is the second argument
                });
                
                if (burnTransfers.length > 0) {
                    const totalBurned = burnTransfers.reduce((acc, t) => {
                        const parsedLog = this.interface.parseLog({
                            topics: t.topics,
                            data: t.data
                        });
                        return acc + (parsedLog?.args?.[2] as bigint || BigInt(0));
                    }, BigInt(0));
                    
                    return {
                        burnMechanism: true,
                        burnAddress: zeroAddress,
                        totalBurned
                    };
                }
            }

            return {
                burnMechanism: false
            };
        } catch (error) {
            return {
                burnMechanism: false
            };
        }
    }

    private async getBurnRate(contract: ethers.Contract): Promise<number | undefined> {
        try {
            const rate = await contract.burnRate().catch(() => null);
            if (rate !== null) return Number(rate) / 100;
            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    private async getTotalBurned(contract: ethers.Contract): Promise<bigint | undefined> {
        try {
            const burned = await contract.totalBurned().catch(() => null);
            if (burned !== null) return burned;
            return undefined;
        } catch (error) {
            return undefined;
        }
    }

    private async getTransactionLimits(contract: ethers.Contract): Promise<[bigint, bigint]> {
        try {
            const maxTx = await contract.maxTransactionAmount().catch(() => BigInt(0));
            const maxWallet = await contract.maxWalletAmount().catch(() => BigInt(0));
            return [maxTx, maxWallet];
        } catch (error) {
            return [BigInt(0), BigInt(0)];
        }
    }
} 