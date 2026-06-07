# Danh sách tài khoản thử nghiệm (Mock Accounts) - Đã sửa lỗi Email

Tài liệu này ghi lại danh sách các tài khoản được sử dụng để test phân quyền trong hệ thống Sales của Hola Group (Đã được thêm `@gmail.com` để vượt qua validation của trình duyệt).

**Mật khẩu chung cho tất cả tài khoản:** `123456`

| Vai trò | Tài khoản | Tên hiển thị | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Quản trị viên** | `admin@gmail.com` | Phạm Admin | Toàn quyền hệ thống |
| **Kế toán** | `accounting@gmail.com` | Võ Huy | Truy cập module Kế toán |
| **Nhân viên bán hàng** | `sale@gmail.com` | Nguyễn Văn An | Truy cập module Sales |
| **Nhân viên kho** | `warehouse@gmail.com` | Lê Văn Kho | Truy cập module Kho |

---

*Lưu ý: Dữ liệu này được đồng bộ với file `src/features/accounting/mockdata/db.json` và logic trong `authService.js`.*
