# 📚 Hướng dẫn sử dụng Mock Data (Dữ liệu giả)

Thư mục này chứa dữ liệu giả lập (Mock Data) nhằm mục đích phục vụ việc phát triển và kiểm thử giao diện Frontend mà không cần phải có sẵn Backend.

## 1. File `db.json`
- **Chức năng chính:** Đóng vai trò như một "Cơ sở dữ liệu ảo" chứa dữ liệu mẫu (Invoices, Customers, Debts...).
- **Đối với Team FE & QA:** Giúp chạy và test giao diện mượt mà. Chỉ cần cấu hình `VITE_USE_MOCK=true` trong file `.env`, giao diện sẽ tự động lấy dữ liệu từ file này để hiển thị.
- **Đối với Team BE:** Đóng vai trò như một **Data Contract (Hợp đồng dữ liệu) thực tế**. Dựa vào file này, team BE có thể biết chính xác Frontend đang cần trả về các trường dữ liệu (fields) nào, kiểu dữ liệu (data types) ra sao để code API cho khớp.

## 2. File `routes.json`
- **Chức năng chính:** Bản đồ định tuyến (Route Mapping) dùng cho thư viện `json-server`.
- **Tác dụng:** Khi chạy mock server giả lập, file này sẽ làm nhiệm vụ "dịch" các Endpoint chuẩn RESTful mà Frontend gọi (Ví dụ: `GET /api/invoices`) trỏ thẳng tới các mảng dữ liệu tương ứng bên trong `db.json`. Nếu không có file này, mock server sẽ trả về lỗi 404 (Not Found).

---
**💡 Lưu ý cho team Backend:**
- Nếu bạn muốn ghép API thật của bạn vào Web, hãy mở file `.env` ở thư mục gốc và cấu hình:
  - `VITE_USE_MOCK=false`
  - `VITE_API_BASE_URL=http://localhost:<cổng_của_bạn>`
- Khi đó, code Frontend sẽ hoàn toàn bỏ qua thư mục mockdata này và gọi thẳng đến Server của bạn!
