import { ethers } from 'ethers';
import { ProviderPool } from '../services/providerPool';
import { logger } from '../utils/logger';

async function runTests() {
    logger.info('Starting ProviderPool tests...');
    
    // Test 1: Kiểm tra khởi tạo providers
    try {
        const pool = new ProviderPool();
        // @ts-ignore - truy cập private property để test
        const providers = pool['providers'];
        if (!Array.isArray(providers) || providers.length === 0) {
            throw new Error('Providers should be initialized as non-empty array');
        }
        logger.info('✅ Test 1 passed: Providers initialized correctly');
    } catch (error) {
        logger.error('❌ Test 1 failed:', error);
        return;
    }

    // Test 2: Kiểm tra chuyển provider khi gặp lỗi
    try {
        const pool = new ProviderPool();
        // @ts-ignore
        const initialIndex = pool['currentIndex'];
        await pool['switchProvider']();
        // @ts-ignore
        const newIndex = pool['currentIndex'];
        
        if (initialIndex === newIndex) {
            throw new Error('Provider index should change after switching');
        }
        logger.info('✅ Test 2 passed: Provider switching works');
    } catch (error) {
        logger.error('❌ Test 2 failed:', error);
        return;
    }

    // Test 3: Kiểm tra retry khi gặp lỗi
    try {
        const pool = new ProviderPool();
        const mockProvider = {
            getBlockNumber: async () => { throw new Error('Simulated failure'); }
        };
        
        // @ts-ignore
        pool['providers'] = Array(4).fill(mockProvider);
        
        try {
            await pool.getBlockNumber();
            throw new Error('Should have failed with retry error');
        } catch (error: any) {
            if (!error.message.includes('Failed to get block number after')) {
                throw error;
            }
        }
        logger.info('✅ Test 3 passed: Retry mechanism works');
    } catch (error) {
        logger.error('❌ Test 3 failed:', error);
        return;
    }

    // Test 4: Kiểm tra xử lý rate limit
    try {
        const pool = new ProviderPool();
        const mockProvider = {
            getLogs: async () => { throw new Error('rate limit exceeded'); }
        };
        
        // @ts-ignore
        pool['providers'] = Array(4).fill(mockProvider);
        
        try {
            await pool.getLogs({
                address: '0x0000000000000000000000000000000000000000',
                fromBlock: 0,
                toBlock: 1
            });
            throw new Error('Should have failed with rate limit error');
        } catch (error: any) {
            if (!error.message.includes('Failed to get logs after')) {
                throw error;
            }
        }
        logger.info('✅ Test 4 passed: Rate limit handling works');
    } catch (error) {
        logger.error('❌ Test 4 failed:', error);
        return;
    }

    // Test 5: Kiểm tra lấy block number thực tế
    try {
        const pool = new ProviderPool();
        const blockNumber = await pool.getBlockNumber();
        if (typeof blockNumber !== 'number' || blockNumber <= 0) {
            throw new Error('Invalid block number received');
        }
        logger.info(`✅ Test 5 passed: Got block number ${blockNumber}`);
    } catch (error) {
        logger.error('❌ Test 5 failed:', error);
        return;
    }

    logger.info('All tests completed successfully! 🎉');
}

// Chạy test
runTests().catch(error => {
    logger.error('Test suite failed:', error);
    process.exit(1);
}); 