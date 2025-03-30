export interface TokenInfo {
    address: string;
    symbol: string;
    amount: string;
    decimals: number;
    name: string;
    balance: bigint;
    allowance: bigint;
    price: number;
    value: number;
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
export interface Token {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: bigint;
    owner: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    metadata?: {
        website?: string;
        twitter?: string;
        telegram?: string;
        github?: string;
        logo?: string;
    };
    stats?: {
        holders: number;
        marketCap: bigint;
        volume24h: bigint;
        price: number;
        priceChange24h: number;
    };
}
export interface TokenPair {
    token0: Token;
    token1: Token;
    pairAddress: string;
    dex: string;
    createdAt: Date;
    updatedAt: Date;
    liquidity: {
        token0: bigint;
        token1: bigint;
        usd: number;
    };
    volume24h: bigint;
    price: number;
    priceChange24h: number;
}
//# sourceMappingURL=token.d.ts.map