"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapRouter = void 0;
const express_1 = require("express");
const txProcessor_1 = require("../txProcessor");
const router = (0, express_1.Router)();
exports.swapRouter = router;
router.get('/swap', async (req, res) => {
    res.status(200).json({ success: true, message: 'Swap route', data: '' });
});
router.post('/swaps', async (req, res) => {
    const { tokenIn, tokenOut, amountIn, toAddress } = req.body;
    console.log({ tokenIn, tokenOut, amountIn, toAddress });
    // Call swapTokens function
    const swap = await (0, txProcessor_1.swapTokens)(tokenIn, tokenOut, amountIn, toAddress);
    // Return response
    // console.log(swap);
    res.status(200).json({ success: true, message: 'Swap route', data: swap });
});
