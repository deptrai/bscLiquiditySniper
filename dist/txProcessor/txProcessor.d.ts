import { ethers } from 'ethers';
export declare class TransactionProcessor {
    private static instance;
    private tokenService;
    private constructor();
    static getInstance(): TransactionProcessor;
    processV2Event(event: ethers.Log): Promise<void>;
    processV3Event(event: ethers.Log): Promise<void>;
}
export declare const txProcessor: TransactionProcessor;
//# sourceMappingURL=txProcessor.d.ts.map