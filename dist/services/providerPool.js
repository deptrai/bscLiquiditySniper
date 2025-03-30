"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderPool = void 0;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const helper_1 = require("../utils/helper");
class ProviderPool {
    constructor() {
        this.requestsPerSecond = 10; // More conservative than 15
        this.logsRequestsPerSecond = 2; // Very conservative for eth_getLogs
        this.requestWindow = 1000; // 1 second window
        this.logsRequestWindow = 5000; // 5 second window for eth_getLogs
        this.minBackoffDelay = 5000; // 5 seconds
        this.maxBackoffDelay = 60000; // 60 seconds
        this.providers = [
            new ethers_1.ethers.JsonRpcProvider(config_1.config.RPC.QUICKNODE),
            new ethers_1.ethers.JsonRpcProvider(config_1.config.RPC.INFURA),
            new ethers_1.ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org'),
            new ethers_1.ethers.JsonRpcProvider('https://bsc-dataseed2.binance.org')
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
    calculateBackoff(consecutiveErrors) {
        const backoff = Math.min(this.maxBackoffDelay, this.minBackoffDelay * Math.pow(2, consecutiveErrors));
        // Add jitter to prevent thundering herd
        return backoff * (0.5 + Math.random());
    }
    async enforceRateLimit(state, isLogsRequest = false) {
        const now = Date.now();
        // Check if rate limited
        if (now < state.rateLimitUntil) {
            const waitTime = state.rateLimitUntil - now;
            logger_1.logger.warn(`Provider ${this.currentIndex} rate limited until ${new Date(state.rateLimitUntil).toISOString()}`);
            await (0, helper_1.sleep)(waitTime);
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
                await (0, helper_1.sleep)(waitTime);
                state.logsRequestCount = 0;
                state.lastLogsRequestTime = Date.now();
            }
            state.logsRequestCount++;
        }
        else {
            // Reset request count if window has passed
            if (now - state.lastRequestTime >= this.requestWindow) {
                state.requestCount = 0;
                state.lastRequestTime = now;
            }
            // If we've hit the rate limit, wait for the next window
            if (state.requestCount >= this.requestsPerSecond) {
                const waitTime = this.requestWindow - (now - state.lastRequestTime);
                await (0, helper_1.sleep)(waitTime);
                state.requestCount = 0;
                state.lastRequestTime = Date.now();
            }
            state.requestCount++;
        }
    }
    async switchProvider() {
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
            await (0, helper_1.sleep)(1000); // Longer delay before using new provider
            return;
        }
        // If we get here, all providers are busy
        const nextAvailable = Math.min(...this.providers.map(p => Math.max(p.rateLimitUntil, p.lastRequestTime + this.requestWindow, p.lastLogsRequestTime + this.logsRequestWindow)));
        const waitTime = nextAvailable - now;
        logger_1.logger.warn(`All providers busy. Waiting ${waitTime}ms for next available provider...`);
        await (0, helper_1.sleep)(waitTime);
    }
    getCurrentState() {
        return this.providers[this.currentIndex];
    }
    getProvider() {
        return this.getCurrentState().provider;
    }
    async getBlockNumber() {
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
            }
            catch (error) {
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
    async getLogs(filter) {
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
            }
            catch (error) {
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
    async getBlock(blockNumber, includeTransactions = false) {
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
            }
            catch (error) {
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
exports.ProviderPool = ProviderPool;
//# sourceMappingURL=providerPool.js.map