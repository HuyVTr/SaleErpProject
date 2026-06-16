import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import warehouseService, { formatDate, STATUS_LABELS } from '../../services/warehouseService';
import { VNDDisplay } from '../../../../utils/formatVND';

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const STATUS_CONFIG = {
  all:       { label: 'Tất cả',    icon: 'list' },
  CONFIRMED: { label: 'Chờ giao',  icon: 'schedule' },
  SHIPPING:  { label: 'Đang giao', icon: 'local_shipping' },
  DELIVERED: { label: 'Đã giao',   icon: 'check_circle' },
  FAILED:    { label: 'Thất bại',  icon: 'cancel' },
};

const STATUS_BADGE = {
  CONFIRMED: { className: 'bg-orange-50 text-orange-600 border-orange-100',   label: 'Chờ giao' },
  SHIPPING:  { className: 'bg-blue-50 text-blue-600 border-blue-100',         label: 'Đang giao' },
  DELIVERED: { className: 'bg-emerald-50 text-emerald-600 border-emerald-100', label: 'Đã giao' },
  CANCELLED: { className: 'bg-red-50 text-red-600 border-red-100',            label: 'Đã hủy' },
  FAILED:    { className: 'bg-red-50 text-red-600 border-red-100',            label: 'G.thất bại' },
};

const DeliveryOrders = () => {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenStatusDropdown, setIsOpenStatusDropdown] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Bộ chọn thời gian giống warehouse/dashboard
  const now = new Date();
  const [timeframe, setTimeframe] = useState('monthly');
  const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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

  // Time Dropdown States & Refs
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const timeDropdownRef = React.useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
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
    return 'Toàn thời gian';
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

  const getTimeframeRange = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      const start = new Date(y, m - 1, selectedDay, 0, 0, 0);
      const end = new Date(y, m - 1, selectedDay, 23, 59, 59);
      return { start, end };
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      const d = new Date(y, 0, 1);
      const dayNum = d.getDay();
      const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
      const firstMonday = new Date(d.setDate(diff));
      const start = new Date(firstMonday.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 3600000 + 59 * 60000 + 59000);
      return { start, end };
    }
    if (timeframe === 'monthly') {
      return { start: new Date(filterYear, 0, 1, 0, 0, 0), end: new Date(filterYear, 11, 31, 23, 59, 59) };
    }
    if (timeframe === 'yearly') {
      const yearsCount = filterYearsCount || 5;
      const currentYear = now.getFullYear();
      return { start: new Date(currentYear - yearsCount + 1, 0, 1, 0, 0, 0), end: new Date(currentYear, 11, 31, 23, 59, 59) };
    }
    return { start: new Date(1970, 0, 1), end: new Date(2099, 11, 31) };
  };

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const data = await warehouseService.getDeliveryOrders({});
      setAllOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const { start, end } = getTimeframeRange();
    return allOrders.filter((order) => {
      const matchesSearch = !search ||
        order.displayID.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search);
      const matchesStatus = activeFilter === 'all' || order.orderStatus === activeFilter;
      const orderTime = new Date(order.orderDate || order.date).getTime();
      const matchesTime = orderTime >= start.getTime() && orderTime <= end.getTime();
      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [allOrders, activeFilter, searchTerm, timeframe, filterDate, filterWeek, filterYear, filterYearsCount, selectedDay]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm, sortConfig, timeframe, filterDate, filterWeek, filterYear, filterYearsCount, selectedDay]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedOrders = useMemo(() => {
    if (!sortConfig.key) return filteredOrders;
    const getValue = (order) => {
      switch (sortConfig.key) {
        case 'displayID': return order.displayID;
        case 'customerName': return order.customerName;
        case 'orderDate': return new Date(order.orderDate || order.date).getTime();
        case 'totalAmount': return order.totalAmount;
        case 'itemsCount': return order.items?.length || 0;
        case 'orderStatus': return order.orderStatus;
        default: return null;
      }
    };
    return [...filteredOrders].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredOrders, sortConfig]);

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return 'unfold_more';
    return sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  const totalPages = Math.ceil(sortedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    return sortedOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sortedOrders, currentPage]);

  const statusCounts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const base = !search
      ? allOrders
      : allOrders.filter(o =>
          o.displayID.toLowerCase().includes(search) ||
          o.customerName.toLowerCase().includes(search)
        );
    return {
      all:       base.length,
      CONFIRMED: base.filter(o => o.orderStatus === 'CONFIRMED').length,
      SHIPPING:  base.filter(o => o.orderStatus === 'SHIPPING').length,
      DELIVERED: base.filter(o => o.orderStatus === 'DELIVERED').length,
      FAILED:    base.filter(o => o.orderStatus === 'FAILED').length,
    };
  }, [allOrders, searchTerm]);

  const getStatusBadge = (status) => {
    const s = STATUS_BADGE[status] || { className: 'bg-slate-50 text-slate-600 border-slate-100', label: status };
    return (
      <span
        style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }}
        className={`${s.className} font-black rounded-lg border uppercase tracking-tighter whitespace-nowrap`}
      >
        {s.label}
      </span>
    );
  };

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 min-h-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 shrink-0">
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
          Lệnh giao hàng
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Hệ thống đang theo dõi{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in tabular-nums">
              {filteredOrders.length} đơn giao hàng
            </span>
          </p>
          <div className="w-full sm:w-auto relative font-inter" ref={timeDropdownRef}>
          <button
            onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
            aria-expanded={isOpenTimeDropdown}
            aria-haspopup="true"
            className="w-full sm:w-auto bg-white border border-slate-300 hover:border-[#00288E] transition-colors rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                  <span className="material-symbols-outlined text-[#00288E] text-[18px] font-bold" aria-hidden="true">tune</span>
                  <span className="text-[13px] font-black uppercase tracking-widest text-[#00288E]">CHỌN THỜI GIAN</span>
                </div>
                <button 
                  onClick={() => setIsOpenTimeDropdown(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Đóng"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold" aria-hidden="true">close</span>
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Chế độ lọc */}
                <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl">
                  {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`flex-1 py-2 transition-colors text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${timeframe === tf ? 'bg-white text-[#00288E] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
                                   className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                   style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                   aria-label="Ngày trước">
                             <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                                   className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                               <span>Ngày {selectedDay}/{m}/{y}</span>
                               <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showDatePicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                          </button>
                          {showDatePicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[340px] animate-fade-in">
                              {datePickerView === 'days' ? (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn ngày</span>
                                    <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                      Tháng {m}, {y} <span className="material-symbols-outlined text-[12px]" aria-hidden="true">arrow_forward</span>
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
                                                className={`h-8 w-8 text-[11px] font-black rounded-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSelected ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
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
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                      {dateTempYear} <span className="material-symbols-outlined text-[12px]" aria-hidden="true">arrow_forward</span>
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
                                              className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${(idx + 1) === m && dateTempYear === y ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                              className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                              aria-label="Quay lại chọn tháng">
                                        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                                      </button>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                      <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }}
                                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                              aria-label="Khoảng năm trước">
                                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_left</span>
                                      </button>
                                      <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }}
                                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                              aria-label="Khoảng năm sau">
                                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
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
                                                className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${yearOpt === dateTempYear ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Ngày tiếp theo">
                             <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
                          </button>
                        </div>
                      );
                    })()}

                    {timeframe === 'weekly' && (
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={weekPickerRef}>
                        <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w - 1; let newY = y; if (newW < 1) { newY--; newW = 52; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Tuần trước">
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }} 
                                className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                          <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                          <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                        </button>
                        {showWeekPicker && (
                          <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[340px] animate-fade-in">
                            <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-blue-600">{filterWeek.split('-W')[0]}</span></div>
                            <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                              <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filterWeek === weekStr ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>}</button>); })}</div>
                            </div>
                          </div>
                        )}
                        <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Tuần tiếp theo">
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {timeframe === 'monthly' && (
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                        <button onClick={() => setFilterYear(prev => prev - 1)} 
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Năm trước">
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }} 
                                className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                          <span>Năm {filterYear}</span>
                          <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                        </button>
                        {showYearPicker && (
                          <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                            <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Thập kỷ trước"><span className="material-symbols-outlined text-[12px]" aria-hidden="true">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Thập kỷ sau"><span className="material-symbols-outlined text-[12px]" aria-hidden="true">chevron_right</span></button></div></div>
                            <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filterYear === y ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                          </div>
                        )}
                        <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }} 
                                disabled={filterYear >= now.getFullYear()} 
                                className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Năm tiếp theo">
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {timeframe === 'yearly' && (
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                        <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }} 
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Giảm số năm">
                          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }} 
                                className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                          <span>{filterYearsCount} Năm qua</span>
                          <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                        </button>
                        {showYearsCountPicker && (
                          <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                            <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex justify-between items-center ${filterYearsCount === v ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check</span>}</button>))}</div>
                          </div>
                        )}
                        <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }} 
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Tăng số năm">
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
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

      {/* Filters & Search */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-row lg:flex-row gap-2 lg:gap-6 items-center justify-between hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
        <div className="relative flex-1 lg:w-[400px] lg:flex-none group">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã đơn, khách hàng…"
            className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold" aria-hidden="true">search</span>
        </div>

        {/* Bộ lọc trạng thái kiểu Dropdown */}
        <div className="relative w-auto lg:w-72 font-inter">
          <button
            type="button"
            onClick={() => setIsOpenStatusDropdown(!isOpenStatusDropdown)}
            className="w-full bg-slate-50 border-2 border-slate-200 hover:border-[#00288E] transition-colors rounded-xl px-3 sm:px-4 py-4 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">filter_alt</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">
                {STATUS_CONFIG[activeFilter].label}
              </span>
            </div>
            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenStatusDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
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
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                    const isSelected = activeFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setActiveFilter(key);
                          setIsOpenStatusDropdown(false);
                        }}
                        className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-colors flex items-center justify-between active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-black'
                            : 'bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                        }`}
                      >
                        <span>{config.label} ({statusCounts[key] ?? 0})</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
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

      {/* Table */}
      <div className="wh-card wh-card-table flex-1 flex flex-col overflow-hidden min-h-0">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="wh-skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-200 mb-3" aria-hidden="true">inbox</span>
            <p className="text-sm font-bold text-gray-400">Không tìm thấy đơn hàng nào</p>
            <p className="text-xs text-gray-300 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden xl:block flex-1 overflow-auto scrollbar-none">
              <table className="w-full table-fixed text-left border-collapse min-w-[900px]">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th onClick={() => handleSort('displayID')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('displayID'); } }} tabIndex={0} role="button" aria-label="Sắp xếp theo Mã đơn" className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 w-[15%] cursor-pointer select-none hover:text-slate-600 focus-visible:text-slate-900 focus-visible:outline-none transition-colors" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <span className="inline-flex items-center gap-1">Mã đơn <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('displayID')}</span></span>
                    </th>
                    <th onClick={() => handleSort('customerName')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('customerName'); } }} tabIndex={0} role="button" aria-label="Sắp xếp theo Tên khách hàng" className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 w-[28%] cursor-pointer select-none hover:text-slate-600 focus-visible:text-slate-900 focus-visible:outline-none transition-colors" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <span className="inline-flex items-center gap-1">Khách hàng <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('customerName')}</span></span>
                    </th>
                    <th onClick={() => handleSort('orderDate')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('orderDate'); } }} tabIndex={0} role="button" aria-label="Sắp xếp theo Ngày đặt" className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left w-[14%] cursor-pointer select-none hover:text-slate-600 focus-visible:text-slate-900 focus-visible:outline-none transition-colors" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <span className="inline-flex items-center gap-1">Ngày đặt <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('orderDate')}</span></span>
                    </th>
                    <th onClick={() => handleSort('totalAmount')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('totalAmount'); } }} tabIndex={0} role="button" aria-label="Sắp xếp theo Tổng tiền" className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left w-[15%] cursor-pointer select-none hover:text-slate-600 focus-visible:text-slate-900 focus-visible:outline-none transition-colors" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <span className="inline-flex items-center gap-1">Tổng tiền <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('totalAmount')}</span></span>
                    </th>
                    <th onClick={() => handleSort('itemsCount')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('itemsCount'); } }} tabIndex={0} role="button" aria-label="Sắp xếp theo Số sản phẩm" className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[8%] cursor-pointer select-none hover:text-slate-600 focus-visible:text-slate-900 focus-visible:outline-none transition-colors" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <span className="inline-flex items-center justify-center gap-1">Số SP <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('itemsCount')}</span></span>
                    </th>
                    <th onClick={() => handleSort('orderStatus')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('orderStatus'); } }} tabIndex={0} role="button" aria-label="Sắp xếp theo Trạng thái" className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[12%] cursor-pointer select-none hover:text-slate-600 focus-visible:text-slate-900 focus-visible:outline-none transition-colors" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <span className="inline-flex items-center justify-center gap-1">Trạng thái <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('orderStatus')}</span></span>
                    </th>
                    <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[8%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedOrders.map((order) => (
                    <tr
                      key={order.orderID}
                      onClick={() => navigate(`/warehouse/delivery/${order.orderID}`)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết đơn hàng ${order.displayID}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/warehouse/delivery/${order.orderID}`);
                        }
                      }}
                      className="group hover:bg-slate-50/50 transition-colors cursor-pointer focus-visible:bg-slate-100 focus-visible:outline-none"
                    >
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider tabular-nums">
                          {order.displayID}
                        </span>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <p className="font-black text-slate-900 uppercase tracking-tight" style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{order.customerName}</p>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-bold text-slate-600 uppercase tracking-tighter whitespace-nowrap tabular-nums" style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                          {formatDate(order.orderDate || order.date)}
                        </span>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                          <VNDDisplay value={order.totalAmount} />
                        </span>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-bold text-slate-600 tabular-nums" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                          {order.items?.length || 0} SP
                        </span>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        {getStatusBadge(order.orderStatus)}
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center justify-center">
                          <Link
                            to={`/warehouse/delivery/${order.orderID}`}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Chi tiết"
                          >
                            <span className="material-symbols-outlined text-base" aria-hidden="true">visibility</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile & iPad Card View */}
            <div className="xl:hidden overflow-y-auto flex-1 p-4 bg-slate-50/50 scrollbar-none flex flex-col">
              {/* Thanh sắp xếp thông minh khi ở chế độ card */}
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sắp xếp theo</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: 'displayID', label: 'Mã đơn' },
                    { key: 'customerName', label: 'Khách' },
                    { key: 'orderDate', label: 'Ngày đặt' },
                    { key: 'totalAmount', label: 'Tổng tiền' }
                  ].map(item => {
                    const isSelected = sortConfig.key === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleSort(item.key)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          isSelected 
                            ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/10' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.label}
                        {isSelected && (
                          <span className="material-symbols-outlined text-[11px] font-bold" aria-hidden="true">
                            {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedOrders.map((order) => (
                  <Link
                    key={order.orderID}
                    to={`/warehouse/delivery/${order.orderID}`}
                    className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-500 shadow-sm transition-[border-color,box-shadow] duration-300 flex flex-col gap-3 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {/* Row 1: displayID + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider whitespace-nowrap tabular-nums">
                        {order.displayID}
                      </span>
                      {getStatusBadge(order.orderStatus)}
                    </div>
                    {/* Row 2: Customer Name */}
                    <p className="font-black text-slate-900 text-xs leading-relaxed truncate">{order.customerName}</p>
                    {/* Row 3: Items Count + Order Date + Total Amount */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-auto">
                      <div className="space-y-1">
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Thông tin đơn</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                          <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '12px' }} aria-hidden="true">calendar_month</span>
                          <span className="tabular-nums">{formatDate(order.orderDate || order.date)}</span>
                          <span className="text-slate-300" aria-hidden="true">•</span>
                          <span className="tabular-nums">{order.items?.length || 0} SP</span>
                        </div>
                      </div>
                      <div className="text-right bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100/50">
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tổng tiền</p>
                        <div className="text-xs font-black text-slate-900 tabular-nums">
                          <VNDDisplay value={order.totalAmount} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-slate-50/50">
              <span className="tabular-nums">
                Hiển thị {filteredOrders.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} / {filteredOrders.length} đơn hàng
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors uppercase tracking-widest text-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        currentPage === p
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                          : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span className="tabular-nums">{p}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors uppercase tracking-widest text-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryOrders;
