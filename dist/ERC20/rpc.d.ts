import { ethers } from 'ethers';
export declare class RPCManager {
    private readonly mainnetRPCs;
    private readonly testnetRPCs;
    constructor();
    private _provider;
    get provider(): ethers.JsonRpcProvider;
    private check;
    get(isTestnet: boolean, maxRetries?: number): Promise<string | null>;
    walletWithProvider(wallet: ethers.HDNodeWallet): Promise<{
        address?: string;
        privatekey?: string;
    } | null>;
}
export default RPCManager;
//# sourceMappingURL=rpc.d.ts.map