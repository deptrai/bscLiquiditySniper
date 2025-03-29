declare module '../services/providerPool' {
    import { ethers } from 'ethers';

    export class ProviderPool {
        constructor();
        getBlockNumber(): Promise<number>;
        getLogs(filter: ethers.Filter): Promise<ethers.Log[]>;
        getBlock(blockNumber: number, includeTransactions?: boolean): Promise<ethers.Block>;
    }
} 