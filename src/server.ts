import express, { RequestHandler } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { findAvailablePort } from './utils/helper';
import { ContractAnalyzer } from './services/contractAnalyzer';
import { ContractAnalysisModel } from './models/ContractAnalysis';
import { LiquidityAnalyzer } from './services/liquidityAnalyzer';
import { LiquidityAnalysisModel } from './models/LiquidityAnalysis';
import { LiquidityInfoModel } from './models/LiquidityInfo';
import { LockContractModel } from './models/LockContract';

const app = express();

app.use(cors());
app.use(express.json());

// Contract analysis endpoint
const analyzeContract: RequestHandler = async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            res.status(400).json({ error: 'Contract address is required' });
            return;
        }

        // Check if analysis already exists
        const existingAnalysis = await ContractAnalysisModel.findOne({ address });
        if (existingAnalysis) {
            res.json(existingAnalysis);
            return;
        }

        // Analyze contract
        const analyzer = ContractAnalyzer.getInstance();
        const analysis = await analyzer.analyzeContract(address);

        // Save analysis to database
        const savedAnalysis = await ContractAnalysisModel.create(analysis);

        res.json(savedAnalysis);
    } catch (error) {
        logger.error('Error analyzing contract:', error);
        res.status(500).json({ error: 'Failed to analyze contract' });
    }
};

// Get contract analysis endpoint
const getContractAnalysis: RequestHandler = async (req, res) => {
    try {
        const { address } = req.params;
        
        const analysis = await ContractAnalysisModel.findOne({ address });
        if (!analysis) {
            res.status(404).json({ error: 'Contract analysis not found' });
            return;
        }

        res.json(analysis);
    } catch (error) {
        logger.error('Error fetching contract analysis:', error);
        res.status(500).json({ error: 'Failed to fetch contract analysis' });
    }
};

// Liquidity analysis endpoints
const analyzeLiquidity: RequestHandler = async (req, res) => {
    try {
        const { pairAddress } = req.body;
        if (!pairAddress) {
            res.status(400).json({ error: 'Pair address is required' });
            return;
        }

        const analyzer = LiquidityAnalyzer.getInstance();
        const analysis = await analyzer.analyzeLiquidity(pairAddress);
        res.json(analysis);
    } catch (error) {
        logger.error('Error analyzing liquidity:', error);
        res.status(500).json({ error: 'Failed to analyze liquidity' });
    }
};

const getLiquidityAnalysis: RequestHandler = async (req, res) => {
    try {
        const { pairAddress } = req.params;
        const analysis = await LiquidityAnalysisModel.findOne({ pairAddress });
        
        if (!analysis) {
            res.status(404).json({ error: 'Analysis not found' });
            return;
        }
        
        res.json(analysis);
    } catch (error) {
        logger.error('Error getting liquidity analysis:', error);
        res.status(500).json({ error: 'Failed to get liquidity analysis' });
    }
};

const getLiquidityInfo: RequestHandler = async (req, res) => {
    try {
        const { pairAddress } = req.params;
        const info = await LiquidityInfoModel.findOne({ pairAddress });
        
        if (!info) {
            res.status(404).json({ error: 'Liquidity info not found' });
            return;
        }
        
        res.json(info);
    } catch (error) {
        logger.error('Error getting liquidity info:', error);
        res.status(500).json({ error: 'Failed to get liquidity info' });
    }
};

const getLockContracts: RequestHandler = async (req, res) => {
    try {
        const { pairAddress } = req.params;
        const contracts = await LockContractModel.find({ pairAddress });
        
        if (!contracts.length) {
            res.status(404).json({ error: 'No lock contracts found' });
            return;
        }
        
        res.json(contracts);
    } catch (error) {
        logger.error('Error getting lock contracts:', error);
        res.status(500).json({ error: 'Failed to get lock contracts' });
    }
};

app.post('/api/analyze-contract', analyzeContract);
app.get('/api/contract-analysis/:address', getContractAnalysis);
app.post('/api/analyze-liquidity', analyzeLiquidity);
app.get('/api/liquidity-analysis/:pairAddress', getLiquidityAnalysis);
app.get('/api/liquidity-info/:pairAddress', getLiquidityInfo);
app.get('/api/lock-contracts/:pairAddress', getLockContracts);

export async function startServer() {
    try {
        const port = await findAvailablePort();
        app.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
        });
        return port;
    } catch (error) {
        logger.error('Failed to start server:', error);
        throw error;
    }
} 