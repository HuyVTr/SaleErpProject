# THIẾT KẾ HỆ THỐNG SALES - HOLA GROUP

## ✅ Tổng quan yêu cầu
Hệ thống được chia thành 4 phân hệ (module) chính dựa trên vai trò người dùng:
1. 👑 Quản trị viên / Quản lý
2. 👨‍💼 Nhân viên Kinh doanh (Sales)
3. 📦 Nhân viên Kho
4. 💰 Kế toán

---

## 🛠️ Stack công nghệ đã chọn
| Loại | Công nghệ |
|---|---|
| Frontend | React 19 + Vite |
| Routing | React Router v6 |
| State Management | Redux Toolkit |
| UI Framework | Material UI (MUI) v6 |
| Form & Validation | React Hook Form + Zod |
| HTTP Client | Axios |
| Chart | Recharts |
| Export Excel/PDF | SheetJS + jsPDF |
| Authentication | JWT Token |

---

## 📂 Cấu trúc thư mục đề xuất
```
src/
├── assets/                 # Hình ảnh, font, tài nguyên tĩnh
├── components/             # Components chung tái sử dụng
│   ├── Layout/             # Header, Sidebar, Footer, Breadcrumb
│   ├── Table/              # Data Table, Pagination, Filters
│   ├── Form/               # Inputs, Select, DatePicker, Buttons
│   ├── Modals/             # Modal confirm, Modal create/edit
│   └── Charts/             # Biểu đồ thống kê
├── features/               # Từng module chức năng (Feature Sliced Design)
│   ├── auth/               # Đăng nhập, xác thực, phân quyền
│   ├── admin/              # Module Quản trị viên
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── slice.js
│   ├── sales/              # Module Nhân viên Kinh doanh
│   ├── warehouse/          # Module Kho hàng
│   └── accounting/         # Module Kế toán
├── hooks/                  # Custom Hooks chung
├── services/               # API Client, cấu hình axios
├── store/                  # Redux store cấu hình
├── utils/                  # Helper functions, constants
├── routes/                 # Định tuyến và bảo vệ route theo role
├── App.jsx
└── main.jsx
```

---

## 🔐 Phân quyền và Định tuyến
| Vai trò | Routes có thể truy cập |
|---|---|
| `admin` | Tất cả các route |
| `sales` | `/dashboard`, `/customers`, `/products`, `/quotations`, `/orders`, `/reports/sales` |
| `warehouse` | `/dashboard`, `/delivery`, `/stock`, `/import`, `/reports/warehouse` |
| `accountant` | `/dashboard`, `/invoices`, `/payments`, `/debts`, `/reports/accounting` |

✅ Bảo vệ route bằng `ProtectedRoute` component kiểm tra role người dùng trước khi render.

---

## 📋 Chi tiết từng Module

### 1. Module Quản trị viên
| Chức năng | Trạng thái |
|---|---|
| ✅ Đăng nhập & Xác thực | |
| ✅ Quản lý Người dùng & Phân quyền | |
| ✅ Quản lý Loại sản phẩm | |
| ✅ Quản lý Sản phẩm | |
| ✅ Quản lý Bảng giá | |
| ✅ Báo cáo Tổng quan doanh thu | |

### 2. Module Kinh doanh
| Chức năng | Trạng thái |
|---|---|
| ✅ Quản lý Thông tin Khách hàng | |
| ✅ Tìm kiếm Thông tin Sản phẩm | |
| ✅ Quản lý Báo giá | |
| ✅ Quản lý Đơn bán hàng | |
| ✅ Báo cáo bán hàng cá nhân | |

### 3. Module Kho hàng
| Chức năng | Trạng thái |
|---|---|
| ✅ Quản lý Lệnh giao hàng | |
| ✅ Cập nhật Trạng thái Giao hàng | |
| ✅ Quản lý Nhập kho | |
| ✅ Báo cáo Tồn kho & Cảnh báo hết hàng | |
| ✅ Thống kê Trạng thái Đơn hàng | |

### 4. Module Kế toán
| Chức năng | Trạng thái |
|---|---|
| ✅ Quản lý Hóa đơn Bán hàng | |   
| ✅ Xác nhận Thanh toán | |
| ✅ Quản lý Công nợ | |
| ✅ Báo cáo Doanh thu & Kế toán | |
| ✅ Xuất Excel / PDF | |

---

## 📊 API Endpoints chính thức (Theo tài liệu đặc tả)

### 🔐 Authentication & Phân quyền
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập, trả về JWT Token |
| `POST` | `/api/auth/logout` | Đăng xuất hệ thống |
| `GET` | `/api/auth/me` | Lấy thông tin user đang đăng nhập + Role |

### 👥 Quản lý Khách hàng
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/customers` | Danh sách khách hàng (phân trang, tìm kiếm) |
| `POST` | `/api/customers` | Tạo mới khách hàng |
| `GET` | `/api/customers/{id}` | Chi tiết thông tin khách hàng |
| `PUT` | `/api/customers/{id}` | Cập nhật thông tin |
| `DELETE` | `/api/customers/{id}` | Xóa khách hàng |
| `GET` | `/api/customers/{id}/history` | Lịch sử giao dịch khách hàng |

### 📦 Sản phẩm & Bảng giá
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/categories` | Danh sách danh mục sản phẩm |
| `GET` | `/api/products` | Danh sách sản phẩm, lọc theo danh mục |
| `POST` | `/api/products` | Thêm mới sản phẩm |
| `GET` | `/api/products/{id}` | Chi tiết sản phẩm |
| `PUT` | `/api/products/{id}` | Cập nhật giá, tồn kho |
| `GET` | `/api/price-lists` | Danh sách bảng giá |
| `GET` | `/api/price-lists/{id}/items` | Chi tiết điều kiện giá |

### 📑 Báo giá
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/quotations` | Danh sách báo giá, lọc trạng thái |
| `POST` | `/api/quotations` | Tạo mới báo giá |
| `GET` | `/api/quotations/{id}` | Chi tiết báo giá |
| `PUT` | `/api/quotations/{id}/status` | Cập nhật trạng thái báo giá |
| `POST` | `/api/quotations/{id}/convert` | Chuyển báo giá thành Đơn hàng |

### 🧾 Đơn hàng
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/orders` | Danh sách đơn hàng |
| `POST` | `/api/orders` | Tạo đơn hàng trực tiếp |
| `GET` | `/api/orders/{id}` | Chi tiết đơn hàng |
| `PUT` | `/api/orders/{id}/status` | Cập nhật trạng thái giao hàng |
| `PUT` | `/api/orders/{id}/payment` | Ghi nhận thanh toán |

### 📊 Báo cáo & Thống kê
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/reports/revenue` | Báo cáo doanh thu theo ngày/tháng/năm |
| `GET` | `/api/reports/debt` | Báo cáo công nợ khách hàng |
| `GET` | `/api/reports/top-products` | Thống kê sản phẩm bán chạy |

### 👑 Quản trị Hệ thống
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/users` | Danh sách nhân viên |
| `POST` | `/api/users` | Tạo tài khoản nhân viên |
| `PUT` | `/api/users/{id}` | Cập nhật thông tin & Phân quyền |
| `GET` | `/api/roles` | Danh sách vai trò hệ thống |


---

## 🎨 Thiết kế giao diện hướng đến
- Giao diện hiện đại, chuyên nghiệp
- Màu chủ đạo: Xanh dương + Xám (giới doanh nghiệp)
- Responsive hoàn toàn trên máy tính bảng và điện thoại
- Tốc độ tải trang nhanh
- UX dễ sử dụng cho nhân viên không giỏi công nghệ