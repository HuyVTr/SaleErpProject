import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-6 sm:top-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[9999] animate-fade-in-down flex justify-center pointer-events-none">
          <div className={`
            flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl shadow-2xl border backdrop-blur-xl
            w-full max-w-[24rem] pointer-events-auto
            ${toast.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
              : toast.type === 'info'
                ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                : 'bg-red-500/10 border-red-500/20 text-red-600'}
          `}>
            <div className={`
              w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shrink-0
              ${toast.type === 'success' ? 'bg-emerald-500 text-white' : toast.type === 'info' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}
            `}>
              <span className="material-symbols-outlined text-lg sm:text-xl">
                {toast.type === 'success' ? 'check_circle' : toast.type === 'info' ? 'info' : 'error'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] opacity-60 mb-0.5 truncate">
                {toast.type === 'success' ? 'Thành công' : toast.type === 'info' ? 'Hệ thống thông báo' : 'Cảnh báo hệ thống'}
              </p>
              <p className="text-xs sm:text-sm font-bold text-acc-text-main leading-tight line-clamp-2">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors shrink-0">
              <span className="material-symbols-outlined text-base sm:text-lg">close</span>
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
