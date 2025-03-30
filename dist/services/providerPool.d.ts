import { ethers } from 'ethers';
export declare class ProviderPool {
    private providers;
    private currentIndex;
    private readonly requestsPerSecond;
    private readonly logsRequestsPerSecond;
    private readonly requestWindow;
    private readonly logsRequestWindow;
    private readonly minBackoffDelay;
    private readonly maxBackoffDelay;
    constructor();
    private calculateBackoff;
    private enforceRateLimit;
    private switchProvider;
    private getCurrentState;
    getProvider(): ethers.Provider;
    getBlockNumber(): Promise<number>;
    getLogs(filter: ethers.Filter): Promise<ethers.Log[]>;
    getBlock(blockNumber: number, includeTransactions?: boolean): Promise<ethers.Block>;
}
//# sourceMappingURL=providerPool.d.ts.map