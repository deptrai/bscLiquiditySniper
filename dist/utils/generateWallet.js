"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWallet = void 0;
const ethers_1 = require("ethers");
const generateWallet = () => {
    const wallet = ethers_1.ethers.Wallet.createRandom();
    return {
        privateKey: wallet.privateKey,
        publicKey: wallet.address
    };
};
exports.generateWallet = generateWallet;
// Generate and display wallet if run directly
if (require.main === module) {
    const wallet = (0, exports.generateWallet)();
    console.log('Generated Wallet:');
    console.log('Public Key (Address):', wallet.publicKey);
    console.log('Private Key:', wallet.privateKey);
    console.log('\nIMPORTANT: Save these keys securely!');
}
