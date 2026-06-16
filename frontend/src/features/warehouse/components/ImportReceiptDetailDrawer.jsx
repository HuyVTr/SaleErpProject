import React from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Avatar, 
  Divider 
} from '@mui/material';
import { 
  Close as CloseIcon, 
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { formatCurrency } from '../services/warehouseService';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('vi-VN', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const ImportReceiptDetailDrawer = ({ open, onClose, receipt, onRevert }) => {
  if (!receipt) return null;

  const handleRevertClick = (e) => {
    e.stopPropagation();
    if (onRevert) {
      onRevert(receipt.id);
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
      <div className="flex flex-col h-full w-full font-inter">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shrink-0">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Chi tiết phiếu nhập kho
          </h2>
          <IconButton onClick={onClose} className="bg-slate-50 hover:bg-slate-100 transition-all">
            <CloseIcon className="text-slate-400" />
          </IconButton>
        </div>

        {/* Content Body */}
        <Box className="flex-1 overflow-y-auto scrollbar-none bg-slate-50/30 p-6 space-y-6">
          {/* Top Metadata */}
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-3xl p-5 border border-slate-200 shadow-sm flex items-start gap-4">
            <Avatar 
              sx={{ 
                width: 64, 
                height: 64, 
                bgcolor: '#ecfdf5',
                color: '#059669',
                borderRadius: '16px',
                border: '1px solid #d1fae5'
              }}
            >
              <ReceiptIcon fontSize="medium" />
            </Avatar>
            <div className="flex-1 min-w-0">
              <Typography className="text-xl font-black text-slate-900 uppercase leading-none font-inter">
                {receipt.id}
              </Typography>
              <Typography className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 font-inter">
                Ngày tạo: {formatDate(receipt.date)}
              </Typography>
              <div className="mt-3">
                {receipt.status === 'cancelled' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-red-100 bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Đã hủy
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Hoàn thành
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <PersonIcon sx={{ fontSize: 16 }} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Người nhập</p>
                <p className="text-xs font-black text-slate-800 truncate leading-tight font-inter">{receipt.createdBy}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Nhà cung cấp</p>
                <p className="text-xs font-black text-slate-800 truncate leading-tight font-inter">{receipt.supplier}</p>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-amber-50/30 border border-dashed border-amber-200 rounded-2xl p-4 shadow-inner">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="material-symbols-outlined text-amber-600 text-[18px]">edit_note</span>
              <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest leading-none">Ghi chú phiếu nhập</span>
            </div>
            <p className="text-xs font-bold text-slate-600 font-inter leading-relaxed italic">
              {receipt.notes || "Không có ghi chú"}
            </p>
          </div>

          {/* Products List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <InventoryIcon sx={{ fontSize: 16, color: '#059669' }} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Danh sách sản phẩm</span>
            </div>

            {(receipt.items || []).map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                    <span className="material-symbols-outlined text-xl">image</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <Typography className="text-xs font-black text-slate-900 truncate font-inter">
                      {item.productName}
                    </Typography>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-inter border border-slate-200 px-1.5 py-0.5 rounded-md">
                        SL: {item.quantity} {item.unit || 'Cái'}
                      </span>
                      {Number(item.unitPrice) > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 font-inter">
                          Đơn giá: {formatCurrency(item.unitPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {Number(item.unitPrice) > 0 && (
                  <div className="ml-4 shrink-0 text-right text-xs font-black text-slate-900 font-inter">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Divider />

          {/* Pricing Summary */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Tổng cộng sản phẩm</span>
              <span className="font-bold text-slate-800">{(receipt.items || []).reduce((sum, it) => sum + Number(it.quantity), 0)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-3">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">Tổng giá trị nhập</span>
              <span className="text-lg font-black text-emerald-600">{formatCurrency(receipt.totalValue)}</span>
            </div>
          </div>
        </Box>

        {/* Footer Actions */}
        {receipt.status !== 'cancelled' && (
          <div className="p-6 bg-white border-t border-slate-200 shrink-0 font-inter flex">
            <button
              onClick={handleRevertClick}
              className="flex-grow group flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-rose-200 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">cancel</span>
              Hủy phiếu nhập kho
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
};

export default ImportReceiptDetailDrawer;
