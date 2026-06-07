/**
 * warehouseService.js
 * 
 * Kết nối với dữ liệu chung của hệ thống thông qua salesService.
 * 
 * MAPPING TRẠNG THÁI (đồng bộ với Sales):
 *   Sales rawStatus  → Warehouse Delivery
 *   'CONFIRMED'      → Kho tiếp nhận, chuẩn bị hàng
 *   'SHIPPING'       → Đang giao hàng
 *   'DELIVERED'      → Giao thành công
 *   'CANCELLED'      → Đã hủy
 *
 * LƯU Ý: Không có trạng thái 'failed' trong Sales.
 * Khi giao thất bại, lưu lý do vào note và rollback về 'CONFIRMED'.
 */

import dbData from '../../../../db.json';

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
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// ============================================================
// LOCAL STORAGE HELPERS (dùng chung với Sales)
// ============================================================
const getLocalOrders = () => {
  try {
    const raw = localStorage.getItem('added_orders');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveLocalOrders = (orders) => {
  localStorage.setItem('added_orders', JSON.stringify(orders));
};

const getLocalProducts = () => {
  try {
    const raw = localStorage.getItem('added_products');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveLocalProducts = (products) => {
  localStorage.setItem('added_products', JSON.stringify(products));
};

const getLocalCustomers = () => {
  try {
    const raw = localStorage.getItem('added_customers');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const getLocalImportHistory = () => {
  try {
    const raw = localStorage.getItem('wh_import_history');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveLocalImportHistory = (history) => {
  localStorage.setItem('wh_import_history', JSON.stringify(history));
};

// ============================================================
// DELIVERY NOTE HELPERS (lưu ghi chú giao hàng riêng)
// ============================================================
const getDeliveryNotes = () => {
  try {
    const raw = localStorage.getItem('wh_delivery_notes');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const saveDeliveryNote = (orderID, note) => {
  const notes = getDeliveryNotes();
  notes[String(orderID)] = note;
  localStorage.setItem('wh_delivery_notes', JSON.stringify(notes));
};

const getDeliveryStatusHistory = () => {
  try {
    const raw = localStorage.getItem('wh_delivery_status_history');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const saveDeliveryStatusHistory = (orderID, history) => {
  const all = getDeliveryStatusHistory();
  all[String(orderID)] = history;
  localStorage.setItem('wh_delivery_status_history', JSON.stringify(all));
};

// ============================================================
// DATA HELPERS
// ============================================================
const getAllProducts = () => {
  const local = getLocalProducts();
  const apiData = dbData.products || [];
  const deletedIds = new Set(
    JSON.parse(localStorage.getItem('deleted_product_ids') || '[]').map(Number)
  );
  const productMap = new Map();
  apiData.forEach(p => {
    if (!deletedIds.has(Number(p.productID))) productMap.set(Number(p.productID), p);
  });
  local.forEach(p => productMap.set(Number(p.productID), p));
  return Array.from(productMap.values());
};

const getAllCustomers = () => {
  const local = getLocalCustomers();
  const apiData = dbData.customers || [];
  const deletedIds = new Set(
    JSON.parse(localStorage.getItem('deleted_customer_ids') || '[]').map(Number)
  );
  const map = new Map();
  apiData.forEach(c => {
    if (!deletedIds.has(Number(c.customerID))) map.set(Number(c.customerID), c);
  });
  local.forEach(c => map.set(Number(c.customerID), c));
  return Array.from(map.values());
};

const getCustomerName = (customerID) => {
  const customers = getAllCustomers();
  const c = customers.find(c => Number(c.customerID) === Number(customerID));
  if (!c) return 'Khách hàng';
  return c.companyName || `${c.lastName || ''} ${c.firstName || ''}`.trim() || 'Khách hàng';
};

const formatOrderID = (id) => {
  if (!id) return 'N/A';
  if (isNaN(id)) return String(id);
  return `ORD-${String(id).padStart(3, '0')}`;
};

// Lấy items của đơn hàng
const getOrderItems = (order) => {
  const allOrderItems = [
    ...JSON.parse(localStorage.getItem('added_order_items') || '[]'),
    ...(dbData.orderItems || [])
  ];
  const allProducts = getAllProducts();
  const productMap = {};
  allProducts.forEach(p => { productMap[p.productID] = p; });

  if (order.items && Array.isArray(order.items) && order.items.length > 0) {
    return order.items.map(item => {
      const product = productMap[item.productID];
      return {
        productID: item.productID,
        productName: item.productName || item.name || 'Sản phẩm',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice || item.price) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice || item.price) || 0),
        stockQuantity: product ? (product.stockQuantity || 0) : 0,
        sku: product ? (product.productCode || product.sku || '') : '',
      };
    });
  }

  const itemsFromDB = allOrderItems.filter(item => Number(item.orderID) === Number(order.orderID));
  return itemsFromDB.map(item => {
    const product = productMap[item.productID];
    return {
      productID: item.productID,
      productName: product ? product.productName : `Sản phẩm ID ${item.productID}`,
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice || item.price || (product ? product.salePrice : 0)) || 0,
      total: (Number(item.quantity) || 1) * (Number(item.unitPrice || item.price || (product ? product.salePrice : 0)) || 0),
      stockQuantity: product ? (product.stockQuantity || 0) : 0,
      sku: product ? (product.productCode || product.sku || '') : '',
    };
  });
};

// ============================================================
// STATUS HELPERS
// ============================================================
export const STATUS_LABELS = {
  CONFIRMED: 'Chờ giao',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export const DELIVERY_STATUSES = ['CONFIRMED', 'SHIPPING', 'DELIVERED'];

// ============================================================
// WAREHOUSE SERVICE
// ============================================================
const warehouseService = {

  // ─── DELIVERY ORDERS (3.1) ──────────────────────────────────
  /**
   * Lấy danh sách đơn hàng cần giao (trạng thái CONFIRMED, SHIPPING, DELIVERED).
   * Dữ liệu được lấy từ localStorage 'added_orders' và db.json (chung với Sales).
   */
  getDeliveryOrders: async (filters = {}) => {
    const localOrders = getLocalOrders();
    const apiOrders = dbData.orders || [];
    const localIds = new Set(localOrders.map(o => Number(o.orderID)));
    let allOrders = [...localOrders, ...apiOrders.filter(o => !localIds.has(Number(o.orderID)))];

    // Chỉ lấy đơn hàng kho cần xử lý (bỏ qua PENDING và CANCELLED)
    allOrders = allOrders.filter(o =>
      ['CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(o.orderStatus)
    );

    const deliveryNotes = getDeliveryNotes();

    // Map dữ liệu + ghép thông tin khách hàng
    let result = allOrders.map(order => ({
      ...order,
      displayID: formatOrderID(order.orderID),
      customerName: getCustomerName(order.customerID),
      totalAmount: Number(order.totalAmount) * 1.1,
      deliveryNote: deliveryNotes[String(order.orderID)] || '',
      items: getOrderItems(order),
    }));

    // Lọc theo trạng thái
    if (filters.status && filters.status !== 'all') {
      result = result.filter(o => o.orderStatus === filters.status);
    }

    // Lọc theo tìm kiếm
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(o =>
        o.displayID.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s)
      );
    }

    // Sắp xếp mới nhất lên đầu
    result.sort((a, b) => new Date(b.orderDate || b.date || 0) - new Date(a.orderDate || a.date || 0));

    return result;
  },

  // ─── ORDER DETAIL (3.2) ─────────────────────────────────────
  getOrderDetail: async (orderID) => {
    const localOrders = getLocalOrders();
    const apiOrders = dbData.orders || [];
    const allOrders = [...localOrders, ...apiOrders];

    const order = allOrders.find(o => String(o.orderID) === String(orderID) || formatOrderID(o.orderID) === String(orderID));
    if (!order) return null;

    const deliveryNotes = getDeliveryNotes();
    const statusHistory = getDeliveryStatusHistory();

    return {
      ...order,
      displayID: formatOrderID(order.orderID),
      customerName: getCustomerName(order.customerID),
      totalAmount: Number(order.totalAmount) * 1.1,
      deliveryNote: deliveryNotes[String(order.orderID)] || '',
      statusHistory: statusHistory[String(order.orderID)] || [
        {
          status: order.orderStatus,
          date: new Date(order.orderDate || Date.now()).toLocaleString('vi-VN'),
          note: 'Đơn hàng được xác nhận bởi bộ phận Kinh doanh',
        }
      ],
      items: getOrderItems(order),
    };
  },

  // ─── UPDATE DELIVERY STATUS (3.2) ───────────────────────────
  /**
   * Cập nhật trạng thái giao hàng - Gọi vào localStorage chung với Sales.
   * Khi giao thất bại (deliveryFailed=true): lưu ghi chú và giữ nguyên trạng thái SHIPPING
   * hoặc rollback về CONFIRMED tùy quyết định nghiệp vụ.
   */
  updateDeliveryStatus: async (orderID, newStatus, note = '', deliveryFailed = false) => {
    const localOrders = getLocalOrders();
    let found = false;

    const updatedLocal = localOrders.map(o => {
      if (Number(o.orderID) === Number(orderID)) {
        found = true;
        return { ...o, orderStatus: newStatus };
      }
      return o;
    });

    if (found) {
      saveLocalOrders(updatedLocal);
    } else {
      // Đơn hàng từ db.json gốc, cần tạo bản override trong localStorage
      const originalOrder = (dbData.orders || []).find(o => Number(o.orderID) === Number(orderID));
      if (originalOrder) {
        saveLocalOrders([{ ...originalOrder, orderStatus: newStatus }, ...localOrders]);
      }
    }

    // Lưu note giao hàng riêng
    if (note) {
      saveDeliveryNote(orderID, note);
    }

    // Cập nhật lịch sử trạng thái
    const allHistory = getDeliveryStatusHistory();
    const currentHistory = allHistory[String(orderID)] || [];
    const newHistoryEntry = {
      status: deliveryFailed ? 'FAILED' : newStatus,
      date: new Date().toLocaleString('vi-VN'),
      note: note || STATUS_LABELS[newStatus] || newStatus,
    };
    saveDeliveryStatusHistory(orderID, [...currentHistory, newHistoryEntry]);

    return { success: true };
  },

  // Xử lý giao hàng thất bại (giữ SHIPPING, ghi chú lý do)
  markDeliveryFailed: async (orderID, reason) => {
    await warehouseService.updateDeliveryStatus(orderID, 'CONFIRMED', reason, true);

    // Ghi vào lịch sử riêng với trạng thái FAILED
    const allHistory = getDeliveryStatusHistory();
    const currentHistory = allHistory[String(orderID)] || [];
    const lastEntry = currentHistory[currentHistory.length - 1];
    // Đã được xử lý trong updateDeliveryStatus, chỉ cần ghi đè entry cuối
    if (lastEntry) {
      lastEntry.status = 'FAILED';
      lastEntry.note = `Giao thất bại: ${reason}`;
    }
    saveDeliveryStatusHistory(orderID, currentHistory);
    return { success: true };
  },

  // ─── INVENTORY / PRODUCTS (3.3 + 3.4) ──────────────────────
  getInventory: async (filters = {}) => {
    let data = getAllProducts();

    if (filters.category) {
      data = data.filter(p => (p.categoryID === filters.category || p.category === filters.category));
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      data = data.filter(p =>
        (p.productName || '').toLowerCase().includes(s) ||
        (p.productCode || p.sku || '').toLowerCase().includes(s)
      );
    }
    if (filters.stockStatus === 'low') {
      data = data.filter(p => p.stockQuantity > 0 && p.stockQuantity <= (p.minStock || 10));
    } else if (filters.stockStatus === 'out') {
      data = data.filter(p => p.stockQuantity === 0 || !p.stockQuantity);
    } else if (filters.stockStatus === 'ok') {
      data = data.filter(p => p.stockQuantity > (p.minStock || 10));
    }

    return data.map(p => ({
      ...p,
      id: p.productID,
      name: p.productName || 'Sản phẩm',
      sku: p.productCode || p.sku || `SP-${p.productID}`,
      category: p.categoryName || p.category || 'Chưa phân loại',
      unitPrice: Number(p.salePrice || p.unitPrice) || 0,
      stockQuantity: Number(p.stockQuantity) || 0,
      minStock: Number(p.minStock) || 10,
      unit: p.unit || 'Cái',
    }));
  },

  getCategories: async () => {
    return dbData.categories || [];
  },

  // Cập nhật tồn kho sản phẩm (dùng chung localStorage với Admin)
  updateStock: async (productID, additionalQty) => {
    const localProducts = getLocalProducts();
    let found = false;

    const updatedLocal = localProducts.map(p => {
      if (Number(p.productID) === Number(productID)) {
        found = true;
        return { ...p, stockQuantity: (Number(p.stockQuantity) || 0) + additionalQty };
      }
      return p;
    });

    if (found) {
      saveLocalProducts(updatedLocal);
    } else {
      const originalProduct = (dbData.products || []).find(p => Number(p.productID) === Number(productID));
      if (originalProduct) {
        const newProduct = {
          ...originalProduct,
          stockQuantity: (Number(originalProduct.stockQuantity) || 0) + additionalQty,
        };
        saveLocalProducts([newProduct, ...localProducts]);
      }
    }

    return { success: true };
  },

  // ─── IMPORT HISTORY (3.3) ───────────────────────────────────
  getImportHistory: async () => {
    return getLocalImportHistory();
  },

  createImportReceipt: async (receipt) => {
    const history = getLocalImportHistory();
    const newReceipt = {
      id: `NK-${String(history.length + 1).padStart(3, '0')}`,
      date: new Date().toISOString().substring(0, 10),
      ...receipt,
      status: 'completed',
      createdBy: 'Nhân viên Kho',
    };

    saveLocalImportHistory([newReceipt, ...history]);

    // Cộng dồn tồn kho
    for (const item of receipt.items) {
      if (item.productId || item.productID) {
        await warehouseService.updateStock(item.productId || item.productID, Number(item.quantity) || 0);
      }
    }

    return newReceipt;
  },

  // ─── DASHBOARD STATS (3.4 + 3.5) ───────────────────────────
  getDashboardStats: async () => {
    const localOrders = getLocalOrders();
    const apiOrders = dbData.orders || [];
    const localIds = new Set(localOrders.map(o => Number(o.orderID)));
    const allOrders = [...localOrders, ...apiOrders.filter(o => !localIds.has(Number(o.orderID)))];

    const products = getAllProducts().map(p => ({
      ...p,
      id: p.productID,
      name: p.productName || 'Sản phẩm',
      sku: p.productCode || p.sku || `SP-${p.productID}`,
      category: p.categoryName || p.category || 'Chưa phân loại',
      unitPrice: Number(p.salePrice || p.unitPrice) || 0,
      stockQuantity: Number(p.stockQuantity) || 0,
      minStock: Number(p.minStock) || 10,
      unit: p.unit || 'Cái',
    }));

    const deliveryOrders = allOrders.filter(o =>
      ['CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(o.orderStatus)
    );

    const totalProducts = products.length;
    const totalStockValue = products.reduce((s, p) => s + p.stockQuantity * p.unitPrice, 0);
    const lowStockProducts = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock);
    const outOfStockProducts = products.filter(p => p.stockQuantity === 0);

    const orderStats = {
      CONFIRMED: deliveryOrders.filter(o => o.orderStatus === 'CONFIRMED').length,
      SHIPPING: deliveryOrders.filter(o => o.orderStatus === 'SHIPPING').length,
      DELIVERED: deliveryOrders.filter(o => o.orderStatus === 'DELIVERED').length,
    };

    return {
      totalProducts,
      totalStockValue,
      lowStockProducts,
      outOfStockProducts,
      orderStats,
      products,
      orders: deliveryOrders,
    };
  },
};

export default warehouseService;
