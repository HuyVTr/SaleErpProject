import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WarningIcon, SuccessIcon, NotificationIcon } from '../Icons/AccountingIcons';

const RelativeTime = ({ notif }) => {
  const [display, setDisplay] = useState('...');

  useEffect(() => {
    // Lấy mốc thời gian gốc (cố định)
    const ts = notif.timestamp || notif.time || notif.paymentDate || notif.createdAt || notif.createAt;
    
    if (!ts) {
      setDisplay('Vừa xong');
      return;
    }

    const date = new Date(ts);
    if (isNaN(date.getTime())) {
      setDisplay('Vừa xong');
      return;
    }

    const calculate = () => {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours >= 24) {
        return date.toLocaleDateString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      if (diffHours > 0) return `${diffHours} giờ trước`;
      if (diffMins > 0) return `${diffMins} phút trước`;
      return 'Vừa xong';
    };

    const updateDisplay = () => {
      setDisplay(calculate());
    };

    updateDisplay();
    // Cập nhật nhanh hơn (10 giây một lần) để người dùng thấy sự thay đổi ngay khi sang phút mới
    const interval = setInterval(updateDisplay, 10000);
    return () => clearInterval(interval);
  }, [notif]);

  return <span className="uppercase">{display}</span>;
};

const NotificationFeed = ({ notifications, loading }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  if (loading) {
    return (
      <div className="flex-1 grid grid-rows-4 gap-2.5 sm:gap-3 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="w-full bg-slate-50 animate-pulse rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="text-center space-y-4 opacity-50 flex flex-col items-center justify-center h-full py-10">
        <NotificationIcon className="text-4xl" />
        <p className="text-[0.625rem] font-black uppercase tracking-widest text-acc-text-muted">Danh sách trống</p>
      </div>
    );
  }

  // Sắp xếp các thông báo mới nhất lên đầu dựa trên tất cả các mốc thời gian khả dụng
  const sortedNotifications = [...notifications].sort((a, b) => {
    const getTs = (n) => n.timestamp || n.time || n.paymentDate || n.createdAt || n.createAt;
    const timeA = new Date(getTs(a)).getTime() || 0;
    const timeB = new Date(getTs(b)).getTime() || 0;
    return timeB - timeA;
  });

  // Calculate pagination
  const totalPages = Math.ceil(sortedNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = sortedNotifications.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleJumpPage = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      handlePageChange(value);
    }
  };

  const handleDetail = (notif) => {
    navigate(`/accounting/transaction/${encodeURIComponent(notif.id)}`, { state: { transaction: notif } });
  };

  const resolveMessage = (notif) => {
    if (!notif.message) return "";
    return notif.message;
  };

  const getTypeConfig = (notif) => {
    const uiType = notif.uiType || notif.type || 'info';
    const txType = notif.transactionType;
    if (uiType === 'warning') return {
      iconEl: <WarningIcon className="text-sm" />,
      iconColor: 'text-amber-500',
      badge: txType || 'List',
      badgeClass: 'bg-amber-50 text-amber-600 border-amber-200',
    };
    if (uiType === 'report') return {
      iconEl: <span className="material-symbols-outlined text-sm">bar_chart</span>,
      iconColor: 'text-violet-500',
      badge: txType || 'Report',
      badgeClass: 'bg-violet-50 text-violet-600 border-violet-200',
    };
    return {
      iconEl: <SuccessIcon className="text-sm" />,
      iconColor: 'text-emerald-500',
      badge: txType || 'Voucher',
      badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    };
  };

  return (
    <div className="flex flex-col h-full bg-white transition-all select-none">
      {/* Items Container */}
      <div className="flex-1 grid grid-rows-4 gap-2.5 sm:gap-3 overflow-hidden">
        {currentItems.map((notif) => {
          const cfg = getTypeConfig(notif);
          return (
            <div
              key={notif.id}
              role="button"
              tabIndex={0}
              onClick={() => handleDetail(notif)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleDetail(notif);
                }
              }}
              className="rounded-2.5xl bg-slate-50/50 hover:bg-white hover:shadow-float active:scale-[0.99] transition-all duration-300 border border-slate-200 hover:border-slate-300 group cursor-pointer p-3.5 lg:p-[var(--space-base,14px)] flex flex-col justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-2"
            >
              <div className="flex gap-4 items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all group-hover:bg-white group-hover:shadow-md ${cfg.iconColor}`}
                  style={{ backgroundColor: `color-mix(in srgb, currentColor, transparent 94%)` }}
                >
                  {cfg.iconEl}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[13px] sm:text-body-sm text-acc-text-muted group-hover:text-acc-text-main leading-snug font-bold line-clamp-2">
                    {resolveMessage(notif)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <p className="text-[9px] sm:text-label-xs text-acc-text-light/70 font-black uppercase tracking-tighter">
                      <RelativeTime notif={notif} />
                    </p>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${cfg.badgeClass}`}>
                      {cfg.badge}
                    </span>
                    <p className="text-[9px] sm:text-label-xs text-acc-primary font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0 ml-auto">CHI TIẾT →</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>


      {/* Synchronized Pagination Footer - Refined spacing */}
      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Trang trước"
            className="w-9 h-9 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all flex items-center justify-center border border-transparent active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100 focus-within:ring-2 focus-within:ring-acc-primary/50">
             <input 
               type="text" 
               value={currentPage}
               onChange={handleJumpPage}
               aria-label="Trang hiện tại"
               spellCheck={false}
               autoComplete="off"
               className="w-5 h-5 border-none bg-transparent p-0 text-center text-label-xs font-black text-acc-primary focus:ring-0"
             />
             <span className="text-label-xs font-black text-acc-text-light/40 tracking-widest">/ {totalPages}</span>
          </div>

          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Trang sau"
            className="w-9 h-9 rounded-xl hover:bg-slate-100 disabled:opacity-20 transition-all flex items-center justify-center border border-transparent active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
        
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm whitespace-nowrap">
           <div className="flex items-center gap-1.5">
             <span className="text-[10px] font-black text-acc-text-main tabular-nums leading-none">
               {startIndex + 1} - {Math.min(startIndex + itemsPerPage, notifications.length)}
             </span>
             <span className="text-[8px] font-bold text-acc-text-light/60 uppercase tracking-widest">GIAO DỊCH</span>
           </div>
           <div className="w-1.5 h-1.5 rounded-full bg-acc-primary/10 flex items-center justify-center flex-shrink-0">
             <div className="w-1 h-1 rounded-full bg-acc-primary animate-pulse"></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationFeed;
