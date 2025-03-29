import express from 'express';
import { TokenHistory } from '../models/TokenHistory';

const router = express.Router();

// Get all token history
router.get('/', async (req, res) => {
    try {
        const history = await TokenHistory.find()
            .sort({ timestamp: -1 })
            .limit(100);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch token history' });
    }
});

// Get history by token address
router.get('/token/:address', async (req, res) => {
    try {
        const address = req.params.address.toLowerCase();
        const history = await TokenHistory.find({
            $or: [
                { 'tokenA.address': address },
                { 'tokenB.address': address }
            ]
        }).sort({ timestamp: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch token history' });
    }
});

export default router; 