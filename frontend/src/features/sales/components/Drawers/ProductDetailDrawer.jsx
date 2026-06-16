import React, { useState, useEffect, useMemo } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Tabs, 
  Tab,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  History as HistoryIcon,
  Inventory as InventoryIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import salesService from '../../services/salesService';
import dbData from '../../../../../db.json';
import { useSwipeToClose } from './useSwipeToClose';
import { formatVND, VNDDisplay } from '../../../../utils/formatVND';

// --- HÀM ĐỊNH DẠNG NGÀY HOẠT ĐỘNG (chỉ hiển thị ngày, DB dùng kiểu DATE) ---

// Module Sales chỉ XEM chi tiết sản phẩm — không có thao tác sửa/xóa.
const ProductDetailDrawer = ({ open, onClose, product }) => {
  const swipeHandlers = useSwipeToClose(onClose);
  const [tabValue, setTabValue] = useState(0);
  const [history, setHistory] = useState({ orders: [], invoices: [], orderItems: [] });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [, setDrawerOpenTime] = useState(Date.now());

  // States cho tính năng tìm kiếm và lọc thời gian
  const [searchQuery, setSearchQuery] = useState('');
  
  // States cho custom Date Calendar Picker
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

  // Prevent focus-trapping DevTools warning by blurring any focused descendant when drawer is closed
  useEffect(() => {
    if (!open) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setDrawerOpenTime(Date.now());
    }
  }, [open]);

  useEffect(() => {
    if (open && product?.productID) {
      fetchProductHistory();
    }
  }, [open, product?.productID]);

  const fetchProductHistory = async () => {
    setLoading(true);
    try {
      // 1. Lấy tất cả orders, invoices
      const allOrders = await salesService.getOrders(null, 'all', { ignoreUserFilter: true });
      
      // 2. Lấy tất cả order items từ local storage và mock db
      const localOrderItems = (() => {
        try {
          const raw = localStorage.getItem('added_order_items');
          return raw ? JSON.parse(raw) : [];
        } catch { return []; }
      })();
      const apiOrderItems = dbData.orderItems || [];
      const allOrderItems = [...localOrderItems, ...apiOrderItems];

      // 3. Lọc ra các order items thuộc về sản phẩm này
      const productOrderItems = allOrderItems.filter(oi => Number(oi.productID) === Number(product.productID));
      
      // 4. Lọc ra các orders và invoices liên quan
      const productOrders = allOrders.filter(o => productOrderItems.some(oi => Number(oi.orderID) === Number(o.orderID)));
      const productInvoices = [];

      setHistory({
        orders: productOrders,
        invoices: productInvoices,
        orderItems: productOrderItems
      });

      // Lấy lịch sử hoạt động qua API ready-for-BE
      const acts = await salesService.getProductActivities(product.productID);
      setActivities(acts);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử sản phẩm:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HÀM TIỆN ÍCH CHO CUSTOM CALENDAR PICKER ---
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const matchDate = (itemDateStr) => {
    if (!selectedDate) return true;
    const itemDate = new Date(itemDateStr);
    if (selectedDate.isMonthOnly) {
      return itemDate.getMonth() === selectedDate.month &&
             itemDate.getFullYear() === selectedDate.year;
    }
    return itemDate.getDate() === selectedDate.getDate() &&
           itemDate.getMonth() === selectedDate.getMonth() &&
           itemDate.getFullYear() === selectedDate.getFullYear();
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchQuery = act.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         act.user.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchQuery) return false;
      
      // Chuyển đổi act.time (ngày định dạng DD/MM/YYYY) thành Date object để so khớp trong matchDate
      const parts = act.time.split('/');
      const dateObj = parts.length === 3 
        ? new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])) 
        : new Date(act.time);
      return matchDate(dateObj);
    });
  }, [activities, searchQuery, selectedDate]);

  const stats = useMemo(() => {
    if (!history.orderItems) return { totalSold: 0, totalRevenue: 0, orderCount: 0 };
    const totalSold = history.orderItems.reduce((sum, oi) => sum + (oi.quantity || 0), 0);
    const totalRevenue = history.orderItems.reduce((sum, oi) => sum + ((oi.quantity || 0) * (product.price || 0)), 0);
    const orderCount = history.orders.length;
    return { totalSold, totalRevenue, orderCount };
  }, [history, product]);

  if (!product) return null;

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchQuery('');
    setSelectedDate(null);
    setTempSelectedDate(null);
    setCalendarOpen(false);
  };

  const formatCurrency = (val, customColorClass = 'text-[#00288E]') => {
    if (val === undefined || val === null) return "0 VND";
    const formatted = formatVND(val, false);
    return (
      <span className="inline-flex items-baseline gap-0.5 font-inter">
        <span className={`font-black ${customColorClass}`}>{formatted}</span>
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 ml-0.5">VND</span>
      </span>
    );
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Còn hàng':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold';
      case 'Sắp hết':
        return 'bg-orange-50 border-orange-200 text-orange-700 font-bold';
      case 'Hết hàng':
        return 'bg-rose-50 border-rose-200 text-rose-700 font-bold';
      case 'Ngừng kinh doanh':
      default:
        return 'bg-slate-50 border-slate-200 text-slate-600 font-bold';
    }
  };

  return (
    <Drawer 
      anchor="right" 
      open={open} 
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { 
            width: { xs: '100vw', sm: 550 }, 
            borderLeft: '1px solid #e2e8f0', 
            boxShadow: '-20px 0 50px rgba(0,0,0,0.05)',
            borderRadius: { xs: 0, sm: '2.5rem 0 0 2.5rem' },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }
        }
      }}
    >
      <div {...swipeHandlers} className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shrink-0 font-inter">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
          Chi tiết sản phẩm
        </h2>
        <IconButton onClick={onClose} className="bg-slate-50 hover:bg-slate-100 transition-all">
          <span className="material-symbols-outlined text-slate-400">close</span>
        </IconButton>
      </div>

      <Box className="flex-1 overflow-y-auto scrollbar-none bg-slate-50/30">
        <Box className="p-6 bg-gradient-to-br from-white to-slate-50">
          <Box className="flex items-start gap-5 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase shadow-sm border-2 border-white overflow-hidden shrink-0">
              {product.imageURL ? (
                <img src={product.imageURL} className="w-full h-full object-cover" alt={product.name} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '2.5rem' }}>image</span>
              )}
            </div>
            <Box className="flex-1">
              <Typography className="text-xl font-black text-slate-900 leading-tight mb-1 font-inter">
                {product.name}
              </Typography>
              <Typography className="text-xs font-bold text-slate-400 uppercase tracking-widest font-inter mb-2">
                SKU: {product.id}
              </Typography>
              <Box className="flex gap-2 items-center flex-wrap">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter ${getStatusStyle(product.status)}`}>
                  <div className={`w-2 h-2 rounded-full ${product.status === 'Còn hàng' ? 'bg-emerald-500' : product.status === 'Sắp hết' ? 'bg-orange-500' : 'bg-rose-500'}`}></div>
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    {product.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter bg-slate-50 border-slate-200 text-slate-600">
                  <span className="material-symbols-outlined text-[14px]">category</span>
                  <span className="text-[9px] font-black uppercase tracking-wider">
                    {typeof product.category === 'object' ? (product.category.categoryName || product.category.name || 'Khác') : (product.category || 'Khác')}
                  </span>
                </div>
              </Box>
            </Box>
          </Box>
 
          <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Giá bán</p>
                <p className="text-lg font-black text-[#00288E] font-inter">{formatCurrency(product.price, 'text-lg text-[#00288E]')}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">payments</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Tồn kho</p>
                <p className="text-lg font-black text-[#00288E] font-inter">
                  {product.stock.toLocaleString('vi-VN')}
                  <span className="text-[10px] text-slate-400 uppercase tracking-tighter ml-1">/{product.unit}</span>
                </p>
              </div>
            </div>
          </Box>
        </Box>

        <Divider />

        {/* Tabs Section */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': {
                fontFamily: 'Inter, sans-serif',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#64748b',
                minHeight: '56px',
                minWidth: 'auto !important',
                padding: '6px 8px !important',
                whiteSpace: 'nowrap !important'
              },
              '& .Mui-selected': {
                color: '#00288E !important',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#00288E',
                height: '3px',
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab label="Thông tin" icon={<InventoryIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
            <Tab label="Lịch sử" icon={<HistoryIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
            <Tab label="Thống kê" icon={<BarChartIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box className="p-4">
          {tabValue === 0 && (
            <Box className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm animate-in fade-in duration-300">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                  <span className="material-symbols-outlined text-[#00288E] text-[18px]">info</span>
                  Thông tin cơ bản
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Tên sản phẩm</span>
                    <span className="text-xs font-black text-slate-800 font-inter text-right max-w-[200px]">{product.name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Phân loại</span>
                    <span className="text-xs font-black text-slate-800 font-inter">
                      {typeof product.category === 'object' ? (product.category.categoryName || product.category.name || 'Khác') : (product.category || 'Khác')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Đơn vị tính</span>
                    <span className="text-xs font-black text-slate-800 font-inter uppercase">{product.unit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Ngưỡng cảnh báo</span>
                    <span className="text-xs font-black text-orange-600 font-inter">20 {product.unit}</span>
                  </div>
                </div>
              </div>
            </Box>
          )}

          {tabValue === 1 && (
            <Box className="flex flex-col gap-4 animate-fade-in">
              {/* Search bar & Custom Calendar Picker Dropdown */}
              <Box className="p-4 bg-slate-100/50 border border-slate-200/80 rounded-[1.5rem] flex gap-3 items-center">
                <Box className="flex-1 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm hoạt động..." 
                    aria-label="Tìm kiếm lịch sử hoạt động"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none text-xs font-bold text-slate-700 bg-white placeholder-slate-400 transition-all font-inter"
                  />
                </Box>

                {/* Custom Date Picker Popover */}
                <Box className="relative shrink-0 font-inter">
                  <button 
                    onClick={() => {
                      if (!calendarOpen) {
                        setTempSelectedDate(selectedDate);
                      }
                      setCalendarOpen(!calendarOpen);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all text-xs font-black bg-white shadow-sm active:scale-95 ${
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
                            : selectedDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }))
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
                      <Box className="absolute right-0 mt-2 z-50 bg-white border border-slate-200 shadow-2xl rounded-3xl p-4 w-[285px] origin-top-right">
                        
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
                            <div className="grid grid-cols-7 gap-1 text-center mb-1">
                              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
                                <span key={idx} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
                              ))}
                            </div>

                            {/* Grid các Ngày */}
                            <div className="grid grid-cols-7 gap-1">
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
                                        ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/20' 
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
                          <div className="grid grid-cols-3 gap-2 py-2">
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
                          <div className="grid grid-cols-3 gap-2 py-2">
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
                          <Box className="flex justify-end items-center mt-4 pt-3 border-t border-slate-100">
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
              </Box>

              {/* Timeline list */}
              {loading ? (
                <Box className="flex justify-center items-center py-12">
                  <CircularProgress size={24} sx={{ color: '#00288E' }} />
                </Box>
              ) : filteredActivities.length > 0 ? (
                <Box className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300">
                  <Box className="flex flex-col gap-6 relative pl-6 before:content-[''] before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100 max-h-[350px] overflow-y-auto pr-2 scrollbar-none">
                    {filteredActivities.map((act, idx) => (
                      <ActivityItem 
                        key={idx}
                        title={act.title} 
                        time={act.time} 
                        user={act.user} 
                        color={act.color}
                        desc={act.desc}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <EmptyState message="Chưa có hoạt động phù hợp" />
              )}
            </Box>
          )}

          {tabValue === 2 && (
            <Box className="flex flex-col gap-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                  <span className="material-symbols-outlined text-[#00288E] text-[18px]">bar_chart</span>
                  Hiệu suất kinh doanh
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-4 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Sản lượng đã bán</p>
                    <p className="text-lg font-black text-[#00288E] font-inter">
                      {stats.totalSold.toLocaleString('vi-VN')}
                      <span className="text-[10px] text-slate-400 ml-1 uppercase tracking-tighter">/{product.unit}</span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-4 rounded-xl border border-emerald-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Doanh thu thu hồi</p>
                    <p className="text-lg font-black text-emerald-700 font-inter">
                      {formatCurrency(stats.totalRevenue, 'text-emerald-700')}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Số lượng đơn hàng</span>
                    <span className="text-xs font-black text-slate-800 font-inter">{stats.orderCount} đơn</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Tốc độ tiêu thụ</span>
                    <span className="text-xs font-black text-slate-800 font-inter">
                      {stats.totalSold > 0 ? (stats.totalSold / 30).toFixed(1) : 0} {product.unit}/ngày (trung bình 30 ngày)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Tần suất xuất hiện</span>
                    <span className="text-xs font-black text-slate-800 font-inter">
                      {stats.orderCount > 0 ? `${((stats.orderCount / (history.orders.length || 1)) * 100).toFixed(0)}%` : '0%'} số đơn hàng
                    </span>
                  </div>
                </div>
              </div>
            </Box>
          )}
        </Box>
      </Box>

      {/* Footer Actions — chỉ có nút Đóng (Sales chỉ xem) */}
      <div className="p-6 bg-white border-t border-slate-200 flex gap-4 shrink-0 font-inter">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 border-slate-300 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">close</span>
          Đóng
        </button>
      </div>
      </div>
    </Drawer>
  );
};

const ActivityItem = ({ title, time, user, color = 'bg-slate-400', desc }) => (
  <Box className="relative font-inter">
    <div className={`absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full ${color} border-2 border-white ring-4 ring-slate-50 z-10`}></div>
    <Typography className="text-xs font-black text-slate-800 leading-none mb-1.5 font-inter">
      {title} {desc && <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] text-white ${color}`}>{desc}</span>}
    </Typography>
    <Box className="flex gap-2 items-center">
      <span className="text-[10px] text-slate-400 font-bold font-inter">{time}</span>
      <div className="w-1 h-1 rounded-full bg-slate-300"></div>
      <Box className="flex items-center gap-1">
        <span className="text-[10px] text-slate-500 font-black uppercase font-inter">{user}</span>
      </Box>
    </Box>
  </Box>
);

const EmptyState = ({ message }) => (
  <Box className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 font-inter mt-4">
    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-4">
      <TrendingUpIcon className="text-slate-300" />
    </div>
    <Typography className="text-sm font-bold text-slate-400 font-inter">{message}</Typography>
  </Box>
);

export default ProductDetailDrawer;
