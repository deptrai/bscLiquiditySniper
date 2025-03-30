import { ethers } from 'ethers';
export declare class HttpProviderPool {
    private providers;
    private currentIndex;
    constructor(providers: ethers.JsonRpcProvider[]);
    getProvider(): ethers.JsonRpcProvider;
    switchProvider(): void;
    getCurrentProviderIndex(): number;
    getProviderCount(): number;
}
export declare class WssProviderPool {
    private providers;
    private currentIndex;
    constructor(providers: ethers.WebSocketProvider[]);
    getProvider(): ethers.WebSocketProvider;
    switchProvider(): void;
    getCurrentProviderIndex(): number;
    getProviderCount(): number;
}
//# sourceMappingURL=providerPool.d.ts.map