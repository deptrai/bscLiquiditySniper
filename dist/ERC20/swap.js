"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapTokenForETH = exports.swapETHforToken = exports.swapToken = exports.approveAllowance = exports.getAllowance = exports.getWalletNonce = exports.getAmountsOut = exports.getTokenBalance = void 0;
const pancakeswap_json_1 = __importDefault(require("../ABI/pancakeswap.json"));
const ethers_1 = require("ethers");
const config_1 = require("../config");
if (!config_1.config.WALLET.secretKey) {
    throw new Error('Secret key not found in config');
}
if (!config_1.config.PANCAKESWAP.V2_ROUTER) {
    throw new Error('V2 Router address not found in config');
}
// Initialize signer and account
const signer = new ethers_1.ethers.Wallet(config_1.config.WALLET.secretKey);
const account = signer.connect(config_1.config.PROVIDER);
// Initialize contract with validated V2_ROUTER
const contract = new ethers_1.ethers.Contract(config_1.config.PANCAKESWAP.V2_ROUTER, pancakeswap_json_1.default, account);
// getTokenBalance
const getTokenBalance = async (tokenAddress, wallet) => {
    try {
        const contract = new ethers_1.ethers.Contract(tokenAddress, pancakeswap_json_1.default, config_1.config.PROVIDER);
        const balance = await contract.balanceOf(wallet);
        return { success: true, data: balance };
    }
    catch (error) {
        console.log('Error getting balance:', error);
        return { success: false, data: error };
    }
};
exports.getTokenBalance = getTokenBalance;
// GetAmountsOut
const getAmountsOut = async (amountIn, path) => {
    const amountsOutABI = [
        'function getAmountsOut(uint amountIn, address[] memory path) public view  returns (uint[] memory amounts)',
    ];
    const contract = new ethers_1.ethers.Contract(config_1.config.PANCAKESWAP.V2_ROUTER, amountsOutABI, config_1.config.PROVIDER);
    try {
        const amounts = await contract.getAmountsOut(amountIn, path);
        console.log('AMOUNTS:', amounts);
        return amounts;
    }
    catch (error) {
        console.log('Error getting amounts:', error);
        return null;
    }
};
exports.getAmountsOut = getAmountsOut;
// Get walletNonce
const getWalletNonce = async (wallet) => {
    try {
        const nonce = await config_1.config.PROVIDER.getTransactionCount(wallet);
        return { success: true, data: nonce };
    }
    catch (error) {
        console.log('Error getting nonce:', error);
        return { success: false, data: 0 };
    }
};
exports.getWalletNonce = getWalletNonce;
// Get Allowance for token
const getAllowance = async (token) => {
    try {
        const contract = new ethers_1.ethers.Contract(token, pancakeswap_json_1.default, account);
        const allowance = await contract.allowance(account, config_1.config.PANCAKESWAP.V2_ROUTER);
        const decimals = await contract.decimals();
        return ethers_1.ethers.formatUnits(allowance, decimals);
    }
    catch (error) {
        return '0';
    }
};
exports.getAllowance = getAllowance;
// Approve Allowance
const approveABI = [
    'function approve(address _spender, uint256 _value) public returns (bool success)',
];
const MAX_INT = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
const approveAllowance = async (token) => {
    try {
        const overloads = {
            gasPrice: 2000000000,
            gasLimit: 300000,
        };
        console.log('APPROVING ALLOWANCE');
        const contract = new ethers_1.ethers.Contract(token, approveABI, account);
        const approveTx = await contract.approve(config_1.config.PANCAKESWAP.V2_ROUTER, MAX_INT, overloads);
        // await approveTx.wait();
        return { success: true, data: approveTx };
    }
    catch (error) {
        console.log('Error approving allowance:', error);
        return { success: false, data: error };
    }
};
exports.approveAllowance = approveAllowance;
// SwapTokens
const swapToken = async (amountIn, amountOutMin, path, to, deadline, overloads) => {
    try {
        const transaction = await contract.swapExactTokensForTokensSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline, overloads);
        // await transaction.wait();
        return { success: true, data: transaction };
    }
    catch (error) {
        console.log('Error swapping tokens:', error);
        return { success: false, data: error };
    }
};
exports.swapToken = swapToken;
// SwapETH
const swapETHforToken = async (amountOutMin, path, to, amountIn, overloads) => {
    try {
        const deadline = Math.floor(Date.now() / 1000) + 60 * 2; // 2 minutes
        const _overloads = {
            ...overloads,
            value: amountIn,
        };
        const transaction = await contract.swapExactETHForTokensSupportingFeeOnTransferTokens(amountOutMin, path, to, deadline, _overloads);
        // await transaction.wait();
        return { success: true, data: transaction };
    }
    catch (error) {
        console.log('Error swapping ETH:', error);
        return { success: false, data: error };
    }
};
exports.swapETHforToken = swapETHforToken;
// SwapTokenForETH
const swapTokenForETH = async (amountIn, amountOutMin, path, to, deadline, overloads) => {
    console.log(`SWAPPING TOKEN FOR ETH: ${amountIn}, ${amountOutMin}, ${path}, ${to}, ${deadline}, ${overloads}`);
    try {
        const transaction = await contract.swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, to, deadline, overloads);
        return { success: true, data: transaction };
    }
    catch (error) {
        console.log('Error swapping tokens:', error);
        return { success: false, data: error };
    }
};
exports.swapTokenForETH = swapTokenForETH;
