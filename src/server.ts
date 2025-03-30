import express, { RequestHandler } from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { findAvailablePort } from './utils/helper';
import { ContractAnalyzer } from './services/contractAnalyzer';
import { ContractAnalysisModel } from './models/ContractAnalysis';

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

app.post('/api/analyze-contract', analyzeContract);
app.get('/api/contract-analysis/:address', getContractAnalysis);

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