# BSC Liquidity Sniper

A tool for monitoring and analyzing token pairs on PancakeSwap V2/V3.

## Features

### Token Analysis
- Monitors new token pair creation events
- Analyzes token contracts and tokenomics
- Tracks liquidity and price history
- Sends real-time Telegram notifications

### Data Collection
- Token metadata and basic information
- Contract analysis results
- Tokenomics analysis
- Liquidity analysis
- Price and liquidity history
- Transaction history

### Real-time Monitoring
- WebSocket connections to BSC nodes
- Automatic reconnection handling
- Multiple provider support
- Event filtering for PancakeSwap V2/V3

## Recent Updates

### Token Analysis Improvements
- Fixed TypeScript errors in route handlers
- Updated token analysis service to handle price calculations
- Improved event parsing for pair creation
- Added proper error handling for WebSocket connections

### Code Structure
- Singleton pattern for analysis services
- Proper TypeScript types and interfaces
- Modular architecture for easy extension
- Comprehensive error handling

### Configuration
- Environment-based configuration
- Support for multiple RPC providers
- Configurable DEX addresses and contracts
- Telegram notification settings

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with required variables:
```
RPC_URL=your_rpc_urls_comma_separated
WSS_URL=your_wss_urls_comma_separated
MONGODB_URI=your_mongodb_uri
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

3. Start the service:
```bash
npm start
```

## Architecture

### Services
- `TokenAnalyzer`: Main service for token analysis
- `ContractAnalyzer`: Analyzes token contracts
- `TokenomicsAnalyzer`: Analyzes token economics
- `LiquidityAnalyzer`: Analyzes liquidity pools

### Models
- `Token`: Basic token information
- `TokenMetadata`: Extended token metadata
- `TokenHistory`: Transaction history
- `TokenPrice`: Price history
- `TokenLiquidity`: Liquidity history
- `TokenomicsAnalysis`: Tokenomics analysis results
- `ContractAnalysis`: Contract analysis results
- `LiquidityAnalysis`: Liquidity analysis results

### WebSocket Management
- Automatic reconnection
- Multiple provider support
- Connection health monitoring
- Event filtering

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT License - xem [LICENSE](LICENSE) để biết thêm chi tiết.
