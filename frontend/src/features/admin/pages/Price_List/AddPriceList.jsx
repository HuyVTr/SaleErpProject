import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import PriceListItemsEditor from '../../components/PriceList/PriceListItemsEditor';
import CustomerAssignmentEditor from '../../components/PriceList/CustomerAssignmentEditor';

const priceListTypes = ['Bảng giá bán lẻ', 'Bảng giá bán buôn', 'Bảng giá nội bộ', 'Bảng giá đại lý'];
const priceListStatusOptions = [
  { id: 'Kích hoạt', title: 'Kích hoạt', desc: 'Áp dụng ngay cho khách hàng', color: 'emerald', icon: 'check_circle' },
  { id: 'Tạm dừng', title: 'Tạm dừng', desc: 'Chưa áp dụng / tạm khóa', color: 'orange', icon: 'pause_circle' },
];

const CustomDatePicker = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const [tempSelectedDate, setTempSelectedDate] = useState(null);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());
  const [calendarView, setCalendarView] = useState('days'); // 'days' | 'months' | 'years'
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(new Date().getFullYear() / 12) * 12);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCalendarView('days');
      if (value) {
        const [y, m, d] = value.split('-').map(Number);
        const activeDate = new Date(y, m - 1, d);
        setTempSelectedDate(activeDate);
        setCurrentCalendarMonth(activeDate.getMonth());
        setCurrentCalendarYear(activeDate.getFullYear());
      } else {
        const today = new Date();
        setTempSelectedDate(null);
        setCurrentCalendarMonth(today.getMonth());
        setCurrentCalendarYear(today.getFullYear());
      }
    }
  }, [isOpen, value]);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handleSelectToday = () => {
    const today = new Date();
    setTempSelectedDate(today);
    setCurrentCalendarMonth(today.getMonth());
    setCurrentCalendarYear(today.getFullYear());
  };

  const handleConfirm = () => {
    if (tempSelectedDate instanceof Date) {
      const yyyy = tempSelectedDate.getFullYear();
      const mm = String(tempSelectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempSelectedDate.getDate()).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const displayValue = useMemo(() => {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }, [value]);

  return (
    <div className="relative space-y-1.5 w-full font-inter" ref={dropdownRef}>
      <label htmlFor={`datepicker-${label.replace(/\s+/g, '-').toLowerCase()}`} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
      <button
        type="button"
        id={`datepicker-${label.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 rounded-xl p-3.5 text-sm font-bold transition-all text-slate-700 flex items-center justify-between shadow-sm cursor-pointer animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
      >
        <span className="text-slate-800 font-bold">{displayValue || 'Chọn ngày'}</span>
        <span className="material-symbols-outlined text-slate-400 text-lg" aria-hidden="true">calendar_today</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-[285px] bg-white border border-slate-200 shadow-2xl rounded-3xl p-4 z-50 animate-fade-in origin-top-left">
          
          {/* Header */}
          <div className="flex justify-between items-center gap-2 mb-3">
            {calendarView === 'days' ? (
              <>
                <div className="flex-1 flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-slate-300 shadow-sm h-[32px]">
                  <button
                    type="button" 
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
                    className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" 
                    aria-label="Tháng trước"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">chevron_left</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { 
                      setCalendarView('months'); 
                    }} 
                    className="flex-1 px-1 py-0.5 rounded-lg transition-all flex items-center justify-center gap-1 hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">
                      THÁNG {currentCalendarMonth + 1}, {currentCalendarYear}
                    </span>
                    <span className="material-symbols-outlined text-[12px] text-slate-300 transition-transform">expand_more</span>
                  </button>
                  <button 
                    type="button"
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
                    className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors touch-manipulation cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" 
                    aria-label="Tháng sau"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">chevron_right</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="shrink-0 text-[10px] font-black text-[#00288E] hover:bg-blue-50 border border-[#00288E]/20 px-2 py-1 rounded-xl uppercase tracking-wider transition-colors bg-white flex items-center gap-1 h-[32px] shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="material-symbols-outlined text-[12px]">today</span>
                  Hôm nay
                </button>
              </>
            ) : calendarView === 'months' ? (
              <div className="flex-1 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => { setCalendarView('days'); }} 
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#00288E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Quay lại chọn ngày"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">arrow_back</span>
                  </button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn tháng</span>
                </div>
                <button 
                  type="button"
                  onClick={() => { 
                    setCalendarView('years'); 
                    setYearRangeStart(Math.floor(currentCalendarYear / 12) * 12); 
                  }} 
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 text-[10px] font-black text-[#00288E] uppercase transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {currentCalendarYear} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => { setCalendarView('months'); }} 
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#00288E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">arrow_back</span>
                  </button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                </div>
                <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                  <button 
                    type="button"
                    onClick={() => { setYearRangeStart(prev => prev - 12); }} 
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="material-symbols-outlined text-[12px] font-bold">chevron_left</span>
                  </button>
                  <span className="text-[8px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 11}</span>
                  <button 
                    type="button"
                    onClick={() => { setYearRangeStart(prev => prev + 12); }} 
                    className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="material-symbols-outlined text-[12px] font-bold">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View 1: Grid các Ngày */}
          {calendarView === 'days' && (
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
                      type="button"
                      onClick={() => {
                        setTempSelectedDate(dateObj);
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isSelected 
                          ? 'bg-blue-50 border border-[#00288E] text-[#00288E] font-black shadow-inner animate-scale-up' 
                          : isToday
                            ? 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
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
          {calendarView === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2 animate-fade-in">
              {monthNames.map((mName, idx) => {
                const isMonthSelected = idx === currentCalendarMonth;
                return (
                  <button 
                    key={mName} 
                    type="button"
                    onClick={() => { 
                      setCurrentCalendarMonth(idx); 
                      setCalendarView('days'); 
                    }} 
                    className={`text-[10px] font-black py-2.5 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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
          {calendarView === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-2 animate-fade-in">
              {Array.from({ length: 12 }).map((_, i) => { 
                const yearOpt = yearRangeStart + i; 
                const isYearSelected = yearOpt === currentCalendarYear;
                return (
                  <button 
                    key={yearOpt} 
                    type="button"
                    onClick={() => { 
                      setCurrentCalendarYear(yearOpt); 
                      setCalendarView('months'); 
                    }} 
                    className={`text-[10px] font-black py-2.5 rounded-xl transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
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

          {/* Hủy & Xác nhận button */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2 bg-[#00288E] hover:bg-[#00288E]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-900/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CustomSelect = ({ label, value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value) || options[0];
  }, [value, options]);

  return (
    <div className="relative space-y-1.5 w-full font-inter" ref={dropdownRef}>
      <label htmlFor={`select-${label.replace(/\s+/g, '-').toLowerCase()}`} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
      <button
        type="button"
        id={`select-${label.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 rounded-xl p-3.5 text-sm font-bold transition-all text-slate-700 flex items-center justify-between shadow-sm cursor-pointer animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 text-left"
      >
        <span className="text-slate-800 font-bold">{selectedOption?.label}</span>
        <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
          keyboard_arrow_down
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-50 text-[#00288E] font-black'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-sm font-bold text-[#00288E]">check</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const AddPriceList = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState(priceListTypes[0]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [status, setStatus] = useState(priceListStatusOptions[0].id);
  const [items, setItems] = useState([]);
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const initialSnapshot = useRef(JSON.stringify({
    name: '', type: priceListTypes[0], effectiveDate: '', status: priceListStatusOptions[0].id,
    items: [], assignedCustomers: [], description: ''
  }));

  const selectOptions = useMemo(() => {
    return priceListTypes.map(t => ({ value: t, label: t }));
  }, []);

  useEffect(() => {
    const current = JSON.stringify({ name, type, effectiveDate, status, items, assignedCustomers, description });
    setIsDirty(current !== initialSnapshot.current);
  }, [name, type, effectiveDate, status, items, assignedCustomers, description]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2600);
  };

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      navigate('/admin/price-lists');
    }
  };

  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    if (!name.trim()) {
      showToast('Vui lòng nhập tên bảng giá', 'error');
      return;
    }
    if (!effectiveDate) {
      showToast('Vui lòng chọn ngày hiệu lực', 'error');
      return;
    }

    setLoading(true);
    const payload = { name: name.trim(), type, effectiveDate, status, itemsCount: items.length, description: description.trim() };
    adminService.createPriceList(payload).then((created) => {
      const priceListId = created?.id;
      const tasks = [];
      if (priceListId && items.length > 0) {
        tasks.push(adminService.savePriceListItems(priceListId, items));
      }
      assignedCustomers.forEach(cust => {
        tasks.push(adminService.setCustomerPriceList(cust.customerID, priceListId));
      });
      return Promise.all(tasks);
    }).then(() => {
      showToast('Đã tạo bảng giá thành công');
      window.setTimeout(() => navigate('/admin/price-lists'), 1200);
    }).catch(err => {
      console.error('Create price list failed', err);
      showToast('Tạo bảng giá thất bại', 'error');
    }).finally(() => {
      setLoading(false);
    });
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    e.stopPropagation();
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    if (!touchStart) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    if (!touchStart || !touchEnd) return;

    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (distanceX > minSwipeDistance) {
        handleBack();
      }
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-10"
    >

      {/* 1. Header Section */}
      <div className="relative flex flex-col gap-2 sm:gap-3 px-2 md:px-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
          Thêm bảng giá
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Thiết lập bảng giá bán mới
          </p>
          <div className="flex w-full sm:w-auto sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none transition-colors active:scale-95 shrink-0"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              aria-busy={loading}
              className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
              ) : (
                <span className="material-symbols-outlined text-sm sm:text-base group-hover:rotate-12 transition-transform" aria-hidden="true">save</span>
              )}
              <span>{loading ? 'Đang lưu…' : 'Lưu bảng giá'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-8 mx-2 md:mx-0 items-stretch">

          {/* Box Thông tin cơ bản */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-blue-600">sell</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin cơ bản</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên & loại bảng giá</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 mb-8">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tên bảng giá *</label>
                  <input
                    id="name"
                    type="text"
                    name="price-list-name"
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Bảng giá tháng 5…"
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-[border-color,box-shadow,background-color] text-slate-700 font-inter"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <CustomSelect
                  label="Loại bảng giá"
                  value={type}
                  onChange={setType}
                  options={selectOptions}
                />
                <CustomDatePicker
                  label="Ngày hiệu lực *"
                  value={effectiveDate}
                  onChange={setEffectiveDate}
                />
              </div>
          </div>

          {/* Box Trạng thái */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-purple-600">toggle_on</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Trạng thái</h3>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Trạng thái bảng giá</legend>
              {priceListStatusOptions.map((item) => {
                const active = status === item.id;
                return (
                  <div 
                    key={item.id} 
                    className={`relative flex items-center border-2 rounded-2xl transition-colors focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 ${
                      active ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      id={`status-${item.id}`}
                      name="status"
                      value={item.id}
                      checked={active}
                      onChange={() => setStatus(item.id)}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`status-${item.id}`}
                      className="w-full flex items-center justify-between p-4 cursor-pointer outline-none select-none"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${active ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'}`}>
                          {active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                        </div>
                        <div>
                          <p className={`font-black text-xs uppercase tracking-tight ${active ? 'text-blue-600' : 'text-slate-900'}`}>{item.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined text-[20px] ${item.color === 'emerald' ? 'text-emerald-500' : 'text-orange-500'}`} aria-hidden="true">{item.icon}</span>
                    </label>
                  </div>
                );
              })}
            </fieldset>
          </div>

          {/* Box Sản phẩm áp dụng */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-orange-600">inventory_2</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sản phẩm áp dụng</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thiết lập giá theo từng sản phẩm</p>
              </div>
            </div>
            <PriceListItemsEditor items={items} onChange={setItems} />
          </div>

          {/* Box Khách hàng áp dụng */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-emerald-600">groups</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Khách hàng áp dụng</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gán bảng giá cho khách hàng</p>
              </div>
            </div>
            <CustomerAssignmentEditor customers={assignedCustomers} onChange={setAssignedCustomers} />
          </div>

          {/* Box Mô tả */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-teal-600">description</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mô tả bảng giá</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ghi chú thêm (không bắt buộc)</p>
              </div>
            </div>
            <div className="space-y-2">
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                placeholder="Mô tả ngắn về bảng giá này…"
                className="w-full max-w-full resize-none bg-slate-50 border-2 border-transparent rounded-[2rem] p-5 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-[border-color,box-shadow,background-color] text-slate-700 font-inter"
              />
            </div>
          </div>

          {/* Ô trống */}
          <div className="hidden xl:block"></div>
        </form>
      </div>

      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] px-6 py-4 rounded-2xl bg-white shadow-2xl border flex items-center gap-3 ${
            toast.type === 'error' ? 'border-rose-100 text-rose-600 shadow-rose-900/10' : 'border-emerald-100 text-emerald-600 shadow-emerald-900/10'
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            toast.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
          }`}>
            <span className="material-symbols-outlined text-lg font-black">
              {toast.type === 'error' ? 'close' : 'check'}
            </span>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.1em]">{toast.message}</p>
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            role="alertdialog"
            aria-labelledby="exit-modal-title"
            aria-describedby="exit-modal-desc"
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-scale-in"
          >
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-100" aria-hidden="true">
              <span className="material-symbols-outlined text-4xl font-black">warning</span>
            </div>
            <h3 id="exit-modal-title" className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              Thoát mà không lưu?
            </h3>
            <p id="exit-modal-desc" className="text-xs text-slate-500 font-semibold leading-relaxed mb-3 font-inter">
              Dữ liệu bảng giá bạn vừa nhập sẽ không được lưu lại nếu thoát ra ngoài lúc này.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/price-lists')}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:ring-offset-2 outline-none text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddPriceList;
