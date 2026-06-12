import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import salesService from '../../services/salesService';
import adminService from '../../../admin/services/adminService';
import { useSalesToast } from '../../components/Notification/useSalesToast';
import SalesToastNotification from '../../components/Notification/SalesToastNotification';

const formatCurrency = (val, isSmall = false, colorClass = "text-slate-800") => {
  if (val === undefined || val === null) return "0 VND";
  const num = typeof val === 'number' ? val : Number(val.toString().replace(/[đ₫\sVND.]/g, ''));
  const formatted = new Intl.NumberFormat('vi-VN').format(num);
  return (
    <span className="flex items-baseline gap-1">
      <span className={isSmall ? `font-bold ${colorClass}` : `font-black ${colorClass}`}>{formatted}</span>
      <span className={`text-[10px] font-black uppercase tracking-tighter ${colorClass === "text-white" ? "text-white/70" : "text-slate-400"}`}>VND</span>
    </span>
  );
};

const ProductSelectionDrawer = ({ isOpen, onClose, quotationItems, onUpdateItemField, onAddItem }) => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isOpenCategoryDropdown, setIsOpenCategoryDropdown] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadInitialData = async () => {
        try {
          setLoading(true);
          const [prods, cats] = await Promise.all([
            salesService.getProducts(),
            salesService.getCategories()
          ]);
          setProducts(prods);
          setCategories(cats);
        } catch (e) {
          console.error("Lỗi khi tải danh sách sản phẩm và danh mục:", e);
        } finally {
          setLoading(false);
        }
      };
      loadInitialData();
    }
  }, [isOpen]);

  const filteredCategoryOptions = useMemo(() => {
    const allOptions = [
      { categoryID: 'ALL', categoryName: 'Tất cả' },
      ...categories
    ];
    if (!categorySearchQuery) return allOptions;
    return allOptions.filter(opt => 
      opt.categoryName.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'ALL') return 'Tất cả';
    const found = categories.find(c => c.categoryID === selectedCategory);
    return found ? found.categoryName : 'Tất cả';
  }, [categories, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.productID.toString().includes(searchTerm) ||
                            p.productName.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (selectedCategory !== 'ALL' && p.categoryID !== Number(selectedCategory)) {
        return false;
      }
      return matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex justify-end font-inter">
      {/* Overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      ></div>
      
      {/* Drawer Content */}
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thêm sản phẩm báo giá</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Chọn từ danh mục sản phẩm của hệ thống</p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Đóng bảng chọn sản phẩm"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-950 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
          </button>
        </div>
        
        {/* Search & Category Filter */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="relative">
            <input 
              type="text" 
              name="product-search"
              aria-label="Tìm kiếm sản phẩm theo tên hoặc mã"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm sản phẩm theo tên, mã (ví dụ: SP-001, Gạch)…" 
              className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-4 pr-10 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-slate-700 shadow-sm"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" aria-hidden="true">search</span>
          </div>

          {/* Category Dropdown Filter */}
          <div className="relative w-full">
            <button 
              onClick={() => setIsOpenCategoryDropdown(!isOpenCategoryDropdown)}
              className="w-full bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl px-4 py-3 flex items-center justify-between text-left transition-all font-black text-slate-700 active:scale-[0.98] shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Danh mục</span>
                <span className="text-xs font-black truncate max-w-[280px] text-[#00288E]">
                  {selectedCategoryName}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenCategoryDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
                keyboard_arrow_down
              </span>
            </button>

            {isOpenCategoryDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => {
                    setIsOpenCategoryDropdown(false);
                    setCategorySearchQuery('');
                  }}
                />
                
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-30 overflow-hidden flex flex-col max-h-[300px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN DANH MỤC</span>
                    
                    <div className="relative w-36 group">
                      <input
                        type="text"
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        placeholder="Tìm nhanh..."
                        className="w-full bg-slate-100 border border-slate-200 text-[10px] font-bold rounded-lg pl-7 pr-5 py-1.5 outline-none focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500 transition-all text-slate-700 placeholder:text-slate-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-bold">search</span>
                      {categorySearchQuery && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategorySearchQuery('');
                          }}
                          className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 text-xs font-bold flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          close
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto p-3 flex-1 scrollbar-none max-h-[200px]">
                    {filteredCategoryOptions.length === 0 ? (
                      <div className="py-6 text-center text-xs font-bold text-slate-400 italic">
                        Không tìm thấy danh mục
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {filteredCategoryOptions.map((cat) => {
                          const isSelected = selectedCategory === cat.categoryID;
                          return (
                            <button
                              key={cat.categoryID}
                              type="button"
                              title={cat.categoryName}
                              onClick={() => {
                                setSelectedCategory(cat.categoryID);
                                setIsOpenCategoryDropdown(false);
                                setCategorySearchQuery('');
                              }}
                              className={`px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center min-h-[40px] leading-tight active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                isSelected
                                  ? 'bg-[#00288E] text-white shadow-lg shadow-blue-500/30 font-black'
                                  : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                              }`}
                            >
                              <span className="truncate max-w-full">{cat.categoryName}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-none">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-[#00288E] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 gap-2">
              <span className="material-symbols-outlined text-4xl">inventory_2</span>
              <p className="text-xs font-bold">Không tìm thấy sản phẩm phù hợp</p>
            </div>
          ) : (
            filteredProducts.map(prod => {
              const currentItem = quotationItems.find(item => item.productID === prod.productID);
              const qty = currentItem ? currentItem.quantity : 0;
              return (
                <div 
                  key={prod.productID} 
                  className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all duration-300 ${
                    qty > 0 ? 'border-blue-500/20 bg-blue-50/30' : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center text-[#00288E] border border-blue-100/50 shadow-inner group-hover:scale-105 transition-transform shrink-0 font-bold">
                    <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight truncate" title={prod.productName}>{prod.productName}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">SKU: SP-{prod.productID.toString().padStart(3, '0')} • ĐVT: {prod.unit || 'm2'}</p>
                    <p className="text-xs font-black text-blue-600 mt-1">{new Intl.NumberFormat('vi-VN').format(prod.salePrice)} VND</p>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {qty > 0 ? (
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button 
                          onClick={() => onUpdateItemField(prod.productID, 'quantity', qty - 1)}
                          aria-label={`Giảm số lượng sản phẩm ${prod.productName}`}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 hover:text-red-500 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <span className="material-symbols-outlined text-xs" aria-hidden="true">remove</span>
                        </button>
                        <span className="font-black text-[11px] text-slate-800 w-6 text-center">{qty}</span>
                        <button 
                          onClick={() => onUpdateItemField(prod.productID, 'quantity', qty + 1)}
                          aria-label={`Tăng số lượng sản phẩm ${prod.productName}`}
                          className="w-6 h-6 flex items-center justify-center rounded bg-[#00288E] shadow-sm text-white hover:bg-[#001D6E] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <span className="material-symbols-outlined text-xs" aria-hidden="true">add</span>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => onAddItem(prod)}
                        aria-label={`Thêm sản phẩm ${prod.productName} vào báo giá`}
                        className="bg-[#00288E] hover:bg-[#001D6E] text-white w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 shadow-md shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

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
    <div className="relative space-y-1.5 w-full" ref={dropdownRef}>
      <label htmlFor={`select-${label.replace(/\s+/g, '-').toLowerCase()}`} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{label}</label>
      <button
        type="button"
        id={`select-${label.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border-2 border-transparent hover:border-blue-100 focus:border-blue-500 rounded-xl p-3.5 text-sm font-bold transition-all text-slate-700 flex items-center justify-between shadow-sm cursor-pointer animate-fade-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500"
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

const AddQuotation = () => {
  const { toast, showToast } = useSalesToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Quotation main fields
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expiration, setExpiration] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerm, setPaymentTerm] = useState('NET_30');
  const [paymentMethod, setPaymentMethod] = useState('TRANSFER');
  const [notes, setNotes] = useState('');

  // Selected customer
  const [selectedCustomer, setSelectedCustomer] = useState(() => {
    const autoCust = location.state?.autoSelectCustomer;
    if (autoCust) {
      return autoCust;
    }
    return null;
  });
  const [customersList, setCustomersList] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef(null);

  // Selected products & quantities
  const [quotationItems, setQuotationItems] = useState([]);
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);

  // Bảng giá riêng được gán cho khách hàng đang chọn (nếu có), dùng để áp giá tự động
  const [customerPriceMap, setCustomerPriceMap] = useState(null);

  useEffect(() => {
    if (!selectedCustomer?.priceListId) {
      setCustomerPriceMap(null);
      return;
    }
    let mounted = true;
    adminService.getPriceListItems(selectedCustomer.priceListId).then(items => {
      if (!mounted) return;
      const map = new Map();
      (Array.isArray(items) ? items : []).forEach(it => map.set(Number(it.productID), Number(it.price)));
      setCustomerPriceMap(map);
    }).catch(err => {
      console.error('Lỗi khi tải bảng giá khách hàng:', err);
      setCustomerPriceMap(null);
    });
    return () => { mounted = false; };
  }, [selectedCustomer]);

  // Global taxes & discounts
  const [taxPercent, setTaxPercent] = useState(10);
  const [discountPercent, setDiscountPercent] = useState(0);



  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const data = await salesService.getCustomers();
        setCustomersList(data);
      } catch (e) {
        console.error("Lỗi khi tải danh sách khách hàng:", e);
      }
    };
    loadCustomers();
  }, []);

  // Warn about unsaved changes on browser refresh/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (selectedCustomer || quotationItems.length > 0) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời đi?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selectedCustomer, quotationItems]);

  const handleCancelOrBack = () => {
    if (selectedCustomer || quotationItems.length > 0) {
      const confirm = window.confirm("Bạn có chắc chắn muốn rời đi? Mọi thông tin chưa lưu sẽ bị mất.");
      if (!confirm) return;
    }
    navigate('/sales/quotations');
  };

  // Click outside customer dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter customer list
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customersList;
    return customersList.filter(c => {
      const q = customerSearch.toLowerCase();
      const name = (c.companyName || `${c.lastName} ${c.firstName}`).toLowerCase();
      const phone = (c.phoneNumber || '').toLowerCase();
      const id = `KH-${c.customerID.toString().padStart(5, '0')}`.toLowerCase();
      return name.includes(q) || phone.includes(q) || id.includes(q);
    });
  }, [customersList, customerSearch]);

  // Add item from drawer
  const handleAddItem = (prod) => {
    const overridePrice = customerPriceMap?.get(Number(prod.productID));
    setQuotationItems(prev => {
      const existing = prev.find(item => item.productID === prod.productID);
      if (existing) return prev;
      return [
        ...prev,
        {
          productID: prod.productID,
          productName: prod.productName,
          unit: prod.unit || 'm2',
          unitPrice: overridePrice ?? prod.salePrice ?? 0,
          quantity: 1,
          discount: 0
        }
      ];
    });
  };

  // Update item field (auto-remove if qty is 0)
  const handleUpdateItemField = (productId, field, value) => {
    setQuotationItems(prev => {
      if (field === 'quantity' && Number(value) <= 0) {
        return prev.filter(item => item.productID !== productId);
      }
      return prev.map(item => {
        if (item.productID === productId) {
          let val = value;
          if (field === 'quantity') {
            val = Math.max(1, parseInt(value) || 1);
          } else if (field === 'unitPrice') {
            val = Math.max(0, parseFloat(value) || 0);
          } else if (field === 'discount') {
            val = Math.min(100, Math.max(0, parseFloat(value) || 0));
          }
          return { ...item, [field]: val };
        }
        return item;
      });
    });
  };

  // Remove item from quote
  const removeItem = (productId) => {
    setQuotationItems(prev => prev.filter(item => item.productID !== productId));
  };

  // Calculations
  const calculations = useMemo(() => {
    const subtotal = quotationItems.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
      return sum + itemSubtotal;
    }, 0);

    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxPercent / 100);
    const totalAmount = afterDiscount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount
    };
  }, [quotationItems, taxPercent, discountPercent]);

  // Handle Save
  const handleSaveQuotation = async () => {
    if (!selectedCustomer) {
      showToast("Vui lòng chọn khách hàng!", "error");
      return;
    }
    if (quotationItems.length === 0) {
      showToast("Vui lòng chọn ít nhất một sản phẩm!", "error");
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        customerID: selectedCustomer.customerID,
        customerName: selectedCustomer.companyName || `${selectedCustomer.lastName} ${selectedCustomer.firstName}`,
        quotationDate,
        expiration,
        paymentTerm,
        paymentMethod,
        totalAmount: calculations.totalAmount,
        quotationStatus: 'PENDING',
        items: quotationItems.map(item => ({
          productID: item.productID,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount
        })),
        notes
      };

      // Temporarily disable warnings before redirect
      setSelectedCustomer(null);
      setQuotationItems([]);

      await salesService.createQuotation(payload);
      navigate('/sales/quotations', { state: { showCreateSuccessToast: true } });

    } catch (e) {
      console.error(e);
      showToast("Có lỗi xảy ra khi lưu báo giá!", "error");
      setLoading(false);
    }
  };

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-8 pb-10">
      
      {/* Toast Alert */}
      <SalesToastNotification toast={toast} />

      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-2 md:px-0 shrink-0">
        <div className="flex items-center gap-4 sm:gap-6">
          <button 
            onClick={handleCancelOrBack} 
            aria-label="Quay lại danh sách báo giá"
            className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-[#00288E] transition-colors" aria-hidden="true">arrow_back</span>
          </button>
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight text-balance">Tạo báo giá mới</h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
              Thiết lập báo giá sản phẩm cho khách hàng{" "}
              <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-black whitespace-nowrap animate-fade-in text-[9px]">
                Bản nháp
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={handleCancelOrBack}
            className="px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSaveQuotation}
            disabled={loading}
            className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-6 py-3 sm:px-8 sm:py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] active:scale-95 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Đang lưu…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base sm:text-lg group-hover:rotate-12 transition-transform" aria-hidden="true">save</span>
                <span>Lưu báo giá mới</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-2">
        <div className="flex flex-col xl:flex-row gap-8 mx-2 md:mx-0 xl:items-stretch">
          
          {/* Cột trái - Các thông tin chính và Items */}
          <div className="xl:flex-[2] flex flex-col gap-8">
            
            {/* Card: Thông tin Báo Giá */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-8 border-b border-slate-50 pb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#00288E]">
                  <span className="material-symbols-outlined text-xl">description</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin báo giá</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Xác định thời hạn & phương thức giao dịch</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <CustomDatePicker
                  label="Ngày lập báo giá"
                  value={quotationDate}
                  onChange={setQuotationDate}
                />
                <CustomDatePicker
                  label="Ngày hết hạn"
                  value={expiration}
                  onChange={setExpiration}
                />
                <CustomSelect
                  label="Điều khoản thanh toán"
                  value={paymentTerm}
                  onChange={setPaymentTerm}
                  options={[
                    { value: 'ADVANCE_100', label: 'Trả trước 100% (Advance 100%)' },
                    { value: 'COD_50_50', label: 'Trả trước 50%, 50% còn lại thanh toán khi giao hàng (COD)' },
                    { value: 'NET_30', label: 'Thanh toán trong vòng 30 ngày (Net 30)' },
                    { value: 'NET_15', label: 'Thanh toán trong vòng 15 ngày (Net 15)' },
                    { value: 'CUSTOM', label: 'Thỏa thuận khác (Custom)' }
                  ]}
                />
                <CustomSelect
                  label="Phương thức thanh toán"
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={[
                    { value: 'TRANSFER', label: 'Chuyển khoản ngân hàng (TRANSFER)' },
                    { value: 'CASH', label: 'Tiền mặt (CASH)' }
                  ]}
                />
              </div>
            </div>

            {/* Card: Danh Sách Sản Phẩm */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 flex-1 flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-50 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined text-xl">inventory</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sản phẩm báo giá</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Danh sách hàng hóa & khối lượng chiết tính</p>
                  </div>
                </div>

                <button 
                  onClick={() => setIsProductDrawerOpen(true)}
                  className="bg-[#00288E] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#001D6E] transition-all active:scale-95 shadow-lg shadow-blue-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span className="material-symbols-outlined text-sm">add</span> Thêm SP
                </button>
              </div>

              {/* Items List */}
              {quotationItems.length === 0 ? (
                <div className="py-12 flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 border-2 border-dashed border-slate-100 rounded-xl">
                  <span className="material-symbols-outlined text-5xl">production_quantity_limits</span>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">Chưa có sản phẩm nào được chọn</p>
                  <button 
                    onClick={() => setIsProductDrawerOpen(true)}
                    className="text-xs font-black uppercase tracking-widest text-[#00288E] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Bấm để chọn ngay
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[420px] scrollbar-none pr-1">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 shadow-[0_1px_0_0_rgba(241,245,249,1)]">
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)] w-[38%]">Sản phẩm</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)] w-[18%]">Số lượng</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)] w-[18%] pr-4">Đơn giá bán</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)] w-[12%]">Chiết khấu (%)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)] w-[14%] pr-2">Thành tiền</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center w-12 sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotationItems.map((item) => {
                        const itemSubtotal = item.quantity * item.unitPrice * (1 - item.discount / 100);
                        return (
                          <tr key={item.productID} className="group border-b border-slate-100 last:border-none hover:bg-slate-50/40 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100/50 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                                  <span className="material-symbols-outlined text-[20px]">image</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="font-black text-slate-900 uppercase tracking-tight text-sm truncate max-w-[180px] sm:max-w-[220px]" title={item.productName}>{item.productName}</p>
                                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">
                                    ĐVT: {item.unit} • SKU: SP-{item.productID.toString().padStart(3, '0')}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-3 bg-slate-50 p-1 rounded-2xl w-fit mx-auto border border-slate-100 hover:border-blue-100 transition-all">
                                <button 
                                  onClick={() => handleUpdateItemField(item.productID, 'quantity', item.quantity - 1)}
                                  aria-label="Giảm số lượng"
                                  className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-rose-500 transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                  <span className="material-symbols-outlined text-sm" aria-hidden="true">remove</span>
                                </button>
                                <input 
                                  type="number" 
                                  min="1"
                                  name={`qty-${item.productID}`}
                                  aria-label="Số lượng sản phẩm"
                                  autoComplete="off"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateItemField(item.productID, 'quantity', e.target.value)}
                                  className="w-8 bg-transparent text-slate-900 text-center text-xs font-black outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500 focus:rounded tabular-nums"
                                />
                                <button 
                                  onClick={() => handleUpdateItemField(item.productID, 'quantity', item.quantity + 1)}
                                  aria-label="Tăng số lượng"
                                  className="w-8 h-8 flex items-center justify-center bg-[#00288E] rounded-xl shadow-md shadow-blue-900/10 text-white hover:bg-[#001D6E] transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                  <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right pr-4">
                              <input 
                                type="number" 
                                min="0"
                                name={`price-${item.productID}`}
                                aria-label="Đơn giá sản phẩm"
                                autoComplete="off"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItemField(item.productID, 'unitPrice', e.target.value)}
                                className="w-28 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-lg p-2 text-right text-sm font-bold outline-none transition-all text-slate-800 ml-auto block tabular-nums"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="number" 
                                min="0"
                                max="100"
                                name={`discount-${item.productID}`}
                                aria-label="Chiết khấu phần trăm"
                                autoComplete="off"
                                value={item.discount}
                                onChange={(e) => handleUpdateItemField(item.productID, 'discount', e.target.value)}
                                className="w-16 bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-lg p-2 text-center text-sm font-bold outline-none transition-all text-slate-800 mx-auto block tabular-nums"
                              />
                            </td>
                            <td className="px-6 py-4 text-right pr-2 tabular-nums">
                              {formatCurrency(itemSubtotal, true)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => removeItem(item.productID)}
                                className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all duration-200 active:scale-95 border border-red-100 hover:border-red-500 shadow-sm hover:shadow-red-500/20 mx-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                title="Xóa khỏi danh sách"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Cột phải - Chọn khách hàng, ghi chú và thanh toán */}
          <div className="xl:flex-[1] flex flex-col gap-8">
            
            {/* Card: Chọn Khách Hàng */}
            <div className="bg-[#00288E] rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-blue-900/5 relative group">
              {/* Cắt viền bóng tròn mà không làm ẩn dropdown */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-white text-lg">groups</span>
                  Khách hàng nhận báo giá
                </h3>

                {selectedCustomer ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-base font-black">
                        {(selectedCustomer.companyName || selectedCustomer.firstName || 'KH').split(' ').pop().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm uppercase tracking-tight truncate">{selectedCustomer.companyName || `${selectedCustomer.lastName} ${selectedCustomer.firstName}`}</p>
                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mt-0.5">
                          ID: KH-{selectedCustomer.customerID.toString().padStart(5, '0')}
                        </p>
                      </div>
                    </div>

                    {customerPriceMap && (
                      <div className="flex items-center gap-2 bg-emerald-400/10 border border-emerald-300/20 text-emerald-300 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        <span className="material-symbols-outlined text-sm">sell</span>
                        Đã áp dụng bảng giá riêng (BG-{String(selectedCustomer.priceListId).padStart(3, '0')})
                      </div>
                    )}

                    <div className="space-y-2.5 text-[11px] font-bold text-white/70 bg-white/5 p-4 rounded-xl border border-white/5">
                      <div className="flex justify-between">
                        <span>Điện thoại:</span>
                        <span className="text-white">{selectedCustomer.phoneNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <span className="text-white truncate max-w-[150px]">{selectedCustomer.email || 'N/A'}</span>
                      </div>
                      <div className="pt-2 border-t border-white/5 text-[10px] leading-relaxed">
                        <span className="block text-white/40 uppercase font-black tracking-wider mb-1">Địa chỉ giao dịch:</span>
                        <span className="text-white/80">{selectedCustomer.address || 'N/A'}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all border border-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Thay đổi khách hàng
                    </button>
                  </div>
                ) : (
                  <div className="relative" ref={customerDropdownRef}>
                    <div className="relative">
                      <input 
                        type="text" 
                        name="customer-search"
                        aria-label="Tìm kiếm khách hàng nhận báo giá"
                        placeholder="Tìm kiếm khách hàng (ví dụ: Công ty Hizo)…" 
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className="w-full bg-white/10 border-2 border-transparent focus:border-white/50 focus:ring-2 focus:ring-white/30 rounded-xl p-3.5 pl-10 text-sm font-bold outline-none transition-all placeholder:text-white/30 text-white" 
                      />
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-base" aria-hidden="true">search</span>
                    </div>

                    {showCustomerDropdown && (
                      <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-[220px] overflow-y-auto scrollbar-none">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 text-[10px] font-black uppercase tracking-wider">
                            Không tìm thấy khách hàng
                          </div>
                        ) : (
                          filteredCustomers.map(cust => (
                            <button 
                              key={cust.customerID}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setShowCustomerDropdown(false);
                                setCustomerSearch('');
                              }}
                              className="w-full p-3.5 border-b border-slate-100 hover:bg-blue-50/40 cursor-pointer transition-colors text-left flex flex-col gap-0.5 group/item focus-visible:outline-none focus-visible:bg-blue-50"
                            >
                              <p className="text-xs font-black text-slate-800 group-hover/item:text-[#00288E] uppercase tracking-tight transition-colors">
                                {cust.companyName || `${cust.lastName} ${cust.firstName}`}
                              </p>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                SĐT: {cust.phoneNumber || 'N/A'} • ID: KH-{cust.customerID.toString().padStart(5, '0')}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Card: Tổng Cộng Chiết Tính */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-300">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 pb-4 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">payments</span>
                Tổng cộng chiết tính
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng tạm tính</span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(calculations.subtotal, true)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chiết khấu tổng (%)</span>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    name="global-discount"
                    aria-label="Chiết khấu tổng phần trăm"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-lg p-1.5 text-center text-sm font-bold outline-none transition-all text-slate-800 tabular-nums"
                  />
                </div>

                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thuế suất GTGT (%)</span>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    name="global-tax"
                    aria-label="Thuế suất phần trăm"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-lg p-1.5 text-center text-sm font-bold outline-none transition-all text-slate-800 tabular-nums"
                  />
                </div>

                <div className="pt-4 flex justify-between items-end">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Thành tiền (Đã thuế)</p>
                    <div className="text-3xl font-black text-[#00288E] tracking-tighter leading-none tabular-nums">
                      {formatCurrency(calculations.totalAmount, false, "text-[#00288E]")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card: Ghi chú điều khoản khác */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-base" aria-hidden="true">description</span> 
                Ghi chú điều khoản khác
              </h4>
              <textarea 
                rows="4" 
                name="quotation-notes"
                aria-label="Ghi chú điều khoản bổ sung"
                placeholder="Ghi chú thêm về điều kiện vận chuyển, thời gian bàn giao, hiệu lực báo giá…" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-700 resize-none"
              ></textarea>
            </div>

          </div>
        </div>
      </div>

      <ProductSelectionDrawer 
        isOpen={isProductDrawerOpen}
        onClose={() => setIsProductDrawerOpen(false)}
        quotationItems={quotationItems}
        onUpdateItemField={handleUpdateItemField}
        onAddItem={handleAddItem}
      />
    </div>
  );
};

export default AddQuotation;
