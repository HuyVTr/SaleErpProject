import React from 'react';

const SalesPerformanceTable = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="w-full py-12 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-acc-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full py-12 flex flex-col items-center justify-center text-slate-400 opacity-40">
        <span className="material-symbols-outlined text-4xl mb-2">table_view</span>
        <p className="text-body-sm font-medium">Chưa có dữ liệu hiệu suất</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 1. Desktop Table View - Hidden on mobile */}
      <div className="hidden md:block overflow-x-auto no-scrollbar">
        <table className="w-full border-separate border-spacing-y-2 min-w-[700px] md:min-w-0">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2 font-black text-slate-400 uppercase tracking-widest" 
                  style={{ fontSize: 'clamp(9px, 0.8vw, 10px)' }}>Nhân viên</th>
              <th className="px-4 py-2 font-black text-slate-400 uppercase tracking-widest text-left" 
                  style={{ fontSize: 'clamp(9px, 0.8vw, 10px)' }}>Doanh thu</th>
              <th className="px-4 py-2 font-black text-slate-400 uppercase tracking-widest text-center" 
                  style={{ fontSize: 'clamp(9px, 0.8vw, 10px)' }}>Đơn hàng</th>
              <th className="px-4 py-2 font-black text-slate-400 uppercase tracking-widest" 
                  style={{ fontSize: 'clamp(9px, 0.8vw, 10px)' }}>Tiến độ mục tiêu</th>
              <th className="px-4 py-2 font-black text-slate-400 uppercase tracking-widest text-left" 
                  style={{ fontSize: 'clamp(9px, 0.8vw, 10px)' }}>Hoa hồng (Ước tính)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="group hover:translate-x-1 transition-all duration-300">
                <td className="bg-white border-l-4 border-acc-primary rounded-l-2xl shadow-sm whitespace-nowrap" 
                    style={{ padding: 'clamp(0.5rem, 1.2vw, 0.75rem) clamp(0.5rem, 1.5vw, 1rem)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-acc-primary font-black text-xs shrink-0">
                      {item.name.split(' ').pop().charAt(0)}
                    </div>
                    <span className="font-black text-acc-text-main uppercase" 
                          style={{ fontSize: 'clamp(11px, 1vw, 13px)' }}>{item.name}</span>
                  </div>
                </td>
                <td className="bg-white shadow-sm text-left whitespace-nowrap" 
                    style={{ padding: 'clamp(0.5rem, 1.2vw, 0.75rem) clamp(0.5rem, 1.5vw, 1rem)' }}>
                  <span className="font-black text-acc-text-main tabular-nums" 
                        style={{ fontSize: 'clamp(11px, 1vw, 13px)' }}>
                    {item.revenue.toLocaleString()}&nbsp;<small className="text-[10px] opacity-40">VND</small>
                  </span>
                </td>
                <td className="bg-white shadow-sm text-center whitespace-nowrap" 
                    style={{ padding: 'clamp(0.5rem, 1.2vw, 0.75rem) clamp(0.5rem, 1.5vw, 1rem)' }}>
                  <span className="font-bold px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg tabular-nums" 
                        style={{ fontSize: 'clamp(10px, 0.9vw, 12px)' }}>
                    {item.orderCount}
                  </span>
                </td>
                <td className="bg-white shadow-sm" 
                    style={{ padding: 'clamp(0.5rem, 1.2vw, 0.75rem) clamp(0.5rem, 1.5vw, 1rem)' }}>
                  <div className="flex flex-col gap-1.5 w-full max-w-[120px]">
                    <div className="flex justify-between items-center font-black text-slate-400 uppercase tabular-nums" 
                         style={{ fontSize: 'clamp(8px, 0.7vw, 9px)' }}>
                      <span>{item.achievement.toFixed(1)}%</span>
                      <span>{item.target.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${item.achievement >= 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-acc-primary'}`}
                        style={{ width: `${Math.min(100, item.achievement)}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td className="bg-white rounded-r-2xl shadow-sm text-left whitespace-nowrap" 
                    style={{ padding: 'clamp(0.5rem, 1.2vw, 0.75rem) clamp(0.5rem, 1.5vw, 1rem)' }}>
                  <span className="font-black text-acc-primary tabular-nums" 
                        style={{ fontSize: 'clamp(11px, 1vw, 13px)' }}>
                    {item.commission.toLocaleString()}&nbsp;<small className="text-[10px] opacity-40 uppercase">VND</small>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. Mobile Card View - Hidden on desktop */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {data.map((item) => (
          <div 
            key={item.id} 
            role="article"
            aria-label={`Hiệu suất của ${item.name}`}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 active:scale-[0.98] transition-transform touch-action-manipulation"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-acc-primary font-black text-sm" aria-hidden="true">
                  {item.name.split(' ').pop().charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-acc-text-main uppercase leading-tight">{item.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tabular-nums">Mã NV: #{String(item.id).slice(-4)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Hoa hồng</span>
                <span className="text-sm font-black text-acc-primary tabular-nums">{item.commission.toLocaleString()} <small className="text-[9px]">đ</small></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-slate-400 uppercase">Doanh thu</span>
                <span className="text-sm font-black text-acc-text-main tabular-nums">{item.revenue.toLocaleString()} <small className="text-[9px] opacity-40">VND</small></span>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase">Đơn hàng</span>
                <span className="text-xs font-black px-3 py-1 bg-slate-50 text-slate-600 rounded-lg tabular-nums">{item.orderCount}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">flag</span>
                  Tiến độ mục tiêu
                </span>
                <span className="text-acc-text-main tabular-nums">{item.achievement.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={item.achievement} aria-valuemin="0" aria-valuemax="100">
                <div 
                  className={`h-full transition-all duration-1000 ${item.achievement >= 100 ? 'bg-emerald-500' : 'bg-acc-primary'}`}
                  style={{ width: `${Math.min(100, item.achievement)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tabular-nums">
                <span>Khởi đầu</span>
                <span>Mục tiêu: {item.target.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesPerformanceTable;
