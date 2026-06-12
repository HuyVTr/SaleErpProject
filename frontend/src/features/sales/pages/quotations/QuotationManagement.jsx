import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import salesService from '../../services/salesService';
import QuotationDetailDrawer from '../../components/Drawers/QuotationDetailDrawer';
import { useSalesToast } from '../../components/Notification/useSalesToast';
import SalesToastNotification from '../../components/Notification/SalesToastNotification';

const formatCurrency = (val, isSmall = false, isStat = false) => {
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
      <span className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="font-black text-inherit">{formatted}</span>
        <span className="font-black text-inherit uppercase tracking-tight">VND</span>
      </span>
    );
  }

  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className={isSmall ? "font-bold text-slate-800" : "font-black text-slate-800"}>{formatted}</span>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">VND</span>
    </span>
  );
};

const extractIdNumber = (idVal) => {
  if (typeof idVal === 'number' ? true : false) return idVal;
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

const QuotationManagement = () => {
  const { toast, showToast } = useSalesToast();
  const navigate = useNavigate();
  const location = useLocation();
  const showToastMsg = (message, type = 'success') => {
    showToast(message, type);
  };

  useEffect(() => {
    if (location.state?.showCreateSuccessToast) {
      showToastMsg("Tạo báo giá thành công!");
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  
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

  const yearPickerRef = useRef(null);
  const weekPickerRef = useRef(null);
  const yearsCountPickerRef = useRef(null);
  const datePickerRef = useRef(null);

  // Time Dropdown States & Refs
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const timeDropdownRef = useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const [activeTab, setActiveTab] = useState('ALL');
  const [isOpenStatusDropdown, setIsOpenStatusDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);

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

  const fetchData = React.useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const userID = currentUser?.userID;

      const data = await salesService.getQuotations(userID);
      
      const mappedQuotes = data.map(q => ({
        ...q,
        id: q.displayID,
        name: q.customerName,
        email: q.customerEmail || 'N/A',
        group: q.customerGroup || 'STANDARD',
        date: q.date,
        value: q.totalAmount || 0,
        status: q.status || q.quotationStatus,
        avatar: q.customerName.substring(0, 2).toUpperCase()
      }));

      setQuotations(mappedQuotes);
    } catch (err) {
      console.error("Lỗi khi tải báo giá:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mapStatus = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'APPROVED':
      case 'ĐỒNG Ý':
      case 'ĐÃ DUYỆT':
        return { label: 'Đồng ý', color: 'bg-emerald-50 text-emerald-600 border-emerald-100 border' };
      case 'CANCELLED':
      case 'TỪ CHỐI':
      case 'ĐÃ HỦY':
        return { label: 'Từ chối', color: 'bg-red-50 text-red-600 border-red-100 border' };
      default:
        return { label: 'Chờ duyệt', color: 'bg-amber-50 text-amber-600 border-amber-100 border' };
    }
  };

  const handleRowClick = (qt) => {
    setSelectedQuotation(qt);
    setIsDrawerOpen(true);
  };

  const filteredByTimeQuotations = useMemo(() => {
    return quotations.filter(q => {
      const rawDateStr = q.createAt || q.date.split('/').reverse().join('-');
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
  }, [quotations, timeframe, filterDate, filterWeek, filterYear, selectedDay, filterYearsCount]);

  const dynamicStats = useMemo(() => {
    const currentQuotes = filteredByTimeQuotations;
    
    let previousQuotes = [];
    let comparisonLabel = "";

    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      const prevDayDate = new Date(y, m - 1, selectedDay);
      prevDayDate.setDate(prevDayDate.getDate() - 1);
      
      previousQuotes = quotations.filter(q => {
        const rawDateStr = q.createAt || q.date.split('/').reverse().join('-');
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

      previousQuotes = quotations.filter(q => {
        const rawDateStr = q.createAt || q.date.split('/').reverse().join('-');
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
      previousQuotes = quotations.filter(q => {
        const rawDateStr = q.createAt || q.date.split('/').reverse().join('-');
        const d = new Date(rawDateStr);
        return !isNaN(d.getTime()) && d.getFullYear() === (filterYear - 1);
      });
      comparisonLabel = "So với năm trước";
    } else if (timeframe === 'yearly') {
      const currentRangeStart = now.getFullYear() - filterYearsCount;
      const prevRangeStart = currentRangeStart - filterYearsCount;
      previousQuotes = quotations.filter(q => {
        const rawDateStr = q.createAt || q.date.split('/').reverse().join('-');
        const d = new Date(rawDateStr);
        return !isNaN(d.getTime()) && d.getFullYear() > prevRangeStart && d.getFullYear() <= currentRangeStart;
      });
      comparisonLabel = `So với ${filterYearsCount} năm trước`;
    }

    const calculateStatsForList = (list) => {
      const valid = list.filter(q => q.status !== 'CANCELLED');
      const value = valid.reduce((sum, q) => sum + (q.value || 0), 0);
      const pending = list.filter(q => q.status === 'PENDING' || q.status === 'SENT').length;
      
      const approvedCount = list.filter(q => q.status === 'APPROVED').length;
      const totalCountForRate = list.filter(q => q.status !== 'DRAFT').length;
      const closeRate = totalCountForRate > 0 ? (approvedCount / totalCountForRate * 100) : 0;

      return { value, pending, closeRate };
    };

    const currentPeriod = calculateStatsForList(currentQuotes);
    const prevPeriod = calculateStatsForList(previousQuotes);

    const calculateGrowth = (curr, prev) => {
      if (prev === 0) return { percent: curr > 0 ? "100" : "0", isUp: curr > 0 };
      const p = ((curr - prev) / prev) * 100;
      return { 
        percent: Math.abs(p).toFixed(1), 
        isUp: p >= 0
      };
    };

    return {
      value: currentPeriod.value,
      pending: currentPeriod.pending,
      closeRate: currentPeriod.closeRate.toFixed(1) + '%',
      rawCloseRate: currentPeriod.closeRate,
      valueGrowth: { ...calculateGrowth(currentPeriod.value, prevPeriod.value), prevValue: prevPeriod.value, label: comparisonLabel },
      pendingGrowth: { ...calculateGrowth(currentPeriod.pending, prevPeriod.pending), prevValue: prevPeriod.pending, label: comparisonLabel },
      closeRateGrowth: { ...calculateGrowth(currentPeriod.closeRate, prevPeriod.closeRate), prevValue: prevPeriod.closeRate.toFixed(1), label: comparisonLabel }
    };
  }, [quotations, filteredByTimeQuotations, timeframe, filterDate, filterWeek, filterYear, selectedDay, filterYearsCount]);

  const stats = [
    { 
      label: 'Tổng giá trị báo giá', 
      value: formatCurrency(dynamicStats.value, false, true), 
      rawValue: dynamicStats.value,
      color: 'emerald', 
      icon: 'payments', 
      type: 'currency',
      growth: dynamicStats.valueGrowth
    },
    { 
      label: 'Tỷ lệ chốt đơn', 
      value: dynamicStats.closeRate, 
      rawValue: dynamicStats.rawCloseRate,
      color: 'purple', 
      icon: 'auto_graph', 
      type: 'percent',
      growth: dynamicStats.closeRateGrowth
    },
    { 
      label: 'Đang chờ phản hồi', 
      value: dynamicStats.pending, 
      color: 'orange', 
      icon: 'pending_actions', 
      type: 'number',
      growth: dynamicStats.pendingGrowth
    },
  ];

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
    return '';
  };

  const filteredQuotations = useMemo(() => {
    const result = filteredByTimeQuotations.filter(qt => {
      const matchesSearch = qt.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            qt.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const s = (qt.status || '').toUpperCase();
      let matchesTab = activeTab === 'ALL';
      if (activeTab === 'PENDING') {
        matchesTab = s === 'PENDING' || s === 'SENT' || s === 'DRAFT' || s === 'CHỜ DUYỆT' || s === 'ĐÃ GỬI' || s === 'BẢN NHÁP' || s === '';
      } else if (activeTab === 'APPROVED') {
        matchesTab = s === 'APPROVED' || s === 'ĐỒNG Ý' || s === 'ĐÃ DUYỆT';
      } else if (activeTab === 'CANCELLED') {
        matchesTab = s === 'CANCELLED' || s === 'TỪ CHỐI' || s === 'ĐÃ HỦY';
      }
      
      return matchesSearch && matchesTab;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'id') {
          const idA = extractIdNumber(a.id);
          const idB = extractIdNumber(b.id);
          return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
        }
        if (sortConfig.key === 'name') {
          const comp = a.name.localeCompare(b.name, 'vi');
          return sortConfig.direction === 'asc' ? comp : -comp;
        }
        if (sortConfig.key === 'date') {
          const datePartsA = a.date.split('/');
          const datePartsB = b.date.split('/');
          const dateA = new Date(`${datePartsA[2]}-${datePartsA[1]}-${datePartsA[0]}`);
          const dateB = new Date(`${datePartsB[2]}-${datePartsB[1]}-${datePartsB[0]}`);
          return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (sortConfig.key === 'value') {
          const valA = Number(a.value) || 0;
          const valB = Number(b.value) || 0;
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return result;
  }, [filteredByTimeQuotations, searchQuery, activeTab, sortConfig]);

  const totalPages = Math.ceil(filteredQuotations.length / ITEMS_PER_PAGE);
  const paginatedQuotations = useMemo(() => {
    return filteredQuotations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredQuotations, currentPage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu báo giá…</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 md:px-0 shrink-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight text-balance">Quản lý báo giá</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Đang quản lý{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in" key={filteredQuotations.length}>
              {filteredQuotations.length} bản ghi
            </span>
          </p>

          <div className="flex flex-row items-center gap-3 w-full sm:w-auto relative z-30" style={{ gap: 'clamp(6px, 0.7vw, 14px)' }}>
          {/* 1. Bộ lọc Thời gian Dropdown */}
          <div className="relative font-inter flex-1 w-1/2 sm:w-auto sm:flex-none" ref={timeDropdownRef}>
            <button 
              onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
              aria-label="Chọn thời gian lọc báo giá"
              className="w-full bg-white border border-slate-300 hover:border-[#00288E] transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00288E]"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" aria-hidden="true" style={{ fontSize: '18px' }}>calendar_month</span>
                <span className="font-black text-slate-700 uppercase tracking-widest truncate whitespace-nowrap max-w-[90px] min-[380px]:max-w-[110px] xs:max-w-[150px] sm:max-w-none">
                  <span className="hidden sm:inline">Thời gian: </span>{getTimeframeText()}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenTimeDropdown ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true" style={{ fontSize: '14px' }}>
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
                              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
          
          <button 
            onClick={() => navigate('/sales/quotations/add')}
            aria-label="Tạo báo giá mới"
            className="group flex-1 w-1/2 sm:w-auto sm:flex-none flex items-center justify-center bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] rounded-xl font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-900/10 border border-[#00288E] active:scale-95 whitespace-nowrap px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
            style={{
              fontSize: 'clamp(9px, 0.75vw, 11px)',
              gap: 'clamp(6px, 0.6vw, 10px)'
            }}
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-500" aria-hidden="true" style={{ fontSize: 'clamp(14px, 1.2vw, 18px)' }}>add_circle</span>
            Tạo báo giá mới
          </button>
        </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 px-2 md:px-0">
            {stats.map((stat, idx) => (
              <StatCard 
                key={idx}
                label={stat.label}
                value={stat.value}
                rawValue={stat.rawValue}
                growth={stat.growth}
                type={stat.type}
                icon={stat.icon}
                color={stat.color}
                idx={idx}
                activeTooltipIdx={activeTooltipIdx}
                setActiveTooltipIdx={setActiveTooltipIdx}
              />
            ))}
      </div>

      {/* Filtering & Search Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-row lg:flex-row gap-2 lg:gap-6 items-center justify-between mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
            <div className="relative flex-1 lg:w-[400px] lg:flex-none group">
              <input 
                type="text" 
                name="search-quotations"
                aria-label="Tìm kiếm mã báo giá hoặc khách hàng"
                placeholder="Tìm mã báo giá, khách hàng (ví dụ: BQ-001, Hizo)…" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-[#00288E] transition-all text-slate-700 placeholder:text-slate-300"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold" aria-hidden="true">search</span>
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
                    {activeTab === 'ALL' ? 'Tất cả' : mapStatus(activeTab).label}
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
                      {['ALL', 'PENDING', 'APPROVED', 'CANCELLED'].map((tab) => {
                        const isSelected = activeTab === tab;
                        const labelText = tab === 'ALL' ? 'Tất cả trạng thái' : mapStatus(tab).label;
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

      {/* Table Area */}
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
                        <span>Mã báo giá</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'id' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'id' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('name')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 cursor-pointer hover:text-[#00288E] transition-colors group w-[28%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Khách hàng</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'name' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('date')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left cursor-pointer hover:text-[#00288E] transition-colors group w-[15%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center justify-start gap-1 w-full">
                        <span>Ngày lập</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'date' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'date' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('value')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left cursor-pointer hover:text-[#00288E] transition-colors group w-[17%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Giá trị dự kiến</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'value' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'value' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Trạng thái</th>
                    <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[8%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedQuotations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-20 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl text-slate-200">payments</span>
                          <p className="font-bold text-xs uppercase tracking-widest italic opacity-50">Không tìm thấy báo giá nào phù hợp</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedQuotations.map((qt) => {
                    const statusInfo = mapStatus(qt.status);
                    return (
                      <tr 
                        key={qt.id} 
                        onClick={() => handleRowClick(qt)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Xem chi tiết báo giá ${qt.id}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(qt);
                          }
                        }}
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer focus-visible:bg-slate-100 focus-visible:outline-none"
                      >
                        <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <span className="font-black text-[#00288E] tracking-tight group-hover:underline underline-offset-4"
                                style={{ fontSize: 'clamp(10px, 0.95vw, 13px)' }}>{qt.id || qt.quotationID}</span>
                        </td>
                        <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <div className="flex items-center gap-4">
                            <div className="rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black group-hover:scale-110 transition-transform"
                                 style={{ width: 'clamp(32px, 2.5vw, 44px)', height: 'clamp(32px, 2.5vw, 44px)', fontSize: 'clamp(10px, 0.9vw, 14px)' }}>
                              {qt.avatar}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 uppercase tracking-tight max-w-[40ch] lg:max-w-none break-words whitespace-normal"
                                 style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{qt.name}</p>
                              <p className="font-bold text-slate-400 uppercase tracking-widest truncate"
                                 style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>{qt.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <div className="flex items-center justify-start">
                            <span className="font-bold text-slate-600 uppercase tracking-tighter"
                                  style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>{qt.date}</span>
                          </div>
                        </td>
                        <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <div className="flex items-center justify-start tabular-nums" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                            {formatCurrency(qt.value, true)}
                          </div>
                        </td>
                        <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <span className={`inline-block rounded-xl font-black uppercase tracking-widest border ${statusInfo.color}`}
                                style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <div className="flex items-center justify-center gap-1 sm:gap-2 transition-opacity">
                            <ActionButton 
                              icon="visibility" 
                              color="text-slate-600 hover:bg-slate-100" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(qt);
                              }} 
                              title="Chi tiết"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet View (Cards) */}
            <div className="block xl:hidden overflow-auto flex-1 p-4 bg-slate-50/50 scrollbar-none">
              
              <div className="flex items-center mb-4 bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-sm shrink-0 gap-2">
                <div className="flex items-center shrink-0 text-slate-400 pl-1">
                  <span className="material-symbols-outlined text-base">swap_vert</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {[
                    { key: 'id', label: 'Mã BQ' },
                    { key: 'name', label: 'K.Hàng' },
                    { key: 'value', label: 'Giá trị' },
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

              {paginatedQuotations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span className="material-symbols-outlined text-4xl text-slate-200">payments</span>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Không tìm thấy báo giá nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedQuotations.map((qt, index) => {
                    const statusInfo = mapStatus(qt.status);
                    return (
                      <div 
                        key={index}
                        onClick={() => handleRowClick(qt)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Xem chi tiết báo giá ${qt.id || qt.quotationID}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleRowClick(qt);
                          }
                        }}
                        className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#00288E] hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-98 flex flex-col justify-between h-full group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase tracking-tighter text-xs shadow-sm shrink-0 border border-slate-100 group-hover:scale-105 transition-transform overflow-hidden">
                            {qt.avatar}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-black text-slate-900 uppercase tracking-tight text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-[#00288E] transition-colors">
                              {qt.name}
                            </div>
                            <div className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mt-1">
                              Mã: {qt.id || qt.quotationID}
                            </div>
                            {qt.email && (
                              <div className="font-bold text-slate-400 text-[9px] mt-0.5 max-w-[25ch] truncate">
                                {qt.email}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 mt-auto flex flex-col gap-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Ngày lập</span>
                            <span className="font-bold text-slate-600">{qt.date}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Giá trị dự kiến</span>
                            <span className="font-black text-slate-900">{formatCurrency(qt.value, true)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái</span>
                            <span className={`inline-block rounded-xl font-black uppercase tracking-widest border ${statusInfo.color}`}
                                  style={{ fontSize: '8px', padding: '3px 8px' }}>
                              {statusInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Pagination / Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-slate-50/50">
              <span>
                Hiển thị {filteredQuotations.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuotations.length)} / {filteredQuotations.length} báo giá
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button 
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        currentPage === p 
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                          : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
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

      {/* Detail Drawer */}
      <QuotationDetailDrawer 
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        quotation={selectedQuotation} 
        onRefresh={(msg) => {
          fetchData(true);
          if (msg) showToastMsg(msg);
        }}
      />

      {/* Toast Alert */}
      <SalesToastNotification toast={toast} />
    </div>
  );
};

const getTooltipClasses = (idx) => {
  const leftAlign = "left-full top-0 ml-2.5 origin-top-left";
  const rightAlign = "right-full top-0 mr-2.5 origin-top-right";

  if (idx === 0) {
    return leftAlign;
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

  const formatValue = (val) => {
    if (type === 'currency') return formatCurrency(val, true);
    if (type === 'percent') {
      const num = Number(val);
      return !isNaN(num) ? `${num.toFixed(1)}%` : `${val}%`;
    }
    return val;
  };

  return (
    <div className="w-max group relative flex items-center gap-1 mt-1 cursor-help">
      <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 tabular-nums ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">{isUp ? 'trending_up' : 'trending_down'}</span>
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
                {formatValue(prevValue)}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ này:</span>
              <span className={`font-black text-[9px] ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatValue(currentValue)}
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
      aria-label={`Xem chi tiết chỉ số ${label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (setActiveTooltipIdx) {
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }
      }}
      className="stat-card-container relative bg-white rounded-xl shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-all duration-300 cursor-pointer group p-3 sm:p-4 lg:p-5 lg:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
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

const ActionButton = ({ icon, color, onClick, title }) => (
  <button 
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`rounded-xl flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${color}`}
    style={{ width: 'clamp(28px, 2.5vw, 40px)', height: 'clamp(28px, 2.5vw, 40px)' }}
  >
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }}>{icon}</span>
  </button>
);

export default QuotationManagement;
