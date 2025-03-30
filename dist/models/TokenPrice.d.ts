import { Document } from 'mongoose';
export interface ITokenPrice extends Document {
    tokenAddress: string;
    pairAddress: string;
    price: number;
    priceUSD: number;
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
}
export declare const TokenPrice: any;
//# sourceMappingURL=TokenPrice.d.ts.map