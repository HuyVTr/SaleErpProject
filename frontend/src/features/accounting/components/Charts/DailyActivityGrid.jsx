import React, { useState, useMemo } from 'react';
import { formatVND, VNDDisplay, CURRENCY_CLASS_PRIMARY, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

const DailyActivityGrid = ({ loading, apiData, dateFilter, onSelectDay, selectedDay }) => {
  const [hoveredDay, setHoveredDay] = useState(null);

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const [filterYearStr, filterMonthStr] = (dateFilter || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).split('-');
  const year = parseInt(filterYearStr, 10);
  const month = parseInt(filterMonthStr, 10) - 1;
  const totalDays = daysInMonth(month, year);
  const startOffset = firstDayOfMonth(month, year);

  const dailyData = useMemo(() => {
    if (apiData && apiData.length > 0 && apiData[0].day !== undefined) return apiData;

    return Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      return { day, revenue: 0, debt: 0, actual: 0, intensity: 0 };
    });
  }, [month, year, totalDays, apiData]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col gap-4 animate-pulse px-2">
        <div className="h-8 w-48 bg-slate-50 rounded-xl mx-auto"></div>
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-white relative font-sans">
      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 mb-1 shrink-0 px-1">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, idx) => (
          <div key={`weekday-${d}-${idx}`} className="text-center text-[9px] font-black text-acc-text-muted uppercase tracking-widest opacity-40">
            {d}
          </div>
        ))}
      </div>

      {/* Grid Area */}
      <div className="flex-1 min-h-0 px-1 pb-1">
        <div className="grid grid-cols-7 grid-rows-6 gap-1 h-full">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="border border-dashed border-slate-100/50 rounded-lg opacity-5"></div>
          ))}

          {dailyData.map((data) => (
            <div 
              key={`day-${data.day}-${month}-${year}`}
              role="gridcell"
              tabIndex={0}
              onMouseEnter={() => setHoveredDay(data)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => onSelectDay && onSelectDay(data.day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDay && onSelectDay(data.day);
                }
              }}
              aria-label={`Ngày ${data.day}, Doanh thu: ${formatVND(data.revenue)}`}
              className={`relative rounded-lg transition-all duration-300 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary ${selectedDay === data.day ? 'border-acc-primary ring-2 ring-acc-primary/20 scale-[1.03] z-10 shadow-sm' : (data.intensity > 0 ? 'border-transparent' : 'border-slate-100/60')} hover:border-acc-primary/40 group overflow-hidden min-h-[2rem] sm:min-h-[2.5rem]`}
              style={{ 
                  backgroundColor: data.intensity > 0 
                      ? `color-mix(in srgb, var(--acc-primary), white ${Math.max(0, 100 - (data.intensity * 100))}%)` 
                      : '#f8fafc',
              }}
            >
              <span className={`absolute top-1 left-1.5 text-[9px] font-black z-10 transition-colors ${data.intensity > 0.6 ? 'text-white' : 'text-slate-400 group-hover:text-acc-primary'}`}>
                {data.day}
              </span>
              
              {data.debt > 5000000 && (
                  <span className="absolute bottom-0.5 right-1 w-1 h-1 bg-rose-500 rounded-full shadow-sm ring-1 ring-white/10"></span>
              )}
            </div>
          ))}

          {Array.from({ length: Math.max(0, 42 - (startOffset + totalDays)) }).map((_, i) => (
            <div key={`empty-${i}`} className="opacity-0"></div>
          ))}
        </div>
      </div>

      {/* Tooltip Popup */}
      {hoveredDay && (
        <div 
            className="fixed z-[999] pointer-events-none animate-fade-in"
            style={{ 
                left: '50%', 
                bottom: '100px',
                transform: 'translateX(-50%)'
            }}
        >
            <div className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2.5xl p-5 min-w-[220px] border-slate-100 shadow-blue-900/10">
                <div className="flex flex-col gap-4">
                    <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
                        <span className="text-[11px] font-black text-acc-text-main uppercase tracking-widest">Chi tiết Ngày {hoveredDay.day}</span>
                        <div className="w-2 h-2 rounded-full bg-acc-primary shadow-lg shadow-blue-500/50"></div>
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-acc-text-light font-black uppercase tracking-tighter">Doanh thu</span>
                            <div className={`flex items-baseline gap-0.5 text-emerald-600 ${CURRENCY_CLASS_SECONDARY}`}>
                                <span className="text-[9px] font-black">+</span>
                                <VNDDisplay value={hoveredDay.revenue} className="text-[10px] font-black" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-acc-text-light font-black uppercase tracking-tighter">Công nợ</span>
                            <div className={`flex items-baseline gap-0.5 text-rose-500 ${CURRENCY_CLASS_SECONDARY}`}>
                                <span className="text-[9px] font-black">-</span>
                                <VNDDisplay value={hoveredDay.debt} className="text-[10px] font-black" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-acc-text-light font-black uppercase tracking-tighter">Hóa đơn (List)</span>
                            <span className="text-[10px] font-black text-blue-500">{hoveredDay.invoiceCount || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-acc-text-light font-black uppercase tracking-tighter">Phiếu thu (Voucher)</span>
                            <span className="text-[10px] font-black text-amber-500">{hoveredDay.paymentCount || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-acc-text-light font-black uppercase tracking-tighter">Báo cáo (Report)</span>
                            <span className="text-[10px] font-black text-purple-500">{hoveredDay.reportCount || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
                            <span className="text-[11px] text-acc-text-main font-black uppercase tracking-wider">Thực thu</span>
                            <div className="flex items-baseline gap-0.5 bg-acc-primary/10 px-3 py-1 rounded-lg text-acc-primary">
                                <VNDDisplay value={hoveredDay.actual} className="text-[10px] font-black" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DailyActivityGrid);
