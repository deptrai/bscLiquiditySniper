"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.txProcessor = exports.TransactionProcessor = void 0;
const ethers_1 = require("ethers");
const tokenService_1 = require("../services/tokenService");
class TransactionProcessor {
    constructor() {
        this.tokenService = tokenService_1.TokenService.getInstance();
    }
    static getInstance() {
        if (!TransactionProcessor.instance) {
            TransactionProcessor.instance = new TransactionProcessor();
        }
        return TransactionProcessor.instance;
    }
    async processV2Event(event) {
        try {
            const [tokenA, tokenB, pair] = ethers_1.ethers.AbiCoder.defaultAbiCoder().decode(['address', 'address', 'address'], event.data);
            const [tokenAInfo, tokenBInfo] = await Promise.all([
                this.tokenService.getTokenInfo(tokenA),
                this.tokenService.getTokenInfo(tokenB)
            ]);
            console.log(`New V2 Pair Created: ${tokenAInfo.symbol}/${tokenBInfo.symbol}`);
            console.log(`Pair Address: ${pair}`);
            console.log(`Transaction: ${event.transactionHash}`);
        }
        catch (error) {
            console.error('Error processing V2 event:', error);
        }
    }
    async processV3Event(event) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [tokenA, tokenB, fee, tickLower, tickUpper, pool] = ethers_1.ethers.AbiCoder.defaultAbiCoder().decode(['address', 'address', 'uint24', 'int24', 'int24', 'address'], event.data);
            const [tokenAInfo, tokenBInfo] = await Promise.all([
                this.tokenService.getTokenInfo(tokenA),
                this.tokenService.getTokenInfo(tokenB)
            ]);
            console.log(`New V3 Pool Created: ${tokenAInfo.symbol}/${tokenBInfo.symbol}`);
            console.log(`Fee: ${fee}`);
            console.log(`Pool Address: ${pool}`);
            console.log(`Transaction: ${event.transactionHash}`);
        }
        catch (error) {
            console.error('Error processing V3 event:', error);
        }
    }
}
exports.TransactionProcessor = TransactionProcessor;
exports.txProcessor = TransactionProcessor.getInstance();
