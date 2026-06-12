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
  Inventory as InventoryIcon,
  Person as PersonIcon,
  Payments as PaymentsIcon
} from '@mui/icons-material';
import salesService from '../../services/salesService';

// --- HÀM ĐỊNH DẠNG NGÀY HOẠT ĐỘNG (chỉ hiển thị ngày, DB dùng kiểu DATE) ---
const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

import { useSwipeToClose } from './useSwipeToClose';

const OrderDetailDrawer = ({ open, onClose, order, onRefresh }) => {
  const swipeHandlers = useSwipeToClose(onClose);
  const [tabValue, setTabValue] = useState(0);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  // Popup xác nhận dùng chung cho các hành động quan trọng (xác nhận / hủy đơn)
  const [confirmAction, setConfirmAction] = useState(null);

  const handleUpdateStatus = async (status) => {
    try {
      onClose(); // Đóng drawer ngay lập tức để UX cực kỳ mượt mà
      await salesService.updateOrderStatus(order.orderID, status);
      if (onRefresh) {
        onRefresh(status === 'CONFIRMED' ? "Xác nhận đơn hàng thành công!" : "Đã hủy đơn hàng thành công!");
      }
    } catch (e) {
      console.error("Lỗi khi cập nhật trạng thái đơn hàng:", e);
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
    if (open && order?.orderID) {
      fetchActivities();
    }
  }, [open, order?.orderID]);

  const fetchActivities = async () => {
    setLoadingActivities(true);
    try {
      const data = await salesService.getOrderActivities(order.orderID);
      setActivities(data);
    } catch (e) {
      console.error("Lỗi khi tải lịch sử đơn hàng:", e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const rawStatus = order?.rawStatus || 'PENDING';

  if (!order) return null;

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

  const getOrderStatusLabel = (status) => {
    const statusMap = {
      'PENDING': 'Chờ xác nhận',
      'CONFIRMED': 'Đã xác nhận',
      'SHIPPING': 'Đang giao',
      'DELIVERED': 'Hoàn thành',
      'CANCELLED': 'Đã hủy'
    };
    return statusMap[status] || status;
  };

  const getOrderStatusStyle = (status) => {
    const styleMap = {
      'PENDING': 'bg-amber-50 border-amber-200 text-amber-700 font-bold',
      'CONFIRMED': 'bg-blue-50 border-blue-200 text-blue-700 font-bold',
      'SHIPPING': 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold',
      'DELIVERED': 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold',
      'CANCELLED': 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
    };
    return styleMap[status] || 'bg-slate-50 border-slate-200 text-slate-600 font-bold';
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
            Chi tiết đơn hàng
          </h2>
          <IconButton onClick={onClose} className="bg-slate-50 hover:bg-slate-100 transition-all">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </IconButton>
        </div>

        <Box className="flex-1 overflow-y-auto scrollbar-none bg-slate-50/30">
          <Box className="p-6 bg-gradient-to-br from-white to-slate-50">
            <Box className="flex items-start gap-5 mb-6">
              <Avatar 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  bgcolor: '#EBF0FF',
                  color: '#00288E',
                  fontSize: '1.75rem',
                  fontWeight: 900,
                  borderRadius: '20px',
                  border: '2px solid white',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <ReceiptIcon fontSize="large" />
              </Avatar>
              <Box className="flex-1">
                <Typography className="text-2xl font-black text-slate-900 leading-tight mb-1 font-inter">
                  #{order.id}
                </Typography>
                <Typography className="text-xs font-bold text-slate-400 uppercase tracking-widest font-inter mb-2">
                  Ngày đặt: {order.date}
                </Typography>
                <Box className="flex gap-2 items-center flex-wrap">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 font-inter ${getOrderStatusStyle(rawStatus)}`}>
                    <div className={`w-2 h-2 rounded-full ${rawStatus === 'DELIVERED' ? 'bg-emerald-500' : 'bg-current'}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {getOrderStatusLabel(rawStatus)}
                    </span>
                  </div>
                </Box>
              </Box>
            </Box>
   
            <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <PersonIcon sx={{ fontSize: 16 }} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Khách hàng</p>
                    <p className="text-sm font-black text-slate-900 font-inter leading-tight">{order.customer}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-500 mt-1 pl-10 font-inter">{order.phone}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-inter">Tổng giá trị</p>
                <p className="text-xl font-black text-[#00288E] font-inter">{formatCurrency(order.total, 'text-xl text-[#00288E]')}</p>
              </div>
            </Box>
  
            {/* Mục Ghi chú Đơn hàng (dưới khách hàng & tổng giá trị, trên divider) */}
            <Box className="mt-4 bg-amber-50/40 border border-dashed border-amber-200 rounded-2xl p-4 shadow-sm select-none">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-amber-600 text-[18px]">edit_note</span>
                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none">Ghi chú đơn hàng</span>
              </div>
              <p className="text-xs font-bold text-slate-600 font-inter leading-relaxed pl-6 italic">
                {(() => {
                  const noteVal = order.notes || order.note;
                  if (!noteVal || !noteVal.trim() || noteVal === 'Khởi tạo trực tiếp từ Dashboard') {
                    return "Không có ghi chú";
                  }
                  return noteVal;
                })()}
              </p>
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
              <Tab label="Sản phẩm" icon={<InventoryIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
              <Tab label="Thanh toán" icon={<PaymentsIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
              <Tab label="Lịch sử" icon={<HistoryIcon sx={{ mb: '2px !important', fontSize: 18 }} />} iconPosition="start" />
            </Tabs>
          </Box>
  
          {/* Tab Content */}
          <Box className="p-4">
            {tabValue === 0 && (
              <Box className="flex flex-col gap-3">
                {(order.items || []).map((item, idx) => (
                  <Box key={idx} className="p-4 rounded-2xl border border-slate-300 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase shadow-sm border border-slate-100 overflow-hidden shrink-0">
                        {item.imageURL ? (
                          <img src={item.imageURL} className="w-full h-full object-cover" alt={item.name} />
                        ) : (
                          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '1.5rem' }}>image</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Typography className="text-sm font-black text-slate-900 break-words whitespace-normal font-inter">
                          {item.name}
                        </Typography>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-inter border border-slate-200 px-1.5 py-0.5 rounded-md">
                            SL: {item.quantity}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      {formatCurrency(item.price * item.quantity, 'text-sm text-slate-900')}
                    </div>
                  </Box>
                ))}
              </Box>
            )}
  
            {tabValue === 1 && (
              <Box className="flex flex-col gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-300 shadow-sm">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2 font-inter">
                    <span className="material-symbols-outlined text-[#00288E] text-[18px]">receipt_long</span>
                    Tóm tắt đơn hàng
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Tạm tính</span>
                      <span className="text-sm font-black text-slate-800 font-inter">{formatCurrency(order.total / 1.1, 'text-sm text-slate-800')}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-inter">Thuế (10%)</span>
                      <span className="text-sm font-black text-slate-800 font-inter">{formatCurrency(order.total - (order.total / 1.1), 'text-sm text-slate-800')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-wider font-inter">Tổng cộng</span>
                      <span className="text-xl font-black text-[#00288E] font-inter">{formatCurrency(order.total, 'text-xl text-[#00288E]')}</span>
                    </div>
                  </div>
                </div>
              </Box>
            )}
  
            {tabValue === 2 && (
              <Box className="bg-white rounded-2xl p-6 shadow-sm border border-slate-300">
                <Box className="flex flex-col gap-6 relative pl-6 before:content-[''] before:absolute before:left-[11px] before:top-1 before:bottom-1 before:w-0.5 before:bg-slate-100 max-h-[350px] overflow-y-auto pr-2 scrollbar-none">
                  {loadingActivities ? (
                    <Box className="flex justify-center items-center py-8">
                      <CircularProgress size={24} sx={{ color: '#00288E' }} />
                    </Box>
                  ) : activities.length > 0 ? (
                    activities.map((act, index) => (
                      <ActivityItem 
                        key={index}
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
  
        {/* Đơn đang giao: hàng đã rời kho nên không còn hành động xác nhận/hủy nào khả dụng từ phía Sales */}
        {rawStatus === 'SHIPPING' && (
          <div className="p-6 bg-white border-t border-slate-200 shrink-0 font-inter">
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-[#00288E] rounded-xl text-xs font-bold uppercase tracking-wide">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
              Đơn hàng đang được giao — không thể xác nhận hoặc hủy ở bước này
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {rawStatus !== 'DELIVERED' && rawStatus !== 'CANCELLED' && rawStatus !== 'SHIPPING' && (
          <div className="p-6 bg-white border-t border-slate-200 flex gap-4 shrink-0 font-inter">
            {rawStatus === 'PENDING' && (
              <button
                onClick={() => setConfirmAction({
                  title: 'Xác nhận đơn hàng',
                  message: `Bạn có chắc chắn muốn xác nhận đơn hàng ${order?.displayID || ('#' + order?.orderID)}?`,
                  icon: 'check_circle',
                  iconBg: 'bg-blue-50',
                  iconColor: 'text-[#00288E]',
                  confirmLabel: 'Xác nhận đơn',
                  confirmClass: 'bg-[#00288E] hover:bg-[#001D6E] shadow-blue-900/20',
                  onConfirm: () => handleUpdateStatus('CONFIRMED'),
                })}
                className="flex-1 group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] active:scale-95"
              >
                <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">check_circle</span>
                Xác nhận đơn
              </button>
            )}
            <button
              onClick={() => setConfirmAction({
                title: 'Hủy đơn hàng',
                message: `Bạn có chắc chắn muốn hủy đơn hàng ${order?.displayID || ('#' + order?.orderID)}? Hành động này không thể hoàn tác.`,
                icon: 'cancel',
                iconBg: 'bg-rose-50',
                iconColor: 'text-rose-500',
                confirmLabel: 'Hủy đơn hàng',
                confirmClass: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
                onConfirm: () => handleUpdateStatus('CANCELLED'),
              })}
              className="flex-1 group flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 border-2 border-slate-300 active:scale-95"
            >
              <span className="material-symbols-outlined text-sm text-rose-500">cancel</span>
              Hủy đơn hàng
            </button>
          </div>
        )}
      </div>

      {/* Popup xác nhận hành động (theo style chung của dự án) */}
      {confirmAction && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-300 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 ${confirmAction.iconBg} ${confirmAction.iconColor} rounded-xl flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-6`}>
                <span className="material-symbols-outlined text-3xl sm:text-4xl">{confirmAction.icon}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{confirmAction.title}</h2>
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {confirmAction.message}
              </p>
            </div>
            <div className="flex gap-4 mt-8 sm:mt-10">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-4 py-3 sm:py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 hover:text-slate-600 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  action.onConfirm();
                }}
                className={`flex-1 px-4 py-3 sm:py-4 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${confirmAction.confirmClass}`}
              >
                <span className="material-symbols-outlined text-base">{confirmAction.icon}</span>
                {confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
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

export default OrderDetailDrawer;
