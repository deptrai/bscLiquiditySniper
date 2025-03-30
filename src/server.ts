import express from 'express';
import cors from 'cors';
import { logger } from './utils/logger';
import { findAvailablePort } from './utils/helper';

const app = express();

app.use(cors());
app.use(express.json());

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