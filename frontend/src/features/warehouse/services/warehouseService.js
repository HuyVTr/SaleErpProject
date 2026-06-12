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
const warehouseService = {

  // ─── DELIVERY ORDERS (3.1) ──────────────────────────────────
  getDeliveryOrders: async (filters = {}) => {
    const localOrders = getLocalOrders();
    const apiOrders = dbData.orders || [];
    const localIds = new Set(localOrders.map(o => Number(o.orderID)));
    let allOrders = [...localOrders, ...apiOrders.filter(o => !localIds.has(Number(o.orderID)))];

    allOrders = allOrders.filter(o =>
      ['CONFIRMED', 'SHIPPING', 'DELIVERED', 'FAILED'].includes(o.orderStatus)
    );

    const deliveryNotes = getDeliveryNotes();

    let result = allOrders.map(order => ({
      ...order,
      displayID: formatOrderID(order.orderID),
      customerName: getCustomerName(order.customerID),
      totalAmount: Number(order.totalAmount) * 1.1,
      deliveryNote: deliveryNotes[String(order.orderID)] || '',
      items: getOrderItems(order),
    }));

    if (filters.status && filters.status !== 'all') {
      result = result.filter(o => o.orderStatus === filters.status);
    }

    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(o =>
        o.displayID.toLowerCase().includes(s) ||
        o.customerName.toLowerCase().includes(s)
      );
    }

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
      // Mỗi entry mô phỏng đúng cấu trúc bảng DeliveryStatusHistory (xem srs.sql #24)
      // để khi backend thật ghép vào, chỉ cần đổi nguồn dữ liệu mà không đổi UI.
      // Đơn chưa từng thao tác trên UI → dựng tiến trình mặc định theo orderDate/deliveryDate thật của đơn.
      statusHistory: statusHistory[String(order.orderID)] || buildDefaultStatusHistory(order),
      items: getOrderItems(order),
    };
  },

  // ─── UPDATE DELIVERY STATUS (3.2) ───────────────────────────
  updateDeliveryStatus: async (orderID, newStatus, note = '', deliveryFailed = false) => {
    const localOrders = getLocalOrders();
    // Lấy đơn TRƯỚC khi cập nhật — dùng để dựng các mốc lịch sử đã qua (nếu đơn này
    // chưa từng có bản ghi lịch sử thật trong localStorage), tránh bị mất mốc cũ.
    const orderBeforeUpdate = [...localOrders, ...(dbData.orders || [])]
      .find(o => Number(o.orderID) === Number(orderID));
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
      const originalOrder = (dbData.orders || []).find(o => Number(o.orderID) === Number(orderID));
      if (originalOrder) {
        saveLocalOrders([{ ...originalOrder, orderStatus: newStatus }, ...localOrders]);
      }
    }

    if (note) {
      saveDeliveryNote(orderID, note);
    }

    const currentUser = getCurrentUser();
    const allHistory = getDeliveryStatusHistory();
    // Nếu đơn này chưa từng có bản ghi lịch sử thật → seed bằng tiến trình mặc định
    // (dựng từ trạng thái CŨ trước khi cập nhật) để không bị mất các mốc đã hiển thị,
    // rồi mới nối thêm mốc mới — tránh hiện tượng "ghi đè" lên thực thể trước đó.
    const currentHistory = allHistory[String(orderID)]
      || (orderBeforeUpdate ? buildDefaultStatusHistory(orderBeforeUpdate) : []);
    const now = new Date();
    // Cấu trúc entry bám theo bảng DeliveryStatusHistory (srs.sql #24): orderID, status, note, changedAt, userID
    const newHistoryEntry = {
      historyID: Number(orderID) * 100 + currentHistory.length + 1,
      orderID: Number(orderID),
      status: deliveryFailed ? 'FAILED' : newStatus,
      note: note || STATUS_LABELS[newStatus] || newStatus,
      changedAt: now.toISOString(),
      userID: currentUser?.userID || null,
      date: now.toLocaleString('vi-VN'),
    };
    saveDeliveryStatusHistory(orderID, [...currentHistory, newHistoryEntry]);

    return { success: true };
  },

  markDeliveryFailed: async (orderID, reason) => {
    // Đơn chuyển hẳn sang trạng thái FAILED (không rollback về CONFIRMED) để
    // phản ánh đúng kết quả giao hàng — đơn vẫn lưu trên màn hình kho với
    // trạng thái "Giao thất bại" và chờ kho kích hoạt giao lại.
    await warehouseService.updateDeliveryStatus(orderID, 'FAILED', `Giao thất bại: ${reason}`, true);
    return { success: true };
  },

  // ─── RETRY DELIVERY (giao lại sau khi thất bại) ─────────────
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
    let data = getAllProducts();
    const categories = dbData.categories || [];

    if (filters.category) {
      data = data.filter(p => {
        const cat = categories.find(c => Number(c.categoryID) === Number(p.categoryID));
        const catName = cat ? cat.categoryName : 'Chưa phân loại';
        return String(p.categoryID) === String(filters.category) || p.category === filters.category || catName === filters.category;
      });
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

    return data.map(p => {
      const cat = categories.find(c => Number(c.categoryID) === Number(p.categoryID));
      const categoryName = cat ? cat.categoryName : 'Chưa phân loại';
      
      return {
        ...p,
        id: p.productID,
        name: p.productName || 'Sản phẩm',
        sku: p.productCode || p.sku || `PRD-${String(p.productID).padStart(3, '0')}`,
        category: categoryName,
        unitPrice: Number(p.salePrice || p.unitPrice) || 0,
        stockQuantity: Number(p.stockQuantity) || 0,
        minStock: Number(p.minStock) || 10,
        unit: p.unit || 'Cái',
      };
    });
  },

  getCategories: async () => {
    return dbData.categories || [];
  },

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
    const currentUser = getCurrentUser();
    const createdBy = currentUser
      ? `${currentUser.lastName || ''} ${currentUser.firstName || ''}`.trim() || 'Nhân viên Kho'
      : 'Nhân viên Kho';

    // Tìm số lớn nhất hiện có trong lịch sử (NK-XXX có đúng 3 chữ số)
    let maxNum = 0;
    history.forEach(item => {
      if (item.id && item.id.startsWith('NK-')) {
        const idStr = item.id.replace('NK-', '');
        if (idStr.length === 3) {
          const num = parseInt(idStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    const nextNum = maxNum + 1;
    const nextId = `NK-${String(nextNum).padStart(3, '0')}`;

    const newReceipt = {
      id: nextId,
      date: new Date().toISOString().substring(0, 10),
      ...receipt,
      status: 'completed',
      createdBy,
    };

    saveLocalImportHistory([newReceipt, ...history]);

    for (const item of receipt.items) {
      if (item.productId || item.productID) {
        await warehouseService.updateStock(item.productId || item.productID, Number(item.quantity) || 0);
      }
    }

    return newReceipt;
  },

  revertImportReceipt: async (receiptId) => {
    const history = getLocalImportHistory();
    const targetIdx = history.findIndex(r => r.id === receiptId);
    if (targetIdx === -1) {
      return { success: false, error: 'Không tìm thấy phiếu nhập kho.' };
    }

    const receipt = history[targetIdx];
    if (receipt.status === 'cancelled') {
      return { success: false, error: 'Phiếu nhập kho này đã được hủy trước đó.' };
    }

    // Đảo ngược tồn kho (trừ bớt số lượng đã cộng)
    for (const item of receipt.items) {
      const pId = item.productId || item.productID;
      if (pId) {
        await warehouseService.updateStock(pId, -Number(item.quantity));
      }
    }

    // Đổi trạng thái thành cancelled
    const updatedReceipt = {
      ...receipt,
      status: 'cancelled',
    };

    history[targetIdx] = updatedReceipt;
    saveLocalImportHistory(history);

    return { success: true, receipt: updatedReceipt };
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
