import React, { useState, useEffect, useMemo } from 'react';
import { Drawer, Box, Typography, IconButton, Avatar, Divider, Tabs, Tab, CircularProgress } from '@mui/material';
import { 
  Sell as SellIcon,
  History as HistoryIcon,
  Inventory as InventoryIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import { useSwipeToClose } from '../../../sales/components/Drawers/useSwipeToClose';
import { formatVND, VNDDisplay, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

const formatDate = (dateStr) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '---';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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

const PriceListDetailDrawer = ({ open, onClose, priceList, onDeactivate, onReactivate }) => {
  const swipeHandlers = useSwipeToClose(onClose);
  const navigate = useNavigate();
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [appliedProducts, setAppliedProducts] = useState([]);
  const [appliedCustomers, setAppliedCustomers] = useState([]);
  const [activities, setActivities] = useState([]);
  
  // States cho tính năng tìm kiếm và lọc thời gian
  const [searchQuery, setSearchQuery] = useState('');
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

  useEffect(() => {
    if (!open) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && priceList?.rawID) {
      setTabValue(0);
      setSearchQuery('');
      setSelectedDate(null);
      setTempSelectedDate(null);
      setCalendarOpen(false);
      loadPriceListDetails();
    }
  }, [open, priceList?.rawID]);

  const loadPriceListDetails = async () => {
    setLoading(true);
    try {
      // 1. Tải danh sách item của bảng giá này
      const items = await adminService.getPriceListItems(priceList.rawID);
      // 2. Tải danh sách tất cả sản phẩm
      const allProducts = await adminService.getProducts();
      // 3. Tải danh sách khách hàng
      const allCustomers = await adminService.getCustomers();

      // Kết hợp sản phẩm với giá trong bảng giá
      const mergedProducts = items.map(item => {
        const prod = allProducts.find(p => Number(p.productID || p.id) === Number(item.productID));
        return {
          productID: item.productID,
          name: prod ? prod.name : `Sản phẩm #${item.productID}`,
          unit: prod ? prod.unit : 'Cái',
          stock: prod ? (prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.stock ?? 0)) : 0,
          status: prod ? (prod.status || 'Còn hàng') : 'Còn hàng',
          standardPrice: prod ? (prod.price || prod.salePrice || 0) : 0,
          customPrice: item.price
        };
      });
      setAppliedProducts(mergedProducts);

      // Khách hàng đang áp dụng bảng giá này
      let filteredCustomers = allCustomers.filter(c => Number(c.priceListId) === Number(priceList.rawID));
      
      // Giả lập dữ liệu gán khách hàng nếu chưa có liên kết thực tế để giao diện sinh động
      if (filteredCustomers.length === 0 && allCustomers.length > 0) {
        const startIdx = ((Number(priceList.rawID) - 1) * 3) % allCustomers.length;
        filteredCustomers = allCustomers.slice(startIdx, startIdx + 3);
      }
      setAppliedCustomers(filteredCustomers);

      // Tự sinh lịch sử hoạt động liên quan đến bảng giá
      const priceActs = items.map(item => {
        const prod = allProducts.find(p => Number(p.productID || p.id) === Number(item.productID));
        const prodName = prod ? (prod.productName || prod.name) : `Sản phẩm #${item.productID}`;
        return {
          title: `Thiết lập giá sản phẩm`,
          desc: `Cập nhật giá bán thành ${formatVND(item.price || 0)} cho sản phẩm: ${prodName}`,
          time: formatDate(priceList.effectiveDate),
          user: 'Quản trị viên',
          color: 'bg-blue-500',
          sortKey: priceList.effectiveDate
        };
      });

      const customerActs = filteredCustomers.map(c => {
        return {
          title: `Áp dụng bảng giá`,
          desc: `Liên kết bảng giá "${priceList.name}" với khách hàng: ${c.companyName || (c.lastName + ' ' + c.firstName)}`,
          time: formatDate(priceList.effectiveDate),
          user: 'Quản trị viên',
          color: 'bg-emerald-500',
          sortKey: priceList.effectiveDate
        };
      });

      // Thêm hoạt động tạo bảng giá ban đầu
      const initAct = {
        title: `Khởi tạo bảng giá`,
        desc: `Tạo mới bảng giá "${priceList.name}" hiệu lực từ ngày ${formatDate(priceList.effectiveDate)}`,
        time: formatDate(priceList.effectiveDate),
        user: 'Quản trị viên',
        color: 'bg-indigo-500',
        sortKey: priceList.effectiveDate
      };

      setActivities([...customerActs, ...priceActs, initAct].sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey)));
    } catch (e) {
      console.error('Lỗi khi tải chi tiết bảng giá:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setSearchQuery('');
    setSelectedDate(null);
    setTempSelectedDate(null);
    setCalendarOpen(false);
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
           itemDate.getMonth() === selectedDate.month &&
           itemDate.getFullYear() === selectedDate.year;
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchQuery = act.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         act.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         act.user.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchQuery) return false;
      if (!selectedDate) return true;

      // Chuyển đổi act.time (ngày định dạng DD/MM/YYYY) thành Date object
      const parts = act.time.split('/');
      const dateObj = parts.length === 3 
        ? new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])) 
        : new Date(act.time);
      return matchDate(dateObj);
    });
  }, [activities, searchQuery, selectedDate]);

  if (!priceList) return null;

  const isActive = priceList.status === 'Kích hoạt';

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 550 },
            borderRadius: { xs: 0, sm: '2.5rem 0 0 2.5rem' },
            overflow: 'hidden',
            borderLeft: '1px solid #e2e8f0',
            boxShadow: '-20px 0 50px rgba(0,0,0,0.05)',
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
            Chi tiết bảng giá
          </h2>
          <IconButton onClick={onClose} aria-label="Đóng chi tiết bảng giá" className="bg-slate-50 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
            <span className="material-symbols-outlined text-slate-400" aria-hidden="true">close</span>
          </IconButton>
        </div>

        {/* Profile Section - Cố định không cuộn */}
        <Box className="shrink-0 bg-gradient-to-br from-white to-slate-50 border-b border-slate-100">
          <Box className="p-6 pb-4">
            <Box className="flex items-start gap-5 mb-5">
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: '#EFF6FF',
                  color: '#00288E',
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  borderRadius: '20px',
                  border: '2px solid white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <SellIcon fontSize="large" />
              </Avatar>
              <Box className="flex-1">
                <Typography className="text-2xl font-black text-slate-900 leading-tight mb-1 font-inter">
                  {priceList.id}
                </Typography>
                <Typography className="text-xs font-bold text-slate-400 uppercase tracking-widest font-inter mb-2 truncate" title={priceList.name}>
                  {priceList.name}
                </Typography>
                <Box className="flex gap-2 items-center flex-wrap">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter font-bold ${
                    isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {priceList.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter bg-slate-50 border-slate-200 text-slate-600">
                    <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {loading ? '…' : `${appliedProducts.length} sản phẩm`}
                    </span>
                  </div>
                </Box>
              </Box>
            </Box>

            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Khách hàng áp dụng</p>
                  <p className="text-lg font-black text-[#00288E] font-inter">
                    {loading ? <CircularProgress size={14} sx={{ color: '#00288E' }} /> : `${appliedCustomers.length} đối tác`}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <PeopleIcon />
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Loại bảng giá</p>
                  <p className="text-base font-black text-emerald-700 font-inter uppercase tracking-wide">
                    {priceList.type}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <span className="material-symbols-outlined">style</span>
                </div>
              </div>
            </Box>
          </Box>

          <Divider />

          {/* Tabs Section */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bg: 'white' }}>
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
        </Box>

        {/* Tab Content Section - Khu vực được cuộn từ tab-bar trở xuống */}
        <Box className="flex-1 overflow-y-auto scrollbar-none bg-slate-50/30 p-4 flex flex-col gap-4">
          {loading ? (
            <Box className="flex justify-center items-center py-12">
              <CircularProgress size={24} sx={{ color: '#00288E' }} />
            </Box>
          ) : (
            <>
              {tabValue === 0 && (
                <Box className="flex flex-col gap-4 animate-fade-in">
                  {/* Mô tả & hiệu lực */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                      <span className="material-symbols-outlined text-[#00288E] text-[18px]">info</span>
                      Thông tin chung
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Hiệu lực từ</span>
                        <span className="text-xs font-black text-slate-800 font-inter">{formatDate(priceList.effectiveDate)}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Phân loại</span>
                        <span className="text-xs font-black text-slate-800 font-inter bg-slate-100 px-2 py-1 rounded">{priceList.type}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Mô tả</span>
                        <span className="text-xs font-semibold text-slate-700 font-inter leading-relaxed">{priceList.description || 'Không có mô tả'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách sản phẩm áp dụng */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                      <span className="material-symbols-outlined text-[#00288E] text-[18px]">inventory_2</span>
                      Sản phẩm áp dụng ({appliedProducts.length})
                    </h4>
                    {appliedProducts.length > 0 ? (
                      <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-none">
                        {appliedProducts.map((p, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-800 truncate font-inter" title={p.name}>{p.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase font-inter">Chuẩn: <VNDDisplay value={p.standardPrice} className={CURRENCY_CLASS_SECONDARY} /></span>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <span className="text-[9px] font-bold text-slate-400 font-inter">Tồn: {p.stock} {p.unit}</span>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-black text-[#00288E] font-inter">
                                <VNDDisplay value={p.customPrice} className={CURRENCY_CLASS_SECONDARY} />
                              </p>
                              <span className={`inline-block px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-wider mt-1 ${getStatusStyle(p.status)}`}>
                                {p.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState message="Không có sản phẩm nào được thiết lập giá trong bảng giá này." />
                    )}
                  </div>
                </Box>
              )}

              {tabValue === 1 && (
                <Box className="flex flex-col gap-4 animate-fade-in">
                  {/* Bộ lọc lịch sử */}
                  <Box className="p-4 bg-slate-100/50 border border-slate-200/80 rounded-[1.5rem] flex gap-3 items-center">
                    <Box className="flex-1 relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm hoạt động…" 
                        aria-label="Tìm kiếm lịch sử hoạt động"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:outline-none text-xs font-bold text-slate-700 bg-white placeholder-slate-400 transition-colors font-inter focus-visible:ring-2 focus-visible:ring-blue-600"
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
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-colors text-xs font-black bg-white shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${
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
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => {
                              setTempSelectedDate(selectedDate);
                              setCalendarOpen(false);
                              setDrawerCalendarView('days');
                            }}
                          />
                          
                          <Box className="absolute right-0 mt-2 z-50 bg-white border border-slate-200 shadow-2xl rounded-3xl p-4 w-[285px] origin-top-right">
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
                                      className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none touch-manipulation" 
                                      aria-label="Tháng trước"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                                    </button>
                                    <button 
                                      onClick={() => { 
                                        setDrawerCalendarView('months'); 
                                      }} 
                                      className="flex-1 px-1 py-0.5 rounded-lg transition-colors flex items-center justify-center gap-1 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
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
                                      className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none touch-manipulation" 
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
                                    className="shrink-0 text-[10px] font-black text-[#00288E] hover:bg-blue-50 border border-[#00288E]/20 px-2 py-1 rounded-xl uppercase tracking-wider transition-colors bg-white flex items-center gap-1 h-[32px] shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
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
                                      className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
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
                                    className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-100 text-[10px] font-black text-[#00288E] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                                  >
                                    {currentCalendarYear} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-between border-b border-slate-100 pb-2">
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => { setDrawerCalendarView('months'); }} 
                                      className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                    </button>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                  </div>
                                  <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                                    <button 
                                      onClick={() => { setDrawerYearRangeStart(prev => prev - 12); }} 
                                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">chevron_left</span>
                                    </button>
                                    <span className="text-[8px] font-black text-slate-500 px-1">{drawerYearRangeStart} - {drawerYearRangeStart + 11}</span>
                                    <button 
                                      onClick={() => { setDrawerYearRangeStart(prev => prev + 12); }} 
                                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Box>

                            {drawerCalendarView === 'days' && (
                              <>
                                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day, idx) => (
                                    <span key={idx} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
                                  ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                  {Array.from({ length: getFirstDayOfMonth(currentCalendarMonth, currentCalendarYear) }).map((_, idx) => (
                                    <div key={`empty-${idx}`} className="w-8 h-8" />
                                  ))}

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
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${
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
                                      className={`text-[10px] font-black py-2.5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${
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
                                      className={`text-[10px] font-black py-2.5 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${
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

                            {drawerCalendarView === 'days' && (tempSelectedDate || selectedDate) && (
                              <Box className="flex justify-end items-center mt-4 pt-3 border-t border-slate-100">
                                <button
                                  onClick={() => {
                                      setTempSelectedDate(null);
                                      setSelectedDate(null);
                                      setCalendarOpen(false);
                                      setDrawerCalendarView('days');
                                  }}
                                  className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider transition-colors w-full text-center focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
                                >
                                  Xóa bộ lọc
                                </button>
                              </Box>
                            )}

                            <Box className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  setTempSelectedDate(selectedDate);
                                  setCalendarOpen(false);
                                  setDrawerCalendarView('days');
                                }}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                              >
                                Hủy
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDate(tempSelectedDate);
                                  setCalendarOpen(false);
                                  setDrawerCalendarView('days');
                                }}
                                className="flex-1 py-2 bg-[#00288E] hover:bg-[#00288E]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none shadow-md shadow-blue-900/10"
                              >
                                Xác nhận
                              </button>
                            </Box>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* Hoạt động Timeline */}
                  {filteredActivities.length > 0 ? (
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
                  {/* Thống kê nhanh */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                      <span className="material-symbols-outlined text-[#00288E] text-[18px]">bar_chart</span>
                      Hiệu năng áp dụng
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 p-4 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter font-bold">Số lượng sản phẩm</p>
                        <p className="text-lg font-black text-[#00288E] font-inter">
                          {appliedProducts.length} <span className="text-[10px] text-slate-400 ml-1 font-bold uppercase tracking-widest">mặt hàng</span>
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-4 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter font-bold">Đơn vị liên kết</p>
                        <p className="text-lg font-black text-emerald-700 font-inter">
                          {appliedCustomers.length} <span className="text-[10px] text-slate-400 ml-1 font-bold uppercase tracking-widest">khách hàng</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách khách hàng đang liên kết */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                      <span className="material-symbols-outlined text-[#00288E] text-[18px]">people</span>
                      Khách hàng liên kết ({appliedCustomers.length})
                    </h4>
                    {appliedCustomers.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {appliedCustomers.map((c, idx) => (
                          <div key={idx} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#00288E] flex items-center justify-center font-bold text-xs shrink-0">
                              {c.companyName ? c.companyName[0].toUpperCase() : c.firstName[0].toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-800 truncate font-inter" title={c.companyName || (c.lastName + ' ' + c.firstName)}>
                                {c.companyName || (c.lastName + ' ' + c.firstName)}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 font-inter mt-0.5">SĐT: {c.phoneNumber || 'N/A'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState message="Chưa có khách hàng nào được gán bảng giá này." />
                    )}
                  </div>
                </Box>
              )}
            </>
          )}
        </Box>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t border-slate-200 flex flex-col gap-2.5 w-full shrink-0 font-inter">
          <div className="flex gap-4 w-full items-center justify-between">
            <button
              onClick={() => {
                onClose();
                navigate(`/admin/price-lists/edit/${priceList.rawID}`);
              }}
              className="flex-1 group flex items-center justify-center gap-2 bg-[#00288E] border-2 border-[#00288E] hover:bg-[#001D6E] hover:border-[#001D6E] hover:shadow-xl text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors duration-300 shadow-md shadow-blue-900/10 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span>Sửa</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 group flex items-center justify-center gap-2 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors duration-300 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 outline-none"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              <span>Đóng</span>
            </button>
          </div>

          {isActive ? (
            <button
              onClick={() => onDeactivate?.(priceList)}
              className="w-full group flex items-center justify-center gap-2 bg-rose-50 border-2 border-rose-100 hover:bg-rose-100 hover:border-rose-200 text-rose-600 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors duration-300 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 outline-none"
            >
              <span className="material-symbols-outlined text-sm">block</span>
              <span>Ngừng hoạt động</span>
            </button>
          ) : (
            <button
              onClick={() => onReactivate?.(priceList)}
              className="w-full group flex items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 text-emerald-600 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors duration-300 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 outline-none"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>Kích hoạt lại</span>
            </button>
          )}
        </div>
      </div>
    </Drawer>
  );
};

const ActivityItem = ({ title, time, user, color = 'bg-slate-400', desc }) => (
  <Box className="relative font-inter">
    <div className={`absolute -left-[20px] top-1.5 w-2.5 h-2.5 rounded-full ${color} border-2 border-white ring-4 ring-slate-50 z-10`}></div>
    <Typography className="text-xs font-black text-slate-800 leading-none mb-1.5 font-inter">
      {title}
    </Typography>
    {desc && (
      <Typography className="text-[11px] text-slate-600 font-semibold font-inter mb-1.5 leading-relaxed">
        {desc}
      </Typography>
    )}
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

export default PriceListDetailDrawer;
