import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Drawer, Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import CreateOrder from './CreateOrder';
import salesService from '../../services/salesService';
import OrderDetailDrawer from '../../components/Drawers/OrderDetailDrawer';
import { useSalesToast } from '../../components/Notification/useSalesToast';
import SalesToastNotification from '../../components/Notification/SalesToastNotification';
import { formatVND, VNDDisplay, CURRENCY_CLASS_PRIMARY } from '../../../../utils/formatVND';

const formatCurrency = (val, isSmall = false, isStat = false, alignRight = false) => {
  if (val === undefined || val === null) return "0 VND";
  const formatted = formatVND(val, false);
  const styleClass = isStat ? CURRENCY_CLASS_PRIMARY : (isSmall ? "font-bold text-slate-800" : "font-black text-slate-800");
  return (
    <span className={`flex items-baseline gap-1 whitespace-nowrap ${alignRight ? 'justify-end' : ''} ${isStat ? 'gap-1.5' : ''}`}>
      <span className={styleClass}>{formatted}</span>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${isStat ? 'text-inherit' : 'text-slate-400'}`}>VND</span>
    </span>
  );
};

const extractIdNumber = (idVal) => {
  if (typeof idVal === 'number') return idVal;
  if (!idVal) return 0;
  const match = idVal.toString().match(/\d+/g);
  if (match) {
    return parseInt(match[match.length - 1], 10);
  }
  return 0;
};

const getWeekRange = (year, week) => {
  const d = new Date(year, 0, 1);
  const dayNum = d.getDay();
  const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
  const firstMonday = new Date(d.setDate(diff));
  const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
};

const getResponsiveValueClass = (val, rawVal) => {
  let str = '';
  if (rawVal !== undefined && rawVal !== null) {
    str = String(rawVal);
    if (typeof rawVal === 'number') {
      str += ' VND..';
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

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const OrderManagement = () => {
  const { toast, showToast } = useSalesToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allOrders, setAllOrders] = useState([]);
  const showToastMsg = (message, type = 'success') => {
    showToast(message, type);
  };
  
  const [timeframe, setTimeframe] = useState('monthly');
  
  // Date filters states
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
  const [datePickerView, setDatePickerView] = useState('days');
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const yearPickerRef = React.useRef(null);
  const weekPickerRef = React.useRef(null);
  const yearsCountPickerRef = React.useRef(null);
  const datePickerRef = React.useRef(null);

  // New Dropdown States & Refs for minimalist UI
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const [isOpenActionDropdown, setIsOpenActionDropdown] = useState(false);
  const timeDropdownRef = React.useRef(null);
  const actionDropdownRef = React.useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const [activeTab, setActiveTab] = useState('Tất cả');
  const [isOpenStatusDropdown, setIsOpenStatusDropdown] = useState(false);
  const tabs = ['Tất cả', 'Chờ xác nhận', 'Đã xác nhận', 'Đang giao', 'Giao thất bại', 'Hoàn thành', 'Đã hủy'];
  const [showQuotationSelector, setShowQuotationSelector] = useState(false);
  const [quotationList, setQuotationList] = useState([]);
  const [quotationSearchQuery, setQuotationSearchQuery] = useState('');
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);

  useEffect(() => {
    if (location.state) {
      if (location.state.quotation || location.state.autoSelectCustomer) {
        navigate('/sales/orders/add', { state: location.state, replace: true });
      } else if (location.state.toastMessage) {
        showToastMsg(location.state.toastMessage, location.state.toastType || 'success');
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target)) setShowYearPicker(false);
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target)) setShowWeekPicker(false);
      if (yearsCountPickerRef.current && !yearsCountPickerRef.current.contains(event.target)) setShowYearsCountPicker(false);
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setDatePickerView('days');
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setIsOpenTimeDropdown(false);
      }
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setIsOpenActionDropdown(false);
      }
      if (!event.target.closest('.stat-card-container')) {
        setActiveTooltipIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, sortConfig, timeframe, filterWeek, filterYear, filterDate, selectedDay, filterYearsCount]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenQuotationSelector = async () => {
    try {
      setLoadingQuotations(true);
      setShowQuotationSelector(true);
      const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const userID = currentUser?.userID;
      
      const qData = await salesService.getQuotations(userID);
      const mappedQuotes = qData
        .filter(q => {
          const s = (q.status || q.quotationStatus || 'PENDING').toUpperCase();
          return s === 'APPROVED' || s === 'ĐỒNG Ý' || s === 'ĐÃ DUYỆT';
        })
        .map(q => ({
          ...q,
          id: q.displayID,
          name: q.customerName,
          email: q.customerEmail || 'N/A',
          group: q.customerGroup || 'STANDARD',
          date: q.date,
          value: q.totalAmount || 0,
          status: q.quotationStatus || q.status || 'PENDING',
          avatar: String(q.customerName || 'KH').substring(0, 2).toUpperCase()
        }));
      setQuotationList(mappedQuotes);
    } catch (err) {
      console.error("Lỗi khi tải báo giá:", err);
    } finally {
      setLoadingQuotations(false);
    }
  };

  const fetchAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const userID = currentUser?.userID;

      const data = await salesService.getOrders(userID, null, {});

      const mappedOrders = data.map(order => ({
        ...order,
        id: order.displayID,
        customer: order.customerName,
        phone: order.customerPhone || 'N/A',
        avatar: String(order.customerName || 'KH').substring(0, 2).toUpperCase(),
        date: order.date || 'N/A',
        total: order.totalAmount,
        rawStatus: order.orderStatus,
        status: mapStatus(order.orderStatus)
      }));

      setAllOrders(mappedOrders);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu đơn hàng:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const mapStatus = (status) => {
    switch (status) {
      case 'PENDING': return 'CHỜ XÁC NHẬN';
      case 'CONFIRMED': return 'ĐÃ XÁC NHẬN';
      case 'SHIPPING': return 'ĐANG GIAO';
      case 'DELIVERED': return 'HOÀN THÀNH';
      case 'CANCELLED': return 'ĐÃ HỦY';
      case 'FAILED': return 'GIAO THẤT BẠI';
      default: return status;
    }
  };

  const filteredByTimeOrders = useMemo(() => {
    return allOrders.filter(o => {
      const rawDateStr = o.orderDate || o.date.split('/').reverse().join('-');
      const d = new Date(rawDateStr);
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
  }, [allOrders, timeframe, filterDate, filterWeek, filterYear, selectedDay, filterYearsCount]);

  const dynamicStats = useMemo(() => {
    const currentOrders = filteredByTimeOrders;
    
    let previousOrders = [];
    let comparisonLabel = "";

    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      const prevDayDate = new Date(y, m - 1, selectedDay);
      prevDayDate.setDate(prevDayDate.getDate() - 1);
      
      previousOrders = allOrders.filter(o => {
        const rawDateStr = o.orderDate || o.date.split('/').reverse().join('-');
        const d = new Date(rawDateStr);
        return !isNaN(d.getTime()) && 
               d.getFullYear() === prevDayDate.getFullYear() && 
               (d.getMonth() + 1) === (prevDayDate.getMonth() + 1) && 
               d.getDate() === prevDayDate.getDate();
      });
      comparisonLabel = "So với hôm qua";
    } else if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      let prevY = y, prevW = w - 1;
      if (prevW === 0) { prevY--; prevW = 52; }

      previousOrders = allOrders.filter(o => {
        const rawDateStr = o.orderDate || o.date.split('/').reverse().join('-');
        const d = new Date(rawDateStr);
        const getWeek = (date) => {
          const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          const dayNum = d.getUTCDay() || 7;
          d.setUTCDate(d.getUTCDate() + 4 - dayNum);
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
          return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
        };
        return !isNaN(d.getTime()) && d.getFullYear() === prevY && getWeek(d) === prevW;
      });
      comparisonLabel = "So với tuần trước";
    } else if (timeframe === 'monthly') {
      previousOrders = allOrders.filter(o => {
        const rawDateStr = o.orderDate || o.date.split('/').reverse().join('-');
        const d = new Date(rawDateStr);
        return !isNaN(d.getTime()) && d.getFullYear() === (filterYear - 1);
      });
      comparisonLabel = "So với năm trước";
    } else if (timeframe === 'yearly') {
      const currentRangeStart = now.getFullYear() - filterYearsCount;
      const prevRangeStart = currentRangeStart - filterYearsCount;
      previousOrders = allOrders.filter(o => {
        const rawDateStr = o.orderDate || o.date.split('/').reverse().join('-');
        const d = new Date(rawDateStr);
        return !isNaN(d.getTime()) && d.getFullYear() > prevRangeStart && d.getFullYear() <= currentRangeStart;
      });
      comparisonLabel = `So với ${filterYearsCount} năm trước`;
    }

    const calculateStatsForList = (list) => {
      const valid = list.filter(o => o.rawStatus !== 'CANCELLED');
      const revenue = valid.reduce((sum, o) => sum + (Number(o.total) || Number(o.totalAmount) || 0), 0);
      const total = list.length;
      const pending = list.filter(o => o.rawStatus === 'PENDING').length;
      const shipping = list.filter(o => o.rawStatus === 'SHIPPING').length;
      return { total, pending, shipping, revenue };
    };

    const currentPeriod = calculateStatsForList(currentOrders);
    const prevPeriod = calculateStatsForList(previousOrders);

    const calculateGrowth = (curr, prev) => {
      if (prev === 0) return { percent: curr > 0 ? "100" : "0", isUp: curr > 0 };
      const p = ((curr - prev) / prev) * 100;
      return { 
        percent: Math.abs(p).toFixed(1), 
        isUp: p >= 0
      };
    };

    return {
      total: currentPeriod.total,
      pending: currentPeriod.pending,
      shipping: currentPeriod.shipping,
      revenue: currentPeriod.revenue,
      totalGrowth: { ...calculateGrowth(currentPeriod.total, prevPeriod.total), prevValue: prevPeriod.total, label: comparisonLabel },
      pendingGrowth: { ...calculateGrowth(currentPeriod.pending, prevPeriod.pending), prevValue: prevPeriod.pending, label: comparisonLabel },
      shippingGrowth: { ...calculateGrowth(currentPeriod.shipping, prevPeriod.shipping), prevValue: prevPeriod.shipping, label: comparisonLabel },
      revenueGrowth: { ...calculateGrowth(currentPeriod.revenue, prevPeriod.revenue), prevValue: prevPeriod.revenue, label: comparisonLabel }
    };
  }, [allOrders, filteredByTimeOrders, timeframe, filterDate, filterWeek, filterYear, selectedDay, filterYearsCount]);

  const stats = dynamicStats;

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

  // Client-side filtering
  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = filteredByTimeOrders.filter(o => {
      const matchSearch = !q
        || (o.id && o.id.toLowerCase().includes(q))
        || (o.customer && o.customer.toLowerCase().includes(q))
        || (o.phone && o.phone.includes(q));
      
      const matchTab = activeTab === 'Tất cả' || o.status === activeTab || o.rawStatus === activeTab;
      return matchSearch && matchTab;
    });

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (key === 'id') {
          // Sort by display ID number
          valA = extractIdNumber(valA);
          valB = extractIdNumber(valB);
        } else if (key === 'date') {
          // Sort by date value
          const parseDate = (dStr) => {
            if (!dStr || dStr === 'N/A') return 0;
            const parts = dStr.split('/');
            return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
          };
          valA = parseDate(valA);
          valB = parseDate(valB);
        } else if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [filteredByTimeOrders, searchQuery, activeTab, sortConfig]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredOrders.length / ITEMS_PER_PAGE));
  }, [filteredOrders.length, ITEMS_PER_PAGE]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage, ITEMS_PER_PAGE]);

  const getStatusBadge = (status) => {
    const badgeStyle = {
      fontSize: 'clamp(8px, 0.75vw, 10px)',
      padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)'
    };
    switch (status) {
      case 'CHỜ XÁC NHẬN':
        return <span style={badgeStyle} className="bg-orange-50 text-orange-600 font-black rounded-lg border border-orange-100 uppercase tracking-tighter whitespace-nowrap">CHỜ XÁC NHẬN</span>;
      case 'ĐANG GIAO':
        return <span style={badgeStyle} className="bg-blue-50 text-blue-600 font-black rounded-lg border border-blue-100 uppercase tracking-tighter whitespace-nowrap">ĐANG GIAO</span>;
      case 'HOÀN THÀNH':
        return <span style={badgeStyle} className="bg-emerald-50 text-emerald-600 font-black rounded-lg border border-emerald-100 uppercase tracking-tighter whitespace-nowrap">HOÀN THÀNH</span>;
      case 'ĐÃ HỦY':
        return <span style={badgeStyle} className="bg-red-50 text-red-600 font-black rounded-lg border border-red-100 uppercase tracking-tighter whitespace-nowrap">ĐÃ HỦY</span>;
      case 'GIAO THẤT BẠI':
        return <span style={badgeStyle} className="bg-rose-50 text-rose-600 font-black rounded-lg border border-rose-100 uppercase tracking-tighter whitespace-nowrap">GIAO THẤT BẠI</span>;
      default:
        return <span style={badgeStyle} className="bg-slate-50 text-slate-600 font-black rounded-lg border border-slate-100 uppercase tracking-tighter whitespace-nowrap">{status}</span>;
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu đơn hàng...</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 md:px-0 shrink-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý đơn hàng</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Đang quản lý{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in" key={allOrders.length}>
              {allOrders.length} đơn hàng
            </span>
          </p>

          <div className="flex flex-row items-center gap-3 w-full sm:w-auto relative z-30" style={{ gap: 'clamp(6px, 0.7vw, 14px)' }}>
          {/* 1. Bộ lọc Thời gian Dropdown */}
          <div className="relative font-inter flex-1 w-1/2 sm:w-auto sm:flex-none" ref={timeDropdownRef}>
            <button 
              onClick={() => {
                setIsOpenTimeDropdown(!isOpenTimeDropdown);
                setIsOpenActionDropdown(false);
              }}
              className="w-full bg-white border border-slate-300 hover:border-[#00288E] transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E]"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }}>calendar_month</span>
                <span className="font-black text-slate-700 uppercase tracking-widest truncate whitespace-nowrap max-w-[90px] min-[380px]:max-w-[110px] xs:max-w-[150px] sm:max-w-none">
                  <span className="hidden sm:inline">Thời gian: </span>{getTimeframeText()}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenTimeDropdown ? 'rotate-180 text-blue-600' : ''}`} style={{ fontSize: '14px' }}>
                keyboard_arrow_down
              </span>
            </button>

            {isOpenTimeDropdown && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-left sm:origin-top-right">
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
                                      const newDate = new Date(y, m - 1, selectedDay - 1);
                                      setSelectedDay(newDate.getDate());
                                      setFilterDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                                    }} 
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Ngày trước">
                              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                                    className={`transition-all flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>Ngày {selectedDay}/{m}/{y}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showDatePicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                            </button>
                            {showDatePicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[340px] animate-fade-in">
                                {datePickerView === 'days' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn ngày</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase">
                                        Tháng {m}, {y} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="py-1">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, idx) => (
                                        <div key={`empty-${idx}`} className="h-8" />
                                      ))}
                                      {Array.from({ length: getDaysInMonth(y, m) }).map((_, idx) => {
                                        const dayNum = idx + 1;
                                        const isSelected = dayNum === selectedDay;
                                        return (
                                          <button key={dayNum}
                                                  onClick={() => { setSelectedDay(dayNum); setShowDatePicker(false); }}
                                                  className={`h-8 w-8 text-[11px] font-black rounded-lg transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            {dayNum}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : datePickerView === 'months' ? (
                                  <div className="space-y-3 animate-fade-in">
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
                                                  const newM = idx + 1;
                                                  const maxD = getDaysInMonth(dateTempYear, newM);
                                                  if (selectedDay > maxD) setSelectedDay(maxD);
                                                  setFilterDate(`${dateTempYear}-${String(newM).padStart(2, '0')}`);
                                                  setDatePickerView('days');
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
                                      const newDate = new Date(y, m - 1, selectedDay + 1);
                                      setSelectedDay(newDate.getDate());
                                      setFilterDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                                    }} 
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-all"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Ngày tiếp theo">
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
          
          {/* 2. Thao tác Dropdown */}
          <div className="relative font-inter flex-1 w-1/2 sm:w-auto sm:flex-none" ref={actionDropdownRef}>
            <button 
              onClick={() => {
                setIsOpenActionDropdown(!isOpenActionDropdown);
                setIsOpenTimeDropdown(false);
              }}
              className="group flex items-center justify-center w-full bg-[#00288E] hover:bg-[#002075] text-white rounded-xl font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-900/10 border border-[#00288E] active:scale-95 whitespace-nowrap cursor-pointer px-4 py-3"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
                gap: 'clamp(6px, 0.6vw, 10px)'
              }}
            >
              <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500 text-white" style={{ fontSize: 'clamp(14px, 1.2vw, 18px)' }}>bolt</span>
              <span>THAO TÁC</span>
              <span className={`material-symbols-outlined text-blue-200 transition-transform duration-300 ${isOpenActionDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '14px' }}>keyboard_arrow_down</span>
            </button>
            
            {isOpenActionDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-fade-in origin-top-right">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN THAO TÁC</span>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/sales/orders/add');
                      setIsOpenActionDropdown(false);
                    }}
                    className="w-full px-3.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-base">shopping_cart_checkout</span>
                    <span>TẠO ĐƠN HÀNG MỚI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenQuotationSelector();
                      setIsOpenActionDropdown(false);
                    }}
                    className="w-full px-3.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-left transition-all hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-base">sync_alt</span>
                    <span>CHUYỂN TỪ BÁO GIÁ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0">
            <StatCard 
              label="DOANH THU ƯỚC TÍNH" 
              value={formatCurrency(stats.revenue, false, true)} 
              rawValue={stats.revenue}
              growth={stats.revenueGrowth}
              type="currency"
              icon="payments" 
              color="emerald" 
              idx={0}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
            <StatCard 
              label="ĐANG GIAO HÀNG" 
              value={stats.shipping} 
              growth={stats.shippingGrowth}
              icon="local_shipping" 
              color="purple" 
              idx={1}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
            <StatCard 
              label="TỔNG ĐƠN HÀNG" 
              value={stats.total} 
              growth={stats.totalGrowth}
              icon="shopping_bag" 
              color="blue" 
              idx={2}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
            <StatCard 
              label="CHỜ XÁC NHẬN" 
              value={stats.pending} 
              growth={stats.pendingGrowth}
              icon="pending_actions" 
              color="orange" 
              idx={3}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
      </div>

      {/* 3. Separated Filter & Search Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-row lg:flex-row gap-2 lg:gap-6 items-center justify-between mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
            <div className="relative flex-1 lg:w-[400px] lg:flex-none group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã đơn, khách hàng..." 
                className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-[#00288E] transition-all text-slate-700 placeholder:text-slate-300"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold">search</span>
            </div>

            {/* Bộ lọc trạng thái kiểu Dropdown cao cấp */}
            <div className="relative w-auto lg:w-72 font-inter">
              <button
                type="button"
                onClick={() => setIsOpenStatusDropdown(!isOpenStatusDropdown)}
                className="w-full bg-slate-50 border-2 border-slate-200 hover:border-[#00288E] transition-all rounded-xl px-3 sm:px-4 py-4 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E]"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }}>filter_alt</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">
                    {activeTab === 'Tất cả' ? 'Tất cả' : activeTab}
                  </span>
                </div>
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenStatusDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
                  keyboard_arrow_down
                </span>
              </button>

              {isOpenStatusDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={() => setIsOpenStatusDropdown(false)}
                  />
                  
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN TRẠNG THÁI</span>
                    </div>

                    <div className="p-4 space-y-2">
                      {tabs.map((tab) => {
                        const isSelected = activeTab === tab;
                        const labelText = tab === 'Tất cả' ? 'Tất cả trạng thái' : tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => {
                              setActiveTab(tab);
                              setIsOpenStatusDropdown(false);
                            }}
                            className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-all flex items-center justify-between active:scale-95 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-black'
                                : 'bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                            }`}
                          >
                            <span>{labelText}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-base">check_circle</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
      </div>

      {/* 4. Table Area Container */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 overflow-hidden mx-2 md:mx-0 flex-1 min-h-0">
            {/* Desktop View (Table) */}
            <div className="hidden xl:block overflow-x-auto overflow-y-auto flex-1 scrollbar-none" style={{ scrollbarGutter: 'stable' }}>
              <table className="w-full table-fixed text-left border-collapse xl:min-w-[1000px] min-w-0">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th 
                      onClick={() => handleSort('id')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 cursor-pointer hover:text-[#00288E] transition-colors group w-[15%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Đơn hàng</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'id' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'id' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('customer')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 cursor-pointer hover:text-[#00288E] transition-colors group w-[28%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Khách hàng</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'customer' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'customer' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('date')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left cursor-pointer hover:text-[#00288E] transition-colors group w-[15%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center justify-start gap-1 w-full">
                        <span>Ngày đặt</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'date' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('total')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left cursor-pointer hover:text-[#00288E] transition-colors group w-[17%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Tổng tiền</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'total' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'total' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[13%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Trạng thái</th>
                    <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[8%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-20 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl text-slate-200">inventory</span>
                          <p className="font-bold text-xs uppercase tracking-widest italic opacity-50">Không tìm thấy đơn hàng nào phù hợp</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedOrders.map((order, index) => (
                    <tr 
                      key={index} 
                      onClick={() => handleViewOrder(order)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết đơn hàng ${order.id}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleViewOrder(order);
                        }
                      }}
                      className="group hover:bg-slate-50/50 transition-colors cursor-pointer focus-visible:bg-slate-100 focus-visible:outline-none"
                    >
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-black text-[#00288E] tracking-tight group-hover:underline underline-offset-4"
                              style={{ fontSize: 'clamp(10px, 0.95vw, 13px)' }}>{order.id}</span>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center gap-4">
                          <div className="rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform"
                               style={{ width: 'clamp(32px, 2.5vw, 44px)', height: 'clamp(32px, 2.5vw, 44px)', fontSize: 'clamp(10px, 0.9vw, 14px)' }}>
                            {order.avatar}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 uppercase tracking-tight max-w-[40ch] lg:max-w-none break-words whitespace-normal"
                                 style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{order.customer}</div>
                            <div className="font-bold text-slate-400 uppercase tracking-widest"
                                 style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>{order.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center justify-start">
                          <span className="font-bold text-slate-600 uppercase tracking-tighter"
                                style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>{order.date}</span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center justify-start tabular-nums" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                          {formatCurrency(order.total, true)}
                        </div>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center justify-center gap-1 sm:gap-2 transition-opacity">
                          <ActionButton 
                            icon="visibility" 
                            color="text-slate-600 hover:bg-slate-100" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewOrder(order);
                            }} 
                            title="Chi tiết"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet View (Cards) */}
            <div className="block xl:hidden overflow-auto flex-1 p-4 bg-slate-50/50 scrollbar-none">
              
              {/* Thanh sắp xếp thông minh khi ở chế độ card */}
              <div className="flex items-center mb-4 bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 gap-2">
                <div className="flex items-center shrink-0 text-slate-400 pl-1">
                  <span className="material-symbols-outlined text-base">swap_vert</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {[
                    { key: 'id', label: 'Mã ĐH' },
                    { key: 'customer', label: 'Tên' },
                    { key: 'total', label: 'Giá trị' },
                    { key: 'date', label: 'N.Tạo' }
                  ].map(item => {
                    const isSelected = sortConfig.key === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleSort(item.key)}
                        className={`py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-0.5 active:scale-95 whitespace-nowrap ${
                          isSelected 
                            ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/10' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.label}
                        {isSelected && (
                          <span className="material-symbols-outlined text-[11px] font-bold">
                            {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {paginatedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span className="material-symbols-outlined text-4xl text-slate-200">inventory</span>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Không tìm thấy đơn hàng nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedOrders.map((order, index) => (
                    <div 
                      key={index}
                      onClick={() => handleViewOrder(order)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết đơn hàng ${order.id}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleViewOrder(order);
                        }
                      }}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#00288E] hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-98 flex flex-col justify-between h-full group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase tracking-tighter text-xs shadow-sm shrink-0 border border-slate-100 group-hover:scale-105 transition-transform overflow-hidden">
                          {order.avatar}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 uppercase tracking-tight text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-[#00288E] transition-colors">
                            {order.customer}
                          </div>
                          <div className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mt-1">
                            Mã đơn: {order.id}
                          </div>
                          {order.phone && (
                            <div className="font-bold text-slate-400 text-[9px] mt-0.5">
                              SĐT: {order.phone}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-4 mt-auto flex flex-col gap-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Ngày đặt</span>
                          <span className="font-bold text-slate-600">{order.date}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tổng tiền</span>
                          <span className="font-black text-slate-900">{formatCurrency(order.total, true)}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái</span>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-slate-50/50">
              <span>
                Trang {currentPage} / {totalPages}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all uppercase tracking-widest text-[9px]"
                  >
                    Trước
                  </button>
                  <span className="px-2 py-1.5 text-slate-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all uppercase tracking-widest text-[9px]"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </div>

      <OrderDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        order={selectedOrder}
        onRefresh={(msg) => {
          fetchAllData(true);
          if (msg) showToastMsg(msg);
        }}
      />

      <QuotationSelectorDrawer
        open={showQuotationSelector}
        onClose={() => {
          setShowQuotationSelector(false);
          setQuotationSearchQuery('');
        }}
        loading={loadingQuotations}
        quotations={quotationList}
        searchQuery={quotationSearchQuery}
        setSearchQuery={setQuotationSearchQuery}
        onSelect={(q) => {
          navigate('/sales/orders/add', { state: { quotation: q } });
          setShowQuotationSelector(false);
          setQuotationSearchQuery('');
        }}
      />

      {/* Toast Alert */}
      <SalesToastNotification toast={toast} />
    </div>
  );
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

const GrowthBadge = ({ growth, type = 'number', currentValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
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
          if (setActiveTooltipIdx) {
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }
      }}
    >
      <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
        <span className="material-symbols-outlined text-[14px] leading-none">{isUp ? 'trending_up' : 'trending_down'}</span>
        <span>{isUp ? '+' : '-'}{percent}%</span>
      </div>
      
      {/* Tooltip */}
      <div className={`absolute hidden group-hover:block z-[9999] w-48 animate-fade-in ${tooltipPositionClass} ${isActive ? '!block' : ''}`}>
        <div className="bg-white/95 backdrop-blur-xl text-slate-900 text-[10px] p-3 rounded-xl shadow-2xl border border-slate-300">
          <p className="font-black opacity-50 mb-2 uppercase tracking-[0.1em] text-[9px] border-b border-slate-100 pb-1.5">{label || 'So với kỳ trước'}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ trước:</span>
              <span className="font-black text-slate-700 text-[9px]">
                {type === 'currency' ? formatCurrency(prevValue, true) : prevValue}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ này:</span>
              <span className={`font-black text-[9px] ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
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

const StatCard = ({ label, value, growth, type = 'number', icon, color, rawValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div 
      onClick={() => {
        if (setActiveTooltipIdx) {
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Xem chi tiết ${label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (setActiveTooltipIdx) {
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }
      }}
      className="stat-card-container relative bg-white rounded-xl shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-all duration-300 cursor-pointer group p-3 sm:p-4 lg:p-5 lg:rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-500 uppercase tracking-wider leading-tight mb-1 text-[9px] sm:text-[10px] lg:text-[11px]">{label}</p>
          <div className={`font-black text-slate-900 mt-1 break-words whitespace-normal xl:truncate xl:whitespace-nowrap ${getResponsiveValueClass(value, rawValue)}`}>
            {value}
          </div>
          <GrowthBadge 
            growth={growth} 
            type={type} 
            currentValue={rawValue !== undefined ? rawValue : (typeof value === 'string' ? value.replace(/[^0-9]/g, '') : value)} 
            idx={idx}
            activeTooltipIdx={activeTooltipIdx}
            setActiveTooltipIdx={setActiveTooltipIdx}
          />
        </div>
        <div className={`rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 ${colorMap[color]}`}>
          <span className="material-symbols-outlined text-lg sm:text-xl lg:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

const QuotationSelectorDrawer = ({ open, onClose, loading, quotations, searchQuery, setSearchQuery, onSelect }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());
  const [drawerCalendarView, setDrawerCalendarView] = useState('days'); // 'days' | 'months' | 'years'
  const [drawerYearRangeStart, setDrawerYearRangeStart] = useState(Math.floor(new Date().getFullYear() / 12) * 12);
  
  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  useEffect(() => {
    if (!open) {
      setSelectedDate(null);
      setTempSelectedDate(null);
      setCalendarOpen(false);
      setDrawerCalendarView('days');
    }
  }, [open]);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const matchDate = (itemDateStr) => {
    if (!selectedDate) return true;
    if (!itemDateStr) return false;
    
    let itemDate;
    if (itemDateStr.includes('/')) {
      const [d, m, y] = itemDateStr.split('/').map(Number);
      itemDate = new Date(y, m - 1, d);
    } else {
      itemDate = new Date(itemDateStr);
    }
    
    if (isNaN(itemDate.getTime())) return false;

    if (selectedDate.isMonthOnly) {
      return itemDate.getMonth() === selectedDate.month &&
             itemDate.getFullYear() === selectedDate.year;
    }
    
    return itemDate.getDate() === selectedDate.getDate() &&
           itemDate.getMonth() === selectedDate.getMonth() &&
           itemDate.getFullYear() === selectedDate.getFullYear();
  };

  const filteredQuotations = useMemo(() => {
    return quotations.filter(q => {
      const qId = (q.id || '').toLowerCase();
      const name = (q.name || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      
      const matchesSearch = qId.includes(query) || name.includes(query);
      if (!matchesSearch) return false;
      
      return matchDate(q.createAt || q.date);
    });
  }, [quotations, searchQuery, selectedDate]);

  const renderStatus = (status) => {
    const s = (status || '').toUpperCase();
    const baseStyle = "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border whitespace-nowrap";
    switch (s) {
      case 'APPROVED':
      case 'ĐỒNG Ý':
      case 'ĐÃ DUYỆT':
        return <span className={`${baseStyle} bg-emerald-50 text-emerald-600 border-emerald-200`}>ĐỒNG Ý</span>;
      case 'CANCELLED':
      case 'TỪ CHỐI':
      case 'ĐÃ HỦY':
        return <span className={`${baseStyle} bg-rose-50 text-rose-600 border-rose-200`}>TỪ CHỐI</span>;
      default:
        return <span className={`${baseStyle} bg-amber-50 text-amber-600 border-amber-200`}>CHỜ DUYỆT</span>;
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 460 },
          borderRadius: { xs: 0, sm: '24px 0 0 24px' },
          boxShadow: '-10px 0 40px rgba(0,0,0,0.08)',
          borderLeft: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }
      }}
    >
      {/* Header */}
      <Box className="p-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="space-y-1">
          <Typography className="text-base font-black text-slate-900 uppercase tracking-wide font-inter">
            Chuyển đổi Báo giá
          </Typography>
          <Typography className="text-xs font-bold text-slate-400 font-inter">
            Chọn một báo giá bên dưới để chuyển đổi sang đơn hàng
          </Typography>
        </div>
        <IconButton onClick={onClose} className="hover:bg-slate-100 rounded-xl transition-all">
          <CloseIcon className="text-slate-500" />
        </IconButton>
      </Box>

      {/* Search Filter */}
      <Box className="p-4 bg-white border-b border-slate-200 shrink-0 select-none">
        <div className="flex gap-2 items-center">
          <div className="relative group flex-1">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã báo giá, khách hàng..." 
              className="w-full bg-slate-50 border-2 border-slate-200 text-xs font-bold rounded-xl pl-10 pr-4 py-3 outline-none focus:bg-white focus:border-[#00288E] transition-all text-slate-700 placeholder:text-slate-400 font-inter"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#00288E] transition-colors text-[20px]">search</span>
          </div>

          {/* Custom Date Picker Popover */}
          <Box className="relative shrink-0 font-inter">
            <button 
              onClick={() => {
                if (!calendarOpen) {
                  setTempSelectedDate(selectedDate);
                }
                setCalendarOpen(!calendarOpen);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-3 rounded-xl border transition-all text-[11px] font-black bg-white shadow-sm active:scale-95 whitespace-nowrap ${
                selectedDate || calendarOpen ? 'border-[#00288E] text-[#00288E]' : 'border-slate-300 text-slate-700 hover:border-slate-400'
              }`}
            >
              <span className={`material-symbols-outlined text-base ${selectedDate || calendarOpen ? 'text-[#00288E]' : 'text-slate-400'}`}>
                calendar_today
              </span>
              <span>
                {selectedDate 
                  ? (selectedDate.isMonthOnly 
                      ? `Tháng ${(selectedDate.month + 1).toString().padStart(2, '0')}/${selectedDate.year}`
                      : (selectedDate instanceof Date ? selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chọn ngày lọc'))
                  : "Chọn ngày lọc"}
              </span>
              <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${calendarOpen ? 'rotate-180 text-[#00288E]' : 'text-slate-400'}`}>
                keyboard_arrow_down
              </span>
            </button>

            {calendarOpen && (
              <>
                {/* Lớp phủ click ra ngoài để đóng lịch */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => {
                    setTempSelectedDate(selectedDate);
                    setCalendarOpen(false);
                    setDrawerCalendarView('days');
                  }}
                />
                
                {/* Calendar Popover */}
                <Box className="absolute right-0 mt-2 z-50 bg-white border border-slate-200 shadow-2xl rounded-3xl p-4 w-[285px] animate-fade-in origin-top-right">
                  
                  {/* Header: Chọn Tháng & Năm kết hợp và nút Hôm nay */}
                  <Box className="flex justify-between items-center gap-2 mb-3">
                    {drawerCalendarView === 'days' ? (
                      <>
                        <div className="flex-1 flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-slate-300 shadow-sm h-[32px]">
                          <button 
                            onClick={() => { 
                              let newM = currentCalendarMonth - 1; 
                              let newY = currentCalendarYear; 
                              if (newM < 0) { 
                                newM = 11; 
                                newY--; 
                              } 
                              setCurrentCalendarMonth(newM); 
                              setCurrentCalendarYear(newY); 
                            }} 
                            className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors touch-manipulation" 
                            aria-label="Tháng trước"
                          >
                            <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                          </button>
                          <button 
                            onClick={() => { 
                              setDrawerCalendarView('months'); 
                            }} 
                            className="flex-1 px-1 py-0.5 rounded-lg transition-all flex items-center justify-center gap-1 hover:bg-slate-50"
                          >
                            <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">
                              THÁNG {currentCalendarMonth + 1}, {currentCalendarYear}
                            </span>
                            <span className="material-symbols-outlined text-[12px] text-slate-300 transition-transform">expand_more</span>
                          </button>
                          <button 
                            onClick={() => { 
                              let newM = currentCalendarMonth + 1; 
                              let newY = currentCalendarYear; 
                              if (newM > 11) { 
                                newM = 0; 
                                newY++; 
                              } 
                              setCurrentCalendarMonth(newM); 
                              setCurrentCalendarYear(newY); 
                            }} 
                            className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors touch-manipulation" 
                            aria-label="Tháng sau"
                          >
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            const today = new Date();
                            setTempSelectedDate(today);
                            setCurrentCalendarMonth(today.getMonth());
                            setCurrentCalendarYear(today.getFullYear());
                          }}
                          className="shrink-0 text-[10px] font-black text-[#00288E] hover:bg-blue-50 border border-[#00288E]/20 px-2 py-1 rounded-xl uppercase tracking-wider transition-colors bg-white flex items-center gap-1 h-[32px] shadow-sm"
                        >
                          <span className="material-symbols-outlined text-[12px]">today</span>
                          Hôm nay
                        </button>
                      </>
                    ) : drawerCalendarView === 'months' ? (
                      <div className="flex-1 flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => { setDrawerCalendarView('days'); }} 
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#00288E] transition-colors"
                            aria-label="Quay lại chọn ngày"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                          </button>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn tháng</span>
                        </div>
                        <button 
                          onClick={() => { 
                            setDrawerCalendarView('years'); 
                            setDrawerYearRangeStart(Math.floor(currentCalendarYear / 12) * 12); 
                          }} 
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 text-[10px] font-black text-[#00288E] uppercase transition-colors"
                        >
                          {currentCalendarYear} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => { setDrawerCalendarView('months'); }} 
                            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                          </button>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                        </div>
                        <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                          <button 
                            onClick={() => { setDrawerYearRangeStart(prev => prev - 12); }} 
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[12px]">chevron_left</span>
                          </button>
                          <span className="text-[8px] font-black text-slate-500 px-1">{drawerYearRangeStart} - {drawerYearRangeStart + 11}</span>
                          <button 
                            onClick={() => { setDrawerYearRangeStart(prev => prev + 12); }} 
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </Box>

                  {/* View 1: Grid các Ngày */}
                  {drawerCalendarView === 'days' && (
                    <>
                      {/* Thứ trong tuần */}
                      <div className="grid grid-cols-7 gap-1 text-center mb-1 animate-fade-in">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
                          <span key={idx} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
                        ))}
                      </div>

                      {/* Grid các Ngày */}
                      <div className="grid grid-cols-7 gap-1 animate-fade-in">
                        {/* Thêm ô trống của tháng trước */}
                        {Array.from({ length: getFirstDayOfMonth(currentCalendarMonth, currentCalendarYear) }).map((_, idx) => (
                          <div key={`empty-${idx}`} className="w-8 h-8" />
                        ))}

                        {/* Render các ngày thực tế */}
                        {Array.from({ length: getDaysInMonth(currentCalendarMonth, currentCalendarYear) }).map((_, idx) => {
                          const dayNum = idx + 1;
                          const dateObj = new Date(currentCalendarYear, currentCalendarMonth, dayNum);
                          const isSelected = tempSelectedDate && 
                                             (tempSelectedDate instanceof Date) &&
                                             tempSelectedDate.getDate() === dayNum && 
                                             tempSelectedDate.getMonth() === currentCalendarMonth && 
                                             tempSelectedDate.getFullYear() === currentCalendarYear;
                          const isToday = new Date().toDateString() === dateObj.toDateString();

                          return (
                            <button
                              key={dayNum}
                              onClick={() => {
                                setTempSelectedDate(dateObj);
                              }}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                                isSelected 
                                  ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/20 animate-scale-up' 
                                  : isToday
                                    ? 'bg-blue-50 border border-[#00288E]/30 text-[#00288E] hover:bg-blue-100'
                                    : 'text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {dayNum}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* View 2: Grid Chọn Tháng */}
                  {drawerCalendarView === 'months' && (
                    <div className="grid grid-cols-3 gap-2 py-2 animate-fade-in">
                      {monthNames.map((mName, idx) => {
                        const isMonthSelected = idx === currentCalendarMonth;
                        return (
                          <button 
                            key={mName} 
                            onClick={() => { 
                              setCurrentCalendarMonth(idx); 
                              setDrawerCalendarView('days'); 
                              setTempSelectedDate({ isMonthOnly: true, month: idx, year: currentCalendarYear });
                            }} 
                            className={`text-[10px] font-black py-2.5 rounded-xl transition-all ${
                              isMonthSelected 
                                ? 'bg-[#00288E] text-white shadow-lg shadow-blue-500/30' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {mName}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* View 3: Grid Chọn Năm */}
                  {drawerCalendarView === 'years' && (
                    <div className="grid grid-cols-3 gap-2 py-2 animate-fade-in">
                      {Array.from({ length: 12 }).map((_, i) => { 
                        const yearOpt = drawerYearRangeStart + i; 
                        const isYearSelected = yearOpt === currentCalendarYear;
                        return (
                          <button 
                            key={yearOpt} 
                            onClick={() => { 
                              setCurrentCalendarYear(yearOpt); 
                              setDrawerCalendarView('months'); 
                              setTempSelectedDate({ isMonthOnly: true, month: currentCalendarMonth, year: yearOpt });
                            }} 
                            className={`text-[10px] font-black py-2.5 rounded-xl transition-all ${
                              isYearSelected 
                                ? 'bg-[#00288E] text-white shadow-lg' 
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                          >
                            {yearOpt}
                          </button>
                        ); 
                      })}
                    </div>
                  )}

                  {/* Footer của Lịch: Xóa bộ lọc */}
                  {drawerCalendarView === 'days' && (tempSelectedDate || selectedDate) && (
                    <Box className="flex justify-end items-center mt-4 pt-3 border-t border-slate-100 animate-fade-in">
                      <button
                        onClick={() => {
                          setTempSelectedDate(null);
                          setSelectedDate(null);
                          setCalendarOpen(false);
                          setDrawerCalendarView('days');
                        }}
                        className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors w-full text-center"
                      >
                        Xóa bộ lọc
                      </button>
                    </Box>
                  )}

                  {/* Hủy & Xác nhận button */}
                  <Box className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setTempSelectedDate(selectedDate);
                        setCalendarOpen(false);
                        setDrawerCalendarView('days');
                      }}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={() => {
                        setSelectedDate(tempSelectedDate);
                        setCalendarOpen(false);
                        setDrawerCalendarView('days');
                      }}
                      className="flex-1 py-2 bg-[#00288E] hover:bg-[#00288E]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-900/10"
                    >
                      Xác nhận
                    </button>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        </div>
      </Box>

      {/* Main List Area */}
      <Box className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-[#00288E] rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-inter">Đang nạp báo giá...</p>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-white rounded-2xl border border-slate-300 p-6">
            <span className="material-symbols-outlined text-slate-300 text-[48px]">receipt_long</span>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-800 font-inter">Không tìm thấy báo giá nào</p>
              <p className="text-xs font-medium text-slate-400 max-w-[280px] font-inter">Không có báo giá nào khả dụng hoặc không khớp với từ khóa tìm kiếm của bạn.</p>
            </div>
          </div>
        ) : (
          filteredQuotations.map((q) => (
            <div 
              key={q.quotationID}
              onClick={() => onSelect(q)}
              tabIndex={0}
              role="button"
              aria-label={`Chọn báo giá ${q.id} của khách hàng ${q.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(q);
                }
              }}
              className="bg-white rounded-2xl border border-slate-300 hover:border-[#00288E] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer p-4 flex items-center justify-between group focus-visible:border-[#00288E] focus-visible:outline-none"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm uppercase shrink-0 border border-slate-100">
                  {q.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 tracking-tight font-inter">{q.id}</span>
                    <span className="text-[10px] font-bold text-slate-400 font-inter">{q.date}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 truncate mt-0.5 font-inter">{q.name}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                {formatCurrency(q.value, true)}
                <div className="flex items-center gap-2">
                  {renderStatus(q.status)}
                  <div className="w-6 h-6 rounded-full bg-blue-50 group-hover:bg-[#00288E] flex items-center justify-center transition-all duration-300">
                    <span className="material-symbols-outlined text-[14px] text-blue-600 group-hover:text-white transition-colors">shopping_cart_checkout</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </Box>
    </Drawer>
  );
};

const ActionButton = ({ icon, color, onClick, title }) => (
  <button 
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`rounded-xl flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${color}`}
    style={{ width: 'clamp(28px, 2.5vw, 40px)', height: 'clamp(28px, 2.5vw, 40px)' }}
  >
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }}>{icon}</span>
  </button>
);

export default OrderManagement;
