import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import PriceListDetailDrawer from '../../components/Drawers/PriceListDetailDrawer';

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
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

const getWeekRange = (year, week) => {
  const d = new Date(year, 0, 1);
  const dayNum = d.getDay();
  const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
  const firstMonday = new Date(d.setDate(diff));
  const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
};

const monthNames = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const getResponsiveValueStyle = (val) => {
  const str = String(val);
  const len = str.length;
  if (len <= 10) return { fontSize: 'clamp(14px, 1.25vw, 20px)' };
  if (len <= 15) return { fontSize: 'clamp(12px, 1.1vw, 16px)' };
  return { fontSize: 'clamp(11px, 0.95vw, 14px)' };
};

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

const GrowthBadge = ({ growth, currentValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  if (!growth) return null;
  const { percent, isUp, prevValue, label } = growth;

  const tooltipPositionClass = getTooltipClasses(idx);
  const arrowPositionClass = getArrowClasses(idx);
  const isActive = activeTooltipIdx === idx;

  return (
    <div
      className="w-max group relative flex items-center gap-1 mt-1 cursor-help focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none rounded-full"
      tabIndex={0}
      role="button"
      aria-label={`${isUp ? 'Tăng' : 'Giảm'} ${percent}% - ${label}`}
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
              <span className="font-black text-slate-700">{prevValue}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ này:</span>
              <span className={`font-black ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>{currentValue}</span>
            </div>
          </div>
        </div>
        <div className={`w-2 h-2 bg-white rotate-45 absolute top-2.5 shadow-sm ${arrowPositionClass}`}></div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, rawValue, growth, icon, color, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${title}: ${value}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        setActiveTooltipIdx(prev => prev === idx ? null : idx);
      }}
      className="stat-card-container relative bg-white rounded-xl shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-shadow duration-300 cursor-pointer p-3 sm:p-4 lg:p-5 lg:rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-500 uppercase tracking-wider leading-tight mb-1" style={{ fontSize: 'clamp(9px, 0.8vw, 11px)' }}>{title}</p>
          <div className="mt-1 font-black text-slate-900 [font-variant-numeric:tabular-nums] break-words whitespace-normal xl:truncate xl:whitespace-nowrap" style={getResponsiveValueStyle(value)} title={value}>
            {value}
          </div>
          <GrowthBadge 
            growth={growth} 
            currentValue={rawValue !== undefined ? rawValue : value} 
            idx={idx} 
            activeTooltipIdx={activeTooltipIdx} 
            setActiveTooltipIdx={setActiveTooltipIdx}
          />
        </div>
        
        <div className={`rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 ${
          color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
          color === 'purple' ? 'bg-purple-50 text-purple-600' :
          color === 'blue' ? 'bg-blue-50 text-blue-600' :
          'bg-orange-50 text-orange-600'
        }`}>
          <span className="material-symbols-outlined text-lg sm:text-xl lg:text-2xl" aria-hidden="true">{icon}</span>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, color, onClick, title, ariaLabel }) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel || title}
    className={`rounded-xl flex items-center justify-center transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none ${color}`}
    style={{ width: 'clamp(28px, 2.5vw, 40px)', height: 'clamp(28px, 2.5vw, 40px)' }}
    title={title}
  >
    <span className="material-symbols-outlined font-bold" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }} aria-hidden="true">{icon}</span>
  </button>
);

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
};

const PriceListManagement = () => {
  const navigate = useNavigate();
  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);

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
  const [isOpenFilterDropdown, setIsOpenFilterDropdown] = useState(false);

  const timeDropdownRef = React.useRef(null);
  const yearPickerRef = React.useRef(null);
  const weekPickerRef = React.useRef(null);
  const yearsCountPickerRef = React.useRef(null);
  const datePickerRef = React.useRef(null);
  const filterDropdownRef = React.useRef(null);

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
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsOpenFilterDropdown(false);
      }
      if (!event.target.closest('.stat-card-container')) {
        setActiveTooltipIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleViewDetail = (item) => {
    setSelectedPriceList(item);
    setDrawerOpen(true);
  };

  useEffect(() => {
    setLoading(true);
    adminService.getPriceLists().then(res => {
      const arr = Array.isArray(res) ? res : [];
      setPriceLists(arr.map(p => {
        const rawID = p.id || p.listID || p.priceListID || p.code;
        const formattedID = isNaN(rawID) ? String(rawID || '') : `BG-${String(rawID).padStart(3, '0')}`;
        return {
          id: formattedID || '',
          rawID,
          name: p.name || p.title || '', 
          effectiveDate: p.effectiveDate || p.startDate || '', 
          status: p.status || 'Tạm dừng', 
          type: p.type || p.listType || 'Bán sỉ', 
          itemsCount: p.itemsCount || p.count || 0, 
          description: p.description || p.desc || ''
        };
      }));
    }).catch(err => {
      console.error('Load price lists failed', err);
      setPriceLists([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const openStatusModal = (item) => {
    setStatusTarget(item);
    setShowStatusModal(true);
  };

  const confirmDeactivate = () => {
    const id = statusTarget?.id;
    setShowStatusModal(false);
    adminService.deletePriceList(id).then(() => {
      setPriceLists(prev => prev.map((item) => (
        String(item.id) === String(id) ? { ...item, status: 'Tạm dừng' } : item
      )));
      setSelectedPriceList(prev => (prev && String(prev.id) === String(id)) ? { ...prev, status: 'Tạm dừng' } : prev);
      showToast(`Đã ngừng hoạt động bảng giá "${statusTarget?.name}".`);
    }).catch(err => {
      console.error('Delete price list failed', err);
      showToast('Ngừng hoạt động bảng giá thất bại', 'error');
    }).finally(() => {
      setStatusTarget(null);
    });
  };

  const handleReactivate = (item) => {
    const id = item?.id;
    adminService.updatePriceList(id, { status: 'Kích hoạt' }).then(() => {
      setPriceLists(prev => prev.map((p) => (
        String(p.id) === String(id) ? { ...p, status: 'Kích hoạt' } : p
      )));
      setSelectedPriceList(prev => (prev && String(prev.id) === String(id)) ? { ...prev, status: 'Kích hoạt' } : prev);
      showToast(`Đã kích hoạt lại bảng giá "${item?.name}".`);
    }).catch(err => {
      console.error('Reactivate price list failed', err);
      showToast('Kích hoạt lại bảng giá thất bại', 'error');
    });
  };

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
    const endY = new Date().getFullYear();
    const startY = endY - filterYearsCount + 1;
    return pd.getFullYear() >= startY && pd.getFullYear() <= endY;
  };

  const filteredLists = useMemo(() => {
    return priceLists.filter((item) => {
      const nameStr = String(item?.name || '');
      const idStr = String(item?.id || '');
      const matchesSearch =
        nameStr.toLowerCase().includes(search.toLowerCase()) ||
        idStr.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'Tất cả' || item.status === statusFilter;
      const matchesTime = matchesTimeframe(item.effectiveDate);
      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [priceLists, search, statusFilter, timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

  const totalPages = Math.ceil(filteredLists.length / ITEMS_PER_PAGE);
  const paginatedLists = useMemo(() => {
    return filteredLists.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredLists, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

  const stats = useMemo(() => {
    const total = priceLists.length;
    const active = priceLists.filter((item) => item.status === 'Kích hoạt').length;
    const paused = priceLists.filter((item) => item.status === 'Tạm dừng').length;
    const usagePercent = total ? Math.round((active / total) * 100) : 0;

    return { total, active, paused, usagePercent };
  }, [priceLists]);

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6">
      
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 px-2 md:px-0 shrink-0">
        {/* Hàng 1: tiêu đề chính riêng một dòng */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight whitespace-nowrap">Quản lý Bảng giá</h1>

        {/* Hàng 2: tiêu đề phụ + action cùng một dòng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Chính sách giá bán ·{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap">
              {priceLists.length} bảng giá
            </span>
          </p>

          <div className="flex flex-row items-center gap-3 w-full sm:w-auto md:w-auto md:justify-end">
            {/* Bộ lọc Thời gian Dropdown */}
            <div className="relative font-inter w-1/2 sm:w-auto" ref={timeDropdownRef}>
              <button
                onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
                aria-expanded={isOpenTimeDropdown}
                aria-haspopup="true"
                className="w-full sm:w-auto h-[46px] bg-white border border-slate-300 hover:border-[#00288E] transition-colors rounded-xl px-4 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
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
                <div className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-right">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#00288E] text-[18px] font-bold" aria-hidden="true">tune</span>
                      <span className="text-[13px] font-black uppercase tracking-widest text-[#00288E]">CHỌN THỜI GIAN</span>
                    </div>
                    <button
                      onClick={() => setIsOpenTimeDropdown(false)}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors text-slate-400 hover:text-slate-600"
                      aria-label="Đóng"
                    >
                      <span className="material-symbols-outlined text-[16px] font-bold" aria-hidden="true">close</span>
                    </button>
                  </div>

                  <div className="p-5 space-y-5">
                    <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl">
                      {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`flex-1 py-2 transition-colors text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${timeframe === tf ? 'bg-white text-[#00288E] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
                                      className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                                      style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                      aria-label="Ngày trước">
                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                                      className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
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
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
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
                                                    className={`h-8 w-8 text-[11px] font-black rounded-lg transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${isSelected ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
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
                                        <button onClick={(e) => { e.stopPropagation(); setDatePickerView('years'); setDateTempYear(dateTempYear); }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
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
                                                  className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${(idx + 1) === m && dateTempYear === y ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                                  className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none text-slate-400 hover:text-blue-600">
                                            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                                          </button>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                          <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }}
                                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none text-blue-600" aria-label="Năm trước">
                                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_left</span>
                                          </button>
                                          <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                          <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }}
                                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none text-blue-600" aria-label="Năm tiếp theo">
                                            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
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
                                                    className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${yearOpt === dateTempYear ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                      className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                                      style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                      aria-label="Ngày tiếp theo">
                                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                              </button>
                            </div>
                          );
                        })()}

                        {timeframe === 'weekly' && (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={weekPickerRef}>
                            <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w - 1; let newY = y; if (newW < 1) { newY--; newW = 52; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Tuần trước">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                                    className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                            </button>
                            {showWeekPicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[340px] animate-fade-in">
                                <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-blue-600">{filterWeek.split('-W')[0]}</span></div>
                                <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                                  <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${filterWeek === weekStr ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]">check_circle</span>}</button>); })}</div>
                                </div>
                              </div>
                            )}
                            <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Tuần tiếp theo">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                            </button>
                          </div>
                        )}

                        {timeframe === 'monthly' && (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                            <button onClick={() => setFilterYear(prev => prev - 1)}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Năm trước">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }}
                                    className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>Năm {filterYear}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                            </button>
                            {showYearPicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                                <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"><span className="material-symbols-outlined text-[12px]">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"><span className="material-symbols-outlined text-[12px]">chevron_right</span></button></div></div>
                                <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${filterYear === y ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                              </div>
                            )}
                            <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }}
                                    disabled={filterYear >= now.getFullYear()}
                                    className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Năm tiếp theo">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                            </button>
                          </div>
                        )}

                        {timeframe === 'yearly' && (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                            <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Giảm số năm">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }}
                                    className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>{filterYearsCount} Năm qua</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                            </button>
                            {showYearsCountPicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                                <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-colors flex justify-between items-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${filterYearsCount === v ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]">check</span>}</button>))}</div>
                              </div>
                            )}
                            <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
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
              type="button"
              onClick={() => navigate('/admin/price-lists/add')}
              className="w-1/2 sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00288E] px-4 h-[46px] font-black text-white uppercase tracking-widest transition-colors hover:bg-[#00288E]/90 whitespace-nowrap shadow-sm active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
              style={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
            >
              <span className="material-symbols-outlined text-[16px] font-bold">add</span>
              Thêm bảng giá mới
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-row items-center gap-2 sm:gap-6 mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-all duration-300">
        <div className="relative flex-1 md:w-96 md:flex-none group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors" aria-hidden="true">search</span>
          <input
            type="text"
            name="search"
            placeholder="Tìm theo mã, tên bảng giá…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 p-4 pl-12 rounded-xl text-sm font-bold outline-none focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-[#00288E]/20 focus:bg-white transition-colors text-slate-700"
            aria-label="Tìm kiếm bảng giá"
          />
        </div>
        
        {/* Desktop View Status Segment */}
        <div className="hidden md:flex ml-auto items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner overflow-x-auto no-scrollbar">
          {['Tất cả', 'Kích hoạt', 'Tạm dừng'].map((statusOpt) => (
            <button 
              key={statusOpt}
              onClick={() => setStatusFilter(statusOpt)}
              className={`text-center px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap border focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none ${
                statusFilter === statusOpt 
                  ? 'bg-white text-blue-600 border-slate-200 shadow-sm' 
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900'
              }`}
            >
              {statusOpt}
            </button>
          ))}
        </div>

        {/* Mobile View: Collapsed Dropdown */}
        <div className="md:hidden ml-auto relative shrink-0" ref={filterDropdownRef}>
          <button 
            onClick={() => setIsOpenFilterDropdown(!isOpenFilterDropdown)}
            className="bg-slate-50 border-2 border-slate-200 text-slate-600 hover:border-[#00288E] active:scale-95 transition-colors p-4 rounded-xl flex items-center justify-center shadow-sm relative focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            {statusFilter !== 'Tất cả' && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></span>
            )}
          </button>

          {isOpenFilterDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 py-2 animate-fade-in origin-top-right">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</span>
              </div>
              {['Tất cả', 'Kích hoạt', 'Tạm dừng'].map((statusOpt) => {
                const isSelected = statusFilter === statusOpt;
                return (
                  <button 
                    key={statusOpt}
                    onClick={() => {
                      setStatusFilter(statusOpt);
                      setIsOpenFilterDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                      isSelected ? 'text-blue-600 bg-blue-50/30' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{statusOpt}</span>
                    {isSelected && <span className="material-symbols-outlined text-sm font-black text-blue-600">check</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:border-blue-500 hover:shadow-xl transition-all duration-300 overflow-hidden mx-2 md:mx-0 flex-1 min-h-[400px]">
        {/* View A: TABLE VIEW (Chỉ hiển thị trên Desktop >= 1280px) */}
        <div className="hidden xl:block overflow-x-auto flex-1 scrollbar-none">
          <table className="w-full table-fixed text-left border-collapse min-w-[900px]" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Mã BG</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[30%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Tên bảng giá</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[15%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Loại bảng giá
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[18%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Hiệu lực từ
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[13%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Trạng thái
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Thao tác
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4" aria-live="polite" aria-busy="true">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLists.length > 0 ? (
                paginatedLists.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="font-black text-slate-900" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(11px, 0.9vw, 13px)' }}>
                      {item.id}
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <p className="font-bold text-slate-800 truncate" title={item.name} style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{item.name}</p>
                      <p className="font-semibold text-slate-400 mt-0.5" style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>{item.description || 'Không có mô tả'}</p>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full">
                        <span className="font-semibold text-slate-700" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>{item.type}</span>
                      </div>
                    </td>
                    <td className="font-semibold text-slate-700" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                      <div className="flex justify-center items-center w-full">
                        {formatDate(item.effectiveDate)}
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full">
                        <span className={`inline-flex items-center justify-center rounded-xl border font-black uppercase tracking-wider ${
                          item.status === 'Kích hoạt' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-orange-50 text-orange-700 border-orange-100'
                        }`} style={{ fontSize: 'clamp(8px, 0.75vw, 9px)', padding: 'clamp(2px, 0.4vw, 4px) clamp(6px, 0.8vw, 12px)' }}>
                          {item.status}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full gap-1 sm:gap-2">
                        <ActionButton 
                          icon="visibility" 
                          color="text-slate-600 hover:bg-slate-100" 
                          onClick={() => handleViewDetail(item)}
                          title="Xem chi tiết"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-slate-400">
                    <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy bảng giá nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View B: CARD LIST VIEW (Tối ưu hóa cho Mobile & iPad < 1280px) */}
        <div className="block xl:hidden overflow-auto flex-1 p-4 bg-slate-50/50 scrollbar-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4" aria-live="polite" aria-busy="true">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
            </div>
          ) : paginatedLists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedLists.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-md transition-[border-color,box-shadow] flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full tracking-wider">
                        {item.id}
                      </span>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm mt-1 truncate" title={item.name}>{item.name}</h4>
                      <p className="text-xs font-semibold text-slate-400 mt-1 line-clamp-2 leading-relaxed" title={item.description}>
                        {item.description || 'Không có mô tả'}
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => handleViewDetail(item)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                      title="Xem chi tiết"
                    >
                      <span className="material-symbols-outlined text-lg font-bold">visibility</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center mt-auto pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 mr-auto">
                      Hiệu lực: {formatDate(item.effectiveDate)}
                    </span>
                    
                    <span className="bg-slate-100 text-slate-600 font-bold rounded-lg border border-slate-200 uppercase tracking-tighter text-[9px] px-2 py-0.5">
                      {item.type}
                    </span>

                    <span className={`inline-flex items-center justify-center rounded-xl border font-black uppercase tracking-wider text-[9px] px-2 py-0.5 ${
                      item.status === 'Kích hoạt' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-orange-50 text-orange-700 border-orange-100'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400">
              <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy bảng giá nào</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredLists.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-white shrink-0">
            <span>Hiển thị {Math.min(filteredLists.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredLists.length, currentPage * ITEMS_PER_PAGE)} trên {filteredLists.length} bảng giá</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              {[...Array(Math.max(1, totalPages))].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex justify-center items-center rounded-lg border text-xs font-black focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors ${
                    currentPage === i + 1 
                      ? 'bg-[#00288E] text-white border-[#00288E]' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <PriceListDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        priceList={selectedPriceList}
        onDeactivate={openStatusModal}
        onReactivate={handleReactivate}
      />

      {/* --- MODAL XÁC NHẬN NGỪNG HOẠT ĐỘNG --- */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" style={{ animation: 'fadeIn 200ms ease-out' }}>
          <div
            role="alertdialog"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 font-inter"
            style={{ animation: 'scaleIn 200ms ease-out' }}
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4" aria-hidden="true">
                ⚠️
              </div>
              <h2 id="modal-title" className="text-xl font-bold text-slate-800 mb-2">Ngừng hoạt động bảng giá?</h2>
              <p id="modal-description" className="text-sm text-slate-500 leading-relaxed">
                Bảng giá <span className="font-bold text-slate-700">"{statusTarget?.name}"</span> sẽ chuyển sang trạng thái <span className="font-bold text-orange-600">Tạm dừng</span>, dữ liệu vẫn được lưu lại và có thể kích hoạt lại sau.
              </p>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowStatusModal(false); setStatusTarget(null); }}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmDeactivate}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:outline-none shadow-lg shadow-red-200 transition-colors"
              >
                Đúng, ngừng hoạt động
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST THÔNG BÁO --- */}
      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
          }`}
          style={{ animation: 'slideIn 300ms ease-out' }}
        >
          <span className="text-xl" aria-hidden="true">{toast.type === 'error' ? '❌' : '✅'}</span>
          <p className="text-sm font-bold tracking-wide">{toast.message}</p>
        </div>
      )}
    </div>
  );
};

export default PriceListManagement;
