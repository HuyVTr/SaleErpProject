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

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('current_user') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

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

// Sinh số giả ngẫu nhiên CỐ ĐỊNH theo seed (cùng orderID luôn ra cùng kết quả) → mốc
// thời gian không nhảy mỗi lần render, nhưng mỗi đơn lại có giờ-phút riêng (không trùng nhau).
const seededRand = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Dựng lịch sử trạng thái mặc định cho đơn chưa từng được thao tác trên UI (chưa có
// bản ghi trong wh_delivery_status_history). Mỗi nấc tiến trình có giờ-phút thực tế,
// tăng dần đúng logic (xác nhận < bắt đầu giao < giao xong) và khác nhau giữa các đơn —
// đúng tinh thần bảng DeliveryStatusHistory (srs.sql #24). Khi ghép BE, thay nguồn dữ liệu
// bằng dữ liệu thật từ bảng này là xong, không cần đổi UI.
const buildDefaultStatusHistory = (order) => {
  const orderID = Number(order.orderID);
  const baseDay = new Date(order.orderDate || Date.now());
  const deliveryDay = order.deliveryDate ? new Date(order.deliveryDate) : null;
  const status = order.orderStatus;

  // Mốc XÁC NHẬN: trong khung 8h–10h sáng, phút sinh theo orderID
  const confirmedAt = new Date(baseDay);
  confirmedAt.setHours(8 + Math.floor(seededRand(orderID) * 3), Math.floor(seededRand(orderID * 7) * 60), 0, 0);

  // Mốc BẮT ĐẦU GIAO: 2–5 tiếng sau khi xác nhận
  const shippedAt = new Date(
    confirmedAt.getTime() + (2 + Math.floor(seededRand(orderID * 13) * 4)) * 3600000
    + Math.floor(seededRand(orderID * 17) * 60) * 60000
  );

  // Mốc GIAO XONG: nếu giao sang ngày khác → buổi chiều (13h–17h) ngày deliveryDate;
  // nếu giao trong ngày → vài tiếng sau khi bắt đầu giao (luôn đảm bảo SAU mốc bắt đầu giao)
  let deliveredAt;
  if (deliveryDay && deliveryDay.toDateString() !== baseDay.toDateString()) {
    deliveredAt = new Date(deliveryDay);
    deliveredAt.setHours(13 + Math.floor(seededRand(orderID * 19) * 5), Math.floor(seededRand(orderID * 23) * 60), 0, 0);
  } else {
    deliveredAt = new Date(shippedAt.getTime() + (3 + Math.floor(seededRand(orderID * 29) * 5)) * 3600000);
  }

  // Mốc HỦY: 1–3 tiếng sau khi xác nhận
  const cancelledAt = new Date(confirmedAt.getTime() + (1 + Math.floor(seededRand(orderID * 31) * 3)) * 3600000);

  const toEntry = (idx, entryStatus, note, when) => ({
    historyID: orderID * 100 + idx,
    orderID,
    status: entryStatus,
    note,
    changedAt: when.toISOString(),
    userID: order.userID || null,
    date: when.toLocaleString('vi-VN'),
  });

  const entries = [
    toEntry(1, 'CONFIRMED', 'Đơn hàng được xác nhận, kho bắt đầu chuẩn bị hàng', confirmedAt),
  ];

  if (status === 'SHIPPING' || status === 'DELIVERED') {
    entries.push(toEntry(2, 'SHIPPING', 'Đơn hàng đã rời kho và đang trên đường giao', shippedAt));
  }

  if (status === 'DELIVERED') {
    entries.push(toEntry(3, 'DELIVERED', 'Giao hàng thành công, khách hàng đã nhận đủ', deliveredAt));
  }

  if (status === 'CANCELLED') {
    entries.push(toEntry(2, 'CANCELLED', 'Đơn hàng đã bị hủy trước khi giao', cancelledAt));
  }

  return entries;
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
    if (!deletedIds.has(Number(p.productID))) {
      const stock = p.stockQuantity !== undefined 
        ? p.stockQuantity 
        : (p.stock !== undefined ? p.stock : [120, 0, 15, 340][Number(p.productID) % 4]);
      productMap.set(Number(p.productID), { ...p, stockQuantity: stock });
    }
  });
  local.forEach(p => {
    const stock = p.stockQuantity !== undefined 
      ? p.stockQuantity 
      : (p.stock !== undefined ? p.stock : [120, 0, 15, 340][Number(p.productID) % 4]);
    productMap.set(Number(p.productID), { ...p, stockQuantity: stock });
  });
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
// WAREHOUSE SERVICE
// ============================================================
import api from '../../../services/api';

const warehouseService = {

  // ─── DELIVERY ORDERS (3.1) ──────────────────────────────────
  getDeliveryOrders: async (filters = {}) => {
    // Gọi API đơn hàng thật từ Backend
    const response = await api.get('/orders', { params: filters });
    const orders = response.data?.success ? response.data.data : response.data || [];

    // Lọc các đơn hàng cần giao theo trạng thái giống logic mock
    const deliveryOrders = orders.filter(o =>
      ['CONFIRMED', 'SHIPPING', 'DELIVERED', 'FAILED'].includes(o.orderStatus)
    );

    return deliveryOrders.map(order => ({
      ...order,
      displayID: formatOrderID(order.orderID),
      customerName: order.customer 
        ? (order.customer.companyName || `${order.customer.lastName || ''} ${order.customer.firstName || ''}`.trim()) 
        : 'Khách hàng',
      totalAmount: Number(order.totalAmount) * 1.1, // Cộng thuế
      deliveryNote: order.deliveryNote || '',
      items: (order.items || []).map(item => ({
        productID: item.productID,
        productName: item.product ? item.product.productName : 'Sản phẩm',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        stockQuantity: item.product ? (item.product.stockQuantity || 0) : 0,
        sku: item.product ? (item.product.sku || '') : '',
      })),
    }));
  },

  // ─── ORDER DETAIL (3.2) ─────────────────────────────────────
  getOrderDetail: async (orderID) => {
    const response = await api.get(`/orders/${orderID}`);
    const order = response.data?.success ? response.data.data : response.data;
    if (!order) return null;

    // Lấy lịch sử giao hàng từ BE
    const historyResponse = await api.get(`/warehouse/delivery-history/${order.orderID}`);
    const statusHistory = historyResponse.data || [];

    return {
      ...order,
      displayID: formatOrderID(order.orderID),
      customerName: order.customer 
        ? (order.customer.companyName || `${order.customer.lastName || ''} ${order.customer.firstName || ''}`.trim()) 
        : 'Khách hàng',
      totalAmount: Number(order.totalAmount) * 1.1,
      deliveryNote: order.deliveryNote || '',
      statusHistory: statusHistory.length > 0 ? statusHistory.map((h, idx) => ({
        historyID: h.historyID,
        orderID: h.orderID,
        status: h.status,
        note: h.note,
        changedAt: h.changedAt,
        userID: h.userID,
        date: new Date(h.changedAt).toLocaleString('vi-VN'),
      })) : buildDefaultStatusHistory(order),
      items: (order.items || []).map(item => ({
        productID: item.productID,
        productName: item.product ? item.product.productName : 'Sản phẩm',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
        stockQuantity: item.product ? (item.product.stockQuantity || 0) : 0,
        sku: item.product ? (item.product.sku || '') : '',
      })),
    };
  },

  // ─── UPDATE DELIVERY STATUS (3.2) ───────────────────────────
  updateDeliveryStatus: async (orderID, newStatus, note = '', deliveryFailed = false) => {
    // Gửi cập nhật lịch sử giao hàng lên BE, BE sẽ tự update trạng thái đơn hàng
    await api.post('/warehouse/delivery-history', {
      orderID: Number(orderID),
      status: deliveryFailed ? 'FAILED' : newStatus,
      note: note || STATUS_LABELS[newStatus] || newStatus,
    });
    return { success: true };
  },

  markDeliveryFailed: async (orderID, reason) => {
    await warehouseService.updateDeliveryStatus(orderID, 'FAILED', `Giao thất bại: ${reason}`, true);
    return { success: true };
  },

  // ─── RETRY DELIVERY ─────────────────────────────────────────
  retryDelivery: async (orderID) => {
    await warehouseService.updateDeliveryStatus(
      orderID,
      'CONFIRMED',
      'Kho kích hoạt giao lại đơn hàng sau khi giao thất bại'
    );
    return { success: true };
  },

  // ─── INVENTORY / PRODUCTS (3.3 + 3.4) ──────────────────────
  getInventory: async (filters = {}) => {
    const response = await api.get('/products', { params: filters });
    const products = response.data?.success ? response.data.data : response.data || [];

    return products.map(p => ({
      ...p,
      id: p.productID,
      name: p.productName || 'Sản phẩm',
      sku: p.sku || `PRD-${String(p.productID).padStart(3, '0')}`,
      category: p.category ? p.category.categoryName : 'Chưa phân loại',
      unitPrice: Number(p.salePrice) || 0,
      stockQuantity: Number(p.stockQuantity) || 0,
      minStock: Number(p.minStock) || 10,
      unit: p.unit || 'Cái',
    }));
  },

  getCategories: async () => {
    const response = await api.get('/categories');
    return response.data || [];
  },

  updateStock: async (productID, additionalQty) => {
    // Gọi API nhập kho của BE để thay đổi tồn kho
    await api.post('/warehouse/imports', {
      items: [{ productId: productID, quantity: additionalQty }]
    });
    return { success: true };
  },

  // ─── IMPORT HISTORY (3.3) ───────────────────────────────────
  getImportHistory: async () => {
    const response = await api.get('/warehouse/imports');
    return response.data || [];
  },

  createImportReceipt: async (receipt) => {
    const response = await api.post('/warehouse/imports', receipt);
    return response.data?.data || response.data;
  },

  revertImportReceipt: async (receiptId) => {
    const response = await api.post(`/warehouse/imports/${receiptId}/revert`);
    return response.data;
  },

  // ─── DASHBOARD STATS (3.4 + 3.5) ───────────────────────────
  getDashboardStats: async (timeframe = 'monthly', options = {}) => {
    const localOrders = getLocalOrders();
    const apiOrders = dbData.orders || [];
    const localIds = new Set(localOrders.map(o => Number(o.orderID)));
    let allOrders = [...localOrders, ...apiOrders.filter(o => !localIds.has(Number(o.orderID)))];

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

    const importHistory = getLocalImportHistory();

    const allOrdersWithItems = allOrders.map(o => ({
      ...o,
      items: getOrderItems(o)
    }));

    const getPeriodRange = (tf, opts) => {
      const { filterDate, filterWeek, filterYear, selectedDay, filterYearsCount } = opts;
      const now = new Date();
      
      let currentStart, currentEnd;
      let prevStart, prevEnd;
      let comparisonLabel = "So với kỳ trước";

      if (tf === 'daily') {
        const [y, m] = filterDate.split('-').map(Number);
        currentStart = new Date(y, m - 1, selectedDay, 0, 0, 0);
        currentEnd = new Date(y, m - 1, selectedDay, 23, 59, 59);

        prevStart = new Date(y, m - 1, selectedDay - 1, 0, 0, 0);
        prevEnd = new Date(y, m - 1, selectedDay - 1, 23, 59, 59);
        comparisonLabel = "So với hôm qua";
      } else if (tf === 'weekly') {
        const [y, w] = filterWeek.split('-W').map(Number);
        
        const getWeekRangeDates = (year, week) => {
          const d = new Date(year, 0, 1);
          const dayNum = d.getDay();
          const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
          const firstMonday = new Date(d.setDate(diff));
          const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
          const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23*3600000 + 59*60000 + 59000);
          return { start, end };
        };

        const currentRange = getWeekRangeDates(y, w);
        currentStart = currentRange.start;
        currentEnd = currentRange.end;

        let prevY = y, prevW = w - 1;
        if (prevW === 0) { prevY--; prevW = 52; }
        const prevRange = getWeekRangeDates(prevY, prevW);
        prevStart = prevRange.start;
        prevEnd = prevRange.end;
        comparisonLabel = "So với tuần trước";
      } else if (tf === 'monthly') {
        currentStart = new Date(filterYear, 0, 1, 0, 0, 0);
        currentEnd = new Date(filterYear, 11, 31, 23, 59, 59);

        prevStart = new Date(filterYear - 1, 0, 1, 0, 0, 0);
        prevEnd = new Date(filterYear - 1, 11, 31, 23, 59, 59);
        comparisonLabel = "So với năm trước";
      } else if (tf === 'yearly') {
        const yearsCount = filterYearsCount || 5;
        const currentYear = now.getFullYear();
        currentStart = new Date(currentYear - yearsCount + 1, 0, 1, 0, 0, 0);
        currentEnd = new Date(currentYear, 11, 31, 23, 59, 59);

        prevStart = new Date(currentYear - (2 * yearsCount) + 1, 0, 1, 0, 0, 0);
        prevEnd = new Date(currentYear - yearsCount, 11, 31, 23, 59, 59);
        comparisonLabel = `So với ${yearsCount} năm trước`;
      } else {
        currentStart = new Date(1970, 0, 1);
        currentEnd = new Date(2099, 11, 31);
        prevStart = new Date(1970, 0, 1);
        prevEnd = new Date(1970, 0, 1);
      }

      return { currentStart, currentEnd, prevStart, prevEnd, comparisonLabel };
    };

    const { currentStart, currentEnd, prevStart, prevEnd, comparisonLabel } = getPeriodRange(timeframe, options);

    const calculateStockAtDate = (baseProducts, targetEnd) => {
      const targetTime = targetEnd.getTime();
      const productsAtDate = baseProducts.map(p => ({ ...p, stockQuantity: Number(p.stockQuantity) || 0 }));

      importHistory.forEach(receipt => {
        const receiptDate = new Date(receipt.date);
        if (!isNaN(receiptDate.getTime()) && receiptDate.getTime() > targetTime) {
          if (receipt.items && Array.isArray(receipt.items)) {
            receipt.items.forEach(item => {
              const pId = item.productId || item.productID;
              const prod = productsAtDate.find(p => Number(p.productID) === Number(pId));
              if (prod) {
                prod.stockQuantity = Math.max(0, prod.stockQuantity - (Number(item.quantity) || 0));
              }
            });
          }
        }
      });

      allOrdersWithItems.forEach(order => {
        if (['SHIPPING', 'DELIVERED'].includes(order.orderStatus)) {
          const orderDate = new Date(order.orderDate || order.date);
          if (!isNaN(orderDate.getTime()) && orderDate.getTime() > targetTime) {
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const prod = productsAtDate.find(p => Number(p.productID) === Number(item.productID));
                if (prod) {
                  prod.stockQuantity = prod.stockQuantity + (Number(item.quantity) || 0);
                }
              });
            }
          }
        }
      });

      return productsAtDate;
    };

    const productsCurrent = calculateStockAtDate(products, currentEnd);
    const productsPrevious = calculateStockAtDate(products, prevEnd);

    const totalProducts = productsCurrent.filter(p => p.stockQuantity > 0).length;
    const totalStockValue = productsCurrent.reduce((s, p) => s + p.stockQuantity * p.unitPrice, 0);
    const lowStockProducts = productsCurrent.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock);
    const outOfStockProducts = productsCurrent.filter(p => p.stockQuantity === 0);

    const totalProductsPrev = productsPrevious.filter(p => p.stockQuantity > 0).length;
    const totalStockValuePrev = productsPrevious.reduce((s, p) => s + p.stockQuantity * p.unitPrice, 0);
    const lowStockProductsPrev = productsPrevious.filter(p => p.stockQuantity > 0 && p.stockQuantity <= p.minStock);
    const outOfStockProductsPrev = productsPrevious.filter(p => p.stockQuantity === 0);

    const calculateGrowth = (curr, prev) => {
      if (prev === 0) return { percent: curr > 0 ? 100 : 0, isUp: curr > 0, prevValue: prev, label: comparisonLabel };
      const p = ((curr - prev) / prev) * 100;
      return { 
        percent: Math.round(Math.abs(p)), 
        isUp: p >= 0,
        prevValue: prev,
        label: comparisonLabel
      };
    };

    const deliveryOrdersCurrent = allOrdersWithItems.filter(o => {
      if (!['CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(o.orderStatus)) return false;
      const d = new Date(o.orderDate || o.date);
      if (isNaN(d.getTime())) return false;
      return d >= currentStart && d <= currentEnd;
    });

    const deliveryOrdersPrevious = allOrdersWithItems.filter(o => {
      if (!['CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(o.orderStatus)) return false;
      const d = new Date(o.orderDate || o.date);
      if (isNaN(d.getTime())) return false;
      return d >= prevStart && d <= prevEnd;
    });

    const shippingCurrent = deliveryOrdersCurrent.filter(o => o.orderStatus === 'SHIPPING').length;
    const shippingPrevious = deliveryOrdersPrevious.filter(o => o.orderStatus === 'SHIPPING').length;

    const alertsCurrent = lowStockProducts.length + outOfStockProducts.length;
    const alertsPrevious = lowStockProductsPrev.length + outOfStockProductsPrev.length;

    const productsGrowth = calculateGrowth(totalProducts, totalProductsPrev);
    const valueGrowth = calculateGrowth(totalStockValue, totalStockValuePrev);
    const shippingGrowth = calculateGrowth(shippingCurrent, shippingPrevious);
    const alertsGrowth = calculateGrowth(alertsCurrent, alertsPrevious);
    alertsGrowth.isUp = alertsCurrent <= alertsPrevious;

    const orderStats = {
      CONFIRMED: deliveryOrdersCurrent.filter(o => o.orderStatus === 'CONFIRMED').length,
      SHIPPING: shippingCurrent,
      DELIVERED: deliveryOrdersCurrent.filter(o => o.orderStatus === 'DELIVERED').length,
    };

    return {
      totalProducts,
      totalStockValue,
      lowStockProducts,
      outOfStockProducts,
      orderStats,
      products: productsCurrent,
      orders: deliveryOrdersCurrent,
      productsGrowth,
      valueGrowth,
      shippingGrowth,
      alertsGrowth
    };
  },
};

export default warehouseService;
