# Hola Group — Backend API

Backend cho hệ thống quản lý bán hàng, xây dựng bằng **Express + Prisma + PostgreSQL**.

## Yêu cầu

- Node.js >= 18
- PostgreSQL đã cài đặt và đang chạy (tải tại https://www.postgresql.org/download/)

## Cài đặt lần đầu

```bash
cd backend

# 1. Cài thư viện
npm install

# 2. Tạo file cấu hình từ mẫu, rồi mở .env sửa DATABASE_URL cho khớp PostgreSQL của bạn
cp .env.example .env

# 3. Tạo bảng trong database (Prisma sẽ tự tạo CSDL theo schema)
npm run prisma:migrate

# 4. Nạp dữ liệu mẫu từ frontend/db.json
npm run seed
```

> Trước bước 3, hãy tạo sẵn một database rỗng tên `hizogroup` trong PostgreSQL
> (dùng pgAdmin hoặc lệnh `createdb hizogroup`), và điền đúng user/password vào `DATABASE_URL`.

## Chạy server

```bash
npm run dev      # chế độ phát triển (tự reload khi sửa code)
npm start        # chế độ chạy thường
```

Server mặc định: http://localhost:5000
Kiểm tra: mở http://localhost:5000/api/health

## Đăng nhập (sau khi seed)

Mọi tài khoản dùng chung mật khẩu demo: **123456**

| Email                 | Vai trò              |
| --------------------- | -------------------- |
| admin@gmail.com       | Super Admin          |
| sale@gmail.com        | Nhân viên bán hàng   |
| accounting@gmail.com  | Kế toán              |
| warehouse@gmail.com   | Nhân viên kho        |

## Các API đã có sẵn

| Method | Đường dẫn                | Mô tả                     |
| ------ | ------------------------ | ------------------------- |
| POST   | /api/auth/login          | Đăng nhập, trả về token   |
| GET    | /api/auth/me             | Thông tin user hiện tại   |
| GET    | /api/products            | Danh sách sản phẩm        |
| POST   | /api/products            | Thêm sản phẩm (admin)     |
| GET    | /api/customers           | Danh sách khách hàng      |
| GET    | /api/orders              | Danh sách đơn hàng        |
| POST   | /api/orders              | Tạo đơn (trừ kho tự động) |

Gọi API cần token: thêm header `Authorization: Bearer <token>`.

## Cấu trúc thư mục

```
backend/
├─ prisma/
│  ├─ schema.prisma     # Định nghĩa toàn bộ bảng & quan hệ
│  └─ seed.js           # Nạp dữ liệu mẫu
└─ src/
   ├─ config/           # Kết nối DB, biến môi trường
   ├─ middlewares/      # auth (JWT), xử lý lỗi, validate
   ├─ controllers/      # Logic xử lý từng nghiệp vụ
   ├─ routes/           # Khai báo đường dẫn API
   ├─ utils/            # Tiện ích dùng chung
   ├─ app.js            # Cấu hình Express
   └─ server.js         # Điểm khởi động
```

## Thêm module mới (mẫu lặp lại)

1. Tạo `controllers/<ten>.controller.js` (copy theo `product.controller.js`)
2. Tạo `routes/<ten>.routes.js`
3. Đăng ký trong `routes/index.js`
```
