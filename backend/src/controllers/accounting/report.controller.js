import prisma from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

// GET /api/reports/revenue?startDate=&endDate=
export const getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  // Tính tổng doanh thu từ các đơn hàng giao thành công
  const orders = await prisma.order.findMany({
    where: {
      orderStatus: "DELIVERED",
      ...(startDate && endDate && {
        orderDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      })
    }
  });

  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const totalPaid = orders.reduce((sum, order) => sum + Number(order.paidAmount), 0);
  const totalPending = totalRevenue - totalPaid;

  res.json({
    revenue: totalRevenue,
    paid: totalPaid,
    pending: totalPending,
  });
});

// GET /api/reports/debt
export const getDebtReport = asyncHandler(async (req, res) => {
  // Lấy các hóa đơn chưa thanh toán hoặc thanh toán một phần
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] }
    },
    include: {
      order: {
        include: { customer: true }
      }
    }
  });

  const debtList = invoices.map(inv => {
    const total = Number(inv.totalAmount || 0);
    const paid = Number(inv.paidAmount || 0);
    return {
      invoiceID: inv.invoiceID,
      customerName: `${inv.order.customer.lastName} ${inv.order.customer.firstName}`,
      companyName: inv.order.customer.companyName,
      totalAmount: total,
      paidAmount: paid,
      debtAmount: total - paid,
      dueDate: inv.dueDate,
      status: inv.status,
    };
  });

  res.json(debtList);
});

// GET /api/reports/top-products
export const getTopProducts = asyncHandler(async (req, res) => {
  // Thống kê các sản phẩm bán chạy dựa trên số lượng trong OrderItem
  const items = await prisma.orderItem.groupBy({
    by: ['productID'],
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      }
    },
    take: 10,
  });

  const topProducts = await Promise.all(items.map(async (item) => {
    const product = await prisma.product.findUnique({
      where: { productID: item.productID },
    });
    return {
      productID: product.productID,
      productName: product.productName,
      salePrice: product.salePrice,
      unit: product.unit,
      totalQuantity: item._sum.quantity,
    };
  }));

  res.json(topProducts);
});

// GET /api/sales/dashboard/stats
export const getDashboardStats = asyncHandler(async (req, res) => {
  const { userID, timeframe, filterYear, filterDate, selectedDay, filterWeek, filterYearsCount } = req.query;
  const activeUserID = userID ? Number(userID) : undefined;

  // Lấy danh sách tất cả các đơn hàng, báo giá và khách hàng liên quan để tính toán động
  // (Filter theo userID nếu là nhân viên bán hàng - RoleID: 2)
  const whereUser = activeUserID && req.user.roleID === 2 ? { userID: activeUserID } : {};

  const [orders, quotations, customersCount] = await prisma.$transaction([
    prisma.order.findMany({
      where: whereUser,
      include: { customer: true }
    }),
    prisma.quotation.findMany({
      where: whereUser
    }),
    prisma.customer.count()
  ]);

  const now = new Date();
  
  // Lọc đơn hàng theo mốc thời gian (Timeframe) được gửi lên từ Frontend
  const filterOrdersByTime = (list, tf) => {
    return list.filter(o => {
      const d = o.orderDate ? new Date(o.orderDate) : new Date();
      if (tf === 'daily') {
        const [y, m] = (filterDate || `${now.getFullYear()}-${now.getMonth()+1}`).split('-').map(Number);
        const sDay = selectedDay ? Number(selectedDay) : now.getDate();
        return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === sDay;
      }
      if (tf === 'weekly') {
        const [y, w] = (filterWeek || `${now.getFullYear()}-W1`).split('-W').map(Number);
        const getWeek = (date) => {
          const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = target.getUTCDay() || 7;
          target.setUTCDate(target.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
          return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
        };
        return d.getFullYear() === y && getWeek(d) === w;
      }
      if (tf === 'monthly') {
        const targetYear = filterYear ? Number(filterYear) : now.getFullYear();
        return d.getFullYear() === targetYear;
      }
      if (tf === 'yearly') {
        const yearsCount = filterYearsCount ? Number(filterYearsCount) : 5;
        return d.getFullYear() > (now.getFullYear() - yearsCount);
      }
      return true;
    });
  };

  const currentPeriodOrders = filterOrdersByTime(orders, timeframe);
  
  // Xác định đơn hàng kỳ trước
  const getPreviousPeriodOrders = () => {
    return orders.filter(o => {
      const d = o.orderDate ? new Date(o.orderDate) : new Date();
      if (timeframe === 'daily') {
        const [y, m] = (filterDate || `${now.getFullYear()}-${now.getMonth()+1}`).split('-').map(Number);
        const sDay = selectedDay ? Number(selectedDay) : now.getDate();
        const prevDayDate = new Date(y, m - 1, sDay);
        prevDayDate.setDate(prevDayDate.getDate() - 1);
        return d.getFullYear() === prevDayDate.getFullYear() && 
               (d.getMonth() + 1) === (prevDayDate.getMonth() + 1) && 
               d.getDate() === prevDayDate.getDate();
      }
      if (timeframe === 'weekly') {
        const [y, w] = (filterWeek || `${now.getFullYear()}-W1`).split('-W').map(Number);
        let prevY = y, prevW = w - 1;
        if (prevW === 0) { prevY--; prevW = 52; }
        const getWeek = (date) => {
          const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = target.getUTCDay() || 7;
          target.setUTCDate(target.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
          return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
        };
        return d.getFullYear() === prevY && getWeek(d) === prevW;
      }
      if (timeframe === 'monthly') {
        const targetYear = filterYear ? Number(filterYear) : now.getFullYear();
        return d.getFullYear() === (targetYear - 1);
      }
      if (timeframe === 'yearly') {
        const yearsCount = filterYearsCount ? Number(filterYearsCount) : 5;
        const currentRangeStart = now.getFullYear() - yearsCount;
        const prevRangeStart = currentRangeStart - yearsCount;
        return d.getFullYear() > prevRangeStart && d.getFullYear() <= currentRangeStart;
      }
      return false;
    });
  };

  const prevPeriodOrders = getPreviousPeriodOrders();

  const getDisplayValue = (order) => (Number(order.totalAmount) || 0) * 1.1;

  const calculatePeriodStats = (list) => {
    const valid = list.filter(o => o.orderStatus !== 'CANCELLED');
    const revenue = valid.reduce((sum, o) => sum + getDisplayValue(o), 0);
    const ordersCount = valid.length;
    const uniqueCustomers = new Set(list.map(o => o.customerID)).size;
    return { revenue, ordersCount, customers: uniqueCustomers };
  };

  const currentStats = calculatePeriodStats(currentPeriodOrders);
  const prevStats = calculatePeriodStats(prevPeriodOrders);

  const calculateGrowth = (curr, prev) => {
    if (prev === 0) return { percent: curr > 0 ? "100" : "0", isUp: curr > 0 };
    const p = ((curr - prev) / prev) * 100;
    return { 
      percent: Math.abs(p).toFixed(1), 
      isUp: p >= 0,
      raw: p
    };
  };

  const totalRevenue = currentStats.revenue;
  const activeOrdersCount = currentStats.ordersCount;
  const activeQuotesCount = quotations.length; // Tổng báo giá
  
  // Dựng dữ liệu cho biểu đồ 12 tháng (mặc định)
  let revenueChart = Array(12).fill(0).map((_, i) => ({
    name: `Th.${i + 1}`,
    revenue: 0,
    orderCount: 0
  }));

  const validOrdersForChart = orders.filter(o => o.orderStatus !== 'CANCELLED');
  validOrdersForChart.forEach(o => {
    const d = o.orderDate ? new Date(o.orderDate) : new Date();
    const mIdx = d.getMonth();
    revenueChart[mIdx].revenue += getDisplayValue(o);
    revenueChart[mIdx].orderCount += 1;
  });

  res.json({
    success: true,
    data: {
      totalRevenue,
      revenueGrowth: { ...calculateGrowth(currentStats.revenue, prevStats.revenue), prevValue: prevStats.revenue },
      activeOrders: activeOrdersCount,
      orderGrowth: { ...calculateGrowth(currentStats.ordersCount, prevStats.ordersCount), prevValue: prevStats.ordersCount },
      customerCount: customersCount,
      customerGrowth: { ...calculateGrowth(currentStats.customers, prevStats.customers), prevValue: prevStats.customers },
      activeQuotes: activeQuotesCount,
      quoteGrowth: { percent: "0", isUp: true, prevValue: 0 },
      kpiProgress: Math.round(Math.min(100, (totalRevenue / 1000000000) * 100)),
      targetRevenue: 1000000000,
      revenueChart
    }
  });
});

// GET /api/reports/sales-performance
export const getSalesPerformanceReport = asyncHandler(async (req, res) => {
  const { timeframe = 'monthly', filterYear, filterDate, selectedDay, filterWeek, filterYearsCount } = req.query;

  // 1. Lấy tất cả nhân viên bán hàng (roleID: 2)
  const salesUsers = await prisma.user.findMany({
    where: { roleID: 2 }
  });

  // 2. Lấy tất cả đơn hàng không bị hủy
  const orders = await prisma.order.findMany({
    where: {
      orderStatus: { not: 'CANCELLED' }
    }
  });

  const now = new Date();

  // Helper lọc theo timeframe
  const matchesTimeframe = (orderDate, tf) => {
    if (!orderDate) return false;
    const d = new Date(orderDate);
    if (isNaN(d.getTime())) return false;

    if (tf === 'daily') {
      const [y, m] = (filterDate || `${now.getFullYear()}-${now.getMonth()+1}`).split('-').map(Number);
      const sDay = selectedDay ? Number(selectedDay) : now.getDate();
      return d.getFullYear() === y && (d.getMonth() + 1) === m && d.getDate() === sDay;
    }
    if (tf === 'weekly') {
      const [y, w] = (filterWeek || `${now.getFullYear()}-W1`).split('-W').map(Number);
      const getWeek = (date) => {
        const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
      };
      return d.getFullYear() === y && getWeek(d) === w;
    }
    if (tf === 'monthly') {
      const targetYear = filterYear ? Number(filterYear) : now.getFullYear();
      return d.getFullYear() === targetYear;
    }
    if (tf === 'yearly') {
      const yearsCount = filterYearsCount ? Number(filterYearsCount) : 5;
      return d.getFullYear() > (now.getFullYear() - yearsCount);
    }
    return true;
  };

  const performance = salesUsers.map(user => {
    const fullName = `${user.lastName || ''} ${user.firstName || ''}`.trim();
    const userOrders = orders.filter(o => 
      Number(o.userID) === Number(user.userID) && matchesTimeframe(o.orderDate, timeframe)
    );

    const revenue = userOrders.reduce((sum, o) => sum + (Number(o.totalAmount || 0) * 1.1), 0);
    const orderCount = userOrders.length;

    let target = 500000000;
    if (timeframe === 'yearly') target = 5000000000;
    if (timeframe === 'weekly') target = 120000000;
    if (timeframe === 'daily') target = 250000000;

    const achievement = target > 0 ? (revenue / target) * 100 : 0;
    const commissionRate = 0.02;

    return {
      id: user.userID,
      userID: user.userID,
      name: fullName,
      revenue,
      orderCount,
      target,
      achievement,
      commission: revenue * commissionRate
    };
  });

  res.json({ success: true, data: performance });
});

