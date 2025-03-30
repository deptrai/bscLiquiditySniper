import { Document } from 'mongoose';
export interface ITokenLiquidity extends Document {
    tokenAddress: string;
    pairAddress: string;
    liquidity: number;
    liquidityUSD: number;
    timestamp: Date;
    blockNumber: number;
    version: 'v2' | 'v3';
    token0Reserve: string;
    token1Reserve: string;
    token0Decimals: number;
    token1Decimals: number;
    token0Symbol: string;
    token1Symbol: string;
    fee?: number;
    tickLower?: number;
    tickUpper?: number;
    sqrtPriceX96?: string;
    liquidityX96?: string;
}
export declare const TokenLiquidity: any;
//# sourceMappingURL=TokenLiquidity.d.ts.map