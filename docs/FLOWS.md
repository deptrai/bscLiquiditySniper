# BSC Liquidity Sniper - Processing Flows

## 1. Provider Management Flow

### Provider Initialization
1. Initialize multiple RPC providers:
   - Quicknode
   - Infura
   - Binance nodes (bsc-dataseed1.binance.org, bsc-dataseed2.binance.org)
2. Create provider pool for load balancing
3. Implement auto-switching mechanism when:
   - Rate limit is hit (wait 30s)
   - Provider error occurs (wait 20s)
   - General errors (wait 10s)

### Provider Pool Features
- Round-robin provider selection
- Provider health monitoring
- Automatic fallback to next provider
- Rate limit handling
- Maximum 10 retry attempts per operation

## 2. Historical Data Processing Flow

### Initial Setup
1. Get current block number from provider
2. Retrieve last processed block from database
3. Calculate start block:
   - If last processed block exists: lastProcessedBlock + 1
   - Otherwise: currentBlock - 1000

### Block Processing
1. Process blocks in batches of 100
2. For each batch:
   - Fetch block transactions and events
   - Process found events
   - Mark blocks as processed
   - Wait 200ms between batches (rate limit)

### Event Types Monitored
1. PancakeSwap V2: `PairCreated(address,address,address,uint256)`
2. PancakeSwap V3: `PoolCreated(address,address,uint24,uint24,address)`
3. Other DEXes: `PairCreated(address,address,address,uint256)`

### DEXes Monitored
1. PancakeSwap (V2 & V3)
2. MDEX
3. JULSWAP
4. WAULTSWAP
5. APESWAP
6. BISWAP
7. BABYSWAP
8. BAKERYSWAP
9. KNIGHTSWAP

## 3. Real-time Monitoring Flow

### Block Monitoring
1. Start from last processed block
2. Check for new blocks every 500ms
3. Process in small batches of 5 blocks
4. Minimum 100ms between requests

### New Block Processing
1. Detect new blocks
2. Process blocks in small batches
3. For each batch:
   - Fetch and process events
   - Process transactions
   - Mark blocks as processed
   - Wait 100ms between batches

## 4. Event Processing Flow

### Event Validation
1. Check event structure
2. Validate required properties (topics, data)
3. Extract token addresses:
   - Token A from topics[1]
   - Token B from topics[2]
   - Pair address from data

### Token Processing
1. Convert addresses to checksum format
2. Fetch token information:
   - Symbol
   - Name
   - Decimals
3. Save token data to database
4. Create token history record
5. Update pool information

### Notification System
1. Monitor for new token pairs with WBNB
2. Generate detailed notification:
   - Token information
   - Pool details
   - BSCScan links
   - PancakeSwap links
3. Send to Telegram

## 5. Error Handling Flow

### Provider Errors
1. Rate limit exceeded:
   - Switch provider
   - Wait 30 seconds
   - Retry operation

2. Provider unavailable:
   - Switch provider
   - Wait 20 seconds
   - Retry operation

3. General errors:
   - Switch provider
   - Wait 10 seconds
   - Retry operation

### Block Processing Errors
1. Maximum 10 retry attempts
2. Mark blocks as failed after max attempts
3. Continue with next batch

### Event Processing Errors
1. Log error details
2. Save error event data
3. Continue with next event

## 6. Database Operations Flow

### Token Updates
1. Find or create token record
2. Update token information:
   - Address
   - Symbol
   - Name
   - Decimals
   - Last updated timestamp
3. Add new pool information

### Block Tracking
1. Check if block already processed
2. Create new block record:
   - Block number
   - Processing status
   - Timestamp
3. Update status on completion

### Token History
1. Create new history record:
   - Block number
   - Transaction hash
   - Token information
   - Pair address
   - DEX information
2. Save to database

## 7. Rate Limiting Strategy

### Request Spacing
- 200ms between historical batches
- 100ms between real-time batches
- 500ms between new block checks
- 100ms minimum between provider requests

### Batch Sizes
- Historical: 100 blocks
- Real-time: 5 blocks
- Provider retry: 10 attempts max

### Error Backoff
- Rate limit: 30s wait
- Provider error: 20s wait
- General error: 10s wait
- Block processing error: 1s wait 