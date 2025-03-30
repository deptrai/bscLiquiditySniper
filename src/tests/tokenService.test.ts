import { ethers } from 'ethers';
import { ProviderPool } from '../services/providerPool';
import { TokenService } from '../services/tokenService';
import { logger } from '../utils/logger';

async function runTests() {
    logger.info('Starting TokenService tests...');
    
    // Test 1: Kiểm tra khởi tạo TokenService
    try {
        const provider = new ProviderPool();
        const service = TokenService.getInstance(provider);
        logger.info('✅ Test 1 passed: TokenService initialized correctly');
    } catch (error) {
        logger.error('❌ Test 1 failed:', error);
        return;
    }

    // Test 2: Kiểm tra lấy thông tin token
    try {
        const provider = new ProviderPool();
        const service = TokenService.getInstance(provider);
        
        // Test với WBNB token
        const wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        const token = await service.getToken(wbnbAddress);
        
        if (!token || token.address !== wbnbAddress) {
            throw new Error('Invalid token data');
        }
        
        logger.info('✅ Test 2 passed: Token info fetched correctly');
    } catch (error) {
        logger.error('❌ Test 2 failed:', error);
        return;
    }

    // Test 3: Kiểm tra lấy thông tin pair
    try {
        const provider = new ProviderPool();
        const service = TokenService.getInstance(provider);
        
        // Test với WBNB-BUSD pair trên PancakeSwap V2
        const pairAddress = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16'; // WBNB-BUSD pair
        const pair = await service.getPair(pairAddress, 'PANCAKESWAP');
        
        if (!pair || pair.pairAddress !== pairAddress) {
            throw new Error('Invalid pair data');
        }
        
        logger.info('✅ Test 3 passed: Pair info fetched correctly');
    } catch (error) {
        logger.error('❌ Test 3 failed:', error);
        return;
    }

    // Test 4: Kiểm tra cache
    try {
        const provider = new ProviderPool();
        const service = TokenService.getInstance(provider);
        
        // Lấy token lần đầu
        const wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        const token1 = await service.getToken(wbnbAddress);
        
        // Lấy token lần thứ hai (nên lấy từ cache)
        const token2 = await service.getToken(wbnbAddress);
        
        if (token1 !== token2) {
            throw new Error('Cache not working');
        }
        
        logger.info('✅ Test 4 passed: Cache working correctly');
    } catch (error) {
        logger.error('❌ Test 4 failed:', error);
        return;
    }

    // Test 5: Kiểm tra cập nhật stats
    try {
        const provider = new ProviderPool();
        const service = TokenService.getInstance(provider);
        
        const wbnbAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        await service.updateTokenStats(wbnbAddress);
        
        const pairAddress = '0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16'; // WBNB-BUSD pair
        await service.updatePairStats(pairAddress);
        
        logger.info('✅ Test 5 passed: Stats updated successfully');
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