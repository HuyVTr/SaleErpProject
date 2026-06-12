import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../../components/Common/AccountingToast';
import accountingService from '../../services/accountingService';
import DebtTable from '../../components/Tables/DebtTable';
import DashboardStat from '../../components/Stats/DashboardStat';
import { WalletIcon, DebtIcon, CustomerIcon } from '../../components/Icons/AccountingIcons';
import '../../styles/accounting.css';

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
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

const getResponsiveValueClass = (val) => {
  const str = val ? String(val) : '';
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

const DebtTracker = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState([]);
  const [filteredDebts, setFilteredDebts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpenRiskDropdown, setIsOpenRiskDropdown] = useState(false);
  const [autoDays, setAutoDays] = useState(localStorage.getItem('debt_auto_days') || "7");
  const [isAutoEnabled, setIsAutoEnabled] = useState(localStorage.getItem('debt_auto_enabled') === 'true');
  const [sortConfig, setSortConfig] = useState({ key: 'remainingAmount', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Time & Date filter states
  const now = new Date();
  const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [timeframe, setTimeframe] = useState('monthly');
  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('days'); 
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4); 
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const yearPickerRef = useRef(null);
  const weekPickerRef = useRef(null);
  const yearsCountPickerRef = useRef(null);
  const datePickerRef = useRef(null);

  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const [isOpenActionDropdown, setIsOpenActionDropdown] = useState(false);
  const timeDropdownRef = useRef(null);
  const actionDropdownRef = useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

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
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setIsOpenActionDropdown(false);
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, riskFilter, timeframe]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleAuto = (id) => {
    const item = debts.find(d => d.invoiceID === id);
    if (item && !item.email) {
      showToast(`Không thể bật tự động cho ${item.customerName} vì chưa có email`, "warning");
      return;
    }

    setDebts(prev => prev.map(debt => 
      debt.invoiceID === id ? { ...debt, autoRemind: !debt.autoRemind } : debt
    ));
    showToast("Đã cập nhật trạng thái tự động nhắc nợ", "success");
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const options = { filterWeek, filterYear, filterYearsCount, filterDate, selectedDay };
      const data = await accountingService.getDebtReport(timeframe, options);
      setDebts(data.data || []);
      setFilteredDebts(data.data || []);
      setSummary(data.summary);
    } catch (err) {
      console.error("Debt API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

  // Logic lọc dữ liệu
  useEffect(() => {
    let result = debts;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        // SQL-aligned: tìm theo customerName (computed) hoặc invoiceID
        (d.customerName      || '').toLowerCase().includes(q) ||
        (String(d.invoiceID) || '').toLowerCase().includes(q) ||
        (d.companyName       || '').toLowerCase().includes(q)
      );
    }
    
    if (riskFilter !== 'all') {
      result = result.filter(d => d.riskLevel === riskFilter);
    }

    // Logic Sắp xếp
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal, bVal;

        // Xử lý các trường đặc biệt
        if (sortConfig.key === 'lastReminderDate') {
          const parseDateStr = (d) => {
            if (!d) return 0;
            const [day, month, year] = d.split('/').map(Number);
            return new Date(year, month - 1, day).getTime();
          };
          aVal = parseDateStr(a.lastReminderDate);
          bVal = parseDateStr(b.lastReminderDate);
        } else if (sortConfig.key === 'displayID') {
          aVal = Number(a.invoiceID) || 0;
          bVal = Number(b.invoiceID) || 0;
        } else {
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
        }

        if (aVal !== bVal) {
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        }

        // Tie-breaker: invoiceID (ID lớn hơn là mới hơn)
        const idA = Number(a.invoiceID) || 0;
        const idB = Number(b.invoiceID) || 0;
        return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
      });
    }
    
    setFilteredDebts(result);
  }, [searchQuery, riskFilter, debts, sortConfig]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDebts.length / itemsPerPage) || 1;
  const paginatedDebts = filteredDebts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const checkDirtyAndAttemptClose = () => {
    const originalDays = localStorage.getItem('debt_auto_days') || "7";
    const originalEnabled = localStorage.getItem('debt_auto_enabled') === 'true';
    const isDirty = autoDays !== originalDays || isAutoEnabled !== originalEnabled;
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      setIsSettingsOpen(false);
    }
  };

  const handleConfirmCloseModal = (confirm) => {
    setShowConfirmClose(false);
    if (confirm) {
      setIsSettingsOpen(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('debt_auto_days', autoDays);
    localStorage.setItem('debt_auto_enabled', isAutoEnabled);
    setIsSettingsOpen(false);
    showToast(`Đã lưu cấu hình: Tự động nhắc nợ đang ${isAutoEnabled ? 'BẬT' : 'TẮT'}`, "success");
  };

  // ── Email validation: gửi nhắc nợ đơn lẻ qua Backend
  const handleReminder = async (item) => {
    if (!item.email) {
      showToast(`Không thể gửi: ${item.customerName} chưa có email`, 'error');
      return;
    }
    
    try {
      // Gọi service - khi ghép BE sẽ gọi endpoint /api/reminders/send
      await accountingService.sendDebtReminder(item.invoiceID);
      showToast(`Đã gửi nhắc nợ tới ${item.email}`, 'success');
    } catch (error) {
      showToast("Không thể kết nối máy chủ gửi mail", "error");
    }
  };

  // ── Batch reminder: gửi hàng loạt tới các KH có email
  const handleBatchReminder = async () => {
    const withEmail = filteredDebts.filter(d => !!d.email);
    const noEmail   = filteredDebts.filter(d => !d.email);
    
    if (withEmail.length === 0) {
      showToast('Không có khách hàng nào có email để gửi', 'error');
      return;
    }

    try {
      const ids = withEmail.map(d => d.invoiceID);
      // Gọi service - khi ghép BE sẽ gọi endpoint /api/reminders/batch-send
      await accountingService.sendBatchReminders(ids);

      const msg = noEmail.length > 0
        ? `Đã gửi ${withEmail.length} nhắc nợ · ${noEmail.length} KH chưa có email (bỏ qua)`
        : `Đã gửi nhắc nợ tới ${withEmail.length} khách hàng`;
      showToast(msg, 'success');
    } catch (error) {
      showToast("Lỗi khi gửi nhắc nợ hàng loạt", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full animate-fade-up" style={{ gap: 'var(--space-md)' }}>
      <div className="flex flex-col gap-2 sm:gap-3 shrink-0 px-2 md:px-2">
        <h1 className="text-acc-text-main leading-tight font-black text-3xl sm:text-4xl lg:text-[2rem] uppercase tracking-tight">QUẢN LÝ CÔNG NỢ</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-acc-text-muted font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Theo dõi nợ quá hạn.</span>
            <span className="inline-flex items-center align-middle px-2.5 py-0.5 rounded-lg bg-blue-50 text-acc-primary font-bold whitespace-nowrap animate-fade-in" key={filteredDebts.length}>
              {filteredDebts.length} khách hàng
            </span>
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-end relative z-50">
          {/* 1. Bộ lọc Thời gian Dropdown */}
          <div className="relative font-inter w-full sm:w-auto flex flex-col h-full" ref={timeDropdownRef}>
            <button 
              onClick={() => {
                setIsOpenTimeDropdown(!isOpenTimeDropdown);
                setIsOpenActionDropdown(false);
              }}
              className="w-full sm:w-auto h-full bg-white border border-slate-300 hover:border-acc-primary transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">calendar_month</span>
                <span className="font-black text-slate-700 uppercase tracking-widest">
                  <span className="hidden md:inline">Thời gian: </span>{getTimeframeText()}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenTimeDropdown ? 'rotate-180 text-acc-primary' : ''}`} style={{ fontSize: '14px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenTimeDropdown && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-left sm:origin-top-right">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-acc-primary text-[18px] font-bold">tune</span>
                    <span className="text-[13px] font-black uppercase tracking-widest text-acc-primary">CHỌN THỜI GIAN</span>
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
                        onClick={() => {
                          setTimeframe(tf);
                          if (tf === 'daily') {
                            const today = new Date();
                            setSelectedDay(today.getDate());
                            setFilterDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
                          } else {
                            setSelectedDay(null);
                          }
                        }}
                        className={`flex-1 py-2 transition-all text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider ${timeframe === tf ? 'bg-white text-acc-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Ngày trước">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }} 
                                    className={`transition-all flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-acc-primary outline-none ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>Ngày {selectedDay}/{m}/{y}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showDatePicker ? 'rotate-180 text-acc-primary' : ''}`} aria-hidden="true">expand_more</span>
                            </button>
                            {showDatePicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[340px] animate-fade-in">
                                {datePickerView === 'days' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn ngày</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }} 
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-acc-primary uppercase">
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
                                                  className={`h-8 w-8 text-[11px] font-black rounded-lg transition-all flex items-center justify-center ${isSelected ? 'bg-acc-primary text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            {dayNum}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : datePickerView === 'months' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn tháng</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('years'); setDateYearRangeStart(Math.floor(dateTempYear / 12) * 12); }} 
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-acc-primary uppercase">
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
                                                className={`text-[11px] font-black py-3 rounded-lg transition-all ${(idx + 1) === m && dateTempYear === y ? 'bg-acc-primary text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                                className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-acc-primary">
                                          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }} 
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-acc-primary">
                                          <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }} 
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-acc-primary">
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
                                                  className={`text-[11px] font-black py-3 rounded-lg transition-all ${yearOpt === dateTempYear ? 'bg-acc-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
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
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }} 
                                  className={`transition-all flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                          </button>
                          {showWeekPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[340px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-acc-primary">{filterWeek.split('-W')[0]}</span></div>
                              <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                                <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-all ${filterWeek === weekStr ? 'bg-acc-primary text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]">check_circle</span>}</button>); })}</div>
                              </div>
                            </div>
                          )}
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'monthly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                          <button onClick={() => setFilterYear(prev => prev - 1)} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }} 
                                  className={`transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>Năm {filterYear}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                          </button>
                          {showYearPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-acc-primary"><span className="material-symbols-outlined text-[12px]">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-acc-primary"><span className="material-symbols-outlined text-[12px]">chevron_right</span></button></div></div>
                              <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-all ${filterYear === y ? 'bg-acc-primary text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                            </div>
                          )}
                          <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }} 
                                  disabled={filterYear >= now.getFullYear()} 
                                  className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'yearly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Giảm số năm">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }} 
                                  className={`transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterYearsCount} Năm qua</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                          </button>
                          {showYearsCountPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                              <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-all flex justify-between items-center ${filterYearsCount === v ? 'bg-acc-primary text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]">check</span>}</button>))}</div>
                            </div>
                          )}
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
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
          <div className="relative font-inter w-full sm:w-auto flex flex-col h-full" ref={actionDropdownRef}>
            <button 
              onClick={() => {
                setIsOpenActionDropdown(!isOpenActionDropdown);
                setIsOpenTimeDropdown(false);
              }}
              className="w-full sm:w-auto h-full bg-acc-primary text-white hover:opacity-90 transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-md active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-2"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined font-bold text-white" style={{ fontSize: '18px' }} aria-hidden="true">settings</span>
                <span className="font-black uppercase tracking-widest text-white">Thao tác</span>
              </div>
              <span className={`material-symbols-outlined text-white transition-transform duration-300 ${isOpenActionDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '14px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenActionDropdown && (
              <div className="absolute right-0 top-full mt-2 w-[240px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-right py-2">
                {/* Batch Reminder Option */}
                <button 
                  onClick={() => {
                    handleBatchReminder();
                    setIsOpenActionDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  <span className="material-symbols-outlined text-acc-error" style={{ fontSize: '20px' }} aria-hidden="true">campaign</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Nhắc nợ hàng loạt</span>
                    <span className="text-[8px] text-slate-400 font-bold">Gửi email nhắc nợ hàng loạt</span>
                  </div>
                </button>

                {/* Settings Option */}
                <button 
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsOpenActionDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  <span className="material-symbols-outlined text-slate-500" style={{ fontSize: '20px' }} aria-hidden="true">settings</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Cấu hình tự động</span>
                    <span className="text-[8px] text-slate-400 font-bold">Thiết lập tự động nhắc nợ</span>
                  </div>
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-2 md:px-0">
        <DashboardStat 
          label="Tổng nợ phải thu" 
          value={summary?.totalDebt} 
          growth={summary?.totalDebtGrowth} 
          icon={WalletIcon} 
          color="text-blue-600" 
          loading={loading} 
          tooltipAlign="right"
        />
        <DashboardStat 
          label="Nợ quá hạn" 
          value={summary?.overdueDebt} 
          growth={summary?.overdueDebtGrowth} 
          icon={DebtIcon} 
          color="text-red-500" 
          loading={loading} 
          tooltipAlign="left"
        />
        <DashboardStat 
          label="Số lượng khách hàng" 
          value={summary?.customerCount} 
          growth={summary?.customerCountGrowth} 
          icon={CustomerIcon} 
          color="text-indigo-500" 
          loading={loading} 
          tooltipAlign="left"
        />
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-row gap-2 sm:gap-6 items-center justify-between hover:border-acc-primary/30 hover:shadow-lg transition-all duration-300">
        <div className="relative flex-1 sm:w-[400px] sm:flex-none group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm khách hàng, mã hóa đơn…"
            aria-label="Tìm kiếm khách hàng hoặc mã hóa đơn"
            className="w-full bg-slate-50 border-2 border-slate-100 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary transition-all text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-acc-primary transition-colors font-bold" aria-hidden="true">search</span>
        </div>

        {/* Risk Filter Dropdown */}
        <div className="relative w-auto sm:w-72 font-manrope">
          <button
            type="button"
            onClick={() => setIsOpenRiskDropdown(!isOpenRiskDropdown)}
            className="w-full bg-slate-50 border-2 border-slate-100 hover:border-acc-primary transition-all rounded-xl px-3 sm:px-4 py-4 flex items-center justify-between gap-1 sm:gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary outline-none text-[10px] sm:text-xs"
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">filter_alt</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">
                {riskFilter === 'all' ? 'Tất cả mức độ' : riskFilter === 'critical' ? 'Rất nguy cấp' : riskFilter === 'high' ? 'Cảnh báo cao' : 'Cần theo dõi'}
              </span>
            </div>
            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenRiskDropdown ? 'rotate-180 text-acc-primary' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
              keyboard_arrow_down
            </span>
          </button>

            {isOpenRiskDropdown && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsOpenRiskDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-acc-primary opacity-80">LỌC MỨC ĐỘ RỦI RO</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      { id: 'all',      label: 'Tất cả mức độ',  count: null },
                      { id: 'critical', label: 'Rất nguy cấp',   count: filteredDebts.filter(d => d.riskLevel === 'critical').length },
                      { id: 'high',     label: 'Cảnh báo cao',   count: filteredDebts.filter(d => d.riskLevel === 'high').length },
                      { id: 'medium',   label: 'Cần theo dõi',   count: filteredDebts.filter(d => d.riskLevel === 'medium').length },
                    ].map((opt) => {
                      const isSelected = riskFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setRiskFilter(opt.id);
                            setIsOpenRiskDropdown(false);
                          }}
                          className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-all flex items-center justify-between active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-acc-primary text-white shadow-lg shadow-blue-900/30 font-black'
                              : 'bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-acc-primary'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {opt.count !== null && opt.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isSelected ? 'bg-white text-acc-primary' : 'bg-slate-200 text-slate-600'}`}>
                              {opt.count}
                            </span>
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

      {/* Table Section */}
      <div className="flex-1 min-h-0 max-h-[36.25rem] md:max-h-[43rem] min-[820px]:max-h-[53rem] min-[1024px]:max-h-[65rem] xl:max-h-none h-fit xl:h-auto flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <DebtTable 
            debts={paginatedDebts}
            loading={loading}
            onReminder={handleReminder}
            onToggleAuto={handleToggleAuto}
            isMasterAutoEnabled={isAutoEnabled}
            sortConfig={sortConfig}
            onSort={handleSort}
          />

        {/* Footer with Pagination */}
        <div className="bg-slate-50 border-t border-slate-200/60 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex flex-row items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Hiển thị {filteredDebts.length ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(filteredDebts.length, currentPage * itemsPerPage)} của {filteredDebts.length}
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="text-[10px] font-black uppercase text-slate-600 px-2 tracking-wider">
                  {currentPage} / {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-xs font-black text-acc-text-main w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-slate-400 uppercase text-[9px] font-black tracking-widest">Tổng nợ:</span>
            <span className="tabular-nums text-acc-primary text-sm font-black">
              {filteredDebts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0).toLocaleString('vi-VN')} VND
            </span>
          </div>
        </div>
      </div>

      {/* Settings Modal - Glassmorphism UI */}
      {isSettingsOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" 
            onClick={checkDirtyAndAttemptClose} 
          />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoom-in pointer-events-auto">
            <div className="p-8 pb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-acc-text-main">Cấu hình tự động</h3>
              <button 
                onClick={checkDirtyAndAttemptClose}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            
            <div className="p-8 pt-2 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-body-base font-black text-acc-text-main">Chế độ nhắc nợ</p>
                    <p className="text-body-xs text-acc-text-light font-medium">Bật/tắt tự động gửi mail cho toàn hệ thống</p>
                  </div>
                  <div 
                    role="switch"
                    aria-checked={isAutoEnabled}
                    aria-label="Bật/tắt tự động nhắc nợ toàn hệ thống"
                    tabIndex={0}
                    onClick={() => setIsAutoEnabled(!isAutoEnabled)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsAutoEnabled(!isAutoEnabled);
                      }
                    }}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-acc-primary/20 ${isAutoEnabled ? 'bg-acc-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isAutoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl">
                  <span className="material-symbols-outlined text-acc-primary" aria-hidden="true">info</span>
                  <p className="text-body-sm text-acc-primary font-bold">Hệ thống sẽ tự động gửi email nhắc nợ sau một số ngày nhất định kể từ khi quá hạn.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="auto-days-range" className="text-label-xs text-acc-text-light font-black uppercase">Thời gian nhắc nợ (Ngày)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      id="auto-days-range"
                      type="range" 
                      min="1" 
                      max="30" 
                      step="1"
                      className="flex-1 accent-acc-primary h-2 bg-slate-100 rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                      value={autoDays}
                      onChange={(e) => setAutoDays(e.target.value)}
                    />
                    <div className="w-16 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-black text-acc-primary tabular-nums">
                      {autoDays}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-acc-text-light uppercase px-1">
                    <span>1 ngày</span>
                    <span>30 ngày</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={checkDirtyAndAttemptClose}
                  className="flex-1 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest text-acc-text-light hover:bg-slate-50 transition focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={saveSettings}
                  className="flex-1 py-4 bg-acc-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-acc-accent shadow-lg shadow-blue-900/10 transition focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirm Dialog Modal */}
      {showConfirmClose && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in" onClick={() => handleConfirmCloseModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-zoom-in pointer-events-auto border border-slate-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-bold">warning</span>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Thay đổi chưa lưu</h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  Bạn có thay đổi chưa lưu trong cấu hình. Bạn có chắc chắn muốn đóng và hủy bỏ thiết lập không?
                </p>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={() => handleConfirmCloseModal(false)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-black text-[10px] uppercase tracking-wider text-slate-500 transition focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => handleConfirmCloseModal(true)}
                  className="flex-1 py-3 bg-acc-primary text-white hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase tracking-wider transition shadow-md shadow-blue-900/10 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  Đồng ý đóng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DebtTracker;
