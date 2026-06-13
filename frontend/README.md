# Hola Group — Frontend App

Giao diện người dùng cho hệ thống quản lý bán hàng, xây dựng bằng **React 19 + Vite + Tailwind CSS + Material UI (MUI) v6**.

## Yêu cầu

- Node.js >= 18
- Backend API đang chạy (mặc định tại http://localhost:5000)

## Cài đặt lần đầu

```bash
cd frontend

# 1. Cài thư viện
npm install

# 2. Tạo file cấu hình từ mẫu, kiểm tra cấu hình VITE_API_BASE_URL
cp .env.example .env
```

## Chạy ứng dụng

```bash
npm run dev      # chế độ phát triển (tự reload khi sửa code, mặc định chạy ở http://localhost:5173)
npm run build    # build ứng dụng ra thư mục dist/ để production deploy
```

Ứng dụng mặc định: http://localhost:5173

## Đăng nhập (tài khoản mẫu)

Mọi tài khoản dùng chung mật khẩu demo: **123456**

| Email                 | Vai trò              | Quyền truy cập phân hệ (Isolated Module) |
| --------------------- | -------------------- | --------------------------------------- |
| admin@gmail.com       | Super Admin          | `/admin` (Quản trị hệ thống, nhân sự)    |
| sale@gmail.com        | Nhân viên bán hàng   | `/sales` (Khách hàng, đơn hàng, báo giá) |
| accounting@gmail.com  | Kế toán              | `/accounting` (Hóa đơn, thanh toán, nợ) |
| warehouse@gmail.com   | Nhân viên kho        | `/warehouse` (Phiếu nhập, giao nhận)    |

*Lưu ý: Hệ thống đã được thiết lập bảo mật cô lập. Tài khoản thuộc vai trò nào chỉ có thể truy cập phân hệ tương ứng ở cả Frontend và Backend.*

## Cấu trúc thư mục

```
frontend/
├─ public/              # Tài nguyên tĩnh (Logo, icon...)
├─ src/
│  ├─ components/       # Các component dùng chung (Layout, Header...)
│  ├─ features/         # Các phân hệ nghiệp vụ (FSD pattern)
│  │  ├─ auth/          # Đăng nhập, đăng xuất, authService
│  │  ├─ admin/         # Phân hệ Quản trị viên
│  │  ├─ sales/         # Phân hệ Nhân viên Kinh doanh
│  │  ├─ accounting/    # Phân hệ Kế toán
│  │  └─ warehouse/     # Phân hệ Kho vận
│  ├─ services/         # Axios client kết nối API
│  ├─ utils/            # Các hàm helper dùng chung
│  ├─ App.jsx           # Cấu hình routes & phân quyền
│  └─ main.jsx          # Điểm khởi động ứng dụng React
```

## Thêm trang/chức năng mới

1. Định nghĩa component hoặc trang mới trong thư mục `pages/` của feature tương ứng (ví dụ `features/sales/pages/`).
2. Khai báo Route mới bên trong phân hệ của nó trong file `src/App.jsx`.
3. Cập nhật các mục menu điều hướng tương ứng tại file `Sidebar` của phân hệ đó (ví dụ `features/sales/components/Layout/SalesSidebar.jsx`).
