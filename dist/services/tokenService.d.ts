import { TokenInfo, Token, TokenPair } from '../types/token';
import { ProviderPool } from './providerPool';
export declare class TokenService {
    private provider;
    private static instance;
    private tokenCache;
    private pairCache;
    private readonly CACHE_TTL;
    private constructor();
    static getInstance(provider: ProviderPool): TokenService;
    getToken(address: string): Promise<Token>;
    getPair(pairAddress: string, dex: string): Promise<TokenPair>;
    updateTokenStats(address: string): Promise<void>;
    updatePairStats(pairAddress: string): Promise<void>;
    private cleanupCache;
    getTokenInfo(address: string, amount?: string): Promise<TokenInfo>;
    getTokenAmount(address: string, owner: string): Promise<string>;
    clearCache(): void;
}
//# sourceMappingURL=tokenService.d.ts.map