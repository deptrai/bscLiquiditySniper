export interface TokenomicsAnalysis {
    address: string;
    buyTax: number;
    sellTax: number;
    maxTransactionAmount: bigint;
    maxWalletAmount: bigint;
    antiWhale: boolean;
    antiWhaleMechanisms: string[];
    burnMechanism: boolean;
    burnAddress?: string;
    burnRate?: number;
    totalBurned?: bigint;
    createdAt: Date;
    updatedAt: Date;
}

export interface TransactionLimit {
    type: 'maxTransaction' | 'maxWallet' | 'cooldown';
    value: bigint;
    unit: 'tokens' | 'percentage' | 'seconds';
    description: string;
}

export interface AntiWhaleMechanism {
    type: 'maxTransaction' | 'maxWallet' | 'cooldown' | 'blacklist' | 'whitelist';
    description: string;
    parameters: Record<string, any>;
}

export interface BurnMechanism {
    type: 'manual' | 'automatic' | 'reflection';
    address?: string;
    rate?: number;
    totalBurned?: bigint;
    description: string;
} 