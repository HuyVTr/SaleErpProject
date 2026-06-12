import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import warehouseService, { formatCurrency } from '../../services/warehouseService';
import { WarehouseStatCard } from '../../components/WarehouseStatCard';

const COLORS = { CONFIRMED: '#00288E', SHIPPING: '#0052CC', DELIVERED: '#4C9AFF' };
const STATUS_LABELS = { CONFIRMED: 'Chờ giao', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao' };

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const CustomYAxisTick = ({ x, y, payload, isMobile }) => {
  const name = payload.value || '';
  const maxLength = isMobile ? 11 : 18;
  const words = name.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + ' ' + word).trim().length > maxLength) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  });
  if (currentLine) lines.push(currentLine.trim());

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-5}
        y={-((lines.length - 1) * 5)}
        textAnchor="end"
        fill="#475569"
        style={{ fontSize: isMobile ? '8px' : '10px', fontWeight: 700, fontFamily: 'Inter, sans-serif' }}
      >
        {lines.map((line, idx) => (
          <tspan x={-5} dy={idx === 0 ? 0 : (isMobile ? 9 : 12)} key={idx}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const WarehouseDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bộ chọn thời gian giống sales/dashboard
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await warehouseService.getDashboardStats(timeframe, {
          filterDate,
          filterWeek,
          filterYear,
          selectedDay,
          filterYearsCount
        });
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]" aria-live="polite" aria-label="Đang tải dữ liệu kho">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <p className="mt-4 text-xs font-extrabold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Đang tải dữ liệu kho…</p>
      </div>
    );
  }

  const orderPieData = stats?.orderStats
    ? Object.entries(stats.orderStats)
        .filter(([key]) => key in COLORS)
        .map(([key, value]) => ({ name: STATUS_LABELS[key], value, key }))
    : [];

  const topStockData = stats?.products
    ? [...stats.products].sort((a, b) => b.stockQuantity - a.stockQuantity).slice(0, 6).map(p => {
        return {
          name: p.name || 'Sản phẩm',
          stock: p.stockQuantity,
          value: p.stockQuantity * p.unitPrice,
        };
      })
    : [];

  const productsGrowth = stats?.productsGrowth || { percent: 0, isUp: true, prevValue: 0, label: 'So với kỳ trước' };
  const valueGrowth = stats?.valueGrowth || { percent: 0, isUp: true, prevValue: 0, label: 'So với kỳ trước' };
  const shippingGrowth = stats?.shippingGrowth || { percent: 0, isUp: true, prevValue: 0, label: 'So với kỳ trước' };
  const alertsGrowth = stats?.alertsGrowth || { percent: 0, isUp: true, prevValue: 0, label: 'So với kỳ trước' };
  const alertsVal = (stats?.lowStockProducts?.length || 0) + (stats?.outOfStockProducts?.length || 0);

  const statCards = [
    { title: 'Tổng sản phẩm', value: stats?.totalProducts || 0, icon: 'inventory_2', color: 'emerald', growth: productsGrowth, type: 'number', rawValue: stats?.totalProducts || 0 },
    { title: 'Giá trị tồn kho', value: formatCurrency(stats?.totalStockValue || 0), icon: 'payments', color: 'blue', growth: valueGrowth, type: 'currency', rawValue: stats?.totalStockValue || 0 },
    { title: 'Đang giao hàng', value: stats?.orderStats?.SHIPPING || 0, icon: 'local_shipping', color: 'purple', growth: shippingGrowth, type: 'number', rawValue: stats?.orderStats?.SHIPPING || 0 },
    { title: 'Cảnh báo tồn kho', value: alertsVal, icon: 'warning', color: 'orange', growth: alertsGrowth, type: 'number', rawValue: alertsVal },
  ];

  return (
    <div id="warehouse-dashboard-content" className="font-inter w-full h-full bg-slate-50 animate-fade-in gap-3 sm:gap-4 md:gap-5 pb-6 overflow-y-auto scrollbar-none">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 md:px-0 shrink-0">
        <h1 className="text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight" style={{ fontSize: 'clamp(28px, 6vw, 36px)' }}>Tổng quan Kho hàng</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Phân tích dữ liệu{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2 sm:px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in" key={getTimeframeText()}>
              {getTimeframeText()}
            </span>
          </p>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 relative z-30">
          {/* Bộ lọc Thời gian Dropdown y hệt sales/dashboard */}
          <div className="relative font-inter w-full sm:w-auto" ref={timeDropdownRef}>
            <button 
              onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
              aria-expanded={isOpenTimeDropdown}
              aria-haspopup="listbox"
              aria-label="Chọn thời gian"
              className="w-full sm:w-auto bg-white border border-slate-300 hover:border-[#00288E] transition-[border-color,box-shadow,background-color] rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
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
              <div className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-auto sm:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-right">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00288E] text-[18px] font-bold">tune</span>
                    <span className="text-[13px] font-black uppercase tracking-widest text-[#00288E]">CHỌN THỜI GIAN</span>
                  </div>
                  <button 
                    onClick={() => setIsOpenTimeDropdown(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Đóng bộ lọc thời gian"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold" aria-hidden="true">close</span>
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Chế độ lọc */}
                  <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl" role="tablist" aria-label="Chế độ xem thời gian">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                      <button 
                        key={tf} 
                        role="tab"
                        aria-selected={timeframe === tf}
                        onClick={() => setTimeframe(tf)}
                        className={`flex-1 py-2 transition-[background-color,color,box-shadow] text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${timeframe === tf ? 'bg-white text-[#00288E] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-1"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Ngày trước">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                                    className={`transition-[background-color,color,box-shadow] duration-200 flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-1 ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>Ngày {selectedDay}/{m}/{y}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform duration-200 ${showDatePicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                            </button>
                            {showDatePicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[340px] animate-fade-in">
                                {datePickerView === 'days' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn ngày</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 transition-[background-color] duration-200 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
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
                                                  className={`h-8 w-8 text-[11px] font-black rounded-lg transition-[background-color,color,box-shadow] duration-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSelected ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
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
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 transition-[background-color] duration-200 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
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
                                                className={`text-[11px] font-black py-3 rounded-lg transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${(idx + 1) === m && dateTempYear === y ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                                aria-label="Quay lại chọn tháng"
                                                className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }}
                                                aria-label="Xem năm trước"
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">
                                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_left</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }}
                                                aria-label="Xem năm tiếp theo"
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">
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
                                                  className={`text-[11px] font-black py-3 rounded-lg transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${yearOpt === dateTempYear ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần trước">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }} 
                                  className={`transition-[background-color,color,box-shadow] duration-200 flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform duration-200 ${showWeekPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                          </button>
                          {showWeekPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[340px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-blue-600">{filterWeek.split('-W')[0]}</span></div>
                              <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                                <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filterWeek === weekStr ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>}</button>); })}</div>
                              </div>
                            </div>
                          )}
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần tiếp theo">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'monthly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                          <button onClick={() => setFilterYear(prev => prev - 1)} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm trước">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }} 
                                  className={`transition-[background-color,color,box-shadow] duration-200 flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>Năm {filterYear}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform duration-200 ${showYearPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                          </button>
                          {showYearPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600"><span className="material-symbols-outlined text-[12px]">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600"><span className="material-symbols-outlined text-[12px]">chevron_right</span></button></div></div>
                              <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filterYear === y ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                            </div>
                          )}
                          <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }} 
                                  disabled={filterYear >= now.getFullYear()} 
                                  className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm tiếp theo">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'yearly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Giảm số năm">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }} 
                                  className={`transition-[background-color,color,box-shadow] duration-200 flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterYearsCount} Năm qua</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform duration-200 ${showYearsCountPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                          </button>
                          {showYearsCountPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                              <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-[background-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex justify-between items-center ${filterYearsCount === v ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check</span>}</button>))}</div>
                            </div>
                          )}
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,color,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 wh-stagger mb-5 mt-5">
        {statCards.map((card, i) => (
          <WarehouseStatCard
            key={i}
            idx={i}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            growth={card.growth}
            type={card.type}
            rawValue={card.rawValue}
            activeTooltipIdx={activeTooltipIdx}
            setActiveTooltipIdx={setActiveTooltipIdx}
          />
        ))}
      </div>

      {/* Charts Row — 1 cột mobile/iPad, 2 cột desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

        {/* ── Pie Chart: Trạng thái đơn hàng (col-span 5) ── */}
        <div className="lg:col-span-5 min-w-0">
          <div
            className="h-full flex flex-col group transition-[transform,box-shadow,border-color] duration-300 bg-white"
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '1.5rem',
              boxShadow: '0 0.625rem 0.9375rem -0.1875rem rgb(0 0 0 / 0.08), 0 0.25rem 0.375rem -0.25rem rgb(0 0 0 / 0.08)',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-0.5rem)';
              e.currentTarget.style.boxShadow = '0 1.25rem 1.5625rem -0.3125rem rgb(0 0 0 / 0.1), 0 0.5rem 0.625rem -0.375rem rgb(0 0 0 / 0.1)';
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0.625rem 0.9375rem -0.1875rem rgb(0 0 0 / 0.08), 0 0.25rem 0.375rem -0.25rem rgb(0 0 0 / 0.08)';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            {/* Card Header */}
            <div className="flex items-center gap-3 sm:gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:rotate-12 transition-transform duration-500">
                <span className="material-symbols-outlined text-xl sm:text-2xl font-black" aria-hidden="true">donut_large</span>
              </div>
              <div>
                <h2
                  className="font-black text-slate-900 uppercase tracking-wider leading-tight"
                  style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}
                >
                  Trạng thái đơn hàng
                </h2>
                <p
                  className="font-bold text-slate-500 uppercase"
                  style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
                >
                  Phân bổ theo tiến trình giao hàng
                </p>
              </div>
            </div>

            {/* Pie Chart */}
            {orderPieData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-12">
                <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Không có dữ liệu</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-w-0">
                <div className="w-full" style={{ height: 'clamp(220px, 22vh, 280px)' }}>
                  <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={orderPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius * 1.28;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          if (percent < 0.04) return null;
                          return (
                            <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 10, fontWeight: 800 }}>
                              {`${(percent * 100).toFixed(1)}%`}
                            </text>
                          );
                        }}
                        labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                        animationDuration={1500}
                        animationBegin={300}
                        stroke="rgba(255,255,255,0.8)"
                        strokeWidth={2}
                      >
                        {orderPieData.map((entry) => (
                          <Cell key={entry.key} fill={COLORS[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white/95 rounded-2xl shadow-xl border border-slate-100 p-3" style={{ backdropFilter: 'blur(8px)' }}>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{d.name}</p>
                                <p className="text-sm font-black text-slate-900">{d.value} <small className="text-[10px] opacity-50">đơn hàng</small></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-4 pt-3 border-t border-slate-50">
                  {orderPieData.map((entry) => (
                    <div key={entry.key} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[entry.key] }} />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {entry.name} ({entry.value})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Bar Chart: Tồn kho theo sản phẩm (col-span 7) ── */}
        <div className="lg:col-span-7 min-w-0">
          <div
            className="h-full flex flex-col group transition-[transform,box-shadow,border-color] duration-300 bg-white"
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '1.5rem',
              boxShadow: '0 0.625rem 0.9375rem -0.1875rem rgb(0 0 0 / 0.08), 0 0.25rem 0.375rem -0.25rem rgb(0 0 0 / 0.08)',
              padding: 'clamp(1rem, 2vw, 1.5rem)',
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease, border-color 0.3s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-0.5rem)';
              e.currentTarget.style.boxShadow = '0 1.25rem 1.5625rem -0.3125rem rgb(0 0 0 / 0.1), 0 0.5rem 0.625rem -0.375rem rgb(0 0 0 / 0.1)';
              e.currentTarget.style.borderColor = '#3B82F6';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 0.625rem 0.9375rem -0.1875rem rgb(0 0 0 / 0.08), 0 0.25rem 0.375rem -0.25rem rgb(0 0 0 / 0.08)';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            {/* Card Header */}
            <div className="flex items-center gap-3 sm:gap-4 mb-6 md:mb-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:rotate-12 transition-transform duration-500">
                <span className="material-symbols-outlined text-xl sm:text-2xl font-black" aria-hidden="true">inventory</span>
              </div>
              <div>
                <h2
                  className="font-black text-slate-900 uppercase tracking-wider leading-tight"
                  style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}
                >
                  Tồn kho theo sản phẩm
                </h2>
                <p
                  className="font-bold text-slate-500 uppercase"
                  style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}
                >
                  Top sản phẩm có số lượng tồn kho cao nhất
                </p>
              </div>
            </div>

            {/* Bar Chart */}
            {topStockData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-12">
                <span className="material-symbols-outlined text-4xl mb-2">database_off</span>
                <p className="text-[10px] font-black uppercase tracking-widest">Không có dữ liệu</p>
              </div>
            ) : (
              <div className="flex-1 relative w-full min-w-0" style={{ height: 'clamp(260px, 26vh, 320px)' }}>
                <ResponsiveContainer width="100%" height={290} minWidth={0} minHeight={0}>
                  <BarChart
                    data={topStockData}
                    layout="vertical"
                    margin={isMobile ? { left: -20, right: 8, top: 4, bottom: 4 } : { left: 8, right: 24, top: 4, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient id="whStockGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#00288E" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.9} />
                      </linearGradient>
                      <linearGradient id="whValueGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#E08B00" stopOpacity={0.85} />
                        <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.9} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#CBD5E1" />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }}
                      tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      width={isMobile ? 85 : 125}
                      tick={<CustomYAxisTick isMobile={isMobile} />}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(241,245,249,0.7)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white/95 rounded-2xl shadow-2xl border border-slate-100 p-3 min-w-[180px]" style={{ backdropFilter: 'blur(8px)' }}>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 mb-2">{d.name}</p>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#00288E' }} />
                                    <span className="text-[11px] font-bold text-slate-500">Tồn kho</span>
                                  </div>
                                  <span className="text-sm font-black text-slate-900">{d.stock?.toLocaleString('vi-VN')} <small className="text-[10px] opacity-50">cái</small></span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span className="text-[11px] font-bold text-slate-500">Giá trị</span>
                                  </div>
                                  <span className="text-sm font-black text-amber-600">{d.value?.toLocaleString('vi-VN')} <small className="text-[10px] opacity-50">VND</small></span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="stock"
                      name="Số lượng tồn"
                      fill="url(#whStockGrad)"
                      radius={[0, 4, 4, 0]}
                      barSize={10}
                      animationDuration={1000}
                    />
                    <Bar
                      dataKey="value"
                      name="Giá trị vốn (VND)"
                      fill="url(#whValueGrad)"
                      radius={[0, 4, 4, 0]}
                      barSize={10}
                      animationDuration={1200}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Low Stock Alert Table — Mobile: cards, iPad: scroll ngang, Desktop: full table */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 overflow-hidden">
        <div className="p-3 sm:p-4 md:p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="space-y-0.5 sm:space-y-1">
            <h2 className="text-xs sm:text-sm md:text-base font-black text-slate-900 uppercase tracking-tight">⚠️ Cảnh báo tồn kho thấp</h2>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">Sản phẩm cần nhập thêm hàng gấp</p>
          </div>
          <Link 
            to="/warehouse/stock-import" 
            className="group flex items-center justify-center bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] rounded-lg sm:rounded-xl font-black uppercase tracking-widest transition-[background-color,color,border-color,box-shadow] duration-300 border-2 border-[#00288E] active:scale-95 px-2.5 sm:px-4 py-1.5 sm:py-2 text-[9px] sm:text-[10px] gap-1 sm:gap-1.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#00288E]"
          >
            <span className="material-symbols-outlined text-xs sm:text-sm font-bold group-hover:rotate-90 transition-transform duration-500" aria-hidden="true">add</span>
            <span className="hidden xs:inline">Nhập kho</span>
            <span className="xs:hidden">Nhập</span>
          </Link>
        </div>

        {(stats?.lowStockProducts?.length > 0 || stats?.outOfStockProducts?.length > 0) ? (
          <>
            {/* Table View: Desktop full size, iPad scroll ngang, CSS toggle ẩn trên Mobile */}
            <div className="wh-ls-table-wrapper overflow-x-auto overflow-y-auto max-h-[300px] sm:max-h-[350px] scrollbar-none">
                <table className="wh-responsive-table w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                    <th className="px-6 py-3.5">Mã SP</th>
                    <th className="px-6 py-3.5">Tên sản phẩm</th>
                    <th className="px-6 py-3.5 text-center">Danh mục</th>
                    <th className="px-6 py-3.5 text-center">Tồn kho</th>
                    <th className="px-6 py-3.5 text-center">Tối thiểu</th>
                    <th className="px-6 py-3.5 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                  {(() => {
                    const items = [...(stats?.outOfStockProducts || []), ...(stats?.lowStockProducts || [])];
                    const renderedRows = items.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors h-[53px]">
                        <td className="px-6 py-3.5" data-label="Mã SP">
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider whitespace-nowrap">
                            {p.sku}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900" data-label="Tên sản phẩm">
                          <span className="line-clamp-1">{p.name}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center" data-label="Danh mục">
                          <span className="bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter text-[9px] px-2.5 py-1 whitespace-nowrap">
                            {p.category}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center font-extrabold text-slate-800 whitespace-nowrap tabular-nums" data-label="Tồn kho">
                          {p.stockQuantity} <small className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">/{p.unit}</small>
                        </td>
                        <td className="px-6 py-3.5 text-center text-slate-400 font-bold" data-label="Tối thiểu">{p.minStock}</td>
                        <td className="px-6 py-3.5 text-center" data-label="Trạng thái">
                          <span className={`inline-block rounded-lg font-black uppercase tracking-tighter border text-[9px] px-2.5 py-1 whitespace-nowrap ${
                            p.stockQuantity === 0 
                              ? 'bg-rose-50 text-rose-600 border-rose-100' 
                              : 'bg-orange-50 text-orange-600 border-orange-100'
                          }`}>
                            {p.stockQuantity === 0 ? 'Hết hàng' : 'Sắp hết'}
                          </span>
                        </td>
                      </tr>
                    ));
                    // Nếu ít hơn 5 dòng, render thêm các dòng trống để đủ 5 dòng
                    if (items.length < 5) {
                      const emptyCount = 5 - items.length;
                      for (let i = 0; i < emptyCount; i++) {
                        renderedRows.push(
                          <tr key={`empty-${i}`} className="h-[53px]">
                            <td className="px-6 py-3.5">&nbsp;</td>
                            <td className="px-6 py-3.5">&nbsp;</td>
                            <td className="px-6 py-3.5 text-center">&nbsp;</td>
                            <td className="px-6 py-3.5 text-center">&nbsp;</td>
                            <td className="px-6 py-3.5 text-center">&nbsp;</td>
                            <td className="px-6 py-3.5 text-center">&nbsp;</td>
                          </tr>
                        );
                      }
                    }
                    return renderedRows;
                  })()}
                </tbody>
              </table>
            </div>

            {/* Mobile & iPad Card View — Class wh-ls-card-view, CSS ẩn/hiện theo breakpoint */}
            <div className="wh-ls-card-view overflow-y-auto max-h-[420px] scrollbar-none p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...(stats?.outOfStockProducts || []), ...(stats?.lowStockProducts || [])].map((p) => (
                  <div key={p.id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-500 shadow-sm transition-[border-color,box-shadow] duration-300 flex flex-col gap-3">
                    {/* Row 1: SKU + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider whitespace-nowrap">
                        {p.sku}
                      </span>
                      <span className={`inline-block rounded-lg font-black uppercase tracking-tighter border text-[9px] px-2.5 py-1 whitespace-nowrap ${
                        p.stockQuantity === 0 
                          ? 'bg-rose-50 text-rose-600 border-rose-100' 
                          : 'bg-orange-50 text-orange-600 border-orange-100'
                      }`}>
                        {p.stockQuantity === 0 ? 'Hết hàng' : 'Sắp hết'}
                      </span>
                    </div>
                    {/* Row 2: Product Name */}
                    <p className="font-bold text-slate-900 text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                    {/* Row 3: Category + Stock info */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 mt-auto">
                      <span className="bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter text-[9px] px-2.5 py-1 whitespace-nowrap">
                        {p.category}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Tồn kho</p>
                          <p className="text-xs font-extrabold text-slate-800 tabular-nums">
                            {p.stockQuantity} <small className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">/{p.unit}</small>
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Tối thiểu</p>
                          <p className="text-xs font-bold text-slate-500">{p.minStock}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 sm:py-16 text-center">
            <span className="material-symbols-outlined text-4xl sm:text-5xl text-emerald-500 mb-3 motion-safe:animate-bounce" aria-hidden="true">check_circle</span>
            <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">Tất cả sản phẩm đều đủ hàng!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseDashboard;
