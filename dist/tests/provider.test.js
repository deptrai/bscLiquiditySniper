"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testProvider = testProvider;
exports.testAllProviders = testAllProviders;
const ethers_1 = require("ethers");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
async function testProvider(url) {
    try {
        logger_1.logger.info(`Testing provider: ${url}`);
        const startTime = Date.now();
        // Create provider
        const provider = new ethers_1.ethers.JsonRpcProvider(url);
        // Test connection by getting block number
        const blockNumber = await provider.getBlockNumber();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        logger_1.logger.info(`✅ Provider ${url} is working`);
        logger_1.logger.info(`✅ Current block: ${blockNumber}`);
        logger_1.logger.info(`✅ Response time: ${responseTime}ms`);
        return {
            success: true,
            blockNumber,
            responseTime
        };
    }
    catch (error) {
        logger_1.logger.error(`❌ Provider ${url} failed:`, error);
        return {
            success: false,
            error
        };
    }
}
async function testAllProviders() {
    const providers = [
        config_1.config.RPC.QUICKNODE,
        config_1.config.RPC.INFURA,
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org'
    ];
    logger_1.logger.info('🔍 Starting provider tests...\n');
    const results = await Promise.all(providers.map(testProvider));
    logger_1.logger.info('\n📊 Test Results Summary:');
    results.forEach((result, index) => {
        const provider = providers[index];
        if (result.success) {
            logger_1.logger.info(`✅ ${provider}: OK (${result.responseTime}ms)`);
        }
        else {
            logger_1.logger.error(`❌ ${provider}: Failed`);
        }
    });
    const successCount = results.filter(r => r.success).length;
    logger_1.logger.info(`\n🎯 ${successCount}/${providers.length} providers working\n`);
    return results;
}
// If running directly (not imported)
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length > 0) {
        // Test specific provider
        const provider = args[0];
        let url;
        switch (provider.toLowerCase()) {
            case 'quicknode':
                url = config_1.config.RPC.QUICKNODE;
                break;
            case 'infura':
                url = config_1.config.RPC.INFURA;
                break;
            case 'binance':
                url = 'https://bsc-dataseed1.binance.org';
                break;
            default:
                logger_1.logger.error('Invalid provider. Use: quicknode, infura, or binance');
                process.exit(1);
        }
        testProvider(url);
    }
    else {
        // Test all providers
        testAllProviders();
    }
}
//# sourceMappingURL=provider.test.js.map