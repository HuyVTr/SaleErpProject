import { ordersApi, productsApi, reportsApi } from '../../../services/api';

// ============================================================
// MOCK DATA - Fallback khi chưa có Backend
// ============================================================

const MOCK_DELIVERY_ORDERS = [
  { id: 'DH-001', customerName: 'Công ty TNHH ABC', customerPhone: '0901234567', orderDate: '2026-04-28', totalAmount: 45000000, items: [{ productName: 'Sản phẩm A', quantity: 100, unitPrice: 200000, total: 20000000 }, { productName: 'Sản phẩm B', quantity: 50, unitPrice: 500000, total: 25000000 }], deliveryStatus: 'pending', deliveryAddress: '123 Nguyễn Huệ, Q1, TP.HCM', notes: '', statusHistory: [{ status: 'confirmed', date: '2026-04-28 09:00', note: 'Đơn hàng được xác nhận bởi Sales' }] },
  { id: 'DH-002', customerName: 'Cửa hàng XYZ', customerPhone: '0912345678', orderDate: '2026-04-27', totalAmount: 32000000, items: [{ productName: 'Sản phẩm C', quantity: 200, unitPrice: 160000, total: 32000000 }], deliveryStatus: 'shipping', deliveryAddress: '456 Lê Lợi, Q3, TP.HCM', notes: 'Giao trong giờ hành chính', statusHistory: [{ status: 'confirmed', date: '2026-04-27 10:00', note: 'Đơn hàng xác nhận' }, { status: 'shipping', date: '2026-04-28 08:30', note: 'Đã chuyển cho đơn vị vận chuyển' }] },
  { id: 'DH-003', customerName: 'Siêu thị Mega', customerPhone: '0923456789', orderDate: '2026-04-25', totalAmount: 78500000, items: [{ productName: 'Sản phẩm A', quantity: 200, unitPrice: 200000, total: 40000000 }, { productName: 'Sản phẩm D', quantity: 110, unitPrice: 350000, total: 38500000 }], deliveryStatus: 'delivered', deliveryAddress: '789 Trần Hưng Đạo, Q5, TP.HCM', notes: '', statusHistory: [{ status: 'confirmed', date: '2026-04-25 14:00', note: 'Xác nhận đơn' }, { status: 'shipping', date: '2026-04-26 09:00', note: 'Bắt đầu giao hàng' }, { status: 'delivered', date: '2026-04-27 11:30', note: 'Giao thành công - KH đã ký nhận' }] },
  { id: 'DH-004', customerName: 'Đại lý Phương Nam', customerPhone: '0934567890', orderDate: '2026-04-26', totalAmount: 15200000, items: [{ productName: 'Sản phẩm E', quantity: 80, unitPrice: 190000, total: 15200000 }], deliveryStatus: 'failed', deliveryAddress: '321 CMT8, Q10, TP.HCM', notes: '', statusHistory: [{ status: 'confirmed', date: '2026-04-26 11:00', note: 'Xác nhận' }, { status: 'shipping', date: '2026-04-27 08:00', note: 'Đang giao' }, { status: 'failed', date: '2026-04-27 15:00', note: 'Khách hàng không có mặt tại địa chỉ nhận hàng' }] },
  { id: 'DH-005', customerName: 'Công ty Hoàng Gia', customerPhone: '0945678901', orderDate: '2026-04-29', totalAmount: 62000000, items: [{ productName: 'Sản phẩm B', quantity: 80, unitPrice: 500000, total: 40000000 }, { productName: 'Sản phẩm F', quantity: 100, unitPrice: 220000, total: 22000000 }], deliveryStatus: 'pending', deliveryAddress: '654 Hai Bà Trưng, Q1, TP.HCM', notes: 'Ưu tiên giao sớm', statusHistory: [{ status: 'confirmed', date: '2026-04-29 08:00', note: 'Đơn hàng từ báo giá QT-012' }] },
  { id: 'DH-006', customerName: 'Shop Thành Đạt', customerPhone: '0956789012', orderDate: '2026-04-30', totalAmount: 28700000, items: [{ productName: 'Sản phẩm G', quantity: 70, unitPrice: 410000, total: 28700000 }], deliveryStatus: 'shipping', deliveryAddress: '987 Điện Biên Phủ, Bình Thạnh, TP.HCM', notes: '', statusHistory: [{ status: 'confirmed', date: '2026-04-30 13:00', note: 'Xác nhận đơn hàng' }, { status: 'shipping', date: '2026-05-01 07:00', note: 'Xuất kho, bắt đầu giao' }] },
  { id: 'DH-007', customerName: 'Nhà phân phối Minh Anh', customerPhone: '0967890123', orderDate: '2026-05-01', totalAmount: 95000000, items: [{ productName: 'Sản phẩm A', quantity: 300, unitPrice: 200000, total: 60000000 }, { productName: 'Sản phẩm C', quantity: 200, unitPrice: 160000, total: 32000000 }, { productName: 'Sản phẩm E', quantity: 15, unitPrice: 200000, total: 3000000 }], deliveryStatus: 'delivered', deliveryAddress: '159 Võ Văn Tần, Q3, TP.HCM', notes: '', statusHistory: [{ status: 'confirmed', date: '2026-05-01 09:30', note: 'Xác nhận' }, { status: 'shipping', date: '2026-05-02 08:00', note: 'Giao hàng' }, { status: 'delivered', date: '2026-05-03 10:00', note: 'Giao thành công' }] },
  { id: 'DH-008', customerName: 'Công ty Tân Tiến', customerPhone: '0978901234', orderDate: '2026-05-02', totalAmount: 41500000, items: [{ productName: 'Sản phẩm D', quantity: 50, unitPrice: 350000, total: 17500000 }, { productName: 'Sản phẩm F', quantity: 100, unitPrice: 220000, total: 22000000 }, { productName: 'Sản phẩm G', quantity: 5, unitPrice: 400000, total: 2000000 }], deliveryStatus: 'pending', deliveryAddress: '753 Lý Tự Trọng, Q1, TP.HCM', notes: 'Liên hệ trước khi giao', statusHistory: [{ status: 'confirmed', date: '2026-05-02 16:00', note: 'Đơn hàng mới từ Sales' }] },
];

const MOCK_PRODUCTS = [
  { id: 1, name: 'Sản phẩm A - Bột giặt cao cấp', category: 'Chăm sóc gia đình', sku: 'SP-A001', unitPrice: 200000, stockQuantity: 450, minStock: 50, unit: 'Thùng' },
  { id: 2, name: 'Sản phẩm B - Nước rửa chén', category: 'Chăm sóc gia đình', sku: 'SP-B002', unitPrice: 500000, stockQuantity: 8, minStock: 20, unit: 'Thùng' },
  { id: 3, name: 'Sản phẩm C - Dầu gội đầu', category: 'Chăm sóc cá nhân', sku: 'SP-C003', unitPrice: 160000, stockQuantity: 320, minStock: 30, unit: 'Thùng' },
  { id: 4, name: 'Sản phẩm D - Kem đánh răng', category: 'Chăm sóc cá nhân', sku: 'SP-D004', unitPrice: 350000, stockQuantity: 15, minStock: 25, unit: 'Thùng' },
  { id: 5, name: 'Sản phẩm E - Nước lau sàn', category: 'Chăm sóc gia đình', sku: 'SP-E005', unitPrice: 190000, stockQuantity: 180, minStock: 40, unit: 'Thùng' },
  { id: 6, name: 'Sản phẩm F - Sữa tắm dưỡng ẩm', category: 'Chăm sóc cá nhân', sku: 'SP-F006', unitPrice: 220000, stockQuantity: 5, minStock: 15, unit: 'Thùng' },
  { id: 7, name: 'Sản phẩm G - Nước xả vải', category: 'Chăm sóc gia đình', sku: 'SP-G007', unitPrice: 410000, stockQuantity: 95, minStock: 20, unit: 'Thùng' },
  { id: 8, name: 'Sản phẩm H - Xịt phòng', category: 'Tiện ích gia đình', sku: 'SP-H008', unitPrice: 85000, stockQuantity: 0, minStock: 30, unit: 'Hộp' },
  { id: 9, name: 'Sản phẩm I - Giấy vệ sinh', category: 'Tiện ích gia đình', sku: 'SP-I009', unitPrice: 120000, stockQuantity: 600, minStock: 100, unit: 'Bịch' },
  { id: 10, name: 'Sản phẩm K - Nước tẩy đa năng', category: 'Chăm sóc gia đình', sku: 'SP-K010', unitPrice: 175000, stockQuantity: 22, minStock: 25, unit: 'Thùng' },
];

const MOCK_CATEGORIES = [
  { id: 1, name: 'Chăm sóc gia đình' },
  { id: 2, name: 'Chăm sóc cá nhân' },
  { id: 3, name: 'Tiện ích gia đình' },
];

const MOCK_IMPORT_HISTORY = [
  { id: 'NK-001', date: '2026-05-04', supplier: 'NCC Việt Tiến', items: [{ productName: 'Sản phẩm A', quantity: 200 }], totalValue: 40000000, status: 'completed', createdBy: 'Nhân viên Kho 1' },
  { id: 'NK-002', date: '2026-05-03', supplier: 'NCC Đại Phát', items: [{ productName: 'Sản phẩm C', quantity: 150 }], totalValue: 24000000, status: 'completed', createdBy: 'Nhân viên Kho 2' },
  { id: 'NK-003', date: '2026-05-02', supplier: 'NCC Hoàng Long', items: [{ productName: 'Sản phẩm E', quantity: 100 }, { productName: 'Sản phẩm G', quantity: 50 }], totalValue: 39500000, status: 'completed', createdBy: 'Nhân viên Kho 1' },
  { id: 'NK-004', date: '2026-05-01', supplier: 'NCC Việt Tiến', items: [{ productName: 'Sản phẩm B', quantity: 30 }], totalValue: 15000000, status: 'completed', createdBy: 'Nhân viên Kho 1' },
];

// ============================================================
// FORMAT HELPERS
// ============================================================
export const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ============================================================
// SERVICE FUNCTIONS - Try API first, fallback to Mock
// ============================================================

const warehouseService = {
  // --- DELIVERY ORDERS (3.1) ---
  getDeliveryOrders: async (filters = {}) => {
    try {
      const res = await ordersApi.getAll({ status: 'confirmed', ...filters });
      return res.data;
    } catch {
      let data = [...MOCK_DELIVERY_ORDERS];
      if (filters.deliveryStatus && filters.deliveryStatus !== 'all') {
        data = data.filter(o => o.deliveryStatus === filters.deliveryStatus);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        data = data.filter(o => o.id.toLowerCase().includes(s) || o.customerName.toLowerCase().includes(s));
      }
      return data;
    }
  },

  // --- ORDER DETAIL (3.2) ---
  getOrderDetail: async (id) => {
    try {
      const res = await ordersApi.getById(id);
      return res.data;
    } catch {
      return MOCK_DELIVERY_ORDERS.find(o => o.id === id) || null;
    }
  },

  // --- UPDATE DELIVERY STATUS (3.2) ---
  updateDeliveryStatus: async (id, status, note = '') => {
    try {
      const res = await ordersApi.updateStatus(id, { status, note });
      return res.data;
    } catch {
      const order = MOCK_DELIVERY_ORDERS.find(o => o.id === id);
      if (order) {
        order.deliveryStatus = status;
        order.statusHistory.push({ status, date: new Date().toISOString().replace('T', ' ').substring(0, 16), note: note || `Cập nhật trạng thái: ${status}` });
      }
      return order;
    }
  },

  // --- INVENTORY (3.3 + 3.4) ---
  getInventory: async (filters = {}) => {
    try {
      const res = await productsApi.getAllProducts(filters);
      return res.data;
    } catch {
      let data = [...MOCK_PRODUCTS];
      if (filters.category) {
        data = data.filter(p => p.category === filters.category);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        data = data.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
      }
      if (filters.stockStatus === 'low') {
        data = data.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock);
      } else if (filters.stockStatus === 'out') {
        data = data.filter(p => p.stockQuantity === 0);
      }
      return data;
    }
  },

  getCategories: async () => {
    try {
      const res = await productsApi.getAllCategories();
      return res.data;
    } catch {
      return MOCK_CATEGORIES;
    }
  },

  updateStock: async (id, additionalQty) => {
    try {
      const product = await productsApi.getProductById(id);
      const newQty = (product.data.stockQuantity || 0) + additionalQty;
      const res = await productsApi.updateProduct(id, { stockQuantity: newQty });
      return res.data;
    } catch {
      const product = MOCK_PRODUCTS.find(p => p.id === id);
      if (product) { product.stockQuantity += additionalQty; }
      return product;
    }
  },

  // --- IMPORT HISTORY (3.3) ---
  getImportHistory: async () => {
    return MOCK_IMPORT_HISTORY;
  },

  createImportReceipt: async (receipt) => {
    const newReceipt = {
      id: `NK-${String(MOCK_IMPORT_HISTORY.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().substring(0, 10),
      ...receipt,
      status: 'completed',
      createdBy: 'Nhân viên Kho',
    };
    MOCK_IMPORT_HISTORY.unshift(newReceipt);
    // Update stock for each item
    for (const item of receipt.items) {
      const product = MOCK_PRODUCTS.find(p => p.name === item.productName || p.id === item.productId);
      if (product) { product.stockQuantity += item.quantity; }
    }
    return newReceipt;
  },

  // --- DASHBOARD STATS (3.4 + 3.5) ---
  getDashboardStats: async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        productsApi.getAllProducts(),
        ordersApi.getAll(),
      ]);
      return { products: productsRes.data, orders: ordersRes.data };
    } catch {
      const products = MOCK_PRODUCTS;
      const orders = MOCK_DELIVERY_ORDERS;
      const totalProducts = products.length;
      const totalStockValue = products.reduce((s, p) => s + p.stockQuantity * p.unitPrice, 0);
      const lowStockProducts = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock);
      const outOfStockProducts = products.filter(p => p.stockQuantity === 0);
      const orderStats = {
        pending: orders.filter(o => o.deliveryStatus === 'pending').length,
        shipping: orders.filter(o => o.deliveryStatus === 'shipping').length,
        delivered: orders.filter(o => o.deliveryStatus === 'delivered').length,
        failed: orders.filter(o => o.deliveryStatus === 'failed').length,
      };
      return { totalProducts, totalStockValue, lowStockProducts, outOfStockProducts, orderStats, products, orders };
    }
  },

  getTopProducts: async () => {
    try {
      const res = await reportsApi.getTopProducts();
      return res.data;
    } catch {
      return MOCK_PRODUCTS.sort((a, b) => b.stockQuantity - a.stockQuantity).slice(0, 5);
    }
  },
};

export default warehouseService;
