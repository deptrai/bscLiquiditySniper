import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';

const app = express();

export function startServer() {
    const port = config.APP.PORT;
    app.listen(port, () => {
        logger.info(`Server is running on port ${port}`);
    });
} 