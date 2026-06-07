import React, { useState, useEffect, useMemo } from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Avatar, 
  Tabs, 
  Tab,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  Close as CloseIcon, 
  History as HistoryIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Payments as PaymentsIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import salesService from '../../services/salesService';

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

const formatDate = (dateStr) => {
  if (!dateStr) return '---';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '---';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

import { useSwipeToClose } from './useSwipeToClose';

const QuotationDetailDrawer = ({ open, onClose, quotation, onRefresh }) => {
  const swipeHandlers = useSwipeToClose(onClose);
  const [tabValue, setTabValue] = useState(0);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  const showToastMsg = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleConvertToOrder = () => {
    onClose();
    navigate('/sales/orders', { state: { quotation } });
  };

  const handleUpdateStatus = async (status) => {
    try {
      onClose(); // Đóng drawer ngay lập tức để UX cực kỳ mượt mà
      await salesService.updateQuotationStatus(quotation.quotationID, status);
      if (onRefresh) {
        onRefresh(status === 'APPROVED' ? "Đã duyệt báo giá thành công!" : "Đã từ chối báo giá!");
      }
    } catch (e) {
      console.error("Lỗi khi cập nhật trạng thái báo giá:", e);
    }
  };

  useEffect(() => {
    if (!open) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && quotation?.quotationID) {
      fetchActivities();
    }
  }, [open, quotation?.quotationID]);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const data = await salesService.getQuotationActivities(quotation.quotationID);
      setActivities(data);
    } catch (e) {
      console.error("Lỗi khi tải lịch sử báo giá:", e);
    } finally {
      setLoadingActivities(false);
    }
  };

  if (!quotation) return null;

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (val, customColorClass = 'text-[#00288E]') => {
    if (val === undefined || val === null) return "0 VND";
    const num = typeof val === 'number' ? val : Number(val.toString().replace(/[đ₫\sVND.]/g, ''));
    const formatted = new Intl.NumberFormat('vi-VN').format(num);
    return (
      <span className="inline-flex items-baseline gap-0.5 font-inter">
        <span className={`font-black ${customColorClass}`}>{formatted}</span>
        <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 ml-0.5">VND</span>
      </span>
    );
  };


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
            Chi tiết báo giá
          </h2>
          <IconButton onClick={onClose} aria-label="Đóng chi tiết báo giá" className="bg-slate-50 hover:bg-slate-100 transition-all">
            <span className="material-symbols-outlined text-slate-400" aria-hidden="true">close</span>
          </IconButton>
        </div>

        <Box className="flex-1 overflow-y-auto scrollbar-none bg-slate-50/30">
          <Box className="p-6 bg-gradient-to-br from-white to-slate-50">
            <Box className="flex items-start gap-5 mb-6">
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: '#FFF5F0',
                  color: '#EA580C',
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  borderRadius: '20px',
                  border: '2px solid white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <AssignmentIcon fontSize="large" />
              </Avatar>
              <Box className="flex-1">
                <Typography className="text-2xl font-black text-slate-900 leading-tight mb-1 font-inter">
                  {quotation.id}
                </Typography>
                <Typography className="text-xs font-bold text-slate-400 uppercase tracking-widest font-inter mb-2">
                  Ngày báo giá: {quotation.date}
                </Typography>
                <Box className="flex gap-2 items-center flex-wrap">
                  {(() => {
                    const s = (quotation.status || '').toUpperCase();
                    let details = { label: 'Chờ duyệt', bg: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500' };
                    if (s === 'APPROVED' || s === 'ĐỒNG Ý' || s === 'ĐÃ DUYỆT') {
                      details = { label: 'Đồng ý', bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' };
                    } else if (s === 'CANCELLED' || s === 'TỪ CHỐI' || s === 'ĐÃ HỦY') {
                      details = { label: 'Từ chối', bg: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' };
                    }
                    return (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter ${details.bg} font-bold`}>
                        <div className={`w-2 h-2 rounded-full ${details.dot}`}></div>
                        <span className="text-[9px] font-black uppercase tracking-wider">
                          {details.label}
                        </span>
                      </div>
                    );
                  })()}
                </Box>
              </Box>
            </Box>
   
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                    <PersonIcon sx={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Đối tác</p>
                    <p className="text-sm font-black text-slate-900 font-inter leading-tight truncate w-32" title={quotation.name}>{quotation.name}</p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-500 mt-1 pl-10 font-inter">{quotation.email}</p>
              </div>
              
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Tổng cộng (VAT)</p>
                <p className="text-xl font-black text-[#00288E] font-inter">{formatCurrency(quotation.value * 1.1, 'text-xl text-[#00288E]')}</p>
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
              <Tab label="Tổng quan" icon={<ReceiptIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
              <Tab label="Lịch sử xử lý" icon={<HistoryIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
            </Tabs>
          </Box>
  
          {/* Tab Content */}
          <Box className="p-4">
            {tabValue === 0 && (
              <Box className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                    <span className="material-symbols-outlined text-[#00288E] text-[18px]">person</span>
                    Thông tin khách hàng
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Nhóm KH</span>
                      <span className="text-xs font-black text-slate-800 font-inter bg-slate-100 px-2 py-1 rounded">{quotation.group}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Mã số thuế</span>
                      <span className="text-xs font-black text-slate-800 font-inter">0102345678-001</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Số điện thoại</span>
                      <span className="text-xs font-black text-slate-800 font-inter">0982 • 334 • 999</span>
                    </div>
                  </div>
                </div>
  
                <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                    <span className="material-symbols-outlined text-[#00288E] text-[18px]">payments</span>
                    Giá trị báo giá
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Giá trị dự kiến</span>
                      <span className="text-sm font-black text-slate-800 font-inter">{formatCurrency(quotation.value, 'text-sm text-slate-800')}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Thuế GTGT (10%)</span>
                      <span className="text-sm font-black text-slate-800 font-inter">{formatCurrency(quotation.value * 0.1, 'text-sm text-slate-800')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider font-inter">Tổng cộng</span>
                      <span className="text-xl font-black text-[#00288E] font-inter">{formatCurrency(quotation.value * 1.1, 'text-xl text-[#00288E]')}</span>
                    </div>
                  </div>
                </div>
              </Box>
            )}
  
            {tabValue === 1 && (
              <Box className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300">
                <Box className="flex flex-col gap-6 relative pl-6 before:content-[''] before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100">
                  {loadingActivities ? (
                    <Box className="flex justify-center items-center py-8">
                      <CircularProgress size={24} sx={{ color: '#00288E' }} />
                    </Box>
                  ) : activities.length > 0 ? (
                    activities.map((act, idx) => (
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
                    <Typography className="text-xs text-slate-400 font-bold font-inter text-center py-4">
                      Không có lịch sử hoạt động
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </Box>
  
        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-2.5 w-full shrink-0 font-inter items-center justify-between">
          {(quotation.status === 'APPROVED' || quotation.status === 'ĐỒNG Ý' || quotation.status === 'ĐÃ DUYỆT') ? (
            <>
              <button 
                onClick={handleConvertToOrder}
                className="flex-1 min-w-0 group flex items-center justify-center gap-1.5 bg-[#00288E] border-2 border-[#00288E] hover:bg-blue-850 hover:border-blue-850 hover:shadow-xl text-white py-3.5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-blue-900/10 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="material-symbols-outlined text-sm sm:text-base group-hover:rotate-180 transition-transform duration-500">sync_alt</span>
                <span>Đơn hàng</span>
              </button>
              <button 
                onClick={() => showToastMsg("Đã gửi email báo giá tới " + (quotation.email || "đối tác") + "!")}
                className="flex-1 min-w-0 group flex items-center justify-center gap-1.5 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-700 py-3.5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">send</span>
                <span>Gửi lại Email</span>
              </button>
            </>
          ) : (quotation.status === 'CANCELLED' || quotation.status === 'TỪ CHỐI' || quotation.status === 'ĐÃ HỦY') ? (
            <>
              <button 
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 border-slate-300 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="material-symbols-outlined text-sm">close</span>
                Đóng
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => handleUpdateStatus('APPROVED')}
                className="flex-1 group flex items-center justify-center gap-1.5 bg-[#00288E] border-2 border-[#00288E] hover:bg-blue-850 hover:border-blue-850 hover:shadow-xl text-white py-3.5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-blue-900/10 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="material-symbols-outlined text-sm sm:text-base group-hover:scale-110 transition-transform">check_circle</span>
                <span>Duyệt</span>
              </button>
              <button 
                onClick={() => handleUpdateStatus('CANCELLED')}
                className="flex-1 group flex items-center justify-center gap-1.5 bg-white border-2 border-rose-300 hover:bg-rose-50/50 text-rose-600 py-3.5 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 active:scale-95 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="material-symbols-outlined text-sm sm:text-base">cancel</span>
                <span>Từ chối</span>
              </button>
            </>
          )}
        </div>

        {/* Toast Alert */}
        {toast.show && (
          <div className="fixed top-6 right-6 z-[9999] flex items-center gap-3 bg-slate-900 text-white px-5 py-4 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300 font-inter">
            <span className={`material-symbols-outlined ${toast.type === 'error' ? 'text-rose-500' : 'text-emerald-500'}`}>
              {toast.type === 'error' ? 'error' : 'check_circle'}
            </span>
            <p className="text-xs font-black uppercase tracking-wider">{toast.message}</p>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default QuotationDetailDrawer;
