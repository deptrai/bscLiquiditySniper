import express from 'express';
import { swapRouter } from './swap';

const router = express.Router();

router.use('/swap', swapRouter);

export const appRouter = router;
