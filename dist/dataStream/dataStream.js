"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataStream = void 0;
const config_1 = require("../config");
const dataStream = async () => {
    console.log('Streaming BSC data...');
    const provider = config_1.config.PROVIDER;
    const router = config_1.config.PANCAKESWAP.V2_ROUTER;
    let transactionCount = 0;
    let lastTransactionTime = Date.now();
    try {
        provider.on('pending', async (txHash) => {
            const currentTime = Date.now();
            // Check for cooldown to avoid exceeding request limits
            if (currentTime - lastTransactionTime < 1000) {
                console.log('Cooldown active. Skipping transaction.');
                return;
            }
            lastTransactionTime = currentTime;
            const tx = await provider.getTransaction(txHash);
            if (tx &&
                tx.to &&
                tx.to.toLowerCase() &&
                tx.data !== null &&
                tx.chainId === BigInt(56)) {
                transactionCount++;
                const txContents = {
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    gasPrice: tx.gasPrice,
                    gasLimit: tx.gasLimit,
                    value: tx.value,
                    nonce: tx.nonce,
                    data: tx.data,
                    chainId: tx.chainId,
                };
                // console.log('Transaction: ', txContents);
                if (transactionCount >= 15) {
                    console.log('Cooldown initiated after 15 transactions.');
                    transactionCount = 0;
                    await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second cooldown
                }
                // Proccess the transaction
            }
        });
    }
    catch (error) {
        console.log('Error streaming data: ', error);
    }
};
exports.dataStream = dataStream;
//# sourceMappingURL=dataStream.js.map