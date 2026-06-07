import React, { useState, useMemo } from 'react';

const DailyActivityGrid = ({ loading, apiData, dateFilter, onSelectDay, selectedDay, formatCurrency }) => {
  const [hoveredDay, setHoveredDay] = useState(null);
  
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const [filterYearStr, filterMonthStr] = (dateFilter || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`).split('-');
  const year = parseInt(filterYearStr, 10);
  const month = parseInt(filterMonthStr, 10) - 1;
  const totalDays = daysInMonth(month, year);
  const startOffset = firstDayOfMonth(month, year);

  const dailyData = useMemo(() => {
    const baseData = Array.from({ length: totalDays }, (_, i) => {
      const dayNum = i + 1;
      const match = apiData?.find(d => d.day === dayNum || d.name === `Ngày ${dayNum}`);
      return {
        day: dayNum,
        revenue: match?.revenue || 0,
        orderCount: match?.orderCount || 0,
        intensity: match?.intensity || (match?.revenue ? Math.min(1, match.revenue / 20000000) : 0)
      };
    });
    return baseData;
  }, [month, year, totalDays, apiData]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col gap-4 animate-pulse px-2">
        <div className="grid grid-cols-7 gap-1.5 flex-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-50 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-white relative font-inter">
      <div className="grid grid-cols-7 gap-1 mb-2 shrink-0 px-1">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, idx) => (
          <div key={`weekday-${d}-${idx}`} className="text-center text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 px-1 pb-1">
        <div className="grid grid-cols-7 grid-rows-6 gap-1 h-full">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="border border-dashed border-slate-100/50 rounded-lg opacity-20"></div>
          ))}

          {dailyData.map((data) => (
            <div 
              key={`day-${data.day}-${month}-${year}`}
              onMouseEnter={() => setHoveredDay(data)}
              onMouseLeave={() => setHoveredDay(null)}
              onClick={() => onSelectDay && onSelectDay(data.day)}
              className={`relative rounded-lg transition-all duration-300 cursor-pointer border ${selectedDay === data.day ? 'border-[#00288E] ring-2 ring-[#00288E]/20 scale-[1.03] z-10 shadow-sm' : (data.intensity > 0 ? 'border-transparent' : 'border-slate-100/60')} hover:border-[#00288E]/40 group overflow-hidden min-h-[2rem]`}
              style={{ 
                  backgroundColor: data.intensity > 0 
                      ? `color-mix(in srgb, #00288E, white ${Math.max(0, 100 - (data.intensity * 100))}%)` 
                      : '#f8fafc',
              }}
            >
              <span className={`absolute top-1 left-1.5 text-[9px] font-black z-10 transition-colors ${data.intensity > 0.6 ? 'text-white' : 'text-slate-400 group-hover:text-[#00288E]'}`}>
                {data.day}
              </span>
            </div>
          ))}

          {Array.from({ length: Math.max(0, 42 - (startOffset + totalDays)) }).map((_, i) => (
            <div key={`empty-${i}`} className="opacity-0"></div>
          ))}
        </div>
      </div>

      {hoveredDay && (
        <div 
            className="absolute z-[999] pointer-events-none animate-fade-in"
            style={{ 
                left: '50%', 
                bottom: '10px',
                transform: 'translateX(-50%)'
            }}
        >
            <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4 min-w-[200px]">
                <div className="flex flex-col gap-3">
                    <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Ngày {hoveredDay.day} tháng {month + 1}</span>
                        <div className="w-2 h-2 rounded-full bg-[#00288E] shadow-lg shadow-blue-500/50"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Doanh thu</span>
                            <div className="flex items-baseline text-emerald-600">
                                <span className="text-[10px] font-black leading-none">+</span>
                                {formatCurrency(hoveredDay.revenue, false, false, "text-emerald-600", "text-[10px]")}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Đơn hàng</span>
                            <span className="text-[10px] font-black text-[#00288E]">{hoveredDay.orderCount || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DailyActivityGrid;
