"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TokenHistory_1 = require("../models/TokenHistory");
const router = express_1.default.Router();
// Get all token history
router.get('/', async (req, res) => {
    try {
        const history = await TokenHistory_1.TokenHistory.find()
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch token history' });
    }
});
// Get history by token address
router.get('/token/:address', async (req, res) => {
    try {
        const address = req.params.address.toLowerCase();
        const history = await TokenHistory_1.TokenHistory.find({
            $or: [
                { 'tokenA.address': address },
                { 'tokenB.address': address }
            ]
        }).sort({ timestamp: -1 });
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch token history' });
    }
});
exports.default = router;
