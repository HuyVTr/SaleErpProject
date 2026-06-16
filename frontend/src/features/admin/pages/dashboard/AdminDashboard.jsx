import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import adminService from '../../services/adminService';
import accountingService from '../../../accounting/services/accountingService';
import CategoryShareChart from '../../../accounting/components/Charts/CategoryShareChart';
import DailyActivityGrid from '../../../sales/components/Charts/DailyActivityGrid';
import { VNDDisplay, CURRENCY_CLASS_PRIMARY } from '../../../../utils/formatVND';

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const getResponsiveValueStyle = (val, rawVal) => {
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
    return { fontSize: 'clamp(14px, 1.25vw, 20px)' };
  } else if (len <= 15) {
    return { fontSize: 'clamp(12px, 1.1vw, 16px)' };
  } else if (len <= 20) {
    return { fontSize: 'clamp(11px, 0.95vw, 14px)' };
  } else {
    return { fontSize: 'clamp(10px, 0.8vw, 12px)' };
  }
};

const formatCurrency = (val, isSmall = false, isStat = false, customColorClass = "", textSizeClass = "") => {
  if (val === undefined || val === null) return "0 VND";

  if (isStat) {
    return (
      <VNDDisplay
        value={val}
        className={`flex items-baseline gap-1.5 whitespace-nowrap ${CURRENCY_CLASS_PRIMARY} ${customColorClass}`}
        valueClassName={`font-black text-inherit ${textSizeClass}`}
        valueStyle={{ fontSize: 'clamp(14px, 1.25vw, 20px)' }}
        unitClassName="font-black text-inherit uppercase tracking-tight"
        unitStyle={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
      />
    );
  }

  const valueColor = customColorClass || "text-slate-800";
  const unitColor = customColorClass ? "text-inherit opacity-70" : "text-slate-400";
  const valueSize = textSizeClass || (isSmall ? "text-xs" : "");

  return (
    <VNDDisplay
      value={val}
      className={`inline-flex items-baseline gap-1 whitespace-nowrap ${customColorClass}`}
      valueClassName={`${isSmall ? "font-bold" : "font-black"} ${valueColor} ${valueSize}`}
      valueStyle={!textSizeClass ? { fontSize: 'clamp(11px, 0.9vw, 14px)' } : {}}
      unitClassName={`text-[10px] font-bold uppercase tracking-tighter ${unitColor}`}
      unitStyle={{ fontSize: 'clamp(8px, 0.7vw, 10px)' }}
    />
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 font-inter">
        <p className="text-xs font-bold text-slate-500 mb-2">{label}</p>
        <p className="text-sm font-black text-[#00288E]">
          Doanh thu: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const getISOWeekString = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getISOWeek = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const monthNames = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const AdminDashboard = () => {
  const [, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);
  const [dashboardStats, setDashboardStats] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const now = new Date();
  const [timeframe, setTimeframe] = useState('monthly');
  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Picker visibility states
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('days');
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const timeDropdownRef = React.useRef(null);
  const yearPickerRef = React.useRef(null);
  const weekPickerRef = React.useRef(null);
  const yearsCountPickerRef = React.useRef(null);
  const datePickerRef = React.useRef(null);

  const chartContainerRef = React.useRef(null);
  const [chartContainerWidth, setChartContainerWidth] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const updateWidth = () => {
      if (chartContainerRef.current) {
        const newWidth = chartContainerRef.current.offsetWidth;
        if (newWidth > 0) setChartContainerWidth(newWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(chartContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const getTooltipClasses = (idx) => {
    const leftAlign = "left-full top-0 ml-2.5 origin-top-left";
    const rightAlign = "right-full top-0 mr-2.5 origin-top-right";
    if (idx === 0) return leftAlign;
    if (idx === 3) return rightAlign;
    if (idx === 1) return `${rightAlign} lg:right-auto lg:left-full lg:mr-0 lg:ml-2.5 lg:origin-top-left`;
    if (idx === 2) return `${leftAlign} lg:left-auto lg:right-full lg:ml-0 lg:mr-2.5 lg:origin-top-right`;
    return leftAlign;
  };

  const getArrowClasses = (idx) => {
    const leftArrow = "-left-1 border-l border-b";
    const rightArrow = "-right-1 border-t border-r";
    if (idx === 0) return leftArrow;
    if (idx === 3) return rightArrow;
    if (idx === 1) return `${rightArrow} lg:right-auto lg:-left-1 lg:border-t-0 lg:border-r-0 lg:border-l lg:border-b`;
    if (idx === 2) return `${leftArrow} lg:left-auto lg:-right-1 lg:border-l-0 lg:border-b-0 lg:border-t lg:border-r`;
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
        onClick={(e) => {
          e.stopPropagation();
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }}
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
            <div className="space-y-1.5 font-inter">
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
          <div className={`w-2 h-2 bg-white rotate-45 absolute top-2.5 shadow-sm ${arrowPositionClass}`}></div>
        </div>
      </div>
    );
  };

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

  // Click outside to close pickers
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

  // Static data: loaded once
  useEffect(() => {
    let mounted = true;
    const loadStaticData = async () => {
      try {
        const [productsRes, staffsRes] = await Promise.all([
          adminService.getProducts(),
          adminService.getStaffs()
        ]);
        if (!mounted) return;

        const totalStaffs = staffsRes.length;
        const totalProducts = productsRes.length;
        const lowStockProducts = productsRes.filter(p => (p.stock ?? p.quantity ?? 0) <= 5).length;

        setDashboardStats(prev => {
          const revenueStat = prev.find(s => s.title === 'Doanh thu tổng');
          return [
            revenueStat || {
              title: 'Doanh thu tổng',
              value: formatCurrency(0, false, true),
              rawValue: 0,
              growth: null,
              type: 'currency',
              icon: 'payments',
              color: 'emerald'
            },
            {
              title: 'Nhân viên hệ thống',
              value: String(totalStaffs),
              rawValue: totalStaffs,
              growth: null,
              type: 'number',
              icon: 'groups',
              color: 'purple'
            },
            {
              title: 'Tổng số sản phẩm',
              value: String(totalProducts),
              rawValue: totalProducts,
              growth: null,
              type: 'number',
              icon: 'inventory_2',
              color: 'blue'
            },
            {
              title: 'Tồn kho thấp',
              value: String(lowStockProducts),
              rawValue: lowStockProducts,
              growth: lowStockProducts > 0 ? { percent: "0.0", isUp: false, prevValue: lowStockProducts, label: 'Sản phẩm cảnh báo tồn kho thấp' } : null,
              type: 'number',
              icon: 'warning',
              color: 'orange'
            },
          ];
        });
      } catch (err) {
        console.error('Failed to load admin static data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadStaticData();
    return () => { mounted = false; };
  }, []);

  // Revenue chart + stats + top selling products: depend on timeframe/filters
  useEffect(() => {
    let mounted = true;
    const loadRevenueData = async () => {
      try {
        setChartLoading(true);
        const options = { filterWeek, filterYear, filterYearsCount, filterDate, selectedDay };

        const [revenueData, statsRes, ordersRes, orderItemsRes, productsRes, categoryRes] = await Promise.all([
          accountingService.getRevenueData(timeframe, options),
          accountingService.getDashboardStats(timeframe, options),
          accountingService.getOrders(),
          accountingService.getOrderItems(),
          adminService.getProducts(),
          accountingService.getCategoryRevenueReport(timeframe, options),
        ]);

        if (!mounted) return;

        setChartData(revenueData);
        setCategoryData(categoryRes);

        // Update Doanh thu tổng card with real data + growth
        setDashboardStats(prev => prev.map(stat =>
          stat.title === 'Doanh thu tổng'
            ? { ...stat, value: formatCurrency(statsRes.totalRevenue, false, true), rawValue: statsRes.totalRevenue, growth: statsRes.revenueGrowth }
            : stat
        ));

        // Compute top selling products theo doanh số thực tế trong khung thời gian đang lọc
        const matchesTimeframe = (dateStr) => {
          const pd = dateStr ? new Date(dateStr) : null;
          if (!pd || isNaN(pd.getTime())) return false;

          if (timeframe === 'daily') {
            const [y, m] = filterDate.split('-').map(Number);
            return pd.getFullYear() === y && (pd.getMonth() + 1) === m && pd.getDate() === selectedDay;
          }
          if (timeframe === 'weekly') {
            const [y, w] = filterWeek.split('-W').map(Number);
            return pd.getFullYear() === y && getISOWeek(pd) === w;
          }
          if (timeframe === 'monthly') {
            return pd.getFullYear() === filterYear;
          }
          // yearly
          const endY = now.getFullYear();
          const startY = endY - filterYearsCount + 1;
          return pd.getFullYear() >= startY && pd.getFullYear() <= endY;
        };

        const matchedOrderIDs = new Set(
          ordersRes.filter(o => matchesTimeframe(o.orderDate || o.date)).map(o => o.orderID)
        );

        const soldQtyByProduct = new Map();
        orderItemsRes.forEach(item => {
          if (!matchedOrderIDs.has(item.orderID)) return;
          const key = item.productID;
          soldQtyByProduct.set(key, (soldQtyByProduct.get(key) || 0) + (Number(item.quantity) || 0));
        });

        const sortedProducts = [...soldQtyByProduct.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([productID, qty], idx) => {
            const product = productsRes.find(p => (p.productID || p.id) === productID);
            return {
              id: productID,
              name: product?.productName || product?.name || 'Sản phẩm không xác định',
              sales: qty,
              index: idx + 1
            };
          });

        setTopProducts(sortedProducts);
      } catch (err) {
        console.error('Failed to load admin revenue data', err);
        setChartData([]);
        setTopProducts([]);
        setCategoryData([]);
      } finally {
        if (mounted) setChartLoading(false);
      }
    };
    loadRevenueData();
    return () => { mounted = false; };
  }, [timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

  return (
    <div className="font-inter flex flex-col w-full bg-slate-50 animate-fade-in gap-4 md:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 shrink-0">
        {/* Hàng 1: tiêu đề chính riêng một dòng */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight whitespace-nowrap">Bảng điều khiển Quản trị</h1>

        {/* Hàng 2: tiêu đề phụ + action cùng một dòng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            Phân tích dữ liệu{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in" key={getTimeframeText()}>
              {getTimeframeText()}
            </span>
          </p>

          {/* Bộ lọc Thời gian Dropdown */}
          <div className="relative font-inter w-full sm:w-auto md:w-auto md:justify-end" ref={timeDropdownRef}>
          <button
            onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
            aria-expanded={isOpenTimeDropdown}
            aria-haspopup="true"
            className="w-full sm:w-auto bg-white border border-slate-300 hover:border-[#00288E] transition-[border-color,background-color,transform] rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-2 outline-none"
            style={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
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
            <div className="absolute right-0 sm:right-0 left-0 sm:left-auto top-full mt-2 w-full sm:w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-right">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00288E] text-[18px] font-bold">tune</span>
                  <span className="text-[13px] font-black uppercase tracking-widest text-[#00288E]">CHỌN THỜI GIAN</span>
                </div>
                <button
                  onClick={() => setIsOpenTimeDropdown(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                  aria-label="Đóng"
                >
                  <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl">
                  {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setTimeframe(tf)}
                      className={`flex-1 py-2 transition-[color,background-color,box-shadow] text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${timeframe === tf ? 'bg-white text-[#00288E] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {tf === 'daily' ? 'Ngày' : tf === 'weekly' ? 'Tuần' : tf === 'monthly' ? 'Tháng' : 'Năm'}
                    </button>
                  ))}
                </div>

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
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Ngày trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                                  className={`transition-[background-color,box-shadow] flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
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
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none">
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
                                                className={`h-8 w-8 text-[11px] font-black rounded-lg transition-[background-color,color,box-shadow] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${isSelected ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
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
                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none">
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
                                              className={`text-[11px] font-black py-3 rounded-lg transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${(idx + 1) === m && dateTempYear === y ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                              className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none">
                                        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                      </button>
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                    </div>
                                    <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                      <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }}
                                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none">
                                        <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                                      </button>
                                      <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }}
                                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none">
                                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1">
                                    {Array.from({ length: 12 }).map((_, i) => {
                                      const yearOpt = dateYearRangeStart + i;
                                      return (
                                        <button key={yearOpt}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDateTempYear(yearOpt);
                                                  setDatePickerView('months');
                                                }}
                                                className={`text-[11px] font-black py-3 rounded-lg transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${yearOpt === dateTempYear ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
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
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Tuần trước">
                          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                                className={`transition-[background-color,box-shadow] flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                          <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                          <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                        </button>
                        {showWeekPicker && (
                          <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-0 w-full sm:min-w-[340px] animate-fade-in">
                            <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-blue-600">{filterWeek.split('-W')[0]}</span></div>
                            <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                              <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-[background-color,color,box-shadow] focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${filterWeek === weekStr ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]">check_circle</span>}</button>); })}</div>
                            </div>
                          </div>
                        )}
                        <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }}
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Tuần tiếp theo">
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {timeframe === 'monthly' && (
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                        <button onClick={() => setFilterYear(prev => prev - 1)}
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Năm trước">
                          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }}
                                className={`transition-[background-color,box-shadow] flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                          <span>Năm {filterYear}</span>
                          <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                        </button>
                        {showYearPicker && (
                          <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-0 w-full sm:min-w-[260px] animate-fade-in">
                            <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"><span className="material-symbols-outlined text-[12px]">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"><span className="material-symbols-outlined text-[12px]">chevron_right</span></button></div></div>
                            <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-[background-color,color] focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${filterYear === y ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                          </div>
                        )}
                        <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }}
                                disabled={filterYear >= now.getFullYear()}
                                className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Năm tiếp theo">
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </div>
                    )}

                    {timeframe === 'yearly' && (
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                        <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }}
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                                style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                aria-label="Giảm số năm">
                          <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }}
                                className={`transition-[background-color,box-shadow] flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                          <span>{filterYearsCount} Năm qua</span>
                          <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                        </button>
                        {showYearsCountPicker && (
                          <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-0 w-full sm:min-w-[200px] animate-fade-in">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                            <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-[background-color,color] focus-visible:ring-2 focus-visible:ring-blue-600 outline-none flex justify-between items-center ${filterYearsCount === v ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]">check</span>}</button>))}</div>
                          </div>
                        )}
                        <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }}
                                className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-[background-color,box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0" style={{ overflow: 'visible' }}>
        {dashboardStats.map((stat, idx) => (
          <div
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
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
            className="stat-card-container relative bg-white rounded-xl p-3 sm:p-4 shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-[border-color,box-shadow,transform,z-index] duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            style={{ overflow: 'visible' }}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-500 uppercase tracking-wider leading-tight" style={{ fontSize: 'clamp(9px, 0.8vw, 11px)' }}>{stat.title}</p>
                <div
                  className="mt-1 font-black text-slate-900 [font-variant-numeric:tabular-nums] break-words whitespace-normal xl:truncate xl:whitespace-nowrap"
                  style={typeof stat.value === 'string' || typeof stat.value === 'number' ? getResponsiveValueStyle(stat.value, stat.rawValue) : {}}
                  title={typeof stat.value === 'object' ? stat.rawValue : stat.value}
                >
                  {stat.value}
                </div>
                <GrowthBadge growth={stat.growth} type={stat.type} currentValue={stat.rawValue} idx={idx} activeTooltipIdx={activeTooltipIdx} />
              </div>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                stat.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                'bg-orange-50 text-orange-600'
              }`} aria-hidden="true">
                <span className="material-symbols-outlined text-base sm:text-xl" aria-hidden="true">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Tables */}
      <div className="w-full pb-4 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Real Chart using Recharts */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[412px]">
            <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0">
              {timeframe === 'daily' ? `Doanh thu theo ngày trong tháng ${filterDate.split('-')[1]}/${filterDate.split('-')[0]}` :
               timeframe === 'weekly' ? 'Doanh thu theo tuần' :
               timeframe === 'monthly' ? `Doanh thu 12 tháng năm ${filterYear}` : `Doanh thu ${filterYearsCount} năm gần đây`}
            </h2>
            {/* Wrapper chiều cao cố định — Recharts yêu cầu parent có height cụ thể để render đúng */}
            <div ref={chartContainerRef} className="flex-1 w-full min-h-0 relative" style={{ overflow: 'hidden', height: 320 }}>
              {(chartLoading || chartContainerWidth === 0) ? (
                <div className="w-full h-full flex items-center justify-center" aria-live="polite" aria-busy="true">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00288E]"></div>
                  <span className="sr-only">Đang tải dữ liệu biểu đồ…</span>
                </div>
              ) : timeframe === 'daily' ? (
                <DailyActivityGrid
                  loading={chartLoading}
                  apiData={chartData}
                  dateFilter={filterDate}
                  selectedDay={selectedDay}
                  onSelectDay={setSelectedDay}
                  formatCurrency={formatCurrency}
                />
              ) : (
                <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAdminRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00288E" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#00288E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis
                      width={60}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickFormatter={(v) => v >= 1000000 ? `${v / 1000000}M` : v}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue" stroke="#00288E" strokeWidth={3} fillOpacity={1} fill="url(#colorAdminRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Revenue Distribution - Đứng song song và cùng chiều cao */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[412px]">
            <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0">Phân bổ doanh thu theo Danh mục</h2>
            <div className="flex-1 w-full flex items-center justify-center min-h-0">
              <CategoryShareChart data={categoryData} loading={chartLoading} />
            </div>
          </div>
        </div>

        {/* Top Products - Thiết kế Premium theo chuẩn UI/UX Pro Max */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 flex flex-col min-h-[280px] w-full">
          <div className="flex items-center justify-between mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00288E] text-2xl font-bold">workspace_premium</span>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sản phẩm bán chạy nhất</h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full uppercase tracking-wider">Top 5 doanh số</span>
          </div>

          <div className="flex-1">
            {chartLoading ? (
              <div className="w-full h-full flex items-center justify-center min-h-[160px]" aria-live="polite" aria-busy="true">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00288E]"></div>
                <span className="sr-only">Đang tải sản phẩm bán chạy…</span>
              </div>
            ) : topProducts.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-center text-slate-400 text-sm font-medium min-h-[160px]">
                Không có dữ liệu bán hàng trong khoảng thời gian này
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {topProducts.map((p, idx) => {
                  const maxSales = topProducts[0]?.sales || 1;
                  const ratio = Math.round((p.sales / maxSales) * 100);
                  
                  // Huy chương theo thứ hạng (Sử dụng icon Material Symbols chuẩn)
                  const rankStyles = 
                    idx === 0 ? { bg: 'bg-amber-50 border-amber-200 text-amber-600', label: 'Quán quân', icon: 'emoji_events' } :
                    idx === 1 ? { bg: 'bg-slate-100 border-slate-300 text-slate-600', label: 'Á quân 1', icon: 'military_tech' } :
                    idx === 2 ? { bg: 'bg-orange-50 border-orange-200 text-orange-700', label: 'Á quân 2', icon: 'military_tech' } :
                    { bg: 'bg-blue-50/50 border-blue-100 text-[#00288E]', label: `Top ${idx + 1}`, icon: 'star' };

                  return (
                    <div 
                      key={p.id} 
                      className="group relative flex flex-col justify-between p-4 bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-150 hover:border-blue-400 hover:shadow-lg hover:-translate-y-1 transition-[border-color,box-shadow,transform] duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      tabIndex={0}
                      role="button"
                      aria-label={`${rankStyles.label}: sản phẩm ${p.name}, đã bán ${p.sales.toLocaleString('vi-VN')} sản phẩm`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          // Handle product detail click if available
                        }
                      }}
                    >
                      {/* Top Rank Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`flex items-center gap-0.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${rankStyles.bg}`}>
                          <span className="material-symbols-outlined text-[13px] leading-none">{rankStyles.icon}</span>
                          <span>#{p.index}</span>
                        </span>
                        <span className="text-[10px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Chi tiết</span>
                      </div>

                      {/* Product Info */}
                      <div className="space-y-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00288E] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
                          <span className="material-symbols-outlined text-xl">inventory_2</span>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-800 line-clamp-2 min-h-[2rem] leading-relaxed group-hover:text-[#00288E] transition-colors" title={p.name}>
                            {p.name}
                          </h3>
                        </div>
                      </div>

                      {/* Sales & Progress Bar */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[10px] font-medium text-slate-400">Đã bán</span>
                          <span className="text-xs font-black text-slate-800 [font-variant-numeric:tabular-nums]">
                            {p.sales.toLocaleString('vi-VN')} <span className="text-[9px] font-bold text-slate-400">SP</span>
                          </span>
                        </div>
                        {/* Progress Bar trực quan */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${
                              idx === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                              idx === 1 ? 'bg-gradient-to-r from-slate-400 to-slate-500' :
                              idx === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                              'bg-gradient-to-r from-blue-500 to-[#00288E]'
                            }`}
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
