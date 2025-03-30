import { Document } from 'mongoose';
export interface ITokenMetadata extends Document {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
    owner: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    github?: string;
    logo?: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    lastPrice?: number;
    lastPriceUSD?: number;
    marketCap?: number;
    volume24h?: number;
    holders?: number;
    verified?: boolean;
}
export declare const TokenMetadata: any;
//# sourceMappingURL=TokenMetadata.d.ts.map