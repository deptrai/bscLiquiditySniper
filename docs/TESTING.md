# BSC Liquidity Sniper - Testing Guide

## 1. Provider Management Testing

### Test Provider Pool
```bash
# Kiểm tra tất cả providers
yarn test:providers

# Kiểm tra từng provider riêng lẻ
yarn test:provider quicknode
yarn test:provider infura
yarn test:provider binance
```

Kết quả mong đợi:
- ✅ Mỗi provider có thể kết nối thành công
- ✅ Trả về block number hiện tại
- ✅ Tốc độ phản hồi < 1000ms
- ✅ Block number từ các provider phải giống nhau

### Test Provider Failover
1. Tắt một provider (ví dụ: Quicknode)
```bash
# Test failover khi provider chính fail
yarn test:provider-failover --primary quicknode --backup infura
```

2. Kiểm tra log để xác nhận:
   - ✅ Hệ thống phát hiện lỗi trong vòng 2s
   - ✅ Tự động chuyển sang provider backup
   - ✅ Ghi log thông báo lỗi
   - ✅ Thời gian chuyển đổi < 5s
   - ✅ Không mất block nào trong quá trình chuyển đổi

### Test Rate Limit Handling
1. Gửi nhiều requests liên tục:
```bash
# Test với 15 req/s trong 1 phút
yarn test:rate-limit --rps 15 --duration 60

# Test với burst requests
yarn test:rate-limit --burst 100
```

2. Kiểm tra:
   - ✅ Hệ thống phát hiện rate limit
   - ✅ Tự động chuyển provider
   - ✅ Đợi 30s trước khi thử lại
   - ✅ Requests được queue và xử lý sau
   - ✅ Không mất requests nào

## 2. Historical Data Testing

### Test Block Range Processing
```bash
# Test xử lý 1000 blocks gần nhất
yarn test:historical --blocks 1000

# Test xử lý range cụ thể
yarn test:historical --from 47890000 --to 47890100

# Test xử lý theo ngày
yarn test:historical --date 2024-03-29

# Test xử lý theo DEX
yarn test:historical --dex pancakeswap --blocks 1000
```

Kiểm tra:
- ✅ Số blocks đã xử lý
- ✅ Số events tìm thấy theo loại:
  - PairCreated (V2)
  - PoolCreated (V3)
  - Swap events
- ✅ Thời gian xử lý:
  - Trung bình/block < 200ms
  - Trung bình/event < 100ms
- ✅ Tỷ lệ lỗi:
  - Block processing < 1%
  - Event processing < 0.1%
  - Provider errors < 0.01%

### Test Event Detection
1. Test với known events:
```bash
# Test với block có PancakeSwap V2 pair creation
yarn test:block 47890517 --type v2

# Test với block có PancakeSwap V3 pool creation
yarn test:block 47890600 --type v3

# Test với block có multiple events
yarn test:block 47890700 --type all
```

2. Verify event data:
```bash
# Verify token pair details
yarn test:pair 0x... --dex pancakeswap

# Verify pool details
yarn test:pool 0x... --dex pancakeswap-v3
```

Kiểm tra:
- ✅ Event detection:
  - Phát hiện đúng loại event
  - Parse đúng parameters
  - Không bỏ sót events
- ✅ Token validation:
  - Verify token addresses
  - Check token metadata
  - Validate decimals
- ✅ Pool validation:
  - Verify pair/pool address
  - Check initial liquidity
  - Validate fee tier (V3)

## 3. Real-time Monitoring Testing

### Test Block Subscription
```bash
# Test real-time mode với các options
yarn dev --mode realtime --providers all
yarn dev --mode realtime --dex pancakeswap
yarn dev --mode realtime --log-level debug
```

Kiểm tra performance:
- ✅ Block detection:
  - Thời gian phát hiện < 2s
  - Không bỏ sót blocks
  - Block order đúng
- ✅ Resource usage:
  - CPU < 50% average
  - Memory < 1GB
  - Network < 100MB/s
- ✅ Stability:
  - Uptime > 99.9%
  - Restart time < 5s
  - No memory leaks

### Test Event Processing Speed
1. Benchmark processing:
```bash
# Benchmark event processing
yarn test:benchmark --events 1000
yarn test:benchmark --parallel 4
yarn test:benchmark --duration 3600
```

2. Monitor metrics:
```bash
# Watch real-time metrics
yarn monitor --metric events
yarn monitor --metric processing-time
yarn monitor --metric error-rate
```

Kiểm tra:
- ✅ Event timing:
  - Detection < 3s
  - Processing < 1s
  - Notification < 5s
- ✅ Accuracy:
  - No false positives
  - No duplicates
  - Correct order
- ✅ Scalability:
  - Linear scaling
  - No degradation
  - Resource efficient

## 4. Database Testing

### Test Token Storage
```bash
# Test token operations
yarn test:token --new 0x...
yarn test:token --update 0x...
yarn test:token --delete 0x...

# Test batch operations
yarn test:token-batch --file tokens.json
yarn test:token-batch --count 1000
```

Verify trong database:
- ✅ Token data:
  - All fields populated
  - Correct types
  - No duplicates
- ✅ Relationships:
  - Linked to pairs
  - Linked to events
  - Correct timestamps
- ✅ Performance:
  - Write speed
  - Query speed
  - Index usage

### Test Block Tracking
```bash
# Test block operations
yarn test:block-status 47890517
yarn test:block-range 47890000 47890100
yarn test:block-cleanup --days 7
```

Verify block data:
- ✅ Status tracking:
  - Correct states
  - State transitions
  - Timestamps
- ✅ Event linking:
  - All events mapped
  - Correct order
  - No orphans
- ✅ Data integrity:
  - No gaps
  - No duplicates
  - Consistent hashes

## 5. Notification Testing

### Test Telegram Notifications
1. Test notification types:
```bash
# Test different notification types
yarn test:notification --type pair-created
yarn test:notification --type high-liquidity
yarn test:notification --type error
yarn test:notification --type system

# Test batch notifications
yarn test:notification-batch --count 10
yarn test:notification-batch --interval 1000
```

Verify notifications:
- ✅ Content:
  - Correct format
  - All data included
  - Links working
- ✅ Timing:
  - Delivery < 5s
  - Rate limiting
  - Retry logic
- ✅ Reliability:
  - No duplicates
  - No missing
  - Error handling

### Test Alert System
```bash
# Test alert conditions
yarn test:alert --condition rate-limit
yarn test:alert --condition high-error
yarn test:alert --condition system-overload

# Test alert levels
yarn test:alert --level warning
yarn test:alert --level critical
yarn test:alert --level emergency
```

Verify alerts:
- ✅ Triggering:
  - Correct conditions
  - Proper thresholds
  - Accurate timing
- ✅ Notifications:
  - Right channels
  - Priority handling
  - Clear actions
- ✅ Resolution:
  - Auto-clear
  - Manual clear
  - History tracking

## 6. Performance Testing

### Test Load Handling
```bash
# Test different load scenarios
yarn test:load --blocks-per-second 100
yarn test:load --events 1000
yarn test:load --duration 3600

# Test parallel processing
yarn test:load --parallel 4
yarn test:load --queue-size 1000
yarn test:load --batch-size 50
```

Monitor metrics:
- ✅ Resource usage:
  - CPU < 70%
  - Memory < 1GB
  - Network stable
- ✅ Processing:
  - No missed events
  - Consistent speed
  - Queue handling
- ✅ Database:
  - Connection pool
  - Query performance
  - Index efficiency

### Test Recovery & Resilience
```bash
# Test recovery scenarios
yarn test:recovery --scenario crash
yarn test:recovery --scenario network-error
yarn test:recovery --scenario db-disconnect

# Test backup systems
yarn test:backup --type provider
yarn test:backup --type database
yarn test:backup --type full
```

Verify recovery:
- ✅ State recovery:
  - Last block
  - Pending tasks
  - Configuration
- ✅ Data integrity:
  - No duplicates
  - No missing data
  - Consistent state
- ✅ Performance:
  - Recovery time
  - Resource usage
  - Service impact

## 7. Security Testing

### Test Access Control
```bash
# Test authentication
yarn test:security --auth basic
yarn test:security --auth token
yarn test:security --auth none

# Test authorization
yarn test:security --role admin
yarn test:security --role user
yarn test:security --role readonly
```

Verify security:
- ✅ Authentication:
  - Token validation
  - Session handling
  - Rate limiting
- ✅ Authorization:
  - Role enforcement
  - Permission checks
  - Audit logging
- ✅ Protection:
  - Input validation
  - SQL injection
  - XSS prevention

### Test Data Protection
```bash
# Test data security
yarn test:security --encrypt
yarn test:security --decrypt
yarn test:security --sanitize

# Test sensitive data
yarn test:security --keys
yarn test:security --credentials
yarn test:security --personal
```

Verify protection:
- ✅ Encryption:
  - Key management
  - Algorithm strength
  - Performance impact
- ✅ Data handling:
  - Sanitization
  - Masking
  - Cleanup
- ✅ Compliance:
  - Logging policy
  - Data retention
  - Access control

## 8. Integration Testing

### Test External Services
```bash
# Test blockchain integration
yarn test:integration --chain bsc
yarn test:integration --provider quicknode
yarn test:integration --contract 0x...

# Test third-party services
yarn test:integration --service telegram
yarn test:integration --service mongodb
yarn test:integration --service metrics
```

Verify integration:
- ✅ Connectivity:
  - Service health
  - Timeout handling
  - Retry logic
- ✅ Data flow:
  - Format matching
  - Transform logic
  - Error handling
- ✅ Performance:
  - Response time
  - Resource usage
  - Bottlenecks

### Test System Integration
```bash
# Test full system
yarn test:system --mode production
yarn test:system --load high
yarn test:system --duration 24h

# Test specific flows
yarn test:system --flow liquidity
yarn test:system --flow notification
yarn test:system --flow recovery
```

Verify system:
- ✅ End-to-end:
  - Complete flows
  - Data consistency
  - Performance
- ✅ Reliability:
  - Error handling
  - Recovery
  - Monitoring
- ✅ Scalability:
  - Load handling
  - Resource usage
  - Bottlenecks

## Logging & Monitoring

### Log Analysis
```bash
# View different log types
yarn logs --type error
yarn logs --type event
yarn logs --type performance

# Filter logs
yarn logs --level debug
yarn logs --service provider
yarn logs --date 2024-03-29
```

### Metrics Monitoring
```bash
# Monitor real-time metrics
yarn monitor --metric blocks
yarn monitor --metric events
yarn monitor --metric errors

# View historical metrics
yarn metrics --range 24h
yarn metrics --type performance
yarn metrics --format chart
```

### System Health
```bash
# Check system status
yarn health --check all
yarn health --service provider
yarn health --component database

# View system metrics
yarn stats --resource cpu
yarn stats --resource memory
yarn stats --resource network
``` 