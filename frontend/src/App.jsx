import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';

import LoginPage from './features/auth/login';
import AdminLayout from './features/admin/components/Layout/AdminLayout';
import SalesLayout from './features/sales/components/Layout/SalesLayout';

// === MODULE ADMIN (Lazy loaded) ===
const AdminDashboard = lazy(() => import('./features/admin/pages/dashboard/AdminDashboard.jsx'));
const StaffManagement = lazy(() => import('./features/admin/pages/staffs/StaffManagement.jsx'));
const StaffCreate = lazy(() => import('./features/admin/pages/staffs/StaffCreate.jsx'));
const StaffEdit = lazy(() => import('./features/admin/pages/staffs/StaffEdit.jsx'));
const CategoryManagement = lazy(() => import('./features/admin/pages/category/CategoryManagement.jsx'));
const AddCategory = lazy(() => import('./features/admin/pages/category/AddCategory.jsx'));
const AdminProductManagement = lazy(() => import('./features/admin/pages/products/ProductManagement.jsx'));
const AdminAddProduct = lazy(() => import('./features/admin/pages/products/AddProduct.jsx'));
const AdminEditProduct = lazy(() => import('./features/admin/pages/products/EditProduct.jsx'));
const PriceListManagement = lazy(() => import('./features/admin/pages/Price_List/PriceListManagement.jsx'));
const AddPriceList = lazy(() => import('./features/admin/pages/Price_List/AddPriceList.jsx'));
const EditPriceList = lazy(() => import('./features/admin/pages/Price_List/EditPriceList.jsx'));
const PriceListDetail = lazy(() => import('./features/admin/pages/Price_List/PriceListDetail.jsx'));

// === MODULE SALES (Lazy loaded) ===
const SalesDashboard = lazy(() => import('./features/sales/pages/dashboard/SalesDashboard.jsx'));
const CustomerList = lazy(() => import('./features/sales/pages/customers/CustomerList.jsx'));
const CustomerCreate = lazy(() => import('./features/sales/pages/customers/CustomerCreate.jsx'));
const ProductManagement = lazy(() => import('./features/sales/pages/products/ProductManagement.jsx'));
const OrderManager = lazy(() => import('./features/sales/pages/orders/OrderManagement.jsx'));
const CreateOrder = lazy(() => import('./features/sales/pages/orders/CreateOrder.jsx'));
const QuotationManagement = lazy(() => import('./features/sales/pages/quotations/QuotationManagement.jsx'));
const QuotationCreate = lazy(() => import('./features/sales/pages/quotations/AddQuotation.jsx'));

// === MODULE KẾ TOÁN (Lazy loaded) ===
const AccountingDashboard = lazy(() => import('./features/accounting/pages/dashboard/index.jsx'));
const InvoiceList = lazy(() => import('./features/accounting/pages/invoices/index.jsx'));
const InvoiceDetail = lazy(() => import('./features/accounting/pages/invoices/invoice_details.jsx'));
const DebtTracker = lazy(() => import('./features/accounting/pages/debts/index.jsx'));
const PaymentList = lazy(() => import('./features/accounting/pages/payments/index.jsx'));
const PaymentDetail = lazy(() => import('./features/accounting/pages/payments/detail.jsx'));
const AccountingReport = lazy(() => import('./features/accounting/pages/reports/accounting/index.jsx'));
const AccountingLayout = lazy(() => import('./features/accounting/components/Layout/AccountingLayout'));
const TransactionDetail = lazy(() => import('./features/accounting/pages/dashboard/TransactionDetail.jsx'));

// === MODULE KHO HÀNG (Lazy loaded) ===
const WarehouseLayout = lazy(() => import('./features/warehouse/components/Layout/WarehouseLayout'));
const WarehouseDashboard = lazy(() => import('./features/warehouse/pages/dashboard/index.jsx'));
const DeliveryOrders = lazy(() => import('./features/warehouse/pages/delivery-orders/index.jsx'));
const DeliveryDetail = lazy(() => import('./features/warehouse/pages/delivery-detail/index.jsx'));
const StockImport = lazy(() => import('./features/warehouse/pages/stock-import/index.jsx'));
const InventoryReport = lazy(() => import('./features/warehouse/pages/inventory/index.jsx'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
    <CircularProgress sx={{ color: '#00288E' }} />
  </Box>
);

import tokenStorage from './utils/tokenStorage';
import ROLE from './constants/roles';

// ProtectedRoute component để phân quyền người dùng strictly theo từng phân hệ
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = tokenStorage.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const currentUser = tokenStorage.getUser();
  const roleID = currentUser ? Number(currentUser.roleID) : null;

  if (allowedRoles.includes(roleID)) {
    return children;
  }

  // Chuyển hướng người dùng về module tương ứng với quyền hạn nếu truy cập sai phân hệ
  if (roleID === ROLE.SALES) return <Navigate to="/sales/dashboard" replace />;
  if (roleID === ROLE.WAREHOUSE) return <Navigate to="/warehouse/dashboard" replace />;
  if (roleID === ROLE.ACCOUNTING) return <Navigate to="/accounting/dashboard" replace />;
  if (roleID === ROLE.ADMIN || roleID === ROLE.SUPER_ADMIN) return <Navigate to="/admin/dashboard" replace />;

  return <Navigate to="/login" replace />;
};

import NotFound from './components/common/NotFound';

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* Tuyến đường Admin Module */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={[ROLE.ADMIN, ROLE.SUPER_ADMIN]}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="staffs" element={<StaffManagement />} />
          <Route path="staffs/add" element={<StaffCreate />} />
          <Route path="staffs/edit/:id" element={<StaffEdit />} />
          <Route path="products" element={<AdminProductManagement />} />
          <Route path="products/add" element={<AdminAddProduct />} />
          <Route path="products/edit/:id" element={<AdminEditProduct />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="categories/add" element={<AddCategory />} />
          <Route path="price-lists" element={<PriceListManagement />} />
          <Route path="price-lists/add" element={<AddPriceList />} />
          <Route path="price-lists/edit/:id" element={<EditPriceList />} />
          <Route path="price-lists/:id" element={<PriceListDetail />} />
        </Route>

        {/* Tuyến đường Sales Module */}
        <Route path="/sales" element={
          <ProtectedRoute allowedRoles={[ROLE.SALES]}>
            <SalesLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SalesDashboard />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/add" element={<CustomerCreate />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="orders" element={<OrderManager />} />
          <Route path="orders/add" element={<CreateOrder />} />
          <Route path="quotations" element={<QuotationManagement />} />
          <Route path="quotations/add" element={<QuotationCreate />} />
          <Route path="quotations/edit/:id" element={<QuotationCreate />} />
        </Route>

        {/* Tuyến đường Kế toán sử dụng AccountingLayout */}
        <Route path="/accounting" element={
          <ProtectedRoute allowedRoles={[ROLE.ACCOUNTING]}>
            <AccountingLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AccountingDashboard />} />
          <Route path="sales-invoices" element={<InvoiceList />} />
          <Route path="sales-invoices/detail" element={<InvoiceDetail />} />
          <Route path="debts" element={<DebtTracker />} />
          <Route path="payments" element={<PaymentList />} />
          <Route path="payments/detail" element={<PaymentDetail />} />
          <Route path="reports" element={<AccountingReport />} />
          <Route path="transaction/:id" element={<TransactionDetail />} />
        </Route>

        {/* Tuyến đường Kho hàng sử dụng WarehouseLayout */}
        <Route path="/warehouse" element={
          <ProtectedRoute allowedRoles={[ROLE.WAREHOUSE]}>
            <WarehouseLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<WarehouseDashboard />} />
          <Route path="delivery" element={<DeliveryOrders />} />
          <Route path="delivery/:id" element={<DeliveryDetail />} />
          <Route path="stock-import" element={<StockImport />} />
          <Route path="inventory" element={<InventoryReport />} />
        </Route>

        {/* Bắt tất cả các url không hợp lệ */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
