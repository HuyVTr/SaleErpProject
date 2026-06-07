import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './features/auth/login';
import MainLayout from './components/Layout/MainLayout';
import AdminLayout from './features/admin/components/Layout/AdminLayout';
import SalesLayout from './features/sales/components/Layout/SalesLayout';

// === MODULE ADMIN ===
import AdminDashboard from './features/admin/pages/dashboard/AdminDashboard.jsx';
import StaffManagement from './features/admin/pages/staffs/StaffManagement.jsx';
import StaffCreate from './features/admin/pages/staffs/StaffCreate.jsx';
import CategoryManagement from './features/admin/pages/category/CategoryManagement.jsx';
import AddCategory from './features/admin/pages/category/AddCategory.jsx';
import AdminProductManagement from './features/admin/pages/products/ProductManagement.jsx';
import AdminAddProduct from './features/admin/pages/products/AddProduct.jsx';
import AdminEditProduct from './features/admin/pages/products/EditProduct.jsx';
import PriceListManagement from './features/admin/pages/Price_List/PriceListManagement.jsx';
import AddPriceList from './features/admin/pages/Price_List/AddPriceList.jsx';
import EditPriceList from './features/admin/pages/Price_List/EditPriceList.jsx';
import PriceListDetail from './features/admin/pages/Price_List/PriceListDetail.jsx';

// === MODULE SALES ===
import SalesDashboard from './features/sales/pages/dashboard/SalesDashboard.jsx';
import CustomerList from './features/sales/pages/customers/CustomerList.jsx';
import CustomerCreate from './features/sales/pages/customers/CustomerCreate.jsx';
import ProductManagement from './features/sales/pages/products/ProductManagement.jsx';
import OrderManager from './features/sales/pages/orders/OrderManagement.jsx';
import CreateOrder from './features/sales/pages/orders/CreateOrder.jsx';
import QuotationManagement from './features/sales/pages/quotations/QuotationManagement.jsx';
import QuotationCreate from './features/sales/pages/quotations/AddQuotation.jsx';

// === MODULE KẾ TOÁN (Accounting) ===
import AccountingDashboard from './features/accounting/pages/dashboard/index.jsx';
import InvoiceList from './features/accounting/pages/invoices/index.jsx';
import InvoiceDetail from './features/accounting/pages/invoices/invoice_details.jsx';
import DebtTracker from './features/accounting/pages/debts/index.jsx';
import PaymentList from './features/accounting/pages/payments/index.jsx';
import PaymentDetail from './features/accounting/pages/payments/detail.jsx';
import AccountingReport from './features/accounting/pages/reports/accounting/index.jsx';
import AccountingLayout from './features/accounting/components/Layout/AccountingLayout';
import TransactionDetail from './features/accounting/pages/dashboard/TransactionDetail.jsx';

// === MODULE KHO HÀNG (Warehouse) ===
import WarehouseLayout from './features/warehouse/components/Layout/WarehouseLayout';
import WarehouseDashboard from './features/warehouse/pages/WarehouseDashboard';
import DeliveryOrders from './features/warehouse/pages/DeliveryOrders';
import DeliveryDetail from './features/warehouse/pages/DeliveryDetail';
import StockImport from './features/warehouse/pages/StockImport';
import InventoryReport from './features/warehouse/pages/InventoryReport';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      
      {/* Tuyến đường Home chính - chọn các module */}
      <Route path="/home" element={<MainLayout />}>
        <Route index element={<div className="p-4 flex h-full items-center justify-center text-gray-500">Vui lòng chọn một Module từ Sidebar để tiếp tục</div>} />
      </Route>
      
      {/* Tuyến đường Admin Module */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="staffs" element={<StaffManagement />} />
        <Route path="staffs/add" element={<StaffCreate />} />
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
      <Route path="/sales" element={<SalesLayout />}>
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

      {/* Tuyến đường Kế toán sử dụng AccountingLayout (Phát triển cục bộ) */}
      <Route path="/accounting" element={<AccountingLayout />}>
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
      <Route path="/warehouse" element={<WarehouseLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<WarehouseDashboard />} />
        <Route path="delivery" element={<DeliveryOrders />} />
        <Route path="delivery/:id" element={<DeliveryDetail />} />
        <Route path="stock-import" element={<StockImport />} />
        <Route path="inventory" element={<InventoryReport />} />
      </Route>
    </Routes>
  );
}

export default App;
