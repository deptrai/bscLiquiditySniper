# BSC Liquidity Sniper

Bot tự động phát hiện và tương tác với các liquidity pool mới trên Binance Smart Chain.

## Tính Năng

- 🔄 **Provider Pool**: Quản lý và tự động chuyển đổi giữa nhiều RPC providers
  - Xử lý rate limit
  - Tự động retry khi gặp lỗi
  - Load balancing giữa các providers

- 🔍 **Liquidity Detection**: (Đang phát triển)
  - Phát hiện pair mới được tạo
  - Lọc pair theo tiêu chí
  - Theo dõi liquidity

- 📊 **Smart Router**: (Đang phát triển)
  - Tìm route tối ưu
  - Tính toán slippage
  - Multi-hop routing

- 💼 **Transaction Manager**: (Đang phát triển)
  - Quản lý giao dịch
  - Tối ưu gas
  - Quản lý nonce

## Cài Đặt

```bash
# Clone repository
git clone https://github.com/yourusername/bscLiquiditySniper.git

# Cài đặt dependencies
yarn install

# Build project
yarn build

# Chạy tests
yarn test
```

## Cấu Hình

Tạo file `.env` với các thông số sau:

```env
# RPC Endpoints
QUICKNODE_RPC=your_quicknode_endpoint
INFURA_RPC=your_infura_endpoint

# Wallet
PRIVATE_KEY=your_wallet_private_key

# Settings
MAX_RETRIES=10
REQUEST_TIMEOUT=5000
```

## Testing

```bash
# Chạy toàn bộ test
yarn test

# Chạy test cho một module cụ thể
yarn test:provider    # Test Provider Pool
yarn test:liquidity  # Test Liquidity Detection
yarn test:router     # Test Smart Router
yarn test:tx         # Test Transaction Manager
```

## Đóng Góp

1. Fork repository
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit thay đổi (`git commit -m 'Add some AmazingFeature'`)
4. Push lên branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License

MIT License - xem [LICENSE](LICENSE) để biết thêm chi tiết.
