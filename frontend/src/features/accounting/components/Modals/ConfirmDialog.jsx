import React from 'react';
import { createPortal } from 'react-dom';

const ConfirmDialog = ({
  isOpen,
  title = "Xác nhận",
  message = "",
  confirmLabel = "Đồng ý",
  cancelLabel = "Hủy",
  tone = "warning", // warning, danger, info
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getToneIcon = () => {
    switch (tone) {
      case 'danger':
        return 'error';
      case 'info':
        return 'info';
      case 'warning':
      default:
        return 'warning';
    }
  };

  const getToneClasses = () => {
    switch (tone) {
      case 'danger':
        return {
          iconBg: 'bg-red-50 text-red-500',
          confirmBtn: 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-50 text-blue-500',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-600'
        };
      case 'warning':
      default:
        return {
          iconBg: 'bg-amber-50 text-amber-500',
          confirmBtn: 'bg-acc-primary hover:bg-blue-700 text-white focus-visible:ring-acc-primary'
        };
    }
  };

  const toneClasses = getToneClasses();

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in" 
        onClick={onCancel} 
      />
      <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-zoom-in pointer-events-auto border border-slate-100">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${toneClasses.iconBg}`}>
            <span className="material-symbols-outlined text-2xl font-bold">{getToneIcon()}</span>
          </div>
          <div className="space-y-1.5 w-full">
            <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{title}</h4>
            <p className="text-xs text-slate-500 font-bold leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
          <div className="flex gap-2 w-full mt-2">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-black text-[10px] uppercase tracking-wider text-slate-500 transition focus-visible:ring-2 focus-visible:ring-slate-300 outline-none cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button 
              onClick={onConfirm}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition shadow-md shadow-blue-900/10 focus-visible:ring-2 outline-none cursor-pointer ${toneClasses.confirmBtn}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
