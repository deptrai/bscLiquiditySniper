# BSC Liquidity Sniper

Hệ thống giám sát và phân tích token mới trên PancakeSwap V2/V3 với khả năng phát hiện honeypot và phân tích bảo mật.

## Tính năng chính

- 🔍 Phân tích mã nguồn hợp đồng thông minh
- 🚨 Giám sát cặp giao dịch mới trên PancakeSwap V2/V3
- 🔒 Phát hiện honeypot và các lỗ hổng bảo mật
- 📊 Tính toán điểm rủi ro cho token
- 📱 Thông báo Telegram với thông tin chi tiết
- 💾 Lưu trữ kết quả phân tích vào database
- 🔄 Tự động kết nối lại khi mất kết nối
- ⚡ Xử lý song song và tối ưu hiệu suất

## Cài đặt

1. Clone repository:
```bash
git clone https://github.com/yourusername/bscLiquiditySniper.git
cd bscLiquiditySniper
```

2. Cài đặt dependencies:
```bash
yarn install
```

3. Tạo file `.env` và cập nhật các biến môi trường:
```env
MONGODB_URI=your_mongodb_uri
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
BSCSCAN_API_KEY=your_bscscan_api_key
HTTP_RPC_URLS=your_rpc_urls
WS_RPC_URLS=your_ws_rpc_urls
```

4. Chạy chương trình:
```bash
yarn dev
```

## Cấu trúc dự án

```
src/
├── config/           # Cấu hình hệ thống
├── constants/        # Các hằng số
├── models/          # Mongoose models
├── scripts/         # Scripts chính
├── services/        # Các service
├── TG/             # Telegram bot
├── types/          # TypeScript types
└── utils/          # Utility functions
```

## API Endpoints

### Phân tích hợp đồng
- `POST /api/analyze-contract`: Phân tích hợp đồng mới
- `GET /api/contract-analysis/:address`: Lấy kết quả phân tích

## Thông báo Telegram

Khi phát hiện token mới, hệ thống sẽ gửi thông báo với các thông tin:
- Thông tin cơ bản về token
- Kết quả phân tích bảo mật
- Điểm rủi ro
- Trạng thái honeypot
- Số lượng hàm nguy hiểm
- Số lượng lỗ hổng

## Phân tích bảo mật

Hệ thống phân tích các yếu tố sau:
- Các hàm nguy hiểm (mint, blacklist, v.v.)
- Lỗ hổng bảo mật phổ biến
- Honeypot detection
- Tính toán điểm rủi ro

## Xử lý lỗi

- Tự động kết nối lại khi mất kết nối
- Xử lý rate limit
- Retry logic cho các request
- Batch processing
- Cache kết quả phân tích

## Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo pull request hoặc báo cáo lỗi.

## License

MIT 