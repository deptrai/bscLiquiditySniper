# Tính năng của hệ thống

## 1. Phân tích hợp đồng thông minh
- Phân tích mã nguồn hợp đồng từ BSCScan
- Phát hiện các hàm nguy hiểm:
  - Mint function
  - Blacklist function
  - Owner privileges
  - Self-destruct
  - Delegate call
  - Unchecked return
  - Reentrancy
  - Frontrunning
- Phát hiện honeypot
- Tính toán điểm rủi ro
- Lưu kết quả phân tích vào database

## 2. Giám sát cặp giao dịch mới
- Theo dõi sự kiện PairCreated trên PancakeSwap V2/V3
- Phân tích bảo mật tự động cho token mới
- Gửi thông báo Telegram với thông tin chi tiết:
  - Thông tin cơ bản về token
  - Kết quả phân tích bảo mật
  - Điểm rủi ro
  - Trạng thái honeypot
  - Số lượng hàm nguy hiểm
  - Số lượng lỗ hổng

## 3. Quản lý kết nối WebSocket
- Hỗ trợ nhiều kết nối WebSocket đồng thời
- Tự động kết nối lại khi mất kết nối
- Cơ chế backoff tăng dần
- Ping định kỳ để giữ kết nối
- Xử lý lỗi và chuyển đổi provider

## 4. API Endpoints
- POST `/api/analyze-contract`: Phân tích hợp đồng mới
- GET `/api/contract-analysis/:address`: Lấy kết quả phân tích

## 5. Lưu trữ dữ liệu
- Lưu thông tin token
- Lưu lịch sử token
- Lưu kết quả phân tích hợp đồng
- Lưu thông tin block đã xử lý

## 6. Xử lý lỗi và tối ưu
- Xử lý rate limit
- Retry logic cho các request
- Batch processing
- Cache kết quả phân tích
- Xử lý lỗi gracefully

## 7. Cấu hình linh hoạt
- Hỗ trợ nhiều RPC URL
- Cấu hình thông qua biến môi trường
- Tùy chỉnh thông số kết nối
- Tùy chỉnh thông số phân tích

## 8. Logging và Monitoring
- Log chi tiết các sự kiện
- Theo dõi trạng thái kết nối
- Thống kê số lượng token đã phân tích
- Theo dõi hiệu suất hệ thống 