import { ethers } from 'ethers';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sleep } from '../utils/helper';

interface ProviderState {
    provider: ethers.Provider;
    requestCount: number;
    lastRequestTime: number;
    rateLimitUntil: number;
    consecutiveErrors: number;
    logsRequestCount: number;
    lastLogsRequestTime: number;
}

export class ProviderPool {
    private providers: ProviderState[];
    private currentIndex: number;
    private readonly requestsPerSecond = 10; // More conservative than 15
    private readonly logsRequestsPerSecond = 2; // Very conservative for eth_getLogs
    private readonly requestWindow = 1000; // 1 second window
    private readonly logsRequestWindow = 5000; // 5 second window for eth_getLogs
    private readonly minBackoffDelay = 5000; // 5 seconds
    private readonly maxBackoffDelay = 60000; // 60 seconds

    constructor() {
        this.providers = [
            new ethers.JsonRpcProvider(config.RPC.QUICKNODE),
            new ethers.JsonRpcProvider(config.RPC.INFURA),
            new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org'),
            new ethers.JsonRpcProvider('https://bsc-dataseed2.binance.org')
        ].map(provider => ({
            provider,
            requestCount: 0,
            lastRequestTime: 0,
            rateLimitUntil: 0,
            consecutiveErrors: 0,
            logsRequestCount: 0,
            lastLogsRequestTime: 0
        }));
        this.currentIndex = 0;
    }

    private calculateBackoff(consecutiveErrors: number): number {
        const backoff = Math.min(
            this.maxBackoffDelay,
            this.minBackoffDelay * Math.pow(2, consecutiveErrors)
        );
        // Add jitter to prevent thundering herd
        return backoff * (0.5 + Math.random());
    }

    private async enforceRateLimit(state: ProviderState, isLogsRequest: boolean = false): Promise<void> {
        const now = Date.now();
        
        // Check if rate limited
        if (now < state.rateLimitUntil) {
            const waitTime = state.rateLimitUntil - now;
            logger.warn(`Provider ${this.currentIndex} rate limited until ${new Date(state.rateLimitUntil).toISOString()}`);
            await sleep(waitTime);
            return;
        }

        if (isLogsRequest) {
            // Reset logs request count if window has passed
            if (now - state.lastLogsRequestTime >= this.logsRequestWindow) {
                state.logsRequestCount = 0;
                state.lastLogsRequestTime = now;
            }

            // If we've hit the logs rate limit, wait for the next window
            if (state.logsRequestCount >= this.logsRequestsPerSecond) {
                const waitTime = this.logsRequestWindow - (now - state.lastLogsRequestTime);
                await sleep(waitTime);
                state.logsRequestCount = 0;
                state.lastLogsRequestTime = Date.now();
            }

            state.logsRequestCount++;
        } else {
            // Reset request count if window has passed
            if (now - state.lastRequestTime >= this.requestWindow) {
                state.requestCount = 0;
                state.lastRequestTime = now;
            }

            // If we've hit the rate limit, wait for the next window
            if (state.requestCount >= this.requestsPerSecond) {
                const waitTime = this.requestWindow - (now - state.lastRequestTime);
                await sleep(waitTime);
                state.requestCount = 0;
                state.lastRequestTime = Date.now();
            }

            state.requestCount++;
        }
    }

    private async switchProvider(): Promise<void> {
        const now = Date.now();
        let attempts = 0;
        const maxAttempts = this.providers.length * 2;

        while (attempts < maxAttempts) {
            this.currentIndex = (this.currentIndex + 1) % this.providers.length;
            const state = this.providers[this.currentIndex];

            // Skip if rate limited
            if (now < state.rateLimitUntil) {
                attempts++;
                continue;
            }

            // Skip if too many requests in current window
            if (now - state.lastRequestTime < this.requestWindow && 
                state.requestCount >= this.requestsPerSecond) {
                attempts++;
                continue;
            }

            // Skip if too many logs requests in current window
            if (now - state.lastLogsRequestTime < this.logsRequestWindow && 
                state.logsRequestCount >= this.logsRequestsPerSecond) {
                attempts++;
                continue;
            }

            // Found a usable provider
            await sleep(1000); // Longer delay before using new provider
            return;
        }

        // If we get here, all providers are busy
        const nextAvailable = Math.min(
            ...this.providers.map(p => 
                Math.max(
                    p.rateLimitUntil,
                    p.lastRequestTime + this.requestWindow,
                    p.lastLogsRequestTime + this.logsRequestWindow
                )
            )
        );
        const waitTime = nextAvailable - now;
        logger.warn(`All providers busy. Waiting ${waitTime}ms for next available provider...`);
        await sleep(waitTime);
    }

    private getCurrentState(): ProviderState {
        return this.providers[this.currentIndex];
    }

    async getBlockNumber(): Promise<number> {
        const maxRetries = 5;
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            const state = this.getCurrentState();
            
            try {
                await this.enforceRateLimit(state);
                const blockNumber = await state.provider.getBlockNumber();
                
                // Success - reset error count
                state.consecutiveErrors = 0;
                return blockNumber;
            } catch (error: any) {
                lastError = error;
                state.consecutiveErrors++;
                
                if (error.message?.includes('rate limit')) {
                    state.rateLimitUntil = Date.now() + this.calculateBackoff(state.consecutiveErrors);
                }
                
                await this.switchProvider();
            }
        }

        throw new Error(`Failed to get block number after ${maxRetries} retries. Last error: ${lastError}`);
    }

    async getLogs(filter: ethers.Filter): Promise<ethers.Log[]> {
        const maxRetries = 5;
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            const state = this.getCurrentState();
            
            try {
                await this.enforceRateLimit(state, true); // true for logs request
                const logs = await state.provider.getLogs(filter);
                
                // Success - reset error count
                state.consecutiveErrors = 0;
                return logs;
            } catch (error: any) {
                lastError = error;
                state.consecutiveErrors++;
                
                if (error.message?.includes('rate limit')) {
                    state.rateLimitUntil = Date.now() + this.calculateBackoff(state.consecutiveErrors);
                }
                
                await this.switchProvider();
            }
        }

        throw new Error(`Failed to get logs after ${maxRetries} retries. Last error: ${lastError}`);
    }

    async getBlock(blockNumber: number, includeTransactions: boolean = false): Promise<ethers.Block> {
        const maxRetries = 5;
        let lastError;

        for (let i = 0; i < maxRetries; i++) {
            const state = this.getCurrentState();
            
            try {
                await this.enforceRateLimit(state);
                const block = await state.provider.getBlock(blockNumber, includeTransactions);
                
                if (!block) {
                    throw new Error(`Block ${blockNumber} not found`);
                }
                
                // Success - reset error count
                state.consecutiveErrors = 0;
                return block;
            } catch (error: any) {
                lastError = error;
                state.consecutiveErrors++;
                
                if (error.message?.includes('rate limit')) {
                    state.rateLimitUntil = Date.now() + this.calculateBackoff(state.consecutiveErrors);
                }
                
                await this.switchProvider();
            }
        }

        throw new Error(`Failed to get block ${blockNumber} after ${maxRetries} retries. Last error: ${lastError}`);
    }
} 