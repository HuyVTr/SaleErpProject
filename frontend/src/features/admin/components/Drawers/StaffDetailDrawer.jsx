import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Tabs,
  Tab,
  CircularProgress
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Cake as CakeIcon,
  History as HistoryIcon,
  Receipt as ReceiptIcon,
  Description as QuotationIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import dbData from '../../../../../db.json';
import { useSwipeToClose } from '../../../sales/components/Drawers/useSwipeToClose';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatCurrency = (val, customColorClass = 'text-[#00288E]') => {
  if (val === undefined || val === null) return '0 VND';
  const formatted = new Intl.NumberFormat('vi-VN').format(val);
  return (
    <span className="inline-flex items-baseline gap-0.5 font-inter">
      <span className={`font-black ${customColorClass}`}>{formatted}</span>
      <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 ml-0.5">VND</span>
    </span>
  );
};

const getOrderStatusLabel = (status) => {
  const statusMap = {
    'PENDING': 'Chờ xác nhận',
    'CONFIRMED': 'Đã xác nhận',
    'SHIPPING': 'Đang giao',
    'DELIVERED': 'Hoàn thành',
    'CANCELLED': 'Đã hủy',
    'FAILED': 'Giao thất bại'
  };
  return statusMap[status] || status;
};

const getOrderStatusStyle = (status) => {
  const styleMap = {
    'PENDING': 'bg-amber-50 border-amber-200 text-amber-700 font-bold',
    'CONFIRMED': 'bg-blue-50 border-blue-200 text-blue-700 font-bold',
    'SHIPPING': 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold',
    'DELIVERED': 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold',
    'CANCELLED': 'bg-rose-50 border-rose-200 text-rose-700 font-bold',
    'FAILED': 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
  };
  return styleMap[status] || 'bg-slate-50 border-slate-200 text-slate-600 font-bold';
};

const getQuotationStatusLabel = (status) => {
  const statusMap = {
    'PENDING': 'Chờ duyệt',
    'SENT': 'Đã gửi',
    'APPROVED': 'Đã duyệt',
    'CANCELLED': 'Đã hủy'
  };
  return statusMap[status] || status;
};

const getQuotationStatusStyle = (status) => {
  const styleMap = {
    'PENDING': 'bg-amber-50 border-amber-200 text-amber-700 font-bold',
    'SENT': 'bg-blue-50 border-blue-200 text-blue-700 font-bold',
    'APPROVED': 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold',
    'CANCELLED': 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
  };
  return styleMap[status] || 'bg-slate-50 border-slate-200 text-slate-600 font-bold';
};

const getRoleStyle = (role) => {
  const r = (role || '').toLowerCase();
  if (r === 'super admin') return 'bg-red-50 border-red-200 text-red-700';
  if (r === 'admin') return 'bg-orange-50 border-orange-200 text-orange-700';
  if (r === 'sales') return 'bg-indigo-50 border-indigo-200 text-indigo-700';
  if (r === 'warehouse') return 'bg-blue-50 border-blue-200 text-blue-700';
  return 'bg-purple-50 border-purple-200 text-purple-700';
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
  <Box className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-300 font-inter">
    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-4">
      <TrendingUpIcon className="text-slate-300" />
    </div>
    <Typography className="text-sm font-bold text-slate-400 font-inter">{message}</Typography>
  </Box>
);

const StaffDetailDrawer = ({ open, onClose, staff, onEdit, onDelete }) => {
  const swipeHandlers = useSwipeToClose(onClose);
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState({ orders: [], quotations: [] });
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

  useEffect(() => {
    if (!open) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && staff?.id) {
      setTabValue(0);
      setSearchQuery('');
      loadStaffHistory();
    }
  }, [open, staff?.id]);

  const loadStaffHistory = () => {
    setLoading(true);
    try {
      const localOrders = JSON.parse(localStorage.getItem('added_orders') || '[]');
      const localQuotations = JSON.parse(localStorage.getItem('added_quotations') || '[]');
      const allOrders = [...localOrders, ...(dbData.orders || [])];
      const allQuotations = [...localQuotations, ...(dbData.quotations || [])];

      const staffOrders = allOrders.filter(o => Number(o.userID) === Number(staff.id));
      const staffQuotations = allQuotations.filter(q => Number(q.userID) === Number(staff.id));

      setHistory({ orders: staffOrders, quotations: staffQuotations });
    } catch (e) {
      console.error('Lỗi khi tải lịch sử nhân viên:', e);
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

  const stats = useMemo(() => {
    const totalRevenue = history.orders
      .filter(o => o.orderStatus === 'DELIVERED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return {
      orderCount: history.orders.length,
      quotationCount: history.quotations.length,
      totalRevenue
    };
  }, [history]);

  const activities = useMemo(() => {
    const orderActs = history.orders.map(o => ({
      title: `Đơn hàng #${o.orderID}`,
      time: formatDate(o.orderDate),
      user: staff?.name || '',
      color: 'bg-blue-500',
      desc: getOrderStatusLabel(o.orderStatus),
      sortKey: o.orderDate
    }));
    const quoActs = history.quotations.map(q => ({
      title: `Báo giá #${q.quotationID}`,
      time: formatDate(q.createAt),
      user: staff?.name || '',
      color: 'bg-orange-500',
      desc: getQuotationStatusLabel(q.status),
      sortKey: q.createAt
    }));
    return [...orderActs, ...quoActs].sort((a, b) => new Date(b.sortKey) - new Date(a.sortKey));
  }, [history, staff]);

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchQuery = act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (act.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchQuery) return false;
      if (!selectedDate) return true;

      const parts = act.time.split('/');
      const dateObj = parts.length === 3 
        ? new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])) 
        : new Date(act.time);
      return matchDate(dateObj);
    });
  }, [activities, searchQuery, selectedDate]);

  const filteredOrders = useMemo(() => {
    return history.orders.filter(o => {
      const matchQuery = o.orderID.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getOrderStatusLabel(o.orderStatus).toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchQuery) return false;
      if (!selectedDate) return true;

      const dateObj = new Date(o.orderDate);
      return matchDate(dateObj);
    });
  }, [history.orders, searchQuery, selectedDate]);

  const filteredQuotations = useMemo(() => {
    return history.quotations.filter(q => {
      const matchQuery = q.quotationID.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getQuotationStatusLabel(q.status).toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchQuery) return false;
      if (!selectedDate) return true;

      const dateObj = new Date(q.createAt);
      return matchDate(dateObj);
    });
  }, [history.quotations, searchQuery, selectedDate]);

  if (!staff) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 550 },
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
            Chi tiết nhân viên
          </h2>
          <IconButton onClick={onClose} className="bg-slate-50 hover:bg-slate-100 transition-all">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </IconButton>
        </div>

        {/* Scrollable Container (Cuộn toàn bộ trên Mobile, chỉ cuộn phần dưới trên Desktop) */}
        <Box className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col min-h-0 bg-slate-50/30">
          {/* Profile & Info Section */}
          <Box className="bg-gradient-to-br from-white to-slate-50 border-b border-slate-100 shrink-0">
            <Box className="p-6">
              <Box className="flex items-start gap-5 mb-6">
              {staff.avatar ? (
                <img src={staff.avatar} alt="avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-sm shrink-0" />
              ) : (
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    borderRadius: '20px',
                    border: '2px solid white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                  className={staff.bgColor}
                >
                  {staff.initials}
                </Avatar>
              )}
              <Box className="flex-1">
                <Typography className="text-2xl font-black text-slate-900 leading-tight mb-1">
                  {staff.name}
                </Typography>
                <Typography className="text-xs font-bold text-slate-400 uppercase tracking-widest font-inter mb-2">
                  {staff.dept}
                </Typography>
                <Box className="flex gap-2 items-center flex-wrap">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter ${
                    staff.status === 'Hoạt động'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${staff.status === 'Hoạt động' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {staff.status}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter ${getRoleStyle(staff.role)}`}>
                    <span className="material-symbols-outlined text-[14px]">
                      {staff.role?.toLowerCase() === 'super admin' ? 'shield' : staff.role?.toLowerCase() === 'admin' ? 'security' : 'badge'}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {staff.role}
                    </span>
                  </div>
                </Box>
              </Box>
            </Box>

            {/* Stats */}
            <Box className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đơn hàng</p>
                <p className="text-lg font-black text-[#00288E]">{stats.orderCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Báo giá</p>
                <p className="text-lg font-black text-[#00288E]">{stats.quotationCount}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm col-span-1 sm:col-span-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Doanh thu</p>
                <p className="text-base font-black text-emerald-700">{formatCurrency(stats.totalRevenue, 'text-emerald-700')}</p>
              </div>
            </Box>

            {/* Contact info */}
            <Box className="flex flex-col gap-4 p-5 bg-white border border-slate-300 rounded-3xl shadow-sm">
              <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Box className="flex items-center gap-3 text-slate-600 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <PhoneIcon sx={{ fontSize: 18 }} />
                  </div>
                  <span className="text-sm font-medium font-inter">{staff.phoneNumber || 'N/A'}</span>
                </Box>
                <Box className="flex items-center gap-3 text-slate-600 group">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <EmailIcon sx={{ fontSize: 18 }} />
                  </div>
                  <span className="text-sm font-medium font-inter break-all">{staff.email || 'N/A'}</span>
                </Box>
              </Box>
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
              <Tab label="Đơn hàng" icon={<ReceiptIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
              <Tab label="Báo giá" icon={<QuotationIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
              <Tab label="Hoạt động" icon={<HistoryIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
            </Tabs>
          </Box>
        </Box>

        {/* Tab Content (Chỉ cuộn độc lập trên Desktop, cuộn chung với Profile trên Mobile) */}
        <Box className="flex-1 md:overflow-y-auto scrollbar-none p-4">
          {loading ? (
            <Box className="flex justify-center items-center py-12">
              <CircularProgress size={24} sx={{ color: '#00288E' }} />
            </Box>
          ) : (
            <>
              {/* Search bar & Calendar picker dùng chung */}
              <Box className="p-4 bg-slate-100/50 border border-slate-200/80 rounded-[1.5rem] flex gap-3 items-center mb-4">
                <Box className="flex-1 relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      tabValue === 0 ? "Tìm kiếm mã đơn hàng, trạng thái..." :
                      tabValue === 1 ? "Tìm kiếm mã báo giá, trạng thái..." :
                      "Tìm hoạt động..."
                    }
                    aria-label="Tìm kiếm nhanh"
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


              {tabValue === 0 && (
                <Box className="bg-white rounded-2xl p-4 shadow-sm border border-slate-300">
                  <Box className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-none">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order, idx) => (
                        <Box key={idx} className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white">
                          <Box className="flex justify-between items-start mb-2">
                            <Typography className="font-black text-slate-900 text-sm font-inter">
                              #{order.orderID}
                            </Typography>
                            <div className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider font-inter ${getOrderStatusStyle(order.orderStatus)}`}>
                              {getOrderStatusLabel(order.orderStatus)}
                            </div>
                          </Box>
                          <Box className="flex justify-between items-baseline">
                            <Typography className="text-xs text-slate-500 font-medium font-inter">
                              Ngày đặt: {formatDate(order.orderDate)}
                            </Typography>
                            <Typography className="font-black text-slate-900 text-sm font-inter">
                              {formatCurrency(order.totalAmount, 'text-slate-900 text-sm')}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    ) : (
                      <EmptyState message="Không tìm thấy đơn hàng phù hợp" />
                    )}
                  </Box>
                </Box>
              )}

              {tabValue === 1 && (
                <Box className="bg-white rounded-2xl p-4 shadow-sm border border-slate-300">
                  <Box className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-none">
                    {filteredQuotations.length > 0 ? (
                      filteredQuotations.map((quo, idx) => (
                        <Box key={idx} className="p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white">
                          <Box className="flex justify-between items-start mb-2">
                            <Typography className="font-black text-slate-900 text-sm font-inter">
                              #{quo.quotationID}
                            </Typography>
                            <div className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider font-inter ${getQuotationStatusStyle(quo.status)}`}>
                              {getQuotationStatusLabel(quo.status)}
                            </div>
                          </Box>
                          <Box className="flex justify-between items-baseline">
                            <Typography className="text-xs text-slate-500 font-medium font-inter">
                              Ngày tạo: {formatDate(quo.createAt)}
                            </Typography>
                            <Typography className="font-black text-slate-900 text-sm font-inter">
                              {formatCurrency(quo.totalAmount, 'text-slate-900 text-sm')}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                    ) : (
                      <EmptyState message="Không tìm thấy báo giá phù hợp" />
                    )}
                  </Box>
                </Box>
              )}

              {tabValue === 2 && (
                <Box className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300">
                  <Box className="flex flex-col gap-6 relative pl-6 before:content-[''] before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100 max-h-[350px] overflow-y-auto pr-2 scrollbar-none">
                    {filteredActivities.length > 0 ? (
                      filteredActivities.map((act, idx) => (
                        <ActivityItem
                          key={idx}
                          title={act.title}
                          time={act.time}
                          user={act.user}
                          color={act.color}
                          desc={act.desc}
                        />
                      ))
                    ) : (
                      <EmptyState message="Chưa có hoạt động phù hợp" />
                    )}
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
        </Box>

        {/* Footer Actions */}
        <div className="p-6 bg-white border-t border-slate-200 flex gap-4 shrink-0 font-inter">
          {onEdit && (
            <button
              onClick={() => onEdit(staff)}
              className="flex-1 flex items-center justify-center gap-2 bg-[#00288E] border-2 border-[#00288E] hover:bg-[#001D6E] hover:border-[#001D6E] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer shadow-md shadow-blue-900/10"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Sửa / Khóa
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(staff)}
              className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-rose-300 hover:bg-rose-50/50 text-rose-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Xóa
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 border-slate-300 active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
            Đóng
          </button>
        </div>
      </div>
    </Drawer>
  );
};

export default StaffDetailDrawer;
