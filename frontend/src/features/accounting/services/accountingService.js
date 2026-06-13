import api from '../../../services/api';
import dbData from '../../../../db.json'; // FIXED PATH

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';


// ─── UTILITIES ──────────────────────────────────────────────────────────────

/**
 * Định dạng ID số sang mã hiển thị (INV-001, PAY-001, v.v.)
 */
const formatDisplayCode = (id, prefix = 'INV') => {
  if (id === undefined || id === null || id === '') return 'N/A';
  if (isNaN(id)) return id;
  return `${prefix}-${id.toString().padStart(3, '0')}`;
};

/**
 * Parse YYYY-MM-DD or DD/MM/YYYY reliably
 */
const parseDate = (dStr) => {
  if (!dStr) return null;
  if (dStr instanceof Date) return { y: dStr.getFullYear(), m: dStr.getMonth() + 1, d: dStr.getDate() };
  
  const s = String(dStr).trim();
  let parts = s.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) { // YYYY-MM-DD
      const [y, m, d] = parts.map(Number);
      return { y, m, d: d || 1 };
    } else if (parts[2].length === 4) { // DD-MM-YYYY
      const [d, m, y] = parts.map(Number);
      return { y, m, d };
    }
  }
  return null;
};

/**
 * Chuẩn hóa trạng thái hóa đơn (VN <-> EN)
 */
const safeNumber = (val) => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(/\./g, '').replace(/,/g, '');
  const num = Number(cleanStr);
  return isNaN(num) ? 0 : num;
};

const normalizeInvoiceStatus = (status) => {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s === 'đã thanh toán' || s === 'paid' || s === 'completed') return 'paid';
  if (s === 'thanh toán một phần' || s === 'partial') return 'partial';
  if (s === 'chờ thanh toán' || s === 'pending') return 'pending';
  if (s === 'quá hạn' || s === 'overdue') return 'overdue';
  return s;
};

const getStatusLabelVN = (status) => {
  const s = normalizeInvoiceStatus(status);
  if (s === 'paid') return 'Đã thanh toán';
  if (s === 'partial') return 'T.Toán một phần';
  if (s === 'overdue') return 'Quá hạn';
  return 'Chờ thanh toán';
};

/**
 * TỰ ĐỘNG TÍNH TOÁN TRẠNG THÁI HÓA ĐƠN
 */
const calculateInvoiceStatus = (totalAmount, paidAmount, dueDate) => {
  const isFullyPaid = paidAmount >= totalAmount;
  const hasPartialPayment = paidAmount > 0 && !isFullyPaid;
  
  const dueObj = dueDate ? (typeof dueDate === 'string' ? new Date(dueDate) : dueDate) : null;
  if (dueObj) dueObj.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const isPastDue = dueObj && dueObj < today;

  if (isFullyPaid) return 'paid';
  if (isPastDue) return 'overdue';
  if (hasPartialPayment) return 'partial';
  return 'pending';
};

/**
 * Tính thời gian tương đối (vd: "2 giờ trước")
 */
const getRelativeTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  // Nếu đã quá 24 giờ, hiển thị rõ ngày tháng
  if (diffHours >= 24) {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  if (diffHours > 0) return `${diffHours} giờ trước`;
  if (diffMins > 0) return `${diffMins} phút trước`;
  return 'Vừa xong';
};

/**
 * Tìm thông tin khách hàng từ ID
 */
const getCustomerDetails = (customerID) => {
  if (!customerID) return { customerName: 'Khách hàng lẻ', email: null, phoneNumber: null, address: null };
  
  const customer = dbData.customers?.find(c => c.customerID === Number(customerID));
  if (customer) {
    return {
      ...customer,
      customerName: customer.companyName || `${customer.lastName} ${customer.firstName}` || 'Khách hàng chưa rõ'
    };
  }
  
  return {
    customerName: isNaN(Number(customerID)) ? String(customerID) : 'Khách hàng lẻ',
    email: null, phoneNumber: null, address: null
  };
};

/**
 * Chuyển Date hoặc chuỗi về YYYY-MM-DD để so sánh chuẩn
 */
const toISODate = (d) => {
  if (!d) return null;
  const dateObj = (d instanceof Date) ? d : parseDateToObj(d);
  if (!dateObj) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateToObj = (s) => {
  if (!s) return null;
  // Bỏ đi phần thời gian (vd: T15:57:16Z) để tránh lỗi NaN khi parse
  const datePart = s.split('T')[0]; 
  const parts = datePart.split(/[-/]/).map(Number);
  if (parts.length >= 3) {
    if (parts[0] > 1000) return new Date(parts[0], parts[1] - 1, parts[2] || 1);
    return new Date(parts[2], parts[1] - 1, parts[0] || 1);
  }
  return null;
};

const getISOWeek = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// ─── LOCAL STORAGE HELPERS ───────────────────────────────────────────────────

const getLocalInvoices = () => {
  try {
    const raw = localStorage.getItem('added_invoices');
    if (!raw) return [];
    const list = JSON.parse(raw);
    const cleanList = list.filter(inv => !isNaN(inv.invoiceID));
    if (cleanList.length !== list.length) {
      localStorage.setItem('added_invoices', JSON.stringify(cleanList));
    }
    return cleanList;
  } catch (e) { return []; }
};

const getLocalOrders = () => {
  try {
    const raw = localStorage.getItem('added_orders');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

const getLocalPayments = () => {
  try {
    const raw = localStorage.getItem('added_payments');
    if (!raw) return [];
    const list = JSON.parse(raw);
    const cleanList = list.filter(p => !isNaN(p.paymentID));
    if (cleanList.length !== list.length) {
      localStorage.setItem('added_payments', JSON.stringify(cleanList));
    }
    return cleanList;
  } catch (e) { return []; }
};

const getLocalOrderItems = () => {
  try {
    const raw = localStorage.getItem('added_order_items');
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
};

/**
 * Lấy tất cả hóa đơn hiện tại (merged từ localStorage + db.json)
 */
const getAllCurrentInvoices = () => {
  const localInvoices = getLocalInvoices();
  const apiInvoices = dbData.invoices || [];
  const overrides = JSON.parse(localStorage.getItem('invoice_overrides') || '[]');
  
  // Tránh trùng lặp: ưu tiên localInvoices và overrides hơn apiInvoices
  const localAndOverrideIds = new Set([
    ...localInvoices.map(inv => inv.invoiceID),
    ...overrides.map(inv => inv.invoiceID)
  ]);

  return [
    ...localInvoices,
    ...apiInvoices.filter(api => !localAndOverrideIds.has(api.invoiceID)),
    ...overrides
  ];
};

/**
 * Lấy tất cả thanh toán hiện tại (merged từ localStorage + db.json)
 */
const getAllCurrentPayments = () => {
  const localPayments = getLocalPayments();
  const apiPayments = dbData.payments || [];
  // Tránh trùng lặp: ưu tiên local payments
  const localIds = new Set(localPayments.map(p => p.paymentID));
  return [
    ...localPayments,
    ...apiPayments.filter(p => !localIds.has(p.paymentID))
  ];
};

// ─── NOTIFICATION ENGINE ─────────────────────────────────────────────────────

/**
 * Tự động sinh danh sách notifications từ dữ liệu thực.
 * Mỗi notification có cấu trúc:
 * {
 *   id: string,         -- unique key (e.g. "overdue", "PAY-1", "RPT-1")
 *   transactionType: 'List' | 'Voucher' | 'Report',
 *   uiType: 'warning' | 'info' | 'report',  -- for icon/color
 *   message: string,    -- tiêu đề hiển thị
 *   time: string,       -- thời gian tương đối
 *   count: number?,     -- số lượng (cho loại List)
 * }
 */
/**
 * Tự động sinh danh sách notifications từ dữ liệu thực, có lọc theo thời gian.
 */
const buildNotifications = (timeframe = 'monthly', options = {}) => {
  const allInvoices = getAllCurrentInvoices();
  const allPayments = getAllCurrentPayments();
  const reports = dbData.quarterly_reports || [];
  const notifications = [];

  const now = new Date();
  const isDaily = timeframe === 'daily';
  const selectedDayNum = options.selectedDay ? parseInt(options.selectedDay, 10) : null;
  const filterY = parseInt((options.filterDate || "").split('-')[0]) || now.getFullYear();
  const filterM = parseInt((options.filterDate || "").split('-')[1]) || (now.getMonth() + 1);



  // 1. Phân loại và Lọc dữ liệu bằng một Helper hợp nhất
  const matchesTimeframe = (dateStr) => {
    const pd = parseDateToObj(dateStr);
    if (!pd) return false;

    if (timeframe === 'daily') {
      const selectedDayNum = options.selectedDay ? parseInt(options.selectedDay, 10) : now.getDate();
      const filterY = parseInt((options.filterDate || "").split('-')[0]) || now.getFullYear();
      const filterM = parseInt((options.filterDate || "").split('-')[1]) || (now.getMonth() + 1);
      return pd.getFullYear() === filterY && (pd.getMonth() + 1) === filterM && pd.getDate() === selectedDayNum;
      
    } else if (timeframe === 'weekly') {
      const [yStr, wStr] = (options.filterWeek || "").split('-W');
      const targetY = parseInt(yStr) || now.getFullYear();
      const targetW = parseInt(wStr) || getISOWeek(now);
      return pd.getFullYear() === targetY && getISOWeek(pd) === targetW;
      
    } else if (timeframe === 'monthly') {
      // Tab "Tháng" hiển thị 12 tháng của năm, nên ta lọc theo Năm (filterYear)
      const targetY = parseInt(options.filterYear) || (options.filterDate ? parseInt(options.filterDate.split('-')[0]) : now.getFullYear());
      return pd.getFullYear() === targetY;
      
    } else {
      // Tab "Năm" (yearly) hiển thị N năm
      const yearsCount = parseInt(options.filterYearsCount) || 5;
      const endY = now.getFullYear();
      const startY = endY - yearsCount + 1;
      const y = pd.getFullYear();
      return y >= startY && y <= endY;
    }
  };

  const filteredPayments = allPayments.filter(p => matchesTimeframe(p.paymentDate));
  const filteredReports = reports.filter(r => matchesTimeframe(r.createdAt));

  // ── A. LIST (Công nợ - Luôn lọc theo matchesTimeframe) ──
  // 1. Quá hạn
  const overdueInvoices = allInvoices.filter(inv => {
    const s = normalizeInvoiceStatus(inv.status);
    const isOverdue = s === 'overdue' || (s !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date());
    return isOverdue && matchesTimeframe(inv.dueDate);
  });

  if (overdueInvoices.length > 0) {
    notifications.push({
      id: 'notif-overdue',
      type: 'List',
      uiType: 'warning',
      message: `Hệ thống ghi nhận ${overdueInvoices.length} hóa đơn quá hạn cần xử lý.`,
      timestamp: overdueInvoices[0].dueDate,
      status: 'Cần xử lý',
      count: overdueInvoices.length,
    });
  }

  // 2. Thanh toán một phần
  const partialInvoices = allInvoices.filter(inv => {
    const isPartial = normalizeInvoiceStatus(inv.status) === 'partial';
    return isPartial && matchesTimeframe(inv.invoiceDate || inv.createAt);
  });

  if (partialInvoices.length > 0) {
    notifications.push({
      id: 'notif-partial',
      type: 'List',
      uiType: 'info',
      message: `Hệ thống ghi nhận ${partialInvoices.length} hóa đơn thanh toán một phần cần theo dõi.`,
      timestamp: partialInvoices[0].invoiceDate || partialInvoices[0].createAt,
      status: 'Đang theo dõi',
      count: partialInvoices.length,
    });
  }

  // ── B. VOUCHER (Phiếu thu - Đã được lọc bởi filteredPayments) ──
  const allOrders = dbData.orders || [];
  filteredPayments.forEach(pay => {
    const invoice = allInvoices.find(i => i.invoiceID === pay.invoiceID);
    const order = allOrders.find(o => o.orderID === invoice?.orderID);
    const customer = getCustomerDetails(invoice?.customerID || order?.customerID);
    const voucherCode = pay.voucherCode || formatDisplayCode(pay.paymentID, 'VCHR');
    
    notifications.push({
      id: `notif-pay-${pay.paymentID}`,
      type: 'Voucher',
      uiType: 'info',
      message: `Phiếu thu ${voucherCode} — ${customer.customerName} đã được duyệt.`,
      timestamp: pay.paymentDate,
      status: 'Hoàn thành',
      paymentID: pay.paymentID,
    });
  });

  // ── C. REPORT (Báo cáo - Đã được lọc bởi filteredReports) ──
  filteredReports.forEach(rpt => {
    notifications.push({
      id: `notif-rpt-${rpt.reportID}`,
      type: 'Report',
      uiType: 'report',
      message: `${rpt.title} đã sẵn sàng phê duyệt.`,
      timestamp: rpt.createdAt,
      status: rpt.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt',
      reportID: rpt.reportID,
    });
  });

  // Sắp xếp theo thời gian mới nhất
  return notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

/**
 * Trả về extended detail cho từng notification ID.
 * ID có dạng:  notif-overdue | notif-partial | notif-pay-{paymentID} | notif-rpt-{reportID}
 */
const buildExtendedDetail = (notifId) => {
  const allInvoices = getAllCurrentInvoices();
  const allPayments = getAllCurrentPayments();

  // ── LIST: Khách hàng quá hạn ─────────────────────────────────────────────
  const allOrders = dbData.orders || [];
  if (notifId === 'notif-overdue') {
    const overdueInvoices = allInvoices.filter(inv => {
      const s = normalizeInvoiceStatus(inv.status);
      return s === 'overdue' || (s !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date());
    });
    const rows = overdueInvoices.map(inv => {
      const order = allOrders.find(o => o.orderID === inv.orderID);
      const customer = getCustomerDetails(inv.customerID || order?.customerID);
      const due = new Date(inv.dueDate);
      const diffDays = Math.ceil((new Date() - due) / (1000 * 60 * 60 * 24));
      const remaining = (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0);
      return {
        id: formatDisplayCode(inv.invoiceID, 'INV'),
        name: customer.customerName,
        amount: remaining.toLocaleString('vi-VN'),
        days: diffDays > 0 ? diffDays : 0,
        status: remaining > 100000000 ? 'high' : 'medium',
      };
    });
    return {
      type: 'multi_entity',
      data: rows,
      note: `Hệ thống tự động quét công nợ ngày ${new Date().toLocaleDateString('vi-VN')}. Vui lòng liên hệ khách hàng để đôn đốc thanh toán.`,
    };
  }

  // ── LIST: Hóa đơn partial ─────────────────────────────────────────────────
  if (notifId === 'notif-partial') {
    const partialInvoices = allInvoices.filter(inv => normalizeInvoiceStatus(inv.status) === 'partial');
    const rows = partialInvoices.map(inv => {
      const order = allOrders.find(o => o.orderID === inv.orderID);
      const customer = getCustomerDetails(inv.customerID || order?.customerID);
      const remaining = (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0);
      return {
        id: formatDisplayCode(inv.invoiceID, 'INV'),
        name: customer.customerName,
        amount: remaining.toLocaleString('vi-VN'),
        days: inv.dueDate ? Math.ceil((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)) : 0,
        status: remaining > 50000000 ? 'high' : 'medium',
      };
    });
    return {
      type: 'multi_entity',
      data: rows,
      note: `Các hóa đơn thanh toán một phần cần được theo dõi định kỳ để đảm bảo thu đủ công nợ.`,
    };
  }

  // ── VOUCHER: Phiếu thu thanh toán ────────────────────────────────────────
  if (notifId.startsWith('notif-pay-')) {
    const paymentID = Number(notifId.replace('notif-pay-', ''));
    const pay = allPayments.find(p => p.paymentID === paymentID);
    if (!pay) return { type: 'generic', data: {} };

    const inv = allInvoices.find(i => i.invoiceID === pay.invoiceID);
    const order = allOrders.find(o => o.orderID === inv?.orderID);
    const customer = getCustomerDetails(inv?.customerID || order?.customerID);
    const invoiceCode = formatDisplayCode(pay.invoiceID, 'INV');
    const orderCode = inv?.orderID ? formatDisplayCode(inv.orderID, 'ORD') : 'N/A';
    const voucherCode = pay.voucherCode || formatDisplayCode(pay.paymentID, 'VCHR');

    return {
      type: 'voucher',
      data: {
        customer: customer.customerName,
        order_ref: orderCode,
        amount: Number(pay.amount).toLocaleString('vi-VN'),
        method: pay.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : pay.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Thẻ / POS',
        ref_code: `${voucherCode} → ${invoiceCode}`,
        date: pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('vi-VN') : 'N/A',
        approval: pay.recordedBy || 'Kế toán trưởng',
        description: pay.note || `Thanh toán cho hóa đơn ${invoiceCode}`,
        status: pay.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý',
      },
      note: `Phiếu thu ${voucherCode} được tạo tự động từ hệ thống thủ quỹ ERP. Có giá trị pháp lý nội bộ.`,
    };
  }

  // ── REPORT: Báo cáo quý ──────────────────────────────────────────────────
  if (notifId.startsWith('notif-rpt-')) {
    const reportID = Number(notifId.replace('notif-rpt-', ''));
    const rpt = (dbData.quarterly_reports || []).find(r => r.reportID === reportID);
    if (!rpt) return { type: 'generic', data: {} };

    return {
      type: 'report',
      data: {
        summary: [
          { label: 'Tổng doanh thu quý', value: rpt.totalRevenue.toLocaleString('vi-VN'), status: 'approved' },
          { label: 'Thuế GTGT đầu ra', value: rpt.vatOut.toLocaleString('vi-VN'), status: 'approved' },
          { label: 'Thuế được khấu trừ', value: rpt.vatDeductible.toLocaleString('vi-VN'), status: rpt.status === 'APPROVED' ? 'approved' : 'pending' },
        ],
        breakdown: rpt.breakdown || [],
        timeline: rpt.timeline || [],
      },
      note: rpt.note || `Báo cáo ${rpt.title} được tổng hợp bởi phòng Kế toán.`,
    };
  }

  return { type: 'generic', data: {} };
};

// ─── GROWTH HELPERS ────────────────────────────────────────────────────────
const calculateGrowth = (curr, prev) => {
  if (prev === 0) return { percent: curr > 0 ? "100" : "0", isUp: curr > 0 };
  const p = ((curr - prev) / prev) * 100;
  return { 
    percent: Math.abs(p).toFixed(1), 
    isUp: p >= 0,
    raw: p
  };
};

const calculatePeriodStats = (timeframe, options, invoices, payments, orders) => {
  const now = new Date();
  let prevOptions = { ...options };
  let comparisonLabel = "";

  if (timeframe === 'daily') {
    const y = options.filterDate ? parseInt(options.filterDate.split('-')[0]) : now.getFullYear();
    const m = options.filterDate ? parseInt(options.filterDate.split('-')[1]) : (now.getMonth() + 1);
    const d = options.selectedDay || now.getDate();
    const current = new Date(y, m - 1, d);
    const prev = new Date(current);
    prev.setDate(current.getDate() - 1);
    
    prevOptions.filterDate = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    prevOptions.selectedDay = prev.getDate();
    comparisonLabel = "SO VỚI HÔM QUA";
  } 
  else if (timeframe === 'weekly') {
    const [y, w] = (options.filterWeek || "").split('-W').map(Number);
    let prevW = w - 1;
    let prevY = y;
    if (prevW < 1) { prevW = 52; prevY--; }
    prevOptions.filterWeek = `${prevY}-W${String(prevW).padStart(2, '0')}`;
    comparisonLabel = "SO VỚI TUẦN TRƯỚC";
  }
  else if (timeframe === 'monthly') {
    const y = parseInt(options.filterYear) || (options.filterDate ? parseInt(options.filterDate.split('-')[0]) : now.getFullYear());
    prevOptions.filterYear = y - 1;
    comparisonLabel = "SO VỚI NĂM TRƯỚC";
  }
  else {
    const count = parseInt(options.filterYearsCount) || 5;
    const currentYear = options.filterYear || now.getFullYear();
    prevOptions.filterYear = currentYear - count;
    comparisonLabel = `SO VỚI ${count} NĂM TRƯỚC`;
  }

  const matchesTimeframe = (dateStr, tf, opt) => {
    const pd = parseDateToObj(dateStr);
    if (!pd) return false;
    if (tf === 'daily') {
      const ty = opt.filterDate ? parseInt(opt.filterDate.split('-')[0]) : now.getFullYear();
      const tm = opt.filterDate ? parseInt(opt.filterDate.split('-')[1]) : (now.getMonth() + 1);
      const td = opt.selectedDay || now.getDate();
      return pd.getFullYear() === ty && (pd.getMonth() + 1) === tm && pd.getDate() === td;
    } else if (tf === 'weekly') {
      const [yS, wS] = (opt.filterWeek || "").split('-W');
      return pd.getFullYear() === (parseInt(yS) || now.getFullYear()) && getISOWeek(pd) === (parseInt(wS) || getISOWeek(now));
    } else if (tf === 'monthly') {
      return pd.getFullYear() === (parseInt(opt.filterYear) || now.getFullYear());
    } else {
      const c = parseInt(opt.filterYearsCount) || 5;
      const end = opt.filterYear || now.getFullYear();
      const start = end - c + 1;
      return pd.getFullYear() >= start && pd.getFullYear() <= end;
    }
  };

  const filteredOrders = orders.filter(o => matchesTimeframe(o.orderDate || o.date, timeframe, options));
  const prevOrders = orders.filter(o => matchesTimeframe(o.orderDate || o.date, timeframe, prevOptions));
  
  const filteredPayments = payments.filter(p => matchesTimeframe(p.paymentDate, timeframe, options));
  const prevPayments = payments.filter(p => matchesTimeframe(p.paymentDate, timeframe, prevOptions));

  const filteredInvoices = invoices.filter(inv => matchesTimeframe(inv.invoiceDate || inv.createAt, timeframe, options));
  const prevInvoices = invoices.filter(inv => matchesTimeframe(inv.invoiceDate || inv.createAt, timeframe, prevOptions));

  const rev = filteredOrders.reduce((sum, o) => sum + (safeNumber(o.totalAmount) * 1.1), 0);
  const pRev = prevOrders.reduce((sum, o) => sum + (safeNumber(o.totalAmount) * 1.1), 0);

  const collected = filteredPayments.reduce((sum, p) => sum + safeNumber(p.amount), 0);
  const pCollected = prevPayments.reduce((sum, p) => sum + safeNumber(p.amount), 0);

  const debt = filteredInvoices.reduce((sum, inv) => {
    const s = normalizeInvoiceStatus(inv.status);
    return s !== 'paid' ? sum + (safeNumber(inv.totalAmount) - safeNumber(inv.paidAmount)) : sum;
  }, 0);
  const pDebt = prevInvoices.reduce((sum, inv) => {
    const s = normalizeInvoiceStatus(inv.status);
    return s !== 'paid' ? sum + (safeNumber(inv.totalAmount) - safeNumber(inv.paidAmount)) : sum;
  }, 0);

  return {
    revenue: rev,
    prevRevenue: pRev,
    collected,
    prevCollected: pCollected,
    debt,
    prevDebt: pDebt,
    invoiceCount: filteredInvoices.length,
    prevInvoiceCount: prevInvoices.length,
    comparisonLabel
  };
};

// ─── MOCK FUNCTIONS ──────────────────────────────────────────────────────────

const mockDashboardStats = (timeframe = 'monthly', options = {}) => {
  const allOrders = [...(dbData.orders || []), ...getLocalOrders()];
  const allPayments = getAllCurrentPayments();
  const allInvoices = getAllCurrentInvoices();

  const pStats = calculatePeriodStats(timeframe, options, allInvoices, allPayments, allOrders);

  const revenueGrowth = { ...calculateGrowth(pStats.revenue, pStats.prevRevenue), prevValue: pStats.prevRevenue, label: pStats.comparisonLabel };
  const collectedGrowth = { ...calculateGrowth(pStats.collected, pStats.prevCollected), prevValue: pStats.prevCollected, label: pStats.comparisonLabel };
  const debtGrowth = { ...calculateGrowth(pStats.debt, pStats.prevDebt), prevValue: pStats.prevDebt, label: pStats.comparisonLabel };
  const invoiceGrowth = { ...calculateGrowth(pStats.invoiceCount, pStats.prevInvoiceCount), prevValue: pStats.prevInvoiceCount, label: pStats.comparisonLabel };

  return {
    totalRevenue: pStats.revenue,
    totalDebt: pStats.debt,
    totalCollected: pStats.collected,
    pendingInvoices: pStats.invoiceCount.toString(),
    cashBalance: dbData.stats.totalBalance || '1.250.000.000',
    notifications: buildNotifications(timeframe, options),
    revenueGrowth,
    collectedGrowth,
    debtGrowth,
    invoiceGrowth
  };
};

const mockInvoices = () => {
  const allPayments = getAllCurrentPayments();
  // FIX: Bao gồm cả đơn hàng từ localStorage để lookup userID cho hóa đơn mới
  const allOrders = [...(dbData.orders || []), ...getLocalOrders()];
  const allOrderItems = [...(dbData.orderItems || []), ...getLocalOrderItems()];
  // Gộp sản phẩm từ db.json và local storage (added_products) có lọc theo deleted_product_ids
  const localProducts = (() => {
    try {
      const raw = localStorage.getItem('added_products');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  })();
  const deletedProductIds = (() => {
    try {
      const raw = localStorage.getItem('deleted_product_ids');
      return raw ? JSON.parse(raw).map(Number) : [];
    } catch (e) { return []; }
  })();

  const productMap = new Map();
  (dbData.products || []).forEach(p => {
    if (!deletedProductIds.includes(Number(p.productID))) {
      productMap.set(Number(p.productID), p);
    }
  });
  localProducts.forEach(p => {
    productMap.set(Number(p.productID), p);
  });
  const allProducts = Array.from(productMap.values());

  return getAllCurrentInvoices().map(inv => {
    // FIX: So sánh ID dạng chuỗi để tránh lỗi NaN với các ID local hoặc có tiền tố
    const order = allOrders.find(o => String(o.orderID) === String(inv.orderID));
    const customer = getCustomerDetails(inv.customerID || order?.customerID);
    
    // Ưu tiên userID trên hóa đơn, nếu không có thì lấy từ đơn hàng
    const targetUserID = inv.userID || order?.userID;
    const salesperson = dbData.users?.find(u => String(u.userID) === String(targetUserID));
    const salespersonName = salesperson ? `${salesperson.lastName} ${salesperson.firstName}` : 'Không xác định';
    
      // Join items from OrderItems and Products
      const items = allOrderItems
        .filter(oi => Number(oi.orderID) === Number(inv.orderID))
        .map(oi => {
          const product = allProducts.find(p => p.productID === oi.productID);
          return {
            ...oi,
            name: product?.productName || oi.productName || oi.name || 'Sản phẩm không xác định',
            productName: product?.productName || oi.productName || oi.name || 'Sản phẩm không xác định',
            categoryID: product?.categoryID || oi.categoryID,
            categoryName: dbData.categories?.find(c => c.categoryID === (product?.categoryID || oi.categoryID))?.categoryName || 'Sản phẩm',
            price: oi.unitPrice || product?.salePrice || 0,
            unit: product?.unit || oi.unit || 'đv'
          };
        });

      // Fallback: If no order items found but invoice has embedded items (legacy/local)
      const finalItems = items.length > 0 ? items : (inv.items || []).map(it => {
        const product = allProducts.find(p => p.productID === it.productID);
        return {
          ...it,
          categoryID: it.categoryID || product?.categoryID,
          categoryName: it.categoryName || dbData.categories?.find(c => c.categoryID === (it.categoryID || product?.categoryID))?.categoryName || 'Sản phẩm',
          price: it.price || it.unitPrice || product?.salePrice || 0
        };
      });

    const normalizedStatus = normalizeInvoiceStatus(inv.status);
    const payments = allPayments.filter(p => Number(p.invoiceID) === Number(inv.invoiceID) && (p.status === 'completed' || normalizeInvoiceStatus(p.status) === 'paid'));
    let paidAt = null;
    
    if (normalizedStatus === 'paid') {
      if (payments.length > 0) {
        const lastPayment = [...payments].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];
        const datePart = lastPayment.paymentDate || inv.invoiceDate || new Date().toISOString().split('T')[0];
        paidAt = `${new Date(datePart).toLocaleDateString('vi-VN')} - 14:30:00`;
      } else {
        const datePart = inv.invoiceDate || new Date().toISOString().split('T')[0];
        paidAt = `${new Date(datePart).toLocaleDateString('vi-VN')} - 09:00:00`;
      }
    }

    // 1. Tính toán tổng tiền thực tế (Subtotal + 10% VAT + Fees)
    const subtotal = finalItems.reduce((sum, it) => sum + (it.quantity * (it.price || it.unitPrice || 0)), 0);
    const taxAmount = subtotal * 0.1;
    const adjustment = (inv.fees?.shipping || 0) + (inv.fees?.handling || 0) + (inv.fees?.insurance || 0) - (inv.fees?.discount || 0);
    const calculatedTotal = subtotal + taxAmount + adjustment;

    // 2. Tính số tiền đã thu từ lịch sử thanh toán thực tế
    const totalPaidFromRecords = payments.reduce((sum, p) => sum + safeNumber(p.amount), 0);
    
    // Nếu trạng thái gốc là 'paid' nhưng không có payment records (dữ liệu mẫu) -> Coi như đã trả đủ
    let finalPaidAmount = totalPaidFromRecords;
    if (normalizeInvoiceStatus(inv.status) === 'paid' && totalPaidFromRecords === 0) {
      finalPaidAmount = calculatedTotal;
    }

    // 3. TỰ ĐỘNG XÁC ĐỊNH TRẠNG THÁI
    const effectiveStatus = calculateInvoiceStatus(calculatedTotal, finalPaidAmount, inv.dueDate);

    const remaining = Math.max(0, calculatedTotal - finalPaidAmount);

    return {
      ...inv,
      totalAmount: calculatedTotal,
      paidAmount: finalPaidAmount,
      remaining,
      taxAmount,
      subtotal,
      salespersonName,
      status: effectiveStatus, // Trạng thái tự động hoàn toàn
      displayID: formatDisplayCode(inv.invoiceID, 'INV'),
      displayOrderID: (inv.orderID && !isNaN(inv.orderID))
        ? formatDisplayCode(inv.orderID, 'ORD')
        : (inv.orderID || 'N/A'),
      ...customer,
      orderStatus: getStatusLabelVN(effectiveStatus),
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : 'N/A',
      items: finalItems,
      paidAt: paidAt
    };
  });
};

const mockPayments = () => {
  const allPayments = getAllCurrentPayments();
  const currentInvoices = mockInvoices();

  return allPayments.map(pay => {
    const invoice = currentInvoices.find(i => i.invoiceID === pay.invoiceID);
    const customerName = invoice ? invoice.customerName : 'Không xác định';
    return {
      ...pay,
      displayID: pay.voucherCode || formatDisplayCode(pay.paymentID, 'PAY'),
      displayInvoiceID: formatDisplayCode(pay.invoiceID, 'INV'),
      customerName,
      paymentMethodLabel: pay.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : pay.paymentMethod === 'CASH' ? 'Tiền mặt' : pay.paymentMethod === 'CARD' ? 'Thẻ / POS' : (pay.paymentMethod || 'Khác'),
      date: pay.paymentDate ? new Date(pay.paymentDate).toLocaleDateString('vi-VN') : 'N/A',
    };
  });
};

const mockDebtReport = (timeframe = 'monthly', options = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Lấy tất cả hóa đơn đã được enrich
  const allProcessedInvoices = mockInvoices();

  // Lọc hóa đơn công nợ: Hiển thị hóa đơn QUÁ HẠN hoặc THANH TOÁN 1 PHẦN
  const debtInvoices = allProcessedInvoices.filter(inv => {
    // Tính remaining trực tiếp từ total và paid để tránh sai lệch
    const actualRemaining = Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0));
    const status = normalizeInvoiceStatus(inv.status);

    // 1. Đã thanh toán đủ -> Bỏ qua
    if (status === 'paid' || actualRemaining <= 0) return false;

    // Lọc theo thời gian
    if (timeframe && timeframe !== 'all') {
      const pd = parseDateToObj(inv.invoiceDate || inv.createAt);
      if (pd) {
        const now = new Date();
        if (timeframe === 'daily') {
          const targetY = options.filterDate ? parseInt(options.filterDate.split('-')[0], 10) : now.getFullYear();
          const targetM = options.filterDate ? parseInt(options.filterDate.split('-')[1], 10) : (now.getMonth() + 1);
          const targetD = options.selectedDay || now.getDate();
          if (!(pd.getFullYear() === targetY && (pd.getMonth() + 1) === targetM && pd.getDate() === targetD)) return false;
        } else if (timeframe === 'weekly') {
          const [yStr, wStr] = (options.filterWeek || "").split('-W');
          const targetY = parseInt(yStr, 10) || now.getFullYear();
          const targetW = parseInt(wStr, 10) || getISOWeek(now);
          if (!(pd.getFullYear() === targetY && getISOWeek(pd) === targetW)) return false;
        } else if (timeframe === 'monthly') {
          const targetY = parseInt(options.filterYear, 10) || now.getFullYear();
          if (pd.getFullYear() !== targetY) return false;
        } else if (timeframe === 'yearly') {
          const yearsCount = parseInt(options.filterYearsCount, 10) || 5;
          const endY = now.getFullYear();
          const startY = endY - yearsCount + 1;
          const y = pd.getFullYear();
          if (!(y >= startY && y <= endY)) return false;
        }
      }
    }

    // 2. Mọi hóa đơn chưa thanh toán đủ đều là công nợ (hiện cả Partial, Overdue, Pending)
    return true;
  });

  // Chuyển thành danh sách nợ theo từng hóa đơn
  const debtItems = debtInvoices.map(inv => {
    const dueObj = parseDateToObj(inv.dueDate);
    let overdueDays = 0;
    let isOverdue = false;

    if (dueObj) {
      const dueCopy = new Date(dueObj);
      dueCopy.setHours(0, 0, 0, 0);
      const diffTime = today - dueCopy;
      overdueDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
      isOverdue = diffTime > 0;
    }
    
    const remaining = Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0));
    
    // Tính mức độ rủi ro (Chỉ tính nếu đã quá hạn)
    let risk = 'medium';
    if (isOverdue) {
      if (overdueDays > 90) risk = 'critical';
      else if (overdueDays > 30) risk = 'high';
    }

    return {
      invoiceID: inv.invoiceID,
      displayID: formatDisplayCode(inv.invoiceID, 'INV'),
      customerID: inv.customerID,
      customerName: inv.customerName || 'Khách hàng lẻ',
      email: inv.email || null,
      phoneNumber: inv.phoneNumber || null,
      companyName: inv.companyName || null,
      daysOverdue: overdueDays,
      isOverdue,
      remainingAmount: remaining,
      totalAmount: Number(inv.totalAmount) || 0,
      riskLevel: risk,
      autoRemind: remaining > 10000000,
      lastReminderDate: overdueDays > 7 ? '20/04/2026' : null,
      nextPaymentDate: !isOverdue ? (inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : 'N/A') : null
    };
  });

  // Tính summary
  const allUnpaid = allProcessedInvoices.filter(inv => normalizeInvoiceStatus(inv.status) !== 'paid');
  const totalDebtVal = allUnpaid.reduce((sum, inv) => sum + Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0)), 0);
  const overdueDebtVal = debtItems.reduce((sum, d) => sum + d.remainingAmount, 0);
  
  // Đếm số khách hàng duy nhất bị quá hạn
  const uniqueCustomerCount = new Set(debtItems.map(d => d.customerID)).size;

  return {
    data: debtItems,
    summary: {
      totalDebt: totalDebtVal.toLocaleString('vi-VN') + ' VND',
      overdueDebt: overdueDebtVal.toLocaleString('vi-VN') + ' VND',
      customerCount: uniqueCustomerCount.toString(),
      totalDebtGrowth: { percent: "12.5", isUp: true, prevValue: Math.round(totalDebtVal * 0.88), label: "SO VỚI THÁNG TRƯỚC" },
      overdueDebtGrowth: { percent: "8.2", isUp: false, prevValue: Math.round(overdueDebtVal * 1.08), label: "SO VỚI THÁNG TRƯỚC" },
      customerCountGrowth: { percent: "15.0", isUp: true, prevValue: Math.max(1, Math.round(uniqueCustomerCount - 1)), label: "SO VỚI THÁNG TRƯỚC" }
    }
  };
};

/**
 * Generate chart data dynamically using standard accounting logic.
 * @param {string} timeframe - 'daily', 'weekly', 'monthly', 'yearly'
 * @param {Array} invoices - All mapped invoices
 * @param {Array} payments - All mapped payments
 */
const computeChartData = (timeframe, invoices, payments, options = {}) => {
  const data = [];
  const now = new Date();
  
  const selectedYear = options.filterYear ? parseInt(options.filterYear, 10) : now.getFullYear();
  const selectedYearsCount = options.filterYearsCount ? parseInt(options.filterYearsCount, 10) : 5;
  const filterWeekStr = options.filterWeek || `${now.getFullYear()}-W01`;

  // Removed local parseDate definition to use hoisted version

  const toDate = (dStr) => {
    const pd = parseDate(dStr);
    if (!pd) return null;
    return new Date(pd.y, pd.m - 1, pd.d);
  };

  const getDebtAtSnapshot = (targetDate) => {
    const targetTime = targetDate.getTime();
    return invoices.reduce((sum, inv) => {
      const dStr = inv.invoiceDate || inv.createAt || inv.createdAt;
      const invDate = toDate(dStr);
      if (!invDate || invDate.getTime() > targetTime) return sum;

      const total = safeNumber(inv.totalAmount);
      if (total <= 0) return sum;

      const paidBySnapshot = payments
        .filter(p => {
          if (String(p.invoiceID) !== String(inv.invoiceID)) return false;
          const pd = toDate(p.paymentDate || p.createAt || p.createdAt);
          return pd && pd.getTime() <= targetTime;
        })
        .reduce((s, p) => s + safeNumber(p.amount), 0);

      return sum + Math.max(0, total - paidBySnapshot);
    }, 0);
  };

  if (timeframe === 'monthly') {
    for (let m = 1; m <= 12; m++) {
      if (selectedYear === now.getFullYear() && m > now.getMonth() + 1) continue;
      
      const matches = invoices.filter(i => {
        const pd = parseDate(i.invoiceDate || i.createAt || i.createdAt);
        return pd && pd.m === m && pd.y === selectedYear;
      });
      const revenue = matches.reduce((sum, i) => sum + safeNumber(i.totalAmount), 0);
      const invoiceCount = matches.length;
        
      const collected = payments
        .filter(p => {
          const pd = parseDate(p.paymentDate || p.createAt || p.createdAt);
          return pd && pd.m === m && pd.y === selectedYear;
        })
        .reduce((sum, p) => sum + safeNumber(p.amount), 0);
        
      let endOfMonth = new Date(selectedYear, m, 0, 23, 59, 59);
      if (selectedYear === now.getFullYear() && m === now.getMonth() + 1) endOfMonth = now;
      const debt = getDebtAtSnapshot(endOfMonth);
      
      data.push({ 
        label: `T${m}`, 
        revenue, 
        collected, 
        expense: debt,
        invoiceCount,
        prevRevenue: data.length > 0 ? data[data.length - 1].revenue : null,
        prevExpense: data.length > 0 ? data[data.length - 1].expense : null
      });
    }
  } else if (timeframe === 'yearly' || timeframe === 'all') {
    const endYear = options.filterYear ? parseInt(options.filterYear, 10) : now.getFullYear();
    const startYear = endYear - selectedYearsCount + 1;
    
    for (let y = startYear; y <= endYear; y++) {
      const matches = invoices.filter(i => {
        const pd = parseDate(i.invoiceDate || i.createAt || i.createdAt);
        return pd && pd.y === y;
      });
      const revenue = matches.reduce((sum, i) => sum + safeNumber(i.totalAmount), 0);
      const invoiceCount = matches.length;
        
      const collected = payments
        .filter(p => {
          const pd = parseDate(p.paymentDate || p.createAt || p.createdAt);
          return pd && pd.y === y;
        })
        .reduce((sum, p) => sum + safeNumber(p.amount), 0);
        
      const endOfYear = new Date(y, 11, 31, 23, 59, 59);
      const snapshotDate = (y === now.getFullYear()) ? now : endOfYear;
      const debt = getDebtAtSnapshot(snapshotDate);
      
      data.push({ 
        label: `${y}`, 
        revenue, 
        collected, 
        expense: debt,
        invoiceCount,
        prevRevenue: data.length > 0 ? data[data.length - 1].revenue : null,
        prevExpense: data.length > 0 ? data[data.length - 1].expense : null
      });
    }
  } else if (timeframe === 'weekly') {
    const [yStr, wStr] = filterWeekStr.split('-W');
    const y = parseInt(yStr, 10);
    const w = parseInt(wStr, 10);
    
    const simple = new Date(Date.UTC(y, 0, 1 + (w - 1) * 7));
    const dow = simple.getUTCDay();
    let mondayUTC = new Date(simple);
    if (dow <= 4) mondayUTC.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    else mondayUTC.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    
    const monday = new Date(mondayUTC.getUTCFullYear(), mondayUTC.getUTCMonth(), mondayUTC.getUTCDate());
    monday.setHours(0, 0, 0, 0);

    const dayNames = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      
      const matchesDate = (dateStr) => {
        const pd = parseDate(dateStr);
        return pd && pd.d === d.getDate() && pd.m === d.getMonth() + 1 && pd.y === d.getFullYear();
      };

      const matches = invoices.filter(inv => matchesDate(inv.invoiceDate || inv.createAt || inv.createdAt));
      const revenue = matches.reduce((sum, inv) => sum + safeNumber(inv.totalAmount), 0);
      const collected = payments.filter(p => matchesDate(p.paymentDate || p.createAt || p.createdAt)).reduce((sum, p) => sum + safeNumber(p.amount), 0);
      
      let endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) endOfDay = now;
      
      const debt = getDebtAtSnapshot(endOfDay);
      data.push({ 
        label: dayNames[i], 
        revenue, 
        collected, 
        expense: debt,
        invoiceCount: matches.length,
        prevRevenue: data.length > 0 ? data[data.length - 1].revenue : null,
        prevExpense: data.length > 0 ? data[data.length - 1].expense : null
      });
    }
  } else if (timeframe === 'daily') {
    const [fy, fm] = (options.filterDate || "").split('-').map(Number);
    const y = fy || now.getFullYear();
    const m = fm || (now.getMonth() + 1);

    if (options.selectedDay) {
      // BÁO CÁO THEO GIỜ TRONG NGÀY ĐÃ CHỌN
      const day = Number(options.selectedDay);
      for (let hour = 0; hour < 24; hour += 2) { // Nhóm 2 giờ 1 lần cho gọn
        const hRange = `${String(hour).padStart(2, '0')}:00 - ${String(hour + 2).padStart(2, '0')}:00`;
        
        const matchesDateAndHour = (dateStr) => {
          const pd = parseDate(dateStr);
          if (!pd || pd.d !== day || pd.m !== m || pd.y !== y) return false;
          const d = new Date(dateStr);
          const h = d.getHours();
          return h >= hour && h < hour + 2;
        };

        const matches = invoices.filter(inv => matchesDateAndHour(inv.invoiceDate || inv.createAt || inv.createdAt));
        const revenue = matches.reduce((sum, inv) => sum + safeNumber(inv.totalAmount), 0);
        const collected = payments.filter(p => matchesDateAndHour(p.paymentDate || p.createAt || p.createdAt)).reduce((sum, p) => sum + safeNumber(p.amount), 0);
        
        // Debt tại snapshot cuối mỗi khung giờ (giả lập)
        const snapshotDate = new Date(y, m - 1, day, hour + 1, 59, 59);
        const debt = getDebtAtSnapshot(snapshotDate);

        data.push({
          label: hRange,
          revenue,
          collected,
          expense: debt,
          debt,
          actual: revenue - debt,
          invoiceCount: matches.length
        });
      }
    } else {
      // BÁO CÁO THEO NGÀY TRONG THÁNG (Biểu đồ nhiệt)
      const daysInMonth = new Date(y, m, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const matchesDate = (dateStr) => {
          const pd = parseDate(dateStr);
          return pd && pd.d === day && pd.m === m && pd.y === y;
        };

        const matches = invoices.filter(inv => matchesDate(inv.invoiceDate || inv.createAt || inv.createdAt));
        const revenue = matches.reduce((sum, inv) => sum + safeNumber(inv.totalAmount), 0);
        
        const dayPayments = payments.filter(p => matchesDate(p.paymentDate || p.createAt || p.createdAt));
        const collected = dayPayments.reduce((sum, p) => sum + safeNumber(p.amount), 0);
        
        const dayReports = (dbData.quarterly_reports || []).filter(r => matchesDate(r.createdAt));
        
        let endOfDay = new Date(y, m - 1, day, 23, 59, 59);
        if (day === now.getDate() && m === (now.getMonth() + 1) && y === now.getFullYear()) endOfDay = now;
        
        const debt = getDebtAtSnapshot(endOfDay);
        const actual = revenue - debt;
        
        const rawIntensity = revenue / 50000000;
        const intensity = revenue > 0 ? Math.min(1, Math.pow(rawIntensity, 0.5) * 0.8 + 0.2) : 0; 
        
        data.push({ 
          day, 
          label: `${day}/${m}`, 
          revenue, 
          collected, 
          expense: debt, 
          debt,          
          actual,
          intensity,
          invoiceCount: matches.length,
          paymentCount: dayPayments.length,
          reportCount: dayReports.length
        });
      }
    }
  }
  return data;
};

// ─── EXPORTED SERVICE ────────────────────────────────────────────────────────
const accountingService = {

  getDashboardStats: async (timeframe, options = {}) => {
    if (USE_MOCK) return mockDashboardStats(timeframe, options);
    try {
      const ordersRes = await accountingService.getOrders();
      const orders = ordersRes?.data || ordersRes || [];
      const invoices = []; // fallback do BE thiếu api
      const payments = []; // fallback do BE thiếu api
      const pStats = calculatePeriodStats(timeframe, options, invoices, payments, orders);

      const revenueGrowth = { ...calculateGrowth(pStats.revenue, pStats.prevRevenue), prevValue: pStats.prevRevenue, label: pStats.comparisonLabel };
      const collectedGrowth = { ...calculateGrowth(pStats.collected, pStats.prevCollected), prevValue: pStats.prevCollected, label: pStats.comparisonLabel };
      const debtGrowth = { ...calculateGrowth(pStats.debt, pStats.prevDebt), prevValue: pStats.prevDebt, label: pStats.comparisonLabel };
      const invoiceGrowth = { ...calculateGrowth(pStats.invoiceCount, pStats.prevInvoiceCount), prevValue: pStats.prevInvoiceCount, label: pStats.comparisonLabel };

      return {
        totalRevenue: pStats.revenue,
        totalDebt: pStats.debt,
        totalCollected: pStats.collected,
        pendingInvoices: pStats.invoiceCount.toString(),
        cashBalance: '1.250.000.000',
        notifications: [],
        revenueGrowth,
        collectedGrowth,
        debtGrowth,
        invoiceGrowth
      };
    } catch (e) {
      console.error("Failed to compute stats, falling back to mock stats", e);
      return mockDashboardStats(timeframe, options);
    }
  },

  getRevenueData: async (timeframe, options = {}) => {
    if (USE_MOCK) {
      const allInvoices = getAllCurrentInvoices();
      const allPayments = getAllCurrentPayments();
      // Chuyển đổi timeframe sang startDate/endDate chuẩn để giả lập API thật
      // Nếu có startDate/endDate từ options thì dùng luôn
      const data = computeChartData(timeframe, allInvoices, allPayments, options);
      return data;
    }
    try {
      const ordersRes = await accountingService.getOrders();
      const orders = ordersRes?.data || ordersRes || [];
      
      const mockInvoicesFromOrders = orders.map(o => ({
        invoiceID: o.orderID,
        orderID: o.orderID,
        customerID: o.customerID,
        totalAmount: Number(o.totalAmount),
        paidAmount: Number(o.paidAmount || 0),
        status: o.orderStatus === 'DELIVERED' ? 'PAID' : 'PENDING',
        invoiceDate: o.orderDate || o.date || new Date().toISOString()
      }));
      
      const mockPaymentsFromOrders = orders.filter(o => Number(o.paidAmount) > 0).map(o => ({
        paymentID: o.orderID,
        invoiceID: o.orderID,
        amount: Number(o.paidAmount),
        paymentDate: o.orderDate || o.date || new Date().toISOString()
      }));

      return computeChartData(timeframe, mockInvoicesFromOrders, mockPaymentsFromOrders, options);
    } catch (e) {
      console.error("Failed to compute real chart data, falling back to mock", e);
      return [];
    }
  },

  mapApiInvoice: (inv) => {
    if (!inv) return inv;
    const order = inv.order || {};
    const customerObj = order.customer || {};
    const customerName = customerObj 
      ? (customerObj.companyName || `${customerObj.lastName || ''} ${customerObj.firstName || ''}`.trim()) 
      : 'Khách hàng';
    
    const salespersonName = inv.user 
      ? `${inv.user.lastName || ''} ${inv.user.firstName || ''}`.trim() 
      : 'Không xác định';

    const finalItems = (order.items || []).map(oi => {
      const product = oi.product || {};
      return {
        ...oi,
        name: product.productName || 'Sản phẩm',
        productName: product.productName || 'Sản phẩm',
        categoryID: product.categoryID,
        price: Number(oi.unitPrice || 0),
        unit: product.unit || 'đv'
      };
    });

    const subtotal = finalItems.reduce((sum, it) => sum + (it.quantity * (it.price || 0)), 0);
    const taxAmount = subtotal * 0.1;
    const calculatedTotal = Number(inv.totalAmount || (subtotal + taxAmount));
    const finalPaidAmount = Number(inv.paidAmount || 0);

    const normalizedStatus = String(inv.status || 'PENDING').toLowerCase();

    return {
      ...inv,
      totalAmount: calculatedTotal,
      paidAmount: finalPaidAmount,
      remaining: Math.max(0, calculatedTotal - finalPaidAmount),
      taxAmount,
      subtotal,
      salespersonName,
      status: normalizedStatus,
      displayID: formatDisplayCode(inv.invoiceID, 'INV'),
      displayOrderID: (inv.orderID && !isNaN(inv.orderID))
        ? formatDisplayCode(inv.orderID, 'ORD')
        : (inv.orderID || 'N/A'),
      customerName,
      companyName: customerObj.companyName || '',
      address: customerObj.address || '',
      phoneNumber: customerObj.phoneNumber || '',
      email: customerObj.email || '',
      orderStatus: getStatusLabelVN(normalizedStatus),
      date: inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('vi-VN') : 'N/A',
      items: finalItems,
    };
  },

  getInvoices: async () => {
    if (USE_MOCK) return mockInvoices();
    const response = await api.get('/invoices');
    const data = response.data?.success ? response.data.data : (response.data || []);
    return (Array.isArray(data) ? data : []).map(accountingService.mapApiInvoice);
  },

  getOrders: async () => {
    if (USE_MOCK) return [...(dbData.orders || []), ...getLocalOrders()];
    const response = await api.get('/orders');
    return response.data?.data || response.data || [];
  },

  getOrderItems: async () => {
    if (USE_MOCK) return [...(dbData.orderItems || []), ...getLocalOrderItems()];
    try {
      const orders = await accountingService.getOrders();
      const orderItems = [];
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            orderItems.push({
              ...item,
              orderID: order.orderID
            });
          });
        }
      });
      return orderItems;
    } catch (e) {
      console.error("Failed to extract order items from orders", e);
      return [];
    }
  },

  getCategoryRevenueReport: async (timeframe = 'monthly', options = {}) => {
    if (USE_MOCK) {
      const allInvoices = getAllCurrentInvoices();
      const categories = dbData.categories || [];
      const products = dbData.products || [];

      const filteredInvoices = allInvoices.filter(inv => {
        const pd = parseDate(inv.invoiceDate || inv.createAt);
        if (!pd) return false;
        const now = new Date();
        const selectedYear = options.filterYear || now.getFullYear();
        if (timeframe === 'monthly') return pd.y === selectedYear;
        if (timeframe === 'yearly') {
          const count = options.filterYearsCount || 5;
          return pd.y >= (selectedYear - count + 1) && pd.y <= selectedYear;
        }
        if (timeframe === 'weekly') {
          const [y, w] = (options.filterWeek || "").split('-W').map(Number);
          if (!y || !w) return pd.y === now.getFullYear();
          const d = new Date(pd.y, pd.m - 1, pd.d);
          const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = target.getUTCDay() || 7;
          target.setUTCDate(target.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(target.getUTCFullYear(),0,1));
          const weekNo = Math.ceil((((target - yearStart) / 86400000) + 1)/7);
          return target.getUTCFullYear() === y && weekNo === w;
        }
        if (timeframe === 'daily') {
          const [y, m] = (options.filterDate || "").split('-').map(Number);
          const baseMatch = pd.y === y && pd.m === m;
          if (options.selectedDay && baseMatch) {
            return pd.d === Number(options.selectedDay);
          }
          return baseMatch;
        }
        return true;
      });

      const results = {};
      categories.forEach(cat => {
        results[cat.categoryName] = 0;
      });

      const allOrderItems = dbData.orderItems || [];

      filteredInvoices.forEach(inv => {
        // Lấy items từ orderItems thay vì inv.items
        const items = allOrderItems.filter(oi => oi.orderID === inv.orderID);
        items.forEach(item => {
          const product = products.find(p => p.productID === item.productID);
          if (product) {
            const category = categories.find(c => c.categoryID === product.categoryID);
            if (category) {
              results[category.categoryName] += safeNumber(item.unitPrice) * (item.quantity || 1);
            }
          }
        });
      });

      return Object.entries(results).map(([name, value]) => ({ name, value }));
    }
    try {
      const [categoriesRes, ordersRes] = await Promise.all([
        api.get('/categories'),
        accountingService.getOrders()
      ]);
      const categories = categoriesRes.data || [];
      const orders = ordersRes?.data || ordersRes || [];

      const filteredOrders = orders.filter(o => {
        const pd = parseDate(o.orderDate || o.date);
        if (!pd) return false;
        const now = new Date();
        const selectedYear = options.filterYear || now.getFullYear();
        if (timeframe === 'monthly') return pd.y === selectedYear;
        if (timeframe === 'yearly') {
          const count = options.filterYearsCount || 5;
          return pd.y >= (selectedYear - count + 1) && pd.y <= selectedYear;
        }
        if (timeframe === 'weekly') {
          const [y, w] = (options.filterWeek || "").split('-W').map(Number);
          if (!y || !w) return pd.y === now.getFullYear();
          const d = new Date(pd.y, pd.m - 1, pd.d);
          const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = target.getUTCDay() || 7;
          target.setUTCDate(target.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(target.getUTCFullYear(),0,1));
          const weekNo = Math.ceil((((target - yearStart) / 86400000) + 1)/7);
          return target.getUTCFullYear() === y && weekNo === w;
        }
        if (timeframe === 'daily') {
          const [y, m] = (options.filterDate || "").split('-').map(Number);
          const baseMatch = pd.y === y && pd.m === m;
          if (options.selectedDay && baseMatch) return pd.d === Number(options.selectedDay);
          return baseMatch;
        }
        return true;
      });

      const results = {};
      categories.forEach(cat => {
        results[cat.categoryName] = 0;
      });

      filteredOrders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const product = item.product;
            if (product) {
              const category = categories.find(c => c.categoryID === product.categoryID);
              if (category) {
                results[category.categoryName] += Number(item.unitPrice) * (item.quantity || 1);
              }
            }
          });
        }
      });

      return Object.entries(results).map(([name, value]) => ({ name, value }));
    } catch (e) {
      console.error("Failed to compute category revenue report on frontend", e);
      return [];
    }
  },

  getSalesPerformanceReport: async (timeframe = 'monthly', options = {}) => {
    if (USE_MOCK) {
      const allOrders = [...(dbData.orders || []), ...getLocalOrders()];
      const salesUsers = (dbData.users || []).filter(u => u.roleID === 2);
      const now = new Date();

      // Helper logic for timeframe filtering (consistent with dashboard)
      const matchesTimeframe = (dateStr) => {
        const pd = parseDateToObj(dateStr);
        if (!pd) return false;

        if (timeframe === 'daily') {
          const targetY = options.filterDate ? parseInt(options.filterDate.split('-')[0]) : now.getFullYear();
          const targetM = options.filterDate ? parseInt(options.filterDate.split('-')[1]) : (now.getMonth() + 1);
          const targetD = options.selectedDay || now.getDate();
          return pd.getFullYear() === targetY && (pd.getMonth() + 1) === targetM && pd.getDate() === targetD;
        } else if (timeframe === 'weekly') {
          const [yStr, wStr] = (options.filterWeek || "").split('-W');
          const targetY = parseInt(yStr) || now.getFullYear();
          const targetW = parseInt(wStr) || getISOWeek(now);
          return pd.getFullYear() === targetY && getISOWeek(pd) === targetW;
        } else if (timeframe === 'monthly') {
          const targetY = parseInt(options.filterYear) || (options.filterDate ? parseInt(options.filterDate.split('-')[0]) : now.getFullYear());
          return pd.getFullYear() === targetY;
        } else {
          const yearsCount = parseInt(options.filterYearsCount) || 5;
          const endY = now.getFullYear();
          const startY = endY - yearsCount + 1;
          const y = pd.getFullYear();
          return y >= startY && y <= endY;
        }
      };

      return salesUsers.map(user => {
        const fullName = `${user.lastName} ${user.firstName}`;
        
        // ĐỒNG BỘ: Sử dụng Đơn hàng làm gốc để tính hiệu suất nhân viên (giống Module Sales)
        const userOrders = allOrders.filter(o => 
          Number(o.userID) === Number(user.userID) && matchesTimeframe(o.orderDate || o.date)
        );
        
        // Doanh thu tính 10% VAT để khớp với kỳ vọng hiển thị
        const revenue = userOrders.reduce((sum, o) => sum + (safeNumber(o.totalAmount) * 1.1), 0);
        const orderCount = userOrders.length;
        
        let target = 500000000;
        if (timeframe === 'yearly') target = 5000000000;
        if (timeframe === 'weekly') target = 120000000;
        if (timeframe === 'daily') target = 250000000;

        const achievement = (revenue / target) * 100;
        const commissionRate = achievement > 100 ? 0.05 : 0.03;

        return {
          id: user.userID,
          name: fullName,
          revenue,
          orderCount,
          target,
          achievement,
          commission: revenue * commissionRate
        };
      });
    }
    const response = await api.get('/reports/sales-performance', { params: { timeframe, ...options } });
    return response.data?.success ? response.data.data : (response.data || []);
  },

  createInvoice: async (data) => {
    if (USE_MOCK) {
      const local = getLocalInvoices();
      const all = [...local, ...dbData.invoices];
      const maxId = all.reduce((max, inv) => Math.max(max, Number(inv.invoiceID) || 0), 0);
      
      // FIX: Parse orderID từ dạng "ORD-101" hoặc số nguyên
      const rawOrderID = data.orderID;
      let resolvedOrderID;
      if (rawOrderID) {
        const str = String(rawOrderID).toUpperCase().replace('ORD-', '');
        resolvedOrderID = isNaN(Number(str)) ? rawOrderID : Number(str);
      } else {
        resolvedOrderID = 200 + maxId; // Mock orderID nếu không nhập
      }
      
      // Tự động gán userID từ đơn hàng nếu hóa đơn chưa có
      let finalUserID = data.userID;
      if (!finalUserID && resolvedOrderID) {
        const linkedOrder = allOrders.find(o => String(o.orderID) === String(resolvedOrderID));
        if (linkedOrder) finalUserID = linkedOrder.userID;
      }

      const newInvoice = {
        ...data,
        invoiceID: maxId + 1,
        orderID: resolvedOrderID,
        userID: finalUserID || 1, // Fallback về admin/system nếu vẫn không tìm thấy
        paidAmount: data.paidAmount || 0,
        status: data.status || 'pending',
        createAt: new Date().toISOString().split('T')[0]
      };
      
      // Store items in localOrderItems if present
      if (data.items && data.items.length > 0) {
        const localItems = getLocalOrderItems();
        const itemsToStore = data.items.map(it => ({
          orderID: resolvedOrderID,
          productID: it.productID,
          quantity: it.quantity,
          unitPrice: it.unitPrice || it.price,
          discount: it.discount || 0
        }));
        localStorage.setItem('added_order_items', JSON.stringify([...itemsToStore, ...localItems]));
      }

      localStorage.setItem('added_invoices', JSON.stringify([newInvoice, ...local]));

      const customer = getCustomerDetails(newInvoice.customerID);
      return {
        ...newInvoice,
        displayID: formatDisplayCode(newInvoice.invoiceID, 'INV'),
        displayOrderID: formatDisplayCode(resolvedOrderID, 'ORD'),
        ...customer,
        orderStatus: getStatusLabelVN(newInvoice.status),
        date: newInvoice.invoiceDate ? new Date(newInvoice.invoiceDate).toLocaleDateString('vi-VN') : 'N/A',
      };
    }
    const response = await api.post('/api/invoices', data);
    const invoice = response.data?.success ? response.data.data : response.data;
    return accountingService.mapApiInvoice(invoice);
  },

  updateInvoiceStatus: async (id, status) => {
    if (USE_MOCK) {
      const local = getLocalInvoices();
      const updated = local.map(inv =>
        inv.invoiceID === id ? { ...inv, status: normalizeInvoiceStatus(status) } : inv
      );
      localStorage.setItem('added_invoices', JSON.stringify(updated));
      return true;
    }
    const response = await api.put(`/api/invoices/${id}/status`, { status });
    return response.data;
  },

  updateInvoiceCosts: async (id, totalAmount) => {
    if (USE_MOCK) {
      const local = getLocalInvoices();
      const updated = local.map(inv =>
        inv.invoiceID === id ? { ...inv, totalAmount } : inv
      );
      localStorage.setItem('added_invoices', JSON.stringify(updated));
      return true;
    }
    const response = await api.put(`/api/invoices/${id}/costs`, { totalAmount });
    return response.data;
  },

  getPayments: async () => {
    if (USE_MOCK) return mockPayments();
    const response = await api.get('/api/payments');
    return response.data;
  },

  recordPayment: async (invoiceID, paymentDetails) => {
    if (USE_MOCK) {
      // 1. Cập nhật trạng thái hóa đơn
      const localInvoices = getLocalInvoices();
      const apiInvoices = dbData.invoices || [];
      const allInvoices = [...localInvoices, ...apiInvoices];

      const inv = allInvoices.find(i => i.invoiceID === Number(invoiceID));
      if (inv) {
        // Cập nhật số tiền đã thanh toán
        inv.paidAmount = (Number(inv.paidAmount) || 0) + (Number(paymentDetails.amount) || 0);
        
        // Tự động tính lại trạng thái
        inv.status = calculateInvoiceStatus(inv.totalAmount, inv.paidAmount, inv.dueDate);

        const isLocal = localInvoices.some(i => i.invoiceID === inv.invoiceID);
        if (isLocal) {
          const updatedLocal = localInvoices.map(i => i.invoiceID === inv.invoiceID ? inv : i);
          localStorage.setItem('added_invoices', JSON.stringify(updatedLocal));
        } else {
          const overrides = JSON.parse(localStorage.getItem('invoice_overrides') || '[]');
          const updatedOverrides = [...overrides.filter(i => i.invoiceID !== inv.invoiceID), inv];
          localStorage.setItem('invoice_overrides', JSON.stringify(updatedOverrides));
        }
      }

      // 2. Tạo phiếu thu mới với mã VCHR
      const localPayments = getLocalPayments();
      const allPaymentsForId = [...localPayments, ...(dbData.payments || [])];
      const maxId = allPaymentsForId.reduce((max, p) => Math.max(max, Number(p.paymentID) || 0), 0);
      const newPaymentID = maxId + 1;
      const newPayment = {
        paymentID: newPaymentID,
        invoiceID: Number(invoiceID),
        amount: Number(paymentDetails.amount),
        paymentDate: new Date().toISOString(),
        paymentMethod: paymentDetails.method === 'Cash' ? 'Tiền mặt' : 'Chuyển khoản',
        voucherCode: formatDisplayCode(newPaymentID, 'VCHR'),
        recordedBy: 'Kế toán trưởng',
        status: 'completed',
        note: paymentDetails.note || `Thanh toán cho hóa đơn ${formatDisplayCode(Number(invoiceID), 'INV')}`,
      };

      localStorage.setItem('added_payments', JSON.stringify([newPayment, ...localPayments]));
      return true;
    }
    const response = await api.post('/api/payments', { invoiceID, ...paymentDetails });
    return response.data;
  },

  // ── NOTIFICATION DETAIL (dùng ID dạng string như "notif-pay-1") ────────────
  getNotificationDetail: async (id) => {
    if (USE_MOCK) {
      const allNotifs = buildNotifications();
      return allNotifs.find(n => n.id === id) || null;
    }
    const response = await api.get(`/api/notifications/${id}`);
    return response.data;
  },

  getExtendedNotificationDetail: async (id) => {
    if (USE_MOCK) {
      return buildExtendedDetail(id);
    }
    const response = await api.get(`/api/notifications/${id}/extended`);
    return response.data;
  },

  getDebtReport: async (timeframe, options = {}) => {
    if (USE_MOCK) return mockDebtReport(timeframe, options);
    
    // 1. Lấy tất cả hóa đơn thật đã được map
    const invoices = await accountingService.getInvoices();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parseDateToObj = (dateStr) => {
      const parsed = parseDate(dateStr);
      return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d) : null;
    };

    const getISOWeek = (date) => {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 0;
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    // Lọc hóa đơn công nợ
    const debtInvoices = invoices.filter(inv => {
      const actualRemaining = Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0));
      const status = String(inv.status || 'PENDING').toLowerCase();

      // Đã thanh toán đủ -> Bỏ qua
      if (status === 'paid' || actualRemaining <= 0) return false;

      // Lọc theo thời gian
      if (timeframe && timeframe !== 'all') {
        const pd = parseDateToObj(inv.invoiceDate || inv.createAt || inv.date);
        if (pd) {
          const now = new Date();
          if (timeframe === 'daily') {
            const targetY = options.filterDate ? parseInt(options.filterDate.split('-')[0], 10) : now.getFullYear();
            const targetM = options.filterDate ? parseInt(options.filterDate.split('-')[1], 10) : (now.getMonth() + 1);
            const targetD = options.selectedDay || now.getDate();
            if (!(pd.getFullYear() === targetY && (pd.getMonth() + 1) === targetM && pd.getDate() === targetD)) return false;
          } else if (timeframe === 'weekly') {
            const [yStr, wStr] = (options.filterWeek || "").split('-W');
            const targetY = parseInt(yStr, 10) || now.getFullYear();
            const targetW = parseInt(wStr, 10) || getISOWeek(now);
            if (!(pd.getFullYear() === targetY && getISOWeek(pd) === targetW)) return false;
          } else if (timeframe === 'monthly') {
            const targetY = parseInt(options.filterYear, 10) || now.getFullYear();
            if (pd.getFullYear() !== targetY) return false;
          } else if (timeframe === 'yearly') {
            const yearsCount = parseInt(options.filterYearsCount, 10) || 5;
            const endY = now.getFullYear();
            const startY = endY - yearsCount + 1;
            const y = pd.getFullYear();
            if (!(y >= startY && y <= endY)) return false;
          }
        }
      }
      return true;
    });

    // Chuyển thành danh sách nợ theo từng hóa đơn
    const debtItems = debtInvoices.map(inv => {
      const dueObj = parseDateToObj(inv.dueDate);
      let overdueDays = 0;
      let isOverdue = false;

      if (dueObj) {
        const dueCopy = new Date(dueObj);
        dueCopy.setHours(0, 0, 0, 0);
        const diffTime = today - dueCopy;
        overdueDays = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
        isOverdue = diffTime > 0;
      }
      
      const remaining = Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0));
      
      let risk = 'medium';
      if (isOverdue) {
        if (overdueDays > 90) risk = 'critical';
        else if (overdueDays > 30) risk = 'high';
      }

      return {
        invoiceID: inv.invoiceID,
        displayID: formatDisplayCode(inv.invoiceID, 'INV'),
        customerID: inv.customerID,
        customerName: inv.customerName || 'Khách hàng lẻ',
        email: inv.email || null,
        phoneNumber: inv.phoneNumber || null,
        companyName: inv.companyName || null,
        daysOverdue: overdueDays,
        isOverdue,
        remainingAmount: remaining,
        totalAmount: Number(inv.totalAmount) || 0,
        riskLevel: risk,
        autoRemind: remaining > 10000000,
        lastReminderDate: overdueDays > 7 ? '20/04/2026' : null,
        nextPaymentDate: !isOverdue ? (inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('vi-VN') : 'N/A') : null
      };
    });

    // Tính summary
    const allUnpaid = invoices.filter(inv => String(inv.status || 'PENDING').toLowerCase() !== 'paid');
    const totalDebtVal = allUnpaid.reduce((sum, inv) => sum + Math.max(0, (Number(inv.totalAmount) || 0) - (Number(inv.paidAmount) || 0)), 0);
    const overdueDebtVal = debtItems.reduce((sum, d) => sum + d.remainingAmount, 0);
    const uniqueCustomerCount = new Set(debtItems.map(d => d.customerID)).size;

    return {
      data: debtItems,
      summary: {
        totalDebt: totalDebtVal.toLocaleString('vi-VN') + ' VND',
        overdueDebt: overdueDebtVal.toLocaleString('vi-VN') + ' VND',
        customerCount: uniqueCustomerCount.toString(),
        totalDebtGrowth: { percent: "12.5", isUp: true, prevValue: Math.round(totalDebtVal * 0.88), label: "SO VỚI THÁNG TRƯỚC" },
        overdueDebtGrowth: { percent: "8.2", isUp: false, prevValue: Math.round(overdueDebtVal * 1.08), label: "SO VỚI THÁNG TRƯỚC" },
        customerCountGrowth: { percent: "15.0", isUp: true, prevValue: Math.max(1, Math.round(uniqueCustomerCount - 1)), label: "SO VỚI THÁNG TRƯỚC" }
      }
    };
  },

  // ── REMINDERS (Email triggers) ──────────────────────────────────────────
  sendDebtReminder: async (invoiceID) => {
    if (USE_MOCK) {
      // Giả lập độ trễ mạng để UI có cảm giác thực tế
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, message: "Mock: Gửi mail thành công" };
    }
    const response = await api.post('/api/reminders/send', { invoiceID });
    return response.data;
  },

  sendBatchReminders: async (invoiceIDs) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true, count: invoiceIDs.length };
    }
    const response = await api.post('/api/reminders/batch-send', { invoiceIDs });
    return response.data;
  },

  getProducts: async () => {
    if (USE_MOCK) return dbData.products || [];
    const response = await api.get('/api/products');
    return response.data;
  },

  getCategories: async () => {
    if (USE_MOCK) return dbData.categories || [];
    const response = await api.get('/api/categories');
    return response.data;
  },

  getRelativeTime,
};

export default accountingService;
export { normalizeInvoiceStatus, formatDisplayCode };
