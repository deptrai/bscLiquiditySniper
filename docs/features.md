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