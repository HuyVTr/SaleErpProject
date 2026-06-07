import React from 'react';

const SalesToastNotification = ({ toast }) => {
  if (!toast || !toast.show) return null;

  return (
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 rounded-xl bg-white shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-300 border-2 ${
      toast.type === 'error' 
        ? 'border-rose-100 text-rose-600 shadow-rose-900/10' 
        : 'border-emerald-100 text-emerald-600 shadow-emerald-900/10'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        toast.type === 'error' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'
      }`}>
        <span className="material-symbols-outlined text-lg font-black">
          {toast.type === 'error' ? 'close' : 'check'}
        </span>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.1em]">{toast.message}</p>
    </div>
  );
};

export default SalesToastNotification;
