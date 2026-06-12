import React, { useState, useEffect } from 'react';
import salesService from '../../services/salesService';
import RevenueChart from '../../components/Charts/RevenueChart';
import DailyActivityGrid from '../../components/Charts/DailyActivityGrid';
import OrderDetailDrawer from '../../components/Drawers/OrderDetailDrawer';
import QuotationDetailDrawer from '../../components/Drawers/QuotationDetailDrawer';

const getResponsiveValueClass = (val, rawVal) => {
  let str = '';
  if (rawVal !== undefined && rawVal !== null) {
    str = String(rawVal);
    if (typeof rawVal === 'number') {
      str += ' VND…';
    }
  } else if (val) {
    str = String(val);
  }
  const len = str.length;
  if (len <= 10) {
    return "text-base sm:text-lg lg:text-lg xl:text-xl";
  } else if (len <= 15) {
    return "text-sm sm:text-base lg:text-[13px] xl:text-lg";
  } else if (len <= 20) {
    return "text-xs sm:text-sm lg:text-[11px] xl:text-base";
  } else {
    return "text-[10px] sm:text-xs lg:text-[10px] xl:text-sm";
  }
};

const SalesDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeOrders: 0,
    customerCount: 0,
    activeQuotes: 0,
    revenueGrowth: null,
    orderGrowth: null,
    customerGrowth: null,
    revenueChart: []
  });
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('monthly');
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);
  
  // Drawer states & handlers for detail views
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [quotationDrawerOpen, setQuotationDrawerOpen] = useState(false);

  const handleViewOrder = (order) => {
    const mappedOrder = {
      ...order,
      id: order.displayID || `ORD-${order.orderID?.toString().padStart(3, '0')}`,
      date: order.date || (order.orderDate ? new Date(order.orderDate).toLocaleDateString('vi-VN') : 'N/A'),
      rawStatus: order.orderStatus || 'PENDING',
      customer: order.customerName,
      phone: order.customerPhone || order.phoneNumber || order.phone || 'N/A',
      total: order.totalAmount,
      note: order.notes || order.note || 'Khởi tạo trực tiếp từ Dashboard',
      items: order.items || []
    };
    setSelectedOrder(mappedOrder);
    setOrderDrawerOpen(true);
  };

  const handleViewQuotation = (quote) => {
    const mappedQuote = {
      ...quote,
      id: quote.displayID || `QUO-${quote.quotationID?.toString().padStart(3, '0')}`,
      name: quote.customerName,
      email: quote.customerEmail || 'N/A',
      date: quote.date || (quote.createAt ? new Date(quote.createAt).toLocaleDateString('vi-VN') : 'N/A'),
      value: quote.totalAmount,
      status: quote.status || quote.quotationStatus || 'PENDING',
      items: quote.items || []
    };
    setSelectedQuotation(mappedQuote);
    setQuotationDrawerOpen(true);
  };
  
  // Date filters states (Standardized from Accounting)
  const now = new Date();
  const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Picker visibility states
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('months');
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const yearPickerRef = React.useRef(null);
  const weekPickerRef = React.useRef(null);
  const yearsCountPickerRef = React.useRef(null);
  const datePickerRef = React.useRef(null);

  // Time Dropdown States & Refs
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const timeDropdownRef = React.useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Handle click outside to close pickers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target)) setShowYearPicker(false);
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target)) setShowWeekPicker(false);
      if (yearsCountPickerRef.current && !yearsCountPickerRef.current.contains(event.target)) setShowYearsCountPicker(false);
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setDatePickerView('months');
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setIsOpenTimeDropdown(false);
      }
      if (!event.target.closest('.stat-card-container')) {
        setActiveTooltipIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const userID = currentUser?.userID;

      const options = { filterWeek, filterYear, filterYearsCount, filterDate, selectedDay };
      const [statsRes, ordersRes, quotesRes] = await Promise.all([
        salesService.getDashboardStats(userID, timeframe, options),
        salesService.getOrders(userID, timeframe, options),
        salesService.getQuotations(userID, timeframe, options)
      ]);
      setStats(statsRes);
      setOrders(ordersRes);
      setQuotations(quotesRes.slice(0, 5));
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

  const getTimeframeText = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      return `ngày ${selectedDay}/${m}/${y}`;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      return `tuần ${w}, ${y}`;
    }
    if (timeframe === 'monthly') return `12 tháng năm ${filterYear}`;
    if (timeframe === 'yearly') return `${filterYearsCount} năm qua`;
    return 'Toàn thời gian';
  };

  const formatCurrency = (val, isSmall = false, isStat = false, customColorClass = "", textSizeClass = "") => {
    if (val === undefined || val === null) return "0 VND";
    
    let cleanVal = val;
    const isMobileOrIpad = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobileOrIpad && (typeof val === 'number' || typeof val === 'string')) {
      const rawDigits = String(val).replace(/[^0-9]/g, '');
      if (rawDigits.length > 15) {
        const truncated = rawDigits.slice(0, 15);
        const isNegative = String(val).startsWith('-');
        cleanVal = Number(truncated) * (isNegative ? -1 : 1);
      }
    }

    const formatted = typeof cleanVal === 'number' ? cleanVal.toLocaleString('vi-VN') : cleanVal.toString().replace(/[đ₫\sVND]/g, '').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
    
    if (isStat) {
      return (
        <span className={`flex items-baseline gap-1.5 whitespace-nowrap ${customColorClass}`}>
          <span className={`font-black text-inherit ${textSizeClass}`}>{formatted}</span>
          <span className="font-black text-inherit uppercase tracking-tight">VND</span>
        </span>
      );
    }

    const valueColor = customColorClass || "text-slate-800";
    const unitColor = customColorClass ? "text-inherit opacity-70" : "text-slate-400";
    const valueSize = textSizeClass || (isSmall ? "text-xs" : "");

    return (
      <span className={`inline-flex items-baseline gap-1 whitespace-nowrap ${customColorClass}`}>
        <span className={`${isSmall ? "font-bold" : "font-black"} ${valueColor} ${valueSize}`}>{formatted}</span>
        <span className={`text-[10px] font-bold uppercase tracking-tighter ${unitColor}`}>VND</span>
      </span>
    );
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedOrders = () => {
    if (!sortConfig.key) return orders;

    return [...orders].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.orderDate || a.date.split('/').reverse().join('-'));
        const dateB = new Date(b.orderDate || b.date.split('/').reverse().join('-'));
        if (dateA.getTime() !== dateB.getTime()) {
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
      } else if (sortConfig.key === 'totalAmount') {
        const valA = Number(a.totalAmount) || 0;
        const valB = Number(b.totalAmount) || 0;
        if (valA !== valB) {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
      } else if (sortConfig.key === 'customerName') {
        const comp = a.customerName.localeCompare(b.customerName, 'vi');
        if (comp !== 0) {
          return sortConfig.direction === 'asc' ? comp : -comp;
        }
      } else if (sortConfig.key === 'displayID') {
        const idA = Number(a.orderID) || 0;
        const idB = Number(b.orderID) || 0;
        if (idA !== idB) {
          return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
        }
      }

      // Default Tie-breaker: Highest ID first
      const idA = Number(a.orderID) || 0;
      const idB = Number(b.orderID) || 0;
      return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
    });
  };

  const getTooltipClasses = (idx) => {
    // Left-aligned tooltip: displays on the right, points left
    const leftAlign = "left-full top-0 ml-2.5 origin-top-left";
    // Right-aligned tooltip: displays on the left, points right
    const rightAlign = "right-full top-0 mr-2.5 origin-top-right";

    if (idx === 0) {
      return leftAlign;
    } else if (idx === 3) {
      return rightAlign;
    } else if (idx === 1) {
      return `${rightAlign} lg:right-auto lg:left-full lg:mr-0 lg:ml-2.5 lg:origin-top-left`;
    } else if (idx === 2) {
      return `${leftAlign} lg:left-auto lg:right-full lg:ml-0 lg:mr-2.5 lg:origin-top-right`;
    }
    return leftAlign;
  };

  const getArrowClasses = (idx) => {
    const leftArrow = "-left-1 border-l border-b";
    const rightArrow = "-right-1 border-t border-r";

    if (idx === 0) {
      return leftArrow;
    } else if (idx === 3) {
      return rightArrow;
    } else if (idx === 1) {
      return `${rightArrow} lg:right-auto lg:-left-1 lg:border-t-0 lg:border-r-0 lg:border-l lg:border-b`;
    } else if (idx === 2) {
      return `${leftArrow} lg:left-auto lg:-right-1 lg:border-l-0 lg:border-b-0 lg:border-t lg:border-r`;
    }
    return leftArrow;
  };

  const GrowthBadge = ({ growth, type = 'currency', currentValue, idx, activeTooltipIdx }) => {
    if (!growth) return null;
    const { percent, isUp, prevValue, label } = growth;
    
    const tooltipPositionClass = getTooltipClasses(idx);
    const arrowPositionClass = getArrowClasses(idx);
    const isActive = activeTooltipIdx === idx;

    return (
      <div 
        className="w-max group relative flex items-center gap-1 mt-1 cursor-help"
        tabIndex={0}
        role="button"
        aria-label="Xem chi tiết tăng trưởng"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }}
      >
        <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
          <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">{isUp ? 'trending_up' : 'trending_down'}</span>
          <span>{isUp ? '+' : '-'}{percent}%</span>
        </div>
        
        {/* Tooltip */}
        <div className={`absolute hidden group-hover:block z-[9999] w-52 animate-fade-in ${tooltipPositionClass} ${isActive ? '!block' : ''}`}>
          <div className="bg-white/95 backdrop-blur-xl text-slate-900 text-[10px] p-3 rounded-xl shadow-2xl border border-slate-300">
            <p className="font-black opacity-50 mb-2 uppercase tracking-[0.1em] text-[9px] border-b border-slate-100 pb-1.5">{label}</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Kỳ trước:</span>
                <span className="font-black text-slate-700">
                  {type === 'currency' ? formatCurrency(prevValue, true) : prevValue}
                </span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-500 font-medium">Kỳ này:</span>
                <span className={`font-black ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {type === 'currency' ? formatCurrency(currentValue, true) : currentValue}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
              <span className="text-slate-400 italic">Tình trạng:</span>
              <span className={`font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isUp ? 'Tăng trưởng' : 'Giảm sút'}
              </span>
            </div>
          </div>
          {/* Mũi tên tooltip */}
          <div className={`w-2 h-2 bg-white rotate-45 absolute top-2.5 shadow-sm ${arrowPositionClass}`}></div>
        </div>
      </div>
    );
  };

  const sortedOrders = getSortedOrders();

  const dashboardStats = [
    { title: 'Doanh thu tổng', value: formatCurrency(stats.totalRevenue, false, true), rawValue: stats.totalRevenue, growth: stats.revenueGrowth, type: 'currency', icon: 'account_balance_wallet', color: 'emerald' },
    { title: 'Báo giá thành công', value: stats.activeQuotes?.toString() || '0', rawValue: stats.activeQuotes || 0, growth: stats.quoteGrowth, type: 'number', icon: 'request_quote', color: 'purple' },
    { title: 'Đơn hàng mới', value: stats.activeOrders?.toString() || '0', rawValue: stats.activeOrders || 0, growth: stats.orderGrowth, type: 'number', icon: 'shopping_cart', color: 'blue' },
    { title: 'Khách hàng', value: stats.customerCount?.toString() || '0', rawValue: stats.customerCount || 0, growth: stats.customerGrowth, type: 'number', icon: 'person_add', color: 'orange' },
  ];

  const getWeekRange = (year, week) => {
    const d = new Date(year, 0, 1);
    const dayNum = d.getDay();
    const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
    const firstMonday = new Date(d.setDate(diff));
    const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
  };

  if (loading && stats.revenueChart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Đang tải dữ liệu…</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-3 sm:gap-4 md:gap-5">
      {/* Header - Cố định */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 md:px-0 shrink-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Bảng điều khiển Kinh doanh</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Tổng quan{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in" key={getTimeframeText()}>
              {getTimeframeText()}
            </span>
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 relative z-30">
          {/* 1. Bộ lọc Thời gian Dropdown */}
          <div className="relative font-inter w-full sm:w-auto" ref={timeDropdownRef}>
            <button 
              onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
              aria-expanded={isOpenTimeDropdown}
              aria-haspopup="true"
              className="w-full sm:w-auto bg-white border border-slate-300 hover:border-[#00288E] transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E]"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">calendar_month</span>
                <span className="font-black text-slate-700 uppercase tracking-widest">
                  Thời gian: {getTimeframeText()}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenTimeDropdown ? 'rotate-180 text-blue-600' : ''}`} style={{ fontSize: '14px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenTimeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-right">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00288E] text-[18px] font-bold">tune</span>
                    <span className="text-[13px] font-black uppercase tracking-widest text-[#00288E]">CHỌN THỜI GIAN</span>
                  </div>
                  <button 
                    onClick={() => setIsOpenTimeDropdown(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600"
                    aria-label="Đóng"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Chế độ lọc */}
                  <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                      <button 
                        key={tf} 
                        onClick={() => setTimeframe(tf)}
                        className={`flex-1 py-2 transition-all text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider ${timeframe === tf ? 'bg-white text-[#00288E] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        {tf === 'daily' ? 'Ngày' : tf === 'weekly' ? 'Tuần' : tf === 'monthly' ? 'Tháng' : 'Năm'}
                      </button>
                    ))}
                  </div>

                  {/* Chi tiết bộ lọc tùy biến */}
                  <div className="pt-3 border-t border-slate-50 flex flex-col gap-2 relative">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bộ chọn chi tiết</span>
                    <div className="flex justify-center w-full">
                      {timeframe === 'daily' && (() => {
                        const [y, m] = filterDate.split('-').map(Number);
                        return (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={datePickerRef}>
                            <button onClick={() => {
                                      let newM = m - 1;
                                      let newY = y;
                                      if (newM < 1) { newM = 12; newY--; }
                                      setFilterDate(`${newY}-${String(newM).padStart(2, '0')}`);
                                    }} 
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Tháng trước">
                              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('months'); }} 
                                    className={`transition-all flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>Tháng {m}, {y}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showDatePicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                            </button>
                            {showDatePicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[340px] animate-fade-in">
                                {datePickerView === 'months' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn tháng</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('years'); setDateYearRangeStart(Math.floor(dateTempYear / 12) * 12); }} 
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase">
                                        {dateTempYear} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {monthNames.map((mName, idx) => (
                                        <button key={mName} 
                                                onClick={() => { 
                                                  setFilterDate(`${dateTempYear}-${String(idx + 1).padStart(2, '0')}`); 
                                                  setShowDatePicker(false); 
                                                }} 
                                                className={`text-[11px] font-black py-3 rounded-lg transition-all ${(idx + 1) === m && dateTempYear === y ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
                                          {mName}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <div className="flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }} 
                                                className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600">
                                          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }} 
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600">
                                          <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }} 
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600">
                                          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {Array.from({length: 12}).map((_, i) => { 
                                        const yearOpt = dateYearRangeStart + i; 
                                        return (
                                          <button key={yearOpt} 
                                                  onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setDateTempYear(yearOpt); 
                                                    setDatePickerView('months'); 
                                                  }} 
                                                  className={`text-[11px] font-black py-3 rounded-lg transition-all ${yearOpt === dateTempYear ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                                            {yearOpt}
                                          </button>
                                        ); 
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <button onClick={() => {
                                      let newM = m + 1;
                                      let newY = y;
                                      if (newM > 12) { newM = 1; newY++; }
                                      setFilterDate(`${newY}-${String(newM).padStart(2, '0')}`);
                                    }} 
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Tháng tiếp theo">
                              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                          </div>
                        );
                      })()}

                      {timeframe === 'weekly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={weekPickerRef}>
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w - 1; let newY = y; if (newW < 1) { newY--; newW = 52; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }} 
                                  className={`transition-all flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                          </button>
                          {showWeekPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[340px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-blue-600">{filterWeek.split('-W')[0]}</span></div>
                              <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                                <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-all ${filterWeek === weekStr ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]">check_circle</span>}</button>); })}</div>
                              </div>
                            </div>
                          )}
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'monthly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                          <button onClick={() => setFilterYear(prev => prev - 1)} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }} 
                                  className={`transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>Năm {filterYear}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                          </button>
                          {showYearPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600"><span className="material-symbols-outlined text-[12px]">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600"><span className="material-symbols-outlined text-[12px]">chevron_right</span></button></div></div>
                              <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-all ${filterYear === y ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                            </div>
                          )}
                          <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }} 
                                  disabled={filterYear >= now.getFullYear()} 
                                  className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'yearly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Giảm số năm">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }} 
                                  className={`transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterYearsCount} Năm qua</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                          </button>
                          {showYearsCountPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                              <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-all flex justify-between items-center ${filterYearsCount === v ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]">check</span>}</button>))}</div>
                            </div>
                          )}
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tăng số năm">
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Content - Phân bổ không gian */}
      <div className="flex-1 flex flex-col min-h-0 gap-4 sm:gap-5 md:gap-6 pb-4 sm:pb-6 pt-2 sm:pt-4 overflow-y-auto scrollbar-none">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0 px-1 sm:px-2 md:px-0">
          {dashboardStats.map((stat, idx) => (
            <div key={idx} 
                 onClick={() => {
                   setActiveTooltipIdx(prev => prev === idx ? null : idx);
                 }}
                 tabIndex={0}
                 role="button"
                 aria-label={`Xem chi tiết ${stat.title}`}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' || e.key === ' ') {
                     e.preventDefault();
                     setActiveTooltipIdx(prev => prev === idx ? null : idx);
                   }
                 }}
                 className="stat-card-container relative bg-white rounded-xl p-3 sm:p-4 shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-[border-color,box-shadow,transform,z-index] duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">{stat.title}</p>
                  <div className={`mt-1 font-black text-slate-900 [font-variant-numeric:tabular-nums] break-words whitespace-normal xl:truncate xl:whitespace-nowrap ${getResponsiveValueClass(stat.value, stat.rawValue)}`} title={typeof stat.value === 'object' ? stat.rawValue : stat.value}>{stat.value}</div>
                  <GrowthBadge growth={stat.growth} type={stat.type} currentValue={stat.rawValue} idx={idx} activeTooltipIdx={activeTooltipIdx} />
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110 ${
                  stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  stat.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                  stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                  'bg-orange-50 text-orange-600'
                }`} aria-hidden="true">
                  <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">{stat.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart & Tables Area */}
        <div className="flex flex-col gap-4 sm:gap-5 md:gap-6 min-h-0 min-w-0 px-1 sm:px-2 md:px-0 pb-2">
          
          {/* Revenue Chart */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 p-3 sm:p-4 hover:border-blue-500 transition-[border-color,box-shadow] duration-300 shrink-0">
            <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight mb-2 sm:mb-4">
              {timeframe === 'daily' ? `Hoạt động bán hàng tháng ${filterDate.split('-')[1]}/${filterDate.split('-')[0]}` : 
               timeframe === 'weekly' ? 'Doanh thu theo tuần' :
               timeframe === 'monthly' ? 'Doanh thu 12 tháng qua' : 'Doanh thu theo năm'}
            </h2>
            <div style={{ width: '100%' }}>
              {timeframe === 'daily' ? (
                <DailyActivityGrid 
                  loading={loading}
                  apiData={stats.revenueChart}
                  dateFilter={filterDate}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <RevenueChart 
                  data={stats.revenueChart}
                  formatCurrency={formatCurrency}
                />
              )}
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6 shrink-0">
            
            {/* Orders Table - 2/3 */}
            <div className="xl:col-span-2 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
              <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">Đơn hàng gần đây</h2>
                <button className="text-[10px] sm:text-xs font-bold text-[#00288E] hover:underline uppercase tracking-wider" aria-label="Xem tất cả đơn hàng">Xem tất cả</button>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-[300px] sm:max-h-[350px] scrollbar-none">
                {/* Desktop Table View */}
                <table className="hidden sm:table w-full text-left border-collapse sticky-header">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200 text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      <th className="px-3 sm:px-6 py-2 sm:py-3 cursor-pointer hover:text-[#00288E] transition-colors group" onClick={() => handleSort('displayID')} aria-sort={sortConfig.key === 'displayID' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <div className="flex items-center gap-1">
                          Mã đơn
                          <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'displayID' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                            {sortConfig.key === 'displayID' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 cursor-pointer hover:text-[#00288E] transition-colors group" onClick={() => handleSort('date')} aria-sort={sortConfig.key === 'date' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <div className="flex items-center gap-1">
                          Khách hàng / Ngày
                          <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'date' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                            {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left cursor-pointer hover:text-[#00288E] transition-colors group" onClick={() => handleSort('totalAmount')} aria-sort={sortConfig.key === 'totalAmount' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <div className="flex items-center justify-start gap-1">
                          Giá trị
                          <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'totalAmount' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                            {sortConfig.key === 'totalAmount' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs sm:text-sm text-slate-700 divide-y divide-gray-50">
                    {sortedOrders.length === 0 ? (
                      <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-400 font-medium">Không có đơn hàng</td></tr>
                    ) : sortedOrders.map((order) => (
                      <tr 
                        key={order.orderID} 
                        onClick={() => handleViewOrder(order)} 
                        tabIndex={0}
                        role="button"
                        aria-label={`Xem chi tiết đơn hàng ${order.displayID}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleViewOrder(order);
                          }
                        }}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer focus-visible:bg-slate-100 focus-visible:outline-none"
                      >
                        <td className="px-3 sm:px-6 py-2 sm:py-3 font-bold text-[#00288E] whitespace-nowrap text-[11px] sm:text-sm">{order.displayID}</td>
                        <td className="px-3 sm:px-6 py-2 sm:py-3">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm whitespace-normal max-w-[40ch] lg:max-w-none break-words" title={order.customerName}>{order.customerName}</p>
                          <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold">{order.date}</p>
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-3 text-left whitespace-nowrap [font-variant-numeric:tabular-nums]">
                          {formatCurrency(order.totalAmount, true)}
                        </td>
                        <td className="px-3 sm:px-6 py-2 sm:py-3 text-center">
                          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold border uppercase tracking-tighter ${
                            order.orderStatus === 'DELIVERED' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            <span className="hidden sm:inline">{order.orderStatus === 'DELIVERED' ? 'Thành công' : 'Đang xử lý'}</span>
                            <span className="sm:hidden">{order.orderStatus === 'DELIVERED' ? 'OK' : 'XL'}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards View - Limit to 5 */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {sortedOrders.slice(0, 5).map((order) => (
                    <div 
                      key={order.orderID} 
                      onClick={() => handleViewOrder(order)} 
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết đơn hàng ${order.displayID}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleViewOrder(order);
                        }
                      }}
                      className="p-3 space-y-2 cursor-pointer hover:bg-slate-50 transition-colors focus-visible:bg-slate-100 focus-visible:outline-none"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#00288E] text-[11px]">{order.displayID}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${
                          order.orderStatus === 'DELIVERED' 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                          : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {order.orderStatus === 'DELIVERED' ? 'Thành công' : 'Đang xử lý'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs leading-relaxed">{order.customerName}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{order.date}</p>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Giá trị</span>
                        <span className="font-black text-slate-900 text-xs">{formatCurrency(order.totalAmount, true)}</span>
                      </div>
                    </div>
                  ))}
                  {sortedOrders.length === 0 && <div className="p-8 text-center text-slate-400 text-xs">Không có đơn hàng</div>}
                </div>
              </div>
            </div>

            {/* Quotations Table - 1/3 */}
            <div className="xl:col-span-1 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
              <div className="p-3 sm:p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">Báo giá mới</h2>
                <button className="text-[10px] sm:text-xs font-bold text-[#00288E] hover:underline uppercase tracking-wider" aria-label="Xem tất cả báo giá">Tất cả</button>
              </div>
              <div className="overflow-y-auto max-h-[350px] scrollbar-none  ">
                {/* Desktop Table View */}
                <table className="hidden sm:table w-full text-left border-collapse">
                  <tbody className="text-sm text-slate-700 divide-y divide-gray-50">
                    {quotations.length === 0 ? (
                      <tr><td className="px-4 py-8 text-center text-slate-400 font-medium">Không có báo giá</td></tr>
                    ) : quotations.map((quote) => (
                      <tr 
                        key={quote.quotationID} 
                        onClick={() => handleViewQuotation(quote)} 
                        tabIndex={0}
                        role="button"
                        aria-label={`Xem chi tiết báo giá ${quote.displayID}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleViewQuotation(quote);
                          }
                        }}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer focus-visible:bg-slate-100 focus-visible:outline-none"
                      >
                        <td className="px-4 py-3">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-[#00288E]">{quote.displayID}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${
                              quote.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                              quote.status === 'SENT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                              'bg-orange-50 text-orange-600 border-orange-100'
                            }`}>
                              {quote.status === 'APPROVED' ? 'Đã duyệt' : quote.status === 'SENT' ? 'Đã gửi' : 'Chờ duyệt'}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900 text-xs sm:text-sm whitespace-normal max-w-[40ch] lg:max-w-none break-words">{quote.customerName}</div>
                          <div className="text-[9px] text-slate-400 font-bold mb-1">{quote.date}</div>
                          <div className="text-left font-bold text-slate-900">
                            {formatCurrency(quote.totalAmount, true)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Cards View - Limit to 5 */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {quotations.slice(0, 5).map((quote) => (
                    <div 
                      key={quote.quotationID} 
                      onClick={() => handleViewQuotation(quote)} 
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết báo giá ${quote.displayID}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleViewQuotation(quote);
                        }
                      }}
                      className="p-3 space-y-2 cursor-pointer hover:bg-slate-50 transition-colors focus-visible:bg-slate-100 focus-visible:outline-none"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#00288E] text-[11px]">{quote.displayID}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-tighter ${
                          quote.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                          quote.status === 'SENT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          {quote.status === 'APPROVED' ? 'Đã duyệt' : quote.status === 'SENT' ? 'Đã gửi' : 'Chờ duyệt'}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs leading-relaxed">{quote.customerName}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{quote.date}</p>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-50">
                        <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Giá trị</span>
                        <span className="font-black text-slate-900 text-xs">{formatCurrency(quote.totalAmount, true)}</span>
                      </div>
                    </div>
                  ))}
                  {quotations.length === 0 && <div className="p-8 text-center text-slate-400 text-xs">Không có báo giá</div>}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Detail Drawers */}
      <OrderDetailDrawer 
        open={orderDrawerOpen} 
        onClose={() => setOrderDrawerOpen(false)} 
        order={selectedOrder} 
        onRefresh={fetchData}
      />

      <QuotationDetailDrawer 
        open={quotationDrawerOpen} 
        onClose={() => setQuotationDrawerOpen(false)} 
        quotation={selectedQuotation} 
        onRefresh={fetchData}
      />
    </div>
  );
};

export default SalesDashboard;
