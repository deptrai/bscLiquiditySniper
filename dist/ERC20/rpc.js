"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCManager = void 0;
const ethers_1 = require("ethers");
const mainnetRPCs = [
    'https://bsc-dataseed.bnbchain.org',
    'https://bsc-dataseed.nariox.org',
    'https://bsc-dataseed.defibit.io',
    'https://bsc-dataseed.ninicoin.io',
    'https://bsc.nodereal.io',
    'https://bsc-dataseed-public.bnbchain.org',
    'https://bnb.rpc.subquery.network/public',
];
const testnetRPCs = [
    'https://eth-mainnet.g.alchemy.com/v2/C2XvP6n2YBz7EuFyTWqOZicmokGHVMYC',
    'https://bsc-testnet-dataseed.bnbchain.org',
    'https://bsc-testnet.bnbchain.org',
    'https://bsc-prebsc-dataseed.bnbchain.org',
];
class RPCManager {
    constructor() {
        this.mainnetRPCs = mainnetRPCs;
        this.testnetRPCs = testnetRPCs;
    }
    get provider() {
        if (!this._provider)
            throw new Error('Provider not set');
        return this._provider;
    }
    async check(url) {
        try {
            const response = new ethers_1.ethers.JsonRpcProvider(url);
            if (!response)
                return false;
            return true;
        }
        catch (error) {
            console.error('Error checking RPC:', error?.message);
            return false;
        }
    }
    async get(isTestnet, maxRetries = 3) {
        const rpcs = isTestnet ? this.testnetRPCs : this.mainnetRPCs;
        for (let i = 0; i < maxRetries; i++) {
            const randomIndex = Math.floor(Math.random() * rpcs.length);
            const rpcUrl = rpcs[randomIndex];
            if (await this.check(rpcUrl)) {
                this._provider = new ethers_1.ethers.JsonRpcProvider(rpcUrl);
                // console.log("Provider:",this._provider)
                return rpcUrl;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        console.log('Could not connect to any RPC');
        return null;
    }
    async walletWithProvider(wallet) {
        try {
            return { address: wallet.address, privatekey: wallet.privateKey };
        }
        catch (error) {
            console.error('Error getting wallet with provider: -> ', error);
            return { address: undefined, privatekey: undefined };
        }
    }
}
exports.RPCManager = RPCManager;
exports.default = RPCManager;
//# sourceMappingURL=rpc.js.map