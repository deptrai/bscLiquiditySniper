# BSC Liquidity Sniper - Features Documentation

## 1. Core Features
### 1.1 Liquidity Event Monitoring
- Monitor new pair creation events (PairCreated) on PancakeSwap V2
- Monitor new pool creation events (PoolCreated) on PancakeSwap V3
- Store event history in MongoDB

### 1.2 Data Processing
- WebSocket connection for real-time event listening
- HTTP connection for data querying
- RPC and WebSocket load balancing system
- Automatic provider switching on errors

## 2. Storage Features
### 2.1 Database
- Store token history in MongoDB
- Store liquidity events
- Store token pair information

## 3. Notification Features
### 3.1 Telegram Integration
- Send notifications for new events
- Send error notifications
- Send bot status updates (start/stop)

## 4. API Features
### 4.1 Endpoints
- Token history query endpoint
- Liquidity events query endpoint
- Bot status check endpoint

## 5. Monitoring Features
### 5.1 Logging
- Detailed event logging
- Error logging
- Connection status monitoring
- Bot performance monitoring

## 6. Security Features
### 6.1 Authentication
- Telegram user authentication
- API access control
- Sensitive endpoint protection

## 7. Error Handling
### 7.1 Recovery
- Automatic connection retry
- Automatic provider switching
- Detailed error logging for debugging

## 8. Configuration
### 8.1 Flexibility
- Environment variable configuration
- Customizable RPC and WebSocket URLs
- Configurable token watch list

## 9. Optimization
### 9.1 Performance
- Block range splitting to avoid rate limits
- Data caching
- Parallel event processing

## 10. Multi-DEX Support
- **PancakeSwap**
  - V2 Pools
  - V3 Pools
  - Smart Router
- **Biswap**
  - V2 Pools
- **MDEX**
  - V2 Pools
- **BabySwap**
  - V2 Pools
- **ApeSwap**
  - V2 Pools
- **JulSwap**
  - V2 Pools
- **BakerySwap**
  - V2 Pools
- **KnightSwap**
  - V2 Pools
- **WaultSwap**
  - V2 Pools

## 11. Token Monitoring
- **New Token Detection**
  - Monitors all DEXes for new token pairs
  - Supports both V2 and V3 pools
  - Real-time notifications via Telegram
  - Includes token metadata (symbol, name, decimals)

- **Pool Tracking**
  - Tracks all pools for each token
  - Records pool type (V2/V3)
  - Stores DEX information
  - Maintains historical pool data

## 12. Smart Router Integration
- **Transaction Monitoring**
  - Tracks `buyMemeToken` transactions
  - Monitors `swapV3ExactIn` operations
  - Supports all DEX routers
  - Real-time transaction processing

## 13. Database Management
- **Token Collection**
  - Stores token information
  - Maintains pool relationships
  - Tracks last update timestamps
  - Supports multiple pools per token

- **Token History**
  - Records all pool creation events
  - Stores transaction details
  - Maintains block information
  - Includes DEX-specific data

- **Processed Blocks**
  - Tracks processed blocks
  - Records processing status
  - Handles failed blocks
  - Supports retry mechanism

## 14. Provider Management
- **Multiple RPC Providers**
  - Load balancing across providers
  - Automatic provider switching
  - Rate limit handling
  - Error recovery

- **WebSocket Support**
  - Real-time event monitoring
  - Efficient data streaming
  - Connection management
  - Automatic reconnection

## 15. Error Handling
- **Rate Limiting**
  - Automatic provider switching
  - Request throttling
  - Backoff strategy
  - Error logging

- **Transaction Processing**
  - Retry mechanism
  - Error recovery
  - Detailed error logging
  - Transaction validation

## 16. Performance Optimization
- **Batch Processing**
  - Processes blocks in batches
  - Efficient database operations
  - Optimized event handling
  - Reduced API calls

- **Caching**
  - Token information caching
  - Provider response caching
  - Reduced database queries
  - Improved response times

## 17. Monitoring & Notifications
- **Telegram Integration**
  - New token alerts
  - Pool creation notifications
  - Error reporting
  - Status updates

- **Logging**
  - Detailed event logging
  - Error tracking
  - Performance metrics
  - Debug information

## 18. Configuration
- **Environment Variables**
  - RPC URLs
  - WebSocket URL
  - MongoDB URI
  - Telegram credentials
  - Application settings

- **DEX Configuration**
  - Router addresses
  - Factory addresses
  - Smart router settings
  - Event filters

## 19. Security
- **Input Validation**
  - Address validation
  - Transaction verification
  - Event validation
  - Data sanitization

- **Error Prevention**
  - Duplicate prevention
  - Invalid data handling
  - Rate limit protection
  - Connection security 