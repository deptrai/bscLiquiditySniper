export interface TokenInfo {
    address: string;
    symbol: string;
    amount: string;
    decimals: number;
    name: string;
}

export interface LiquidityEvent {
    tokenA: TokenInfo;
    tokenB: TokenInfo;
    version: 'V2' | 'V3';
    transactionHash: string;
    createdAt: Date;
    blockNumber: number;
    pairAddress?: string;
    poolAddress?: string;
    fee?: number;
    tickLower?: number;
    tickUpper?: number;
} 