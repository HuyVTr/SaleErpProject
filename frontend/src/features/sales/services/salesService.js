import api from '../../../services/api';
import dbData from '../../../../db.json';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

// ─── UTILITIES ──────────────────────────────────────────────────────────────

const formatDisplayCode = (id, prefix = 'ORD') => {
  if (!id) return 'N/A';
  if (isNaN(id)) return id;
  return `${prefix}-${id.toString().padStart(3, '0')}`;
};

const parseSafeDate = (dateStr) => {
  if (!dateStr || dateStr === 'N/A') return new Date();
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      } else if (parts[2].length === 4) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (p0 > 12) {
        return new Date(p2, p1 - 1, p0);
      } else if (p1 > 12) {
        return new Date(p2, p0 - 1, p1);
      } else {
        return new Date(p2, p1 - 1, p0);
      }
    }
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const formatDateString = (dateObj) => {
  const d = parseSafeDate(dateObj);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Lấy userID (số) của user đầu tiên theo roleID — phục vụ cột userID trong bảng Activities.
const getUserIdByRole = (roleID) => {
  const user = (dbData.users || []).find(u => Number(u.roleID) === Number(roleID));
  return user ? Number(user.userID) : null;
};

// Tạo 1 bản ghi hoạt động BÁM ĐÚNG cấu trúc bảng Activities (srs.sql #7):
//   relatedType, relatedID, activityType, description, status, activityTime, createdAt, userID
// Đồng thời kèm các field hiển thị (title/time/user/color/desc/timestamp) để component ActivityItem
// render mà không phải đổi UI. Khi ghép BE: chỉ cần map thẳng 1 row của bảng Activities sang object này.
//   - when: nhận Date HOẶC timestamp (ms) → activityTime/createdAt là DATETIME thật (có giờ-phút).
//   - userID = null khi sự kiện do hệ thống tự sinh (vd "Hệ thống Logistics").
const buildActivity = ({ relatedType, relatedID, activityType, title, status, color, when, userID = null, userName = 'Hệ thống' }) => {
  const ts = typeof when === 'number' ? when : parseSafeDate(when).getTime();
  const at = new Date(ts);
  return {
    // ── Cột map theo bảng Activities ──
    relatedType,
    relatedID: Number(relatedID),
    activityType,
    description: title,
    status,
    activityTime: at.toISOString(),
    createdAt: at.toISOString(),
    userID,
    // ── Field phục vụ hiển thị (ActivityItem) ──
    title,
    time: formatDateString(at),
    user: userName,
    color,
    desc: status,
    timestamp: ts,
  };
};

// ─── LOCAL STORAGE HELPERS (SHARED WITH ACCOUNTING) ────────────────────────

const getLocalInvoices = () => {
  try {
    const raw = localStorage.getItem('added_invoices');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const getLocalOrders = () => {
  try {
    const raw = localStorage.getItem('added_orders');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const getLocalCustomers = () => {
  try {
    const raw = localStorage.getItem('added_customers');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const getLocalProducts = () => {
  try {
    const raw = localStorage.getItem('added_products');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const getDeletedProductIds = () => {
  try {
    const raw = localStorage.getItem('deleted_product_ids');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const getInvoiceOverrides = () => {
  try {
    const raw = localStorage.getItem('invoice_overrides');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const getAllCurrentInvoices = () => {
  const local = getLocalInvoices();
  const apiData = dbData.invoices || [];
  const overrides = getInvoiceOverrides();
  
  const overrideIds = new Set(overrides.map(ov => ov.invoiceID));
  return [
    ...local,
    ...overrides,
    ...apiData.filter(a => !overrideIds.has(a.invoiceID))
  ];
};

// ─── AUTH HELPERS ────────────────────────────────────────────────────────────
const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('current_user') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};

// ─── SALES SERVICE LOGIC ───────────────────────────────────────────────────

const salesService = {
  // Lấy danh sách khách hàng
  getCustomers: async () => {
    if (USE_MOCK) {
      const local = getLocalCustomers();
      const apiData = dbData.customers || [];
      const deletedIds = JSON.parse(localStorage.getItem('deleted_customer_ids') || '[]');
      const deletedSet = new Set(deletedIds.map(Number));

      // Dùng Number() làm key thống nhất để tránh conflict giữa string "1" và number 1
      const customerMap = new Map();
      apiData.forEach(c => {
        if (!deletedSet.has(Number(c.customerID))) {
          customerMap.set(Number(c.customerID), c);
        }
      });
      
      // Các khách hàng ở local (added_customers) chắc chắn đang kích hoạt (vì khi xóa đã bị lọc ra khỏi local)
      // Do đó không cần check qua deletedSet, giúp hiển thị ngay cả khi có xung đột ID cũ.
      local.forEach(c => {
        customerMap.set(Number(c.customerID), c);
      });

      // Tự động dọn dẹp các ID bị xung đột trong danh sách đã xóa nếu có
      const cleanDeletedIds = deletedIds.filter(id => !local.some(lc => Number(lc.customerID) === Number(id)));
      if (cleanDeletedIds.length !== deletedIds.length) {
        localStorage.setItem('deleted_customer_ids', JSON.stringify(cleanDeletedIds));
      }

      return Array.from(customerMap.values());
    }
    const response = await api.get('/customers');
    return response.data;
  },

  // Lấy danh sách đơn hàng (Lọc theo nhân viên nếu có userID và theo thời gian)
  getOrders: async (userID, timeframe, options = {}) => {
    if (USE_MOCK) {
      const currentUser = getCurrentUser();
      const activeUserID = userID || currentUser?.userID;

      const localOrders = getLocalOrders();
      const apiOrders = dbData.orders || [];
      const allInvoices = getAllCurrentInvoices();
      const customers = await salesService.getCustomers();

      const localOrderIds = new Set(localOrders.map(o => Number(o.orderID)));
      let orders = [...localOrders, ...apiOrders.filter(o => !localOrderIds.has(Number(o.orderID)))];

      // Thêm các đơn hàng từ hóa đơn nếu chưa tồn tại trong danh sách đơn hàng
      allInvoices.forEach(inv => {
        if (inv.orderID && !orders.some(o => o.orderID === inv.orderID)) {
          orders.push({
            orderID: inv.orderID,
            customerID: inv.customerID,
            userID: inv.userID || 1,
            totalAmount: inv.totalAmount,
            orderDate: inv.invoiceDate || inv.createAt,
            orderStatus: inv.status === 'PAID' ? 'DELIVERED' : 'PENDING',
            isAutoGenerated: true
          });
        }
      });

      // ─── LỌC THEO THỜI GIAN ────────────────────────────────────────────────
      if (timeframe && timeframe !== 'all') {
        const { filterDate, filterWeek, filterYear, selectedDay, filterYearsCount } = options;
        const now = new Date();

        orders = orders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          if (isNaN(d.getTime())) return false;

          if (timeframe === 'daily') {
            const [y, m] = filterDate.split('-').map(Number);
            return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === selectedDay;
          }
          if (timeframe === 'weekly') {
            const [y, w] = filterWeek.split('-W').map(Number);
            const getWeek = (date) => {
              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
              const dayNum = d.getUTCDay() || 7;
              d.setUTCDate(d.getUTCDate() + 4 - dayNum);
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
              return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
            };
            return d.getFullYear() === y && getWeek(d) === w;
          }
          if (timeframe === 'monthly') {
            return d.getFullYear() === filterYear;
          }
          if (timeframe === 'yearly') {
            return d.getFullYear() > (now.getFullYear() - filterYearsCount);
          }
          return true;
        });
      }

      // Lọc theo userID nếu được yêu cầu (hoặc nếu là nhân viên sale)
      if (activeUserID && currentUser?.roleID === 2 && !options.ignoreUserFilter) {
        orders = orders.filter(o => Number(o.userID) === Number(activeUserID));
      }

      // Load all orderItems and products for mapping
      const apiOrderItems = dbData.orderItems || [];
      const localOrderItems = JSON.parse(localStorage.getItem('added_order_items') || '[]');
      const allOrderItems = [...localOrderItems, ...apiOrderItems];

      // Load products for lookup
      const apiProds = dbData.products || [];
      const localProds = getLocalProducts();
      const allProducts = [...localProds, ...apiProds];
      
      const productMap = {};
      allProducts.forEach(p => {
        productMap[p.productID] = p;
      });

      return orders.map(order => {
        const customer = customers.find(c => c.customerID === order.customerID);
        const displayID = formatDisplayCode(order.orderID, 'ORD');
        
        // ĐỒNG BỘ VAT: Tính lại tổng tiền có VAT 10% cho bảng đơn hàng
        const rawTotal = Number(order.totalAmount) || 0;
        const totalWithVAT = rawTotal * 1.1; // Giả định thuế 10% như bên Kế toán

        // Phân tích và chuẩn hóa danh sách sản phẩm (items) của đơn hàng
        let orderItemsMapped = [];
        if (order.items && Array.isArray(order.items)) {
          // Đối với đơn hàng mới tạo từ LocalStorage đã có sẵn items
          orderItemsMapped = order.items.map(item => {
            const product = productMap[item.productID];
            return {
              productID: item.productID,
              name: item.productName || item.name || 'Sản phẩm',
              quantity: Number(item.quantity) || 1,
              price: Number(item.unitPrice || item.price) || 0,
              icon: item.icon || '📦',
              imageURL: product ? (product.imageURL || product.image || '') : (item.imageURL || '')
            };
          });
        } else {
          // Đối với đơn hàng mock ban đầu trong db.json, lọc từ bảng orderItems liên kết
          const itemsFromDB = allOrderItems.filter(item => Number(item.orderID) === Number(order.orderID));
          orderItemsMapped = itemsFromDB.map(item => {
            const product = productMap[item.productID];
            return {
              productID: item.productID,
              name: product ? product.productName : `Sản phẩm ID ${item.productID}`,
              quantity: Number(item.quantity) || 1,
              price: Number(item.unitPrice || item.price || (product ? product.salePrice : 0)) || 0,
              icon: '📦',
              imageURL: product ? (product.imageURL || product.image || '') : ''
            };
          });
        }

        return {
          ...order,
          displayID,
          totalAmount: totalWithVAT,
          customerName: customer ? (customer.companyName || `${customer.lastName} ${customer.firstName}`) : (order.customerName || 'Khách hàng lẻ'),
          customerPhone: customer?.phoneNumber || order.customerPhone || 'N/A',
          date: (order.orderDate || order.date) ? new Date(order.orderDate || order.date).toLocaleDateString('vi-VN') : 'N/A',
          items: orderItemsMapped
        };
      }).sort((a, b) => {
        const dateA = new Date(a.orderDate || a.date);
        const dateB = new Date(b.orderDate || b.date);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB - dateA;
        }
        // Tie-breaker: Highest ID first
        const idA = Number(a.orderID) || 0;
        const idB = Number(b.orderID) || 0;
        return idB - idA;
      });
    }
    const response = await api.get('/api/orders', { params: { userID, timeframe, ...options } });
    return response.data;
  },

  // Lấy danh sách sản phẩm
  getProducts: async () => {
    if (USE_MOCK) {
      const local = getLocalProducts();
      const apiData = dbData.products || [];
      const deletedIds = getDeletedProductIds();
      const deletedSet = new Set(deletedIds.map(Number));

      const productMap = new Map();
      apiData.forEach(p => {
        if (!deletedSet.has(Number(p.productID))) {
          productMap.set(Number(p.productID), p);
        }
      });
      
      local.forEach(p => {
        productMap.set(Number(p.productID), p);
      });

      return Array.from(productMap.values());
    }
    const response = await api.get('/products');
    return response.data;
  },

  // Tạo sản phẩm mới
  createProduct: async (productData) => {
    if (USE_MOCK) {
      const local = getLocalProducts();
      const apiData = dbData.products || [];
      const deletedIds = getDeletedProductIds();
      
      const allIds = [
        ...local.map(p => Number(p.productID) || 0),
        ...apiData.map(p => Number(p.productID) || 0),
        ...deletedIds.map(Number)
      ];
      
      const maxId = allIds.reduce((max, id) => Math.max(max, id), 0);

      const newProduct = {
        ...productData,
        productID: maxId + 1
      };
      localStorage.setItem('added_products', JSON.stringify([newProduct, ...local]));
      return newProduct;
    }
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Cập nhật thông tin sản phẩm
  updateProduct: async (productID, productData) => {
    if (USE_MOCK) {
      const local = getLocalProducts();
      const updatedLocal = local.map(p => 
        Number(p.productID) === Number(productID) ? { ...p, ...productData } : p
      );
      const isOriginal = !local.some(p => Number(p.productID) === Number(productID));
      if (isOriginal) {
        const originalProduct = dbData.products.find(p => Number(p.productID) === Number(productID));
        if (originalProduct) {
          const updatedOriginal = { ...originalProduct, ...productData };
          localStorage.setItem('added_products', JSON.stringify([updatedOriginal, ...local]));
        }
      } else {
        localStorage.setItem('added_products', JSON.stringify(updatedLocal));
      }
      return { success: true };
    }
    const response = await api.put(`/products/${productID}`, productData);
    return response.data;
  },

  // Xóa sản phẩm
  deleteProduct: async (productID) => {
    if (USE_MOCK) {
      const local = getLocalProducts();
      const updatedLocal = local.filter(p => Number(p.productID) !== Number(productID));
      localStorage.setItem('added_products', JSON.stringify(updatedLocal));
      
      const deletedIds = getDeletedProductIds();
      if (!deletedIds.includes(Number(productID))) {
        deletedIds.push(Number(productID));
        localStorage.setItem('deleted_product_ids', JSON.stringify(deletedIds));
      }
      return { success: true };
    }
    const response = await api.delete(`/products/${productID}`);
    return response.data;
  },

  // Lấy danh sách danh mục
  getCategories: async () => {
    if (USE_MOCK) return dbData.categories || [];
    try {
      const response = await api.get('/categories');
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
      return dbData.categories || [];
    } catch (e) {
      console.warn("Failed to fetch categories from API, falling back to mock:", e);
      return dbData.categories || [];
    }
  },

  // Lấy danh sách báo giá
  getQuotations: async (userID, timeframe, options = {}) => {
    if (USE_MOCK) {
      const currentUser = getCurrentUser();
      const activeUserID = userID || currentUser?.userID;
      const localQuotes = JSON.parse(localStorage.getItem('added_quotations') || '[]');
      const apiQuotes = dbData.quotations || [];
      const localQuoteIds = new Set(localQuotes.map(q => Number(q.quotationID)));
      const allQuotes = [...localQuotes, ...apiQuotes.filter(q => !localQuoteIds.has(Number(q.quotationID)))];
      const customers = await salesService.getCustomers();

      let quotes = (activeUserID && currentUser?.roleID === 2 && !options.ignoreUserFilter) 
        ? allQuotes.filter(q => Number(q.userID) === Number(activeUserID))
        : allQuotes;

      // ─── LỌC THEO THỜI GIAN ────────────────────────────────────────────────
      if (timeframe && timeframe !== 'all') {
        const { filterDate, filterWeek, filterYear, selectedDay, filterYearsCount } = options;
        const now = new Date();

        quotes = quotes.filter(q => {
          const d = new Date(q.createAt);
          if (isNaN(d.getTime())) return false;

          if (timeframe === 'daily') {
            const [y, m] = filterDate.split('-').map(Number);
            return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === selectedDay;
          }
          if (timeframe === 'weekly') {
            const [y, w] = filterWeek.split('-W').map(Number);
            const getWeek = (date) => {
              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
              const dayNum = d.getUTCDay() || 7;
              d.setUTCDate(d.getUTCDate() + 4 - dayNum);
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
              return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
            };
            return d.getFullYear() === y && getWeek(d) === w;
          }
          if (timeframe === 'monthly') return d.getFullYear() === filterYear;
          if (timeframe === 'yearly') return d.getFullYear() > (now.getFullYear() - filterYearsCount);
          return true;
        });
      }

      return quotes.map(q => {
        const customer = customers.find(c => c.customerID === q.customerID);
        return {
          ...q,
          displayID: `QUO-${q.quotationID.toString().padStart(3, '0')}`,
          customerName: customer ? (customer.companyName || `${customer.lastName} ${customer.firstName}`) : 'Khách hàng lẻ',
          customerEmail: customer ? customer.email : 'N/A',
          customerGroup: customer ? (customer.status === 'ACTIVE' ? 'VIP MEMBER' : 'STANDARD') : 'STANDARD',
          date: q.createAt ? new Date(q.createAt).toLocaleDateString('vi-VN') : 'N/A'
        };
      }).sort((a, b) => {
        const dateA = new Date(a.createAt);
        const dateB = new Date(b.createAt);
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB - dateA;
        }
        return b.quotationID - a.quotationID;
      });
    }
    const response = await api.get('/api/quotations', { params: { userID, timeframe, ...options } });
    return response.data;
  },

  // Lấy thống kê Dashboard (Lọc theo nhân viên và thời gian)
  getDashboardStats: async (userID, timeframe, options = {}) => {
    if (USE_MOCK) {
      const currentUser = getCurrentUser();
      const activeUserID = userID || currentUser?.userID;

      const allOrders = [...(dbData.orders || []), ...getLocalOrders()];

      // 1. Lọc đơn hàng và báo giá của nhân viên
      const shouldFilterByUser = activeUserID && currentUser?.roleID === 2 && !options.ignoreUserFilter;
      let userOrders = shouldFilterByUser
        ? allOrders.filter(o => Number(o.userID) === Number(activeUserID))
        : allOrders;

      const allQuotes = dbData.quotations || [];
      let userQuotes = shouldFilterByUser
        ? allQuotes.filter(q => Number(q.userID) === Number(activeUserID))
        : allQuotes;
      
      // 2. Phân loại đơn hàng theo thời gian
      let monthOrders = [];
      let selectedDayOrders = [];
      let selectedDayQuotes = [];

      const { filterDate, filterWeek, filterYear, selectedDay, filterYearsCount } = options;
      const now = new Date();

      if (timeframe === 'daily') {
        const [y, m] = filterDate.split('-').map(Number);
        monthOrders = userOrders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          return !isNaN(d.getTime()) && d.getFullYear() === y && (d.getMonth() + 1) === m;
        });
        selectedDayOrders = monthOrders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          return d.getDate() === selectedDay;
        });
        selectedDayQuotes = userQuotes.filter(q => {
          const d = new Date(q.createAt);
          return !isNaN(d.getTime()) && d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === selectedDay;
        });
      } else {
        selectedDayOrders = userOrders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          if (isNaN(d.getTime())) return false;

          if (timeframe === 'weekly') {
            const [y, w] = filterWeek.split('-W').map(Number);
            const getWeek = (date) => {
              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
              const dayNum = d.getUTCDay() || 7;
              d.setUTCDate(d.getUTCDate() + 4 - dayNum);
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
              return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
            };
            return d.getFullYear() === y && getWeek(d) === w;
          }
          if (timeframe === 'monthly') return d.getFullYear() === filterYear;
          if (timeframe === 'yearly') return d.getFullYear() > (now.getFullYear() - filterYearsCount);
          return true;
        });

        selectedDayQuotes = userQuotes.filter(q => {
          const d = new Date(q.createAt);
          if (isNaN(d.getTime())) return false;

          if (timeframe === 'weekly') {
            const [y, w] = filterWeek.split('-W').map(Number);
            const getWeek = (date) => {
              const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
              const dayNum = d.getUTCDay() || 7;
              d.setUTCDate(d.getUTCDate() + 4 - dayNum);
              const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
              return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
            };
            return d.getFullYear() === y && getWeek(d) === w;
          }
          if (timeframe === 'monthly') return d.getFullYear() === filterYear;
          if (timeframe === 'yearly') return d.getFullYear() > (now.getFullYear() - filterYearsCount);
          return true;
        });
        monthOrders = selectedDayOrders;
      }

      // 3. Định nghĩa công thức tính giá trị hiển thị (Đồng bộ: Gốc + 10% VAT)
      const getDisplayValue = (order) => (Number(order.totalAmount) || 0) * 1.1;

      // 4. Helper tính toán chỉ số cho một tập hợp đơn hàng
      const calculatePeriodStats = (orders) => {
        const valid = orders.filter(o => o.orderStatus !== 'CANCELLED');
        const revenue = valid.reduce((sum, o) => sum + getDisplayValue(o), 0);
        const ordersCount = valid.length;
        const customers = new Set(orders.map(o => o.customerID)).size;
        return { revenue, ordersCount, customers };
      };

      // 5. Xác định đơn hàng và báo giá kỳ trước để so sánh tăng trưởng
      let previousPeriodOrders = [];
      let previousPeriodQuotes = [];
      let comparisonLabel = "";

      if (timeframe === 'daily') {
        const [y, m] = filterDate.split('-').map(Number);
        const prevDayDate = new Date(y, m - 1, selectedDay);
        prevDayDate.setDate(prevDayDate.getDate() - 1);
        
        previousPeriodOrders = userOrders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          return !isNaN(d.getTime()) && 
                 d.getFullYear() === prevDayDate.getFullYear() && 
                 (d.getMonth() + 1) === (prevDayDate.getMonth() + 1) && 
                 d.getDate() === prevDayDate.getDate();
        });

        previousPeriodQuotes = userQuotes.filter(q => {
          const d = new Date(q.createAt);
          return !isNaN(d.getTime()) && 
                 d.getFullYear() === prevDayDate.getFullYear() && 
                 (d.getMonth() + 1) === (prevDayDate.getMonth() + 1) && 
                 d.getDate() === prevDayDate.getDate();
        });
        comparisonLabel = "So với hôm qua";
      } else if (timeframe === 'weekly') {
        const [y, w] = filterWeek.split('-W').map(Number);
        let prevY = y, prevW = w - 1;
        if (prevW === 0) { prevY--; prevW = 52; } // Giả định đơn giản 52 tuần

        previousPeriodOrders = userOrders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          const getWeek = (date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
          };
          return d.getFullYear() === prevY && getWeek(d) === prevW;
        });

        previousPeriodQuotes = userQuotes.filter(q => {
          const d = new Date(q.createAt);
          const getWeek = (date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
            return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
          };
          return d.getFullYear() === prevY && getWeek(d) === prevW;
        });
        comparisonLabel = "So với tuần trước";
      } else if (timeframe === 'monthly') {
        previousPeriodOrders = userOrders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          return d.getFullYear() === (filterYear - 1);
        });
        previousPeriodQuotes = userQuotes.filter(q => {
          const d = new Date(q.createAt);
          return d.getFullYear() === (filterYear - 1);
        });
        comparisonLabel = "So với năm trước";
      } else if (timeframe === 'yearly') {
        const yearsCount = filterYearsCount || 5;
        const currentRangeStart = now.getFullYear() - yearsCount;
        const prevRangeStart = currentRangeStart - yearsCount;
        previousPeriodOrders = userOrders.filter(o => {
          const d = new Date(o.orderDate || o.date);
          return d.getFullYear() > prevRangeStart && d.getFullYear() <= currentRangeStart;
        });
        previousPeriodQuotes = userQuotes.filter(q => {
          const d = new Date(q.createAt);
          return d.getFullYear() > prevRangeStart && d.getFullYear() <= currentRangeStart;
        });
        comparisonLabel = `So với ${yearsCount} năm trước đó`;
      }

      // 6. Tính toán chỉ số hiện tại và kỳ trước
      const currentStats = calculatePeriodStats(selectedDayOrders);
      const prevStats = calculatePeriodStats(previousPeriodOrders);

      const calculateGrowth = (curr, prev) => {
        if (prev === 0) return { percent: curr > 0 ? "100" : "0", isUp: curr > 0 };
        const p = ((curr - prev) / prev) * 100;
        return { 
          percent: Math.abs(p).toFixed(1), 
          isUp: p >= 0,
          raw: p
        };
      };

      const revenueGrowth = calculateGrowth(currentStats.revenue, prevStats.revenue);
      const orderGrowth = calculateGrowth(currentStats.ordersCount, prevStats.ordersCount);
      const customerGrowth = calculateGrowth(currentStats.customers, prevStats.customers);
      const quoteGrowth = calculateGrowth(selectedDayQuotes.length, previousPeriodQuotes.length);

      const totalRevenue = currentStats.revenue;
      const activeOrdersCount = currentStats.ordersCount;
      const customerCount = currentStats.customers;
      const activeQuotesCount = selectedDayQuotes.length;

      // 5. Tính doanh thu cho biểu đồ (Dựa trên timeframe)
      // Với 'daily': dùng monthOrders (đơn trong tháng) để vẽ heatmap
      // Với 'weekly/monthly/yearly': dùng toàn bộ userOrders để vẽ biểu đồ lịch sử
      const allValidUserOrders = userOrders.filter(o => o.orderStatus !== 'CANCELLED');
      const validOrdersForChart = timeframe === 'daily'
        ? monthOrders.filter(o => o.orderStatus !== 'CANCELLED')
        : allValidUserOrders;
      let revenueChart = [];
      if (timeframe === 'monthly' || timeframe === 'all') {
        const targetYear = timeframe === 'monthly' ? options.filterYear : new Date().getFullYear();
        revenueChart = Array(12).fill(0).map((_, i) => ({
          name: `Th.${i + 1}`,
          revenue: 0
        }));
        validOrdersForChart.forEach(o => {
          const d = new Date(o.orderDate || o.date);
          if (d.getFullYear() === targetYear) {
            revenueChart[d.getMonth()].revenue += getDisplayValue(o);
          }
        });
      } else if (timeframe === 'yearly') {
        const yearsCount = options.filterYearsCount || 5;
        const currentYear = new Date().getFullYear();
        revenueChart = Array(yearsCount).fill(0).map((_, i) => ({
          name: `${currentYear - yearsCount + i + 1}`,
          revenue: 0
        }));
        validOrdersForChart.forEach(o => {
          const d = new Date(o.orderDate || o.date);
          const yearIndex = d.getFullYear() - (currentYear - yearsCount + 1);
          if (yearIndex >= 0 && yearIndex < yearsCount) {
            revenueChart[yearIndex].revenue += getDisplayValue(o);
          }
        });
      } else if (timeframe === 'weekly') {
        const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
        revenueChart = days.map(d => ({ name: d, revenue: 0 }));
        validOrdersForChart.forEach(o => {
          const d = new Date(o.orderDate || o.date);
          let dayIdx = d.getDay() - 1;
          if (dayIdx === -1) dayIdx = 6; // CN
          revenueChart[dayIdx].revenue += getDisplayValue(o);
        });
      } else if (timeframe === 'daily') {
        const [y, m] = options.filterDate.split('-').map(Number);
        const daysInMonth = new Date(y, m, 0).getDate();
        revenueChart = Array.from({ length: daysInMonth }, (_, i) => ({ 
          day: i + 1, 
          name: `Ngày ${i + 1}`, 
          revenue: 0,
          orderCount: 0
        }));
        validOrdersForChart.forEach(o => {
          const d = new Date(o.orderDate || o.date);
          const dayIdx = d.getDate() - 1;
          if (dayIdx >= 0 && dayIdx < daysInMonth) {
            revenueChart[dayIdx].revenue += getDisplayValue(o);
            revenueChart[dayIdx].orderCount += 1;
          }
        });
      }

      return {
        totalRevenue,
        revenueGrowth: { ...revenueGrowth, prevValue: prevStats.revenue, label: comparisonLabel },
        activeOrders: activeOrdersCount,
        orderGrowth: { ...orderGrowth, prevValue: prevStats.ordersCount, label: comparisonLabel },
        customerCount,
        customerGrowth: { ...customerGrowth, prevValue: prevStats.customers, label: comparisonLabel },
        activeQuotes: activeQuotesCount,
        quoteGrowth: { ...quoteGrowth, prevValue: previousPeriodQuotes.length, label: comparisonLabel },
        kpiProgress: Math.round(Math.min(100, (totalRevenue / 1000000000) * 100)),
        targetRevenue: 1000000000,
        revenueChart
      };
    }
    const response = await api.get('/api/sales/dashboard/stats', { params: { userID, timeframe, ...options } });
    return response.data;
  },

  // Tạo đơn hàng mới
  createOrder: async (orderData) => {
    if (USE_MOCK) {
      const currentUser = getCurrentUser();
      const local = getLocalOrders();
      const apiOrders = dbData.orders || [];
      const all = [...local, ...apiOrders];
      const maxId = all.reduce((max, o) => Math.max(max, Number(o.orderID) || 0), 0);
      
      const newOrder = {
        ...orderData,
        orderID: maxId + 1,
        userID: orderData.userID || currentUser?.userID || 1, // Gán userID người tạo
        orderDate: new Date().toISOString().split('T')[0],
        orderStatus: orderData.orderStatus || 'PENDING',
        paidAmount: orderData.paidAmount || 0
      };

      localStorage.setItem('added_orders', JSON.stringify([newOrder, ...local]));

      // ─── LƯU SẢN PHẨM CỦA ĐƠN HÀNG VÀO LOCALSTORAGE ───
      if (newOrder.items && newOrder.items.length > 0) {
        try {
          const localOrderItems = JSON.parse(localStorage.getItem('added_order_items') || '[]');
          const itemsToStore = newOrder.items.map(it => ({
            orderID: newOrder.orderID,
            productID: it.productID,
            quantity: it.quantity,
            unitPrice: it.unitPrice || it.price || 0,
            discount: it.discount || 0
          }));
          localStorage.setItem('added_order_items', JSON.stringify([...itemsToStore, ...localOrderItems]));
        } catch (e) {
          console.error("Lỗi khi lưu sản phẩm đơn hàng:", e);
        }
      }



      return newOrder;
    }
    const response = await api.post('/api/orders', orderData);
    return response.data;
  },

  // Cập nhật trạng thái đơn hàng
  updateOrderStatus: async (orderID, status) => {
    if (USE_MOCK) {
      const local = getLocalOrders();
      let found = false;
      const updatedLocal = local.map(o => {
        if (Number(o.orderID) === Number(orderID)) {
          found = true;
          return { ...o, orderStatus: status };
        }
        return o;
      });
      if (found) {
        localStorage.setItem('added_orders', JSON.stringify(updatedLocal));
      } else {
        const originalOrder = (dbData.orders || []).find(o => Number(o.orderID) === Number(orderID));
        if (originalOrder) {
          const updatedOriginal = { ...originalOrder, orderStatus: status };
          localStorage.setItem('added_orders', JSON.stringify([updatedOriginal, ...local]));
        }
      }
      return { success: true };
    }
    const response = await api.put(`/api/orders/${orderID}/status`, { status });
    return response.data;
  },

  // Tạo báo giá mới
  createQuotation: async (quotationData) => {
    if (USE_MOCK) {
      const currentUser = getCurrentUser();
      const local = JSON.parse(localStorage.getItem('added_quotations') || '[]');
      const apiQuotes = dbData.quotations || [];
      const all = [...local, ...apiQuotes];
      const maxId = all.reduce((max, q) => Math.max(max, Number(q.quotationID) || 0), 0);
      
      const newQuotation = {
        ...quotationData,
        quotationID: maxId + 1,
        userID: quotationData.userID || currentUser?.userID || 1,
        createAt: new Date().toISOString().split('T')[0],
        status: quotationData.status || 'PENDING'
      };

      localStorage.setItem('added_quotations', JSON.stringify([newQuotation, ...local]));
      return newQuotation;
    }
    const response = await api.post('/api/quotations', quotationData);
    return response.data;
  },

  // Cập nhật trạng thái báo giá
  updateQuotationStatus: async (quotationID, status) => {
    if (USE_MOCK) {
      const local = JSON.parse(localStorage.getItem('added_quotations') || '[]');
      let found = false;
      const updatedLocal = local.map(q => {
        if (Number(q.quotationID) === Number(quotationID)) {
          found = true;
          return { ...q, status };
        }
        return q;
      });
      if (found) {
        localStorage.setItem('added_quotations', JSON.stringify(updatedLocal));
      } else {
        const originalQuote = (dbData.quotations || []).find(q => Number(q.quotationID) === Number(quotationID));
        if (originalQuote) {
          const updatedOriginal = { ...originalQuote, status };
          localStorage.setItem('added_quotations', JSON.stringify([updatedOriginal, ...local]));
        }
      }
      return { success: true };
    }
    const response = await api.put(`/api/quotations/${quotationID}/status`, { status });
    return response.data;
  },

  // Tạo khách hàng mới
  createCustomer: async (customerData) => {
    if (USE_MOCK) {
      const local = getLocalCustomers();
      const apiData = dbData.customers || [];
      const deletedIds = JSON.parse(localStorage.getItem('deleted_customer_ids') || '[]');
      
      // Tập hợp tất cả ID từ danh sách local, api và cả những ID đã bị xóa để tránh trùng lặp
      const allIds = [
        ...local.map(c => Number(c.customerID) || 0),
        ...apiData.map(c => Number(c.customerID) || 0),
        ...deletedIds.map(Number)
      ];
      
      const maxId = allIds.reduce((max, id) => Math.max(max, id), 0);

      const newCustomer = {
        ...customerData,
        customerID: maxId + 1,
        status: 'ACTIVE'
      };
      localStorage.setItem('added_customers', JSON.stringify([newCustomer, ...local]));
      return newCustomer;
    }
    const response = await api.post('/customers', customerData);
    return response.data;
  },

  // Xóa khách hàng
  deleteCustomer: async (customerID) => {
    if (USE_MOCK) {
      const local = getLocalCustomers();
      const updatedLocal = local.filter(c => Number(c.customerID) !== Number(customerID));
      localStorage.setItem('added_customers', JSON.stringify(updatedLocal));
      
      const deletedIds = JSON.parse(localStorage.getItem('deleted_customer_ids') || '[]');
      if (!deletedIds.includes(Number(customerID))) {
        deletedIds.push(Number(customerID));
        localStorage.setItem('deleted_customer_ids', JSON.stringify(deletedIds));
      }
      return { success: true };
    }
    const response = await api.delete(`/customers/${customerID}`);
    return response.data;
  },

  // Cập nhật thông tin khách hàng
  updateCustomer: async (customerID, customerData) => {
    if (USE_MOCK) {
      const local = getLocalCustomers();
      const updatedLocal = local.map(c => 
        Number(c.customerID) === Number(customerID) ? { ...c, ...customerData } : c
      );
      const isOriginal = !local.some(c => Number(c.customerID) === Number(customerID));
      if (isOriginal) {
        const originalCustomer = (dbData.customers || []).find(c => Number(c.customerID) === Number(customerID));
        if (originalCustomer) {
          const updatedOriginal = { ...originalCustomer, ...customerData };
          localStorage.setItem('added_customers', JSON.stringify([updatedOriginal, ...local]));
        }
      } else {
        localStorage.setItem('added_customers', JSON.stringify(updatedLocal));
      }
      return { success: true };
    }
    const response = await api.put(`/customers/${customerID}`, customerData);
    return response.data;
  },

  // Lấy danh sách hóa đơn
  getInvoices: async () => {
    if (USE_MOCK) return getAllCurrentInvoices();
    const response = await api.get('/api/invoices');
    return response.data;
  },

  // Lấy danh sách thanh toán
  getPayments: async () => {
    if (USE_MOCK) {
      const local = JSON.parse(localStorage.getItem('added_payments') || '[]');
      const apiData = dbData.payments || [];
      const localIds = new Set(local.map(p => p.paymentID));
      return [...local, ...apiData.filter(p => !localIds.has(p.paymentID))];
    }
    const response = await api.get('/api/payments');
    return response.data;
  },

  // ─── USER HELPER METHODS ─────────────────────────────────────────────────
  // Lấy tên đầy đủ của user theo userID từ db.json
  getUserFullName: (userID) => {
    const users = dbData.users || [];
    const user = users.find(u => Number(u.userID) === Number(userID));
    if (!user) return 'Nhân viên';
    return `${user.lastName} ${user.firstName}`.trim();
  },

  // Lấy tên của user đầu tiên có roleID tương ứng
  getUserByRole: (roleID) => {
    const users = dbData.users || [];
    const user = users.find(u => Number(u.roleID) === Number(roleID));
    if (!user) return 'Nhân viên';
    return `${user.lastName} ${user.firstName}`.trim();
  },

  // Lấy lịch sử hoạt động của Đơn hàng
  getOrderActivities: async (orderID) => {
    if (USE_MOCK) {
      const orders = await salesService.getOrders(null, 'all', { ignoreUserFilter: true });
      const order = orders.find(o => Number(o.orderID) === Number(orderID));
      if (!order) return [];

      const list = [];
      const orderDate = parseSafeDate(order.orderDate || order.date);
      const rawStatus = order.orderStatus || 'PENDING';

      const creatorId = order.userID || 1;
      const creatorName = salesService.getUserFullName(creatorId);
      const warehouseStaffId = getUserIdByRole(4);
      const warehouseStaff = salesService.getUserByRole(4);

      list.push(buildActivity({
        relatedType: 'Order', relatedID: order.orderID, activityType: 'ORDER_CREATED',
        title: "Đơn hàng được khởi tạo thành công", status: "Khởi tạo", color: "bg-blue-600",
        when: orderDate, userID: creatorId, userName: creatorName,
      }));

      if (rawStatus === 'CANCELLED') {
        list.push(buildActivity({
          relatedType: 'Order', relatedID: order.orderID, activityType: 'ORDER_CANCELLED',
          title: "Đơn hàng đã bị hủy bỏ", status: "Đã hủy", color: "bg-rose-500",
          when: orderDate, userID: creatorId, userName: creatorName,
        }));
      } else {
        if (rawStatus === 'PENDING') {
          list.push(buildActivity({
            relatedType: 'Order', relatedID: order.orderID, activityType: 'ORDER_PENDING',
            title: "Chờ xác nhận từ bộ phận kho", status: "Kiểm kho", color: "bg-slate-300",
            when: orderDate, userID: null, userName: "Hệ thống tự động",
          }));
        }

        if (['CONFIRMED', 'SHIPPING', 'DELIVERED'].includes(rawStatus)) {
          list.push(buildActivity({
            relatedType: 'Order', relatedID: order.orderID, activityType: 'ORDER_CONFIRMED',
            title: "Đơn hàng đã được xác nhận", status: "Xác nhận", color: "bg-indigo-500",
            when: orderDate, userID: creatorId, userName: creatorName,
          }));
        }

        if (['SHIPPING', 'DELIVERED'].includes(rawStatus)) {
          const deliveryDate = parseSafeDate(order.deliveryDate || orderDate);
          list.push(buildActivity({
            relatedType: 'Order', relatedID: order.orderID, activityType: 'ORDER_SHIPPING',
            title: "Đơn hàng bắt đầu được giao đi", status: "Đang giao", color: "bg-amber-500",
            when: deliveryDate, userID: warehouseStaffId, userName: warehouseStaff,
          }));
        }

        if (rawStatus === 'DELIVERED') {
          const deliveryDate = parseSafeDate(order.deliveryDate || orderDate);
          list.push(buildActivity({
            relatedType: 'Order', relatedID: order.orderID, activityType: 'ORDER_DELIVERED',
            title: "Giao hàng và thanh toán thành công", status: "Hoàn thành", color: "bg-emerald-500",
            when: deliveryDate, userID: null, userName: "Hệ thống Logistics",
          }));
        }
      }

      return list.sort((a, b) => b.timestamp - a.timestamp);
    }
    const response = await api.get(`/api/orders/${orderID}/activities`);
    return response.data;
  },

  // Lấy lịch sử hoạt động của Báo giá
  getQuotationActivities: async (quotationID) => {
    if (USE_MOCK) {
      const quotations = await salesService.getQuotations(null, 'all', { ignoreUserFilter: true });
      const quotation = quotations.find(q => Number(q.quotationID) === Number(quotationID));
      if (!quotation) return [];

      const list = [];
      const quotationDate = parseSafeDate(quotation.createAt || quotation.date);
      const rawStatus = quotation.status || 'DRAFT';
      const qID = quotation.quotationID;

      const saleStaffId = quotation.userID || 1;
      const saleStaff = salesService.getUserFullName(saleStaffId);
      const managerId = 5;
      const managerStaff = salesService.getUserFullName(managerId);
      const customerActor = quotation.customerName || quotation.name || "Khách hàng";

      const A = (activityType, title, status, color, when, userID, userName) => buildActivity({
        relatedType: 'Quotation', relatedID: qID, activityType, title, status, color, when, userID, userName,
      });

      if (rawStatus === 'DRAFT') {
        list.push(A('QUOTATION_DRAFT', "Khởi tạo báo giá bản nháp", "Bản nháp", "bg-slate-400", quotationDate.getTime(), null, "Hệ thống"));
      } else if (rawStatus === 'SENT') {
        list.push(A('QUOTATION_CREATED', "Khởi tạo báo giá", "Khởi tạo", "bg-blue-500", quotationDate.getTime(), null, "Hệ thống"));
        list.push(A('QUOTATION_SENT', "Gửi báo giá tới khách hàng", "Đã gửi", "bg-indigo-500", quotationDate.getTime() + 1800000, saleStaffId, saleStaff));
      } else if (rawStatus === 'APPROVED') {
        list.push(A('QUOTATION_CREATED', "Khởi tạo báo giá", "Khởi tạo", "bg-blue-500", quotationDate.getTime(), null, "Hệ thống"));
        list.push(A('QUOTATION_SENT', "Gửi báo giá tới khách hàng", "Đã gửi", "bg-indigo-500", quotationDate.getTime() + 1800000, saleStaffId, saleStaff));

        const appDate = parseSafeDate(quotation.approvedDate || quotationDate);
        list.push(A('QUOTATION_CUSTOMER_AGREED', "Khách hàng đồng ý báo giá", "Phản hồi", "bg-emerald-500", appDate.getTime(), null, customerActor));
        list.push(A('QUOTATION_APPROVED', "Đã duyệt báo giá thành công", "Đã duyệt", "bg-teal-500", appDate.getTime() + 3600000, managerId, managerStaff));
      } else if (rawStatus === 'CANCELLED') {
        list.push(A('QUOTATION_CREATED', "Khởi tạo báo giá", "Khởi tạo", "bg-blue-500", quotationDate.getTime(), null, "Hệ thống"));
        list.push(A('QUOTATION_CANCELLED', "Đã hủy báo giá", "Đã hủy", "bg-rose-500", quotationDate.getTime() + 3600000, managerId, managerStaff));
      } else {
        list.push(A('QUOTATION_CREATED', "Khởi tạo báo giá", "Khởi tạo", "bg-blue-500", quotationDate.getTime(), null, "Hệ thống"));
      }

      return list.sort((a, b) => b.timestamp - a.timestamp);
    }
    const response = await api.get(`/api/quotations/${quotationID}/activities`);
    return response.data;
  },

  // Lấy lịch sử hoạt động của Sản phẩm
  getProductActivities: async (productID) => {
    if (USE_MOCK) {
      const allOrders = await salesService.getOrders(null, 'all', { ignoreUserFilter: true });
      const allInvoices = await salesService.getInvoices();
      const apiOrderItems = dbData.orderItems || [];
      const localOrderItems = JSON.parse(localStorage.getItem('added_order_items') || '[]');
      const allOrderItems = [...localOrderItems, ...apiOrderItems];

      const product = (dbData.products || []).concat(getLocalProducts()).find(p => Number(p.productID) === Number(productID));
      if (!product) return [];

      const productOrderItems = allOrderItems.filter(oi => Number(oi.productID) === Number(productID));
      const list = [];
      const accountantId = getUserIdByRole(1);
      const accountantStaff = salesService.getUserByRole(1);

      const A = (activityType, title, status, color, when, userID, userName) => buildActivity({
        relatedType: 'Product', relatedID: productID, activityType, title, status, color, when, userID, userName,
      });

      productOrderItems.forEach(oi => {
        const order = allOrders.find(o => Number(o.orderID) === Number(oi.orderID));
        if (!order) return;

        const orderDate = parseSafeDate(order.orderDate || order.date);
        const saleStaffId = order.userID || 1;
        const saleStaff = salesService.getUserFullName(saleStaffId);
        const displayOrderID = order.displayID || ('ORD-' + String(order.orderID).padStart(3, '0'));

        list.push(A('PRODUCT_STOCK_OUT', `Xuất kho đơn hàng #${displayOrderID}`,
          `-${oi.quantity} ${product.unit || 'Cái'}`, "bg-rose-500", orderDate.getTime(), saleStaffId, saleStaff));

        if (order.orderStatus === 'DELIVERED') {
          const deliveryDate = parseSafeDate(order.deliveryDate || orderDate);
          list.push(A('PRODUCT_ORDER_DELIVERED', `Đơn hàng #${displayOrderID} giao thành công`,
            "Hoàn thành", "bg-emerald-500", deliveryDate.getTime(), null, "Hệ thống Logistics"));
        }

        const correspondingInvoice = allInvoices.find(inv => Number(inv.orderID) === Number(order.orderID));
        if (correspondingInvoice) {
          const invDate = parseSafeDate(correspondingInvoice.createAt || correspondingInvoice.invoiceDate);
          const displayInvID = correspondingInvoice.displayID || `INV-${correspondingInvoice.invoiceID.toString().padStart(3, '0')}`;

          list.push(A('PRODUCT_INVOICE_ISSUED', `Phát hành hóa đơn #${displayInvID}`,
            "Hóa đơn", "bg-indigo-500", invDate.getTime(), accountantId, accountantStaff));

          const invStatus = (correspondingInvoice.status || '').toUpperCase();
          if (invStatus === 'PAID' || invStatus === 'ĐÃ THANH TOÁN') {
            list.push(A('PRODUCT_INVOICE_PAID', `Thanh toán thành công hóa đơn #${displayInvID}`,
              "Thanh toán", "bg-emerald-500", invDate.getTime() + 3600000, accountantId, accountantStaff));
          }
        }
      });

      return list.sort((a, b) => b.timestamp - a.timestamp);
    }
    const response = await api.get(`/api/products/${productID}/activities`);
    return response.data;
  },

  // Lấy lịch sử hoạt động của Khách hàng
  getCustomerActivities: async (customerID) => {
    if (USE_MOCK) {
      const allOrders = await salesService.getOrders(null, 'all', { ignoreUserFilter: true });
      const allQuotations = await salesService.getQuotations(null, 'all', { ignoreUserFilter: true });
      const allInvoices = await salesService.getInvoices();

      const customerOrders = allOrders.filter(o => Number(o.customerID) === Number(customerID));
      const customerQuotations = allQuotations.filter(q => Number(q.customerID) === Number(customerID));
      const customerInvoices = allInvoices.filter(inv => Number(inv.customerID) === Number(customerID));

      const list = [];
      const accountantId = getUserIdByRole(1);
      const accountantStaff = salesService.getUserByRole(1);

      const A = (activityType, title, status, color, when, userID, userName) => buildActivity({
        relatedType: 'Customer', relatedID: customerID, activityType, title, status, color, when, userID, userName,
      });

      customerOrders.forEach(order => {
        const orderDate = parseSafeDate(order.orderDate || order.date);
        const saleStaffId = order.userID || 1;
        const saleStaff = salesService.getUserFullName(saleStaffId);

        list.push(A('CUSTOMER_ORDER_CREATED', `Tạo đơn hàng mới #${order.displayID}`,
          "Đơn hàng", "bg-blue-500", orderDate.getTime(), saleStaffId, saleStaff));

        if (order.orderStatus === 'DELIVERED') {
          const deliveryDate = parseSafeDate(order.deliveryDate || orderDate);
          list.push(A('CUSTOMER_ORDER_DELIVERED', `Đơn hàng #${order.displayID} đã giao thành công`,
            "Hoàn thành", "bg-emerald-500", deliveryDate.getTime(), null, "Hệ thống Logistics"));
        } else if (order.orderStatus === 'CANCELLED') {
          list.push(A('CUSTOMER_ORDER_CANCELLED', `Đơn hàng #${order.displayID} đã bị hủy bỏ`,
            "Đã hủy", "bg-rose-500", orderDate.getTime() + 1800000, null, order.customerName || "Khách hàng"));
        }
      });

      customerQuotations.forEach(quo => {
        const qDate = parseSafeDate(quo.createAt || quo.date);
        const saleStaffId = quo.userID || 1;
        const saleStaff = salesService.getUserFullName(saleStaffId);

        list.push(A('CUSTOMER_QUOTATION_SENT', `Gửi báo giá mới #${quo.displayID}`,
          "Báo giá", "bg-purple-500", qDate.getTime(), saleStaffId, saleStaff));
      });

      customerInvoices.forEach(inv => {
        const invDate = parseSafeDate(inv.createAt || inv.invoiceDate);
        const displayInvID = inv.displayID || `INV-${inv.invoiceID.toString().padStart(3, '0')}`;

        list.push(A('CUSTOMER_INVOICE_ISSUED', `Phát hành hóa đơn #${displayInvID}`,
          "Hóa đơn", "bg-indigo-500", invDate.getTime(), accountantId, accountantStaff));

        const invStatus = (inv.status || '').toUpperCase();
        if (invStatus === 'PAID' || invStatus === 'ĐÃ THANH TOÁN') {
          list.push(A('CUSTOMER_INVOICE_PAID', `Thanh toán thành công hóa đơn #${displayInvID}`,
            "Thanh toán", "bg-emerald-500", invDate.getTime() + 3600000, accountantId, accountantStaff));
        }
      });

      return list.sort((a, b) => b.timestamp - a.timestamp);
    }
    const response = await api.get(`/api/customers/${customerID}/activities`);
    return response.data;
  }
};

export default salesService;

