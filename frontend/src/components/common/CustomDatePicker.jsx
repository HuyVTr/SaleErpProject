import React, { useState, useEffect, useRef, useMemo } from 'react';

const CustomDatePicker = ({ label, value, onChange, min, disabled = false, placeholder = "Chọn ngày" }) => {
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
        // Handle both ISO format YYYY-MM-DD and DD/MM/YYYY
        let y, m, d;
        if (value.includes('-')) {
          [y, m, d] = value.split('-').map(Number);
        } else if (value.includes('/')) {
          [d, m, y] = value.split('/').map(Number);
        } else {
          const dateObj = new Date(value);
          if (!isNaN(dateObj.getTime())) {
            y = dateObj.getFullYear();
            m = dateObj.getMonth() + 1;
            d = dateObj.getDate();
          }
        }
        
        if (y && m && d) {
          const activeDate = new Date(y, m - 1, d);
          setTempSelectedDate(activeDate);
          setCurrentCalendarMonth(activeDate.getMonth());
          setCurrentCalendarYear(activeDate.getFullYear());
        }
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
    if (min) {
      const minDate = new Date(min);
      minDate.setHours(0,0,0,0);
      const todayCopy = new Date(today);
      todayCopy.setHours(0,0,0,0);
      if (todayCopy < minDate) {
        return;
      }
    }
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
    let y, m, d;
    if (value.includes('-')) {
      [y, m, d] = value.split('-');
      return `${d}/${m}/${y}`;
    }
    return value;
  }, [value]);

  return (
    <div className={`relative space-y-1.5 w-full font-inter ${disabled ? 'opacity-60' : ''}`} ref={dropdownRef}>
      {label && <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] ml-1">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 border border-slate-200 hover:border-[#00288E]/30 focus:border-[#00288E]/50 rounded-xl p-3 text-sm font-medium transition-all text-slate-700 flex items-center justify-between shadow-sm cursor-pointer ${disabled ? 'cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400' : 'focus:bg-white'}`}
      >
        <span className={`${displayValue ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
          {displayValue || placeholder}
        </span>
        <span className="material-symbols-outlined text-slate-400 text-lg">calendar_today</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-[285px] bg-white border border-slate-200 shadow-2xl rounded-3xl p-4 z-[999] animate-fade-in origin-top-left">
          
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
                    className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors touch-manipulation cursor-pointer" 
                    aria-label="Tháng trước"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">chevron_left</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => { 
                      setCalendarView('months'); 
                    }} 
                    className="flex-1 px-1 py-0.5 rounded-lg transition-all flex items-center justify-center gap-0.5 hover:bg-slate-50 cursor-pointer"
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
                    className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors touch-manipulation cursor-pointer" 
                    aria-label="Tháng sau"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">chevron_right</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="shrink-0 text-[10px] font-black text-[#00288E] hover:bg-[#00288E]/5 border border-[#00288E]/20 px-2 py-1 rounded-xl uppercase tracking-wider transition-colors bg-white flex items-center gap-1 h-[32px] shadow-sm cursor-pointer"
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
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#00288E] transition-colors cursor-pointer"
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
                  }} 
                  className="px-2 py-1 rounded-lg hover:bg-slate-50 text-[10px] font-black uppercase text-[#00288E] tracking-wider transition-all cursor-pointer"
                >
                  Năm {currentCalendarYear}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => { setCalendarView('months'); }} 
                    className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#00288E] transition-colors cursor-pointer"
                    aria-label="Quay lại chọn tháng"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">arrow_back</span>
                  </button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn năm</span>
                </div>
                <div className="flex gap-1 h-[28px]">
                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart - 12)}
                    className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">chevron_left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setYearRangeStart(yearRangeStart + 12)}
                    className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px] font-bold">chevron_right</span>
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
                  
                  let isDateDisabled = false;
                  if (min) {
                    const minDate = new Date(min);
                    minDate.setHours(0,0,0,0);
                    const dateObjCopy = new Date(dateObj);
                    dateObjCopy.setHours(0,0,0,0);
                    if (dateObjCopy < minDate) {
                      isDateDisabled = true;
                    }
                  }

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
                      disabled={isDateDisabled}
                      onClick={() => {
                        setTempSelectedDate(dateObj);
                      }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#00288E] text-white font-black shadow-lg animate-scale-up' 
                          : isDateDisabled
                            ? 'text-slate-200 cursor-not-allowed'
                            : isToday
                              ? 'bg-slate-50 border border-slate-200 text-[#00288E] hover:bg-slate-100'
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
                    className={`text-[10px] font-black py-2.5 rounded-xl transition-all cursor-pointer ${
                      isMonthSelected 
                        ? 'bg-[#00288E] text-white shadow-lg shadow-[#00288E]/30' 
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
                    className={`text-[10px] font-black py-2.5 rounded-xl transition-all cursor-pointer ${
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
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-2 bg-[#00288E] hover:bg-[#00288E]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-blue-900/10 cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
