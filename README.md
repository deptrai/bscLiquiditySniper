## BSC LIQUID SNIPER (PANCAKESWAP)

- A HFT Sniper Bot for BSC
- This bot is designed to snipe new tokens on PancakeSwap
- Set specific params to filter new tokens - based on liquidity, volume, etc.
- It will buy the token as soon as it is listed
- It will sell the token after a certain amount of profit
- It will sell the token after a certain amount of loss
- It will sell the token after a certain amount of time has passed

## Features

- Specific Supported Tokens to monitor
- Monitor addLiquidity events
- Monitor removeLiquidity events
- Monitor swap events
- TG Bot Notifications
- Buy/Sell Tokens

## Installation

- WSS URL (Provider)
- WALLET
- DB_URL
- TG_BOT

# Network
WSS_URL=your_bsc_websocket_url
RPC_URL=your_bsc_rpc_url

# Wallet
PUBLIC_KEY=your_wallet_public_key
SECRET_KEY=your_wallet_private_key

# Database
MONGO_URL=your_mongodb_connection_string

# Telegram
BOT_TOKEN=your_telegram_bot_token
TG_USERS=comma_separated_telegram_user_ids

# App Config
PORT=4001
NODE_ENV=development
SERVER_URL=http://localhost:
