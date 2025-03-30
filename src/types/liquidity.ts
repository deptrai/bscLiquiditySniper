export interface LiquidityAnalysis {
    address: string;
    pairAddress: string;
    token0Address: string;
    token1Address: string;
    token0Symbol: string;
    token1Symbol: string;
    liquidityLocked: boolean;
    lockContract?: string;
    lockAmount: bigint;
    lockPercentage: number;
    lockEndTime?: Date;
    lockStartTime?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface LockContract {
    address: string;
    tokenAddress: string;
    pairAddress: string;
    amount: bigint;
    percentage: number;
    startTime: Date;
    endTime: Date;
    owner: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LiquidityInfo {
    token0Amount: bigint;
    token1Amount: bigint;
    totalLiquidityUSD: number;
    token0Price: number;
    token1Price: number;
    token0Decimals: number;
    token1Decimals: number;
    token0Symbol: string;
    token1Symbol: string;
    pairAddress: string;
    token0Address: string;
    token1Address: string;
    createdAt: Date;
    updatedAt: Date;
} 