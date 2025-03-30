import axios from 'axios';
import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { ContractAnalysis, ContractSource, Vulnerability, VulnerabilityType } from '../types/contract';
import { config } from '../config';

export class ContractAnalyzer {
    private static instance: ContractAnalyzer;
    private readonly bscScanApiKey: string;
    private readonly bscScanApiUrl: string;

    private constructor() {
        this.bscScanApiKey = config.BSCSCAN_API_KEY;
        this.bscScanApiUrl = 'https://api.bscscan.com/api';
    }

    public static getInstance(): ContractAnalyzer {
        if (!ContractAnalyzer.instance) {
            ContractAnalyzer.instance = new ContractAnalyzer();
        }
        return ContractAnalyzer.instance;
    }

    public async analyzeContract(address: string): Promise<ContractAnalysis> {
        try {
            // Fetch contract source code
            const source = await this.fetchContractSource(address);
            
            // Analyze contract
            const analysis = await this.analyzeSourceCode(source);
            
            // Check for honeypot
            const isHoneypot = await this.checkHoneypot(address);
            
            // Calculate risk score
            const riskScore = this.calculateRiskScore(analysis.vulnerabilities);
            
            return {
                ...analysis,
                address,
                isHoneypot,
                riskScore,
                lastUpdated: new Date()
            };
        } catch (error) {
            logger.error(`Error analyzing contract ${address}:`, error);
            throw error;
        }
    }

    private async fetchContractSource(address: string): Promise<ContractSource> {
        try {
            const response = await axios.get(this.bscScanApiUrl, {
                params: {
                    module: 'contract',
                    action: 'getsourcecode',
                    address,
                    apikey: this.bscScanApiKey
                }
            });

            if (response.data.status === '1') {
                const data = response.data.result[0];
                return {
                    address,
                    sourceCode: data.SourceCode,
                    compilerVersion: data.CompilerVersion,
                    optimization: data.OptimizationUsed === '1',
                    runs: parseInt(data.Runs),
                    license: data.LicenseType,
                    constructorArguments: data.ConstructorArguments,
                    libraries: this.parseLibraries(data.Library),
                    implementation: data.Implementation,
                    proxy: data.Proxy === '1'
                };
            } else {
                throw new Error(`Failed to fetch contract source: ${response.data.message}`);
            }
        } catch (error) {
            logger.error(`Error fetching contract source for ${address}:`, error);
            throw error;
        }
    }

    private parseLibraries(libraryString: string): Record<string, string> {
        if (!libraryString) return {};
        
        const libraries: Record<string, string> = {};
        const matches = libraryString.match(/\{([^}]+)\}/g);
        
        if (matches) {
            matches.forEach(match => {
                const [key, value] = match.slice(1, -1).split(':');
                if (key && value) {
                    libraries[key.trim()] = value.trim();
                }
            });
        }
        
        return libraries;
    }

    private async analyzeSourceCode(source: ContractSource): Promise<ContractAnalysis> {
        const vulnerabilities: Vulnerability[] = [];
        
        // Check for dangerous functions
        const dangerousFunctions = this.findDangerousFunctions(source.sourceCode);
        vulnerabilities.push(...dangerousFunctions);
        
        // Check for blacklist functions
        const blacklistFunctions = this.findBlacklistFunctions(source.sourceCode);
        vulnerabilities.push(...blacklistFunctions);
        
        // Check for owner privileges
        const ownerPrivileges = this.findOwnerPrivileges(source.sourceCode);
        vulnerabilities.push(...ownerPrivileges);
        
        // Check for self-destruct
        const selfDestruct = this.findSelfDestruct(source.sourceCode);
        vulnerabilities.push(...selfDestruct);
        
        // Check for delegate call
        const delegateCall = this.findDelegateCall(source.sourceCode);
        vulnerabilities.push(...delegateCall);
        
        // Check for unchecked return
        const uncheckedReturn = this.findUncheckedReturn(source.sourceCode);
        vulnerabilities.push(...uncheckedReturn);
        
        // Check for reentrancy
        const reentrancy = this.findReentrancy(source.sourceCode);
        vulnerabilities.push(...reentrancy);
        
        // Check for frontrunning
        const frontrunning = this.findFrontrunning(source.sourceCode);
        vulnerabilities.push(...frontrunning);

        return {
            address: source.address,
            sourceCode: source.sourceCode,
            compilerVersion: source.compilerVersion,
            optimization: source.optimization,
            runs: source.runs,
            license: source.license,
            functions: [], // TODO: Parse functions
            events: [], // TODO: Parse events
            vulnerabilities,
            isHoneypot: false, // Will be set later
            riskScore: 0, // Will be calculated later
            lastUpdated: new Date()
        };
    }

    private findDangerousFunctions(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const dangerousPatterns = [
            { pattern: /function\s+mint/i, type: VulnerabilityType.MINT_FUNCTION },
            { pattern: /function\s+_mint/i, type: VulnerabilityType.MINT_FUNCTION },
            { pattern: /function\s+_safeMint/i, type: VulnerabilityType.MINT_FUNCTION }
        ];

        dangerousPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'high',
                    description: 'Contract contains mint function',
                    location: 'Contract functions',
                    recommendation: 'Review mint function implementation and access controls'
                });
            }
        });

        return vulnerabilities;
    }

    private findBlacklistFunctions(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const blacklistPatterns = [
            { pattern: /function\s+blacklist/i, type: VulnerabilityType.BLACKLIST },
            { pattern: /function\s+_blacklist/i, type: VulnerabilityType.BLACKLIST },
            { pattern: /function\s+setBlacklist/i, type: VulnerabilityType.BLACKLIST }
        ];

        blacklistPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'medium',
                    description: 'Contract contains blacklist function',
                    location: 'Contract functions',
                    recommendation: 'Review blacklist implementation and access controls'
                });
            }
        });

        return vulnerabilities;
    }

    private findOwnerPrivileges(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const ownerPatterns = [
            { pattern: /function\s+setOwner/i, type: VulnerabilityType.OWNER_PRIVILEGES },
            { pattern: /function\s+transferOwnership/i, type: VulnerabilityType.OWNER_PRIVILEGES },
            { pattern: /function\s+renounceOwnership/i, type: VulnerabilityType.OWNER_PRIVILEGES }
        ];

        ownerPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'medium',
                    description: 'Contract contains owner privilege functions',
                    location: 'Contract functions',
                    recommendation: 'Review owner privilege functions and access controls'
                });
            }
        });

        return vulnerabilities;
    }

    private findSelfDestruct(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const selfDestructPatterns = [
            { pattern: /selfdestruct/i, type: VulnerabilityType.SELF_DESTRUCT },
            { pattern: /suicide/i, type: VulnerabilityType.SELF_DESTRUCT }
        ];

        selfDestructPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'high',
                    description: 'Contract contains selfdestruct function',
                    location: 'Contract functions',
                    recommendation: 'Review selfdestruct implementation and access controls'
                });
            }
        });

        return vulnerabilities;
    }

    private findDelegateCall(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const delegateCallPatterns = [
            { pattern: /delegatecall/i, type: VulnerabilityType.DELEGATE_CALL },
            { pattern: /callcode/i, type: VulnerabilityType.DELEGATE_CALL }
        ];

        delegateCallPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'high',
                    description: 'Contract contains delegatecall or callcode',
                    location: 'Contract functions',
                    recommendation: 'Review delegatecall/callcode implementation and security implications'
                });
            }
        });

        return vulnerabilities;
    }

    private findUncheckedReturn(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const uncheckedPatterns = [
            { pattern: /require\(/i, type: VulnerabilityType.UNCHECKED_RETURN },
            { pattern: /assert\(/i, type: VulnerabilityType.UNCHECKED_RETURN }
        ];

        uncheckedPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'medium',
                    description: 'Contract contains unchecked return values',
                    location: 'Contract functions',
                    recommendation: 'Review return value handling and add appropriate checks'
                });
            }
        });

        return vulnerabilities;
    }

    private findReentrancy(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const reentrancyPatterns = [
            { pattern: /call\.value/i, type: VulnerabilityType.REENTRANCY },
            { pattern: /transfer\(/i, type: VulnerabilityType.REENTRANCY },
            { pattern: /send\(/i, type: VulnerabilityType.REENTRANCY }
        ];

        reentrancyPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'high',
                    description: 'Potential reentrancy vulnerability detected',
                    location: 'Contract functions',
                    recommendation: 'Implement reentrancy guard and follow checks-effects-interactions pattern'
                });
            }
        });

        return vulnerabilities;
    }

    private findFrontrunning(sourceCode: string): Vulnerability[] {
        const vulnerabilities: Vulnerability[] = [];
        const frontrunningPatterns = [
            { pattern: /block\.timestamp/i, type: VulnerabilityType.FRONTRUNNING },
            { pattern: /block\.number/i, type: VulnerabilityType.FRONTRUNNING }
        ];

        frontrunningPatterns.forEach(({ pattern, type }) => {
            if (pattern.test(sourceCode)) {
                vulnerabilities.push({
                    type,
                    severity: 'medium',
                    description: 'Potential frontrunning vulnerability detected',
                    location: 'Contract functions',
                    recommendation: 'Review timestamp and block number usage, consider using commit-reveal scheme'
                });
            }
        });

        return vulnerabilities;
    }

    private async checkHoneypot(address: string): Promise<boolean> {
        try {
            // Check if contract is verified
            const response = await axios.get(this.bscScanApiUrl, {
                params: {
                    module: 'contract',
                    action: 'getabi',
                    address,
                    apikey: this.bscScanApiKey
                }
            });

            if (response.data.status !== '1') {
                return true; // Unverified contract is suspicious
            }

            // Check for suspicious patterns in the contract
            const source = await this.fetchContractSource(address);
            const suspiciousPatterns = [
                /function\s+_transfer/i,
                /function\s+_beforeTokenTransfer/i,
                /function\s+_afterTokenTransfer/i,
                /function\s+_approve/i,
                /function\s+_beforeApproval/i,
                /function\s+_afterApproval/i
            ];

            return suspiciousPatterns.some(pattern => pattern.test(source.sourceCode));
        } catch (error) {
            logger.error(`Error checking honeypot for ${address}:`, error);
            return true; // If we can't verify, assume it's a honeypot
        }
    }

    private calculateRiskScore(vulnerabilities: Vulnerability[]): number {
        const severityScores = {
            high: 3,
            medium: 2,
            low: 1
        };

        const baseScore = vulnerabilities.reduce((score, vuln) => {
            return score + severityScores[vuln.severity];
        }, 0);

        // Normalize score to 0-100 range
        return Math.min(100, (baseScore / (vulnerabilities.length * 3)) * 100);
    }
} 