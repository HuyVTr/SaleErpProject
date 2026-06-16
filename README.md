# HIZO GROUP - Hệ Thống Quản Lý Sales (Sales ERP Project)

Dự án Frontend cho Hệ thống Quản lý Sales của HIZO GROUP. Đây là hệ thống ERP thu nhỏ hỗ trợ quản lý quy trình bán hàng khép kín từ khâu tiếp cận khách hàng, báo giá, lên đơn hàng, giao nhận kho cho đến đối soát kế toán và báo cáo doanh thu.

## 🚀 Tính Năng Chính Theo Phân Hệ

Hệ thống được thiết kế và phân quyền chặt chẽ theo 4 vai trò (roles) chính:

### 1. 👑 Quản trị viên / Quản lý (Admin)
*   **Quản lý người dùng & phân quyền:** Tạo tài khoản nhân viên, cấp quyền truy cập hệ thống.
*   **Quản lý sản phẩm & danh mục:** Thêm mới, chỉnh sửa thông tin, giá bán và danh mục sản phẩm.
*   **Quản lý bảng giá:** Cấu hình bảng giá bán linh hoạt cho từng đối tượng khách hàng.
*   **Báo cáo tổng quan:** Dashboard theo dõi toàn bộ doanh thu, công nợ và hiệu suất kinh doanh của doanh nghiệp.

### 2. 👨‍💼 Nhân viên Kinh doanh (Sales)
*   **Quản lý khách hàng:** Lưu trữ thông tin khách hàng, lịch sử giao dịch và chăm sóc khách hàng.
*   **Tra cứu sản phẩm:** Xem thông tin chi tiết sản phẩm, giá bán theo bảng giá được áp dụng.
*   **Quản lý báo giá:** Tạo và gửi báo giá cho khách hàng, theo dõi trạng thái phê duyệt báo giá.
*   **Quản lý đơn hàng:** Lên đơn bán hàng trực tiếp hoặc chuyển đổi từ báo giá được phê duyệt.
*   **Báo cáo cá nhân:** Theo dõi chỉ tiêu doanh số cá nhân đạt được.

### 3. 📦 Nhân viên Kho (Warehouse)
*   **Quản lý lệnh giao hàng:** Theo dõi các yêu cầu xuất kho từ đơn hàng bán thành công.
*   **Cập nhật trạng thái giao hàng:** Quản lý giao nhận hàng hóa đến khách hàng.
*   **Quản lý nhập kho:** Ghi nhận thông tin hàng hóa nhập kho mới.
*   **Báo cáo tồn kho:** Theo dõi số lượng hàng tồn, cảnh báo khi hàng sắp hết.

### 4. 💰 Kế toán (Accountant)
*   **Quản lý hóa đơn:** Tạo và quản lý hóa đơn tài chính cho các đơn hàng.
*   **Xác nhận thanh toán:** Ghi nhận thanh toán từ khách hàng (tiền mặt, chuyển khoản).
*   **Quản lý công nợ:** Theo dõi công nợ của từng khách hàng, thời hạn thanh toán.
*   **Báo cáo tài chính:** Thống kê doanh thu, dòng tiền và xuất dữ liệu báo cáo sang định dạng Excel/PDF.

---

## 🛠️ Stack Công Nghệ Sử Dụng

*   **Core:** React 19, Vite (HMR)
*   **Routing:** React Router v6
*   **State Management:** Redux Toolkit
*   **UI Framework:** Material UI (MUI) v6
*   **Form & Validation:** React Hook Form, Zod
*   **HTTP Client:** Axios
*   **Thống kê & Biểu đồ:** Recharts
*   **Xuất tài liệu:** SheetJS (Excel), jsPDF (PDF)
*   **Authentication:** JWT Token

---

## 📂 Cấu Trúc Thư Mục Dự Án

```
src/
├── assets/                 # Tài nguyên tĩnh (hình ảnh, fonts, logo)
├── components/             # Components dùng chung (Layout, Table, Form, Modals...)
├── features/               # Các module chức năng (Feature Sliced Design)
│   ├── auth/               # Đăng nhập, xác thực và phân quyền
│   ├── admin/              # Giao diện & nghiệp vụ Quản trị viên
│   ├── sales/              # Giao diện & nghiệp vụ Nhân viên Kinh doanh
│   ├── warehouse/          # Giao diện & nghiệp vụ Quản lý Kho hàng
│   └── accounting/         # Giao diện & nghiệp vụ Kế toán
├── hooks/                  # Custom hooks dùng chung
├── services/               # Cấu hình API Client (Axios client)
├── store/                  # Cấu hình Redux Store chung
├── routes/                 # Quản lý định tuyến và bảo vệ Route theo vai trò
└── utils/                  # Thư viện helper, hằng số chung
```

---

## 💻 Hướng Dẫn Phát Triển (Development)

### Cài đặt dependencies
```bash
npm install
```

### Chạy dự án ở môi trường local
```bash
npm run dev
```

### Build production
```bash
npm run build
```