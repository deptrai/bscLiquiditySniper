import { ethers } from 'ethers';

export const generateWallet = () => {
    const wallet = ethers.Wallet.createRandom();
    return {
        privateKey: wallet.privateKey,
        publicKey: wallet.address
    };
};

// Generate and display wallet if run directly
if (require.main === module) {
    const wallet = generateWallet();
    console.log('Generated Wallet:');
    console.log('Public Key (Address):', wallet.publicKey);
    console.log('Private Key:', wallet.privateKey);
    console.log('\nIMPORTANT: Save these keys securely!');
} 