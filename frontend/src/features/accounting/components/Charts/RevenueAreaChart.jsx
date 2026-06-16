import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { VNDDisplay, CURRENCY_CLASS_PRIMARY, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    const renderTrend = (current, prev) => {
      if (prev === undefined || prev === null || prev === 0) return null;
      const diff = ((current - prev) / prev) * 100;
      const isUp = diff >= 0;
      if (Math.abs(diff) < 0.1) return null;
      
      return (
        <div className={`flex items-center gap-0.5 font-black text-[9px] px-1.5 py-0.5 rounded-md ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          <span className="material-symbols-outlined text-[12px] font-black">
            {isUp ? 'trending_up' : 'trending_down'}
          </span>
          {Math.abs(diff).toFixed(1)}%
        </div>
      );
    };

    return (
      <div className="bg-white/95 backdrop-blur-md rounded-[1.5rem] shadow-2xl border border-slate-100 p-4 min-w-[15rem] animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-3 pb-2 flex justify-between items-center">
          <span>{label}</span>
        </p>
        
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-acc-primary"></div>
                <span className="text-[11px] font-bold text-slate-500">Doanh thu</span>
              </div>
              {renderTrend(data.revenue, data.prevRevenue)}
            </div>
            <VNDDisplay value={data.revenue || 0} className="text-sm font-black text-acc-text-main pl-3" />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span className="text-[11px] font-bold text-slate-500">Công nợ</span>
              </div>
              {renderTrend(data.expense, data.prevExpense)}
            </div>
            <VNDDisplay value={data.expense || 0} className="text-sm font-black text-amber-600 pl-3" />
          </div>

          <div className="pt-2 mt-2 border-t border-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase">Hóa đơn:</span>
              <span className="text-[11px] font-black text-slate-700">{data.invoiceCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-acc-primary uppercase">Thực thu:</span>
              <VNDDisplay value={data.collected || 0} className="text-sm font-black text-acc-primary" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const RevenueAreaChart = ({ data, loading }) => {
  const containerRef = React.useRef(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    if (!containerRef.current) return;

    // Đo kích thước ngay lập tức
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        if (newWidth > 0) setWidth(newWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, []);

  // Derive chart height and axis width based on measured container width
  const chartHeight = width < 480 ? 280 : width < 768 ? 320 : width < 1280 ? 350 : 380;
  const isMobile = width < 480;
  const yAxisWidth = isMobile ? 40 : 56;
  const tickFontSize = isMobile ? 9 : 10;

  const formatYAxis = (value) => {
    if (value === 0) return '0';
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
    return value.toString();
  };

  return (
    <div ref={containerRef} className="w-full relative" style={{ height: chartHeight }}>
      {(loading || width === 0) ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-acc-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tính toán không gian…</p>
          </div>
        </div>
      ) : (!data || data.length === 0) ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-center">
          <span className="material-symbols-outlined text-4xl mb-2">database_off</span>
          <p className="text-[10px] font-black uppercase tracking-widest">Không có dữ liệu</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight} minWidth={0} minHeight={0}>
          <AreaChart data={data} margin={{ top: 20, right: 20, left: isMobile ? 0 : 8, bottom: 30 }}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00288E" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#00288E" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDebt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#CBD5E1" />
            <XAxis 
              dataKey="label" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 800 }} 
              dy={15}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
              tick={{ fill: '#94A3B8', fontSize: tickFontSize, fontWeight: 700 }}
              tickFormatter={formatYAxis}
              domain={[0, (dataMax) => dataMax * 1.1]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
            <Area 
              type="linear" 
              dataKey="revenue" 
              stroke="#00288E" 
              strokeWidth={3} 
              fillOpacity={1} 
              fill="url(#colorRev)" 
              animationDuration={1000}
              dot={{ r: 4, fill: '#fff', stroke: '#00288E', strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 0, fill: '#00288E' }}
            />
            <Area 
              type="linear" 
              dataKey="expense" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              strokeDasharray="4 4"
              fillOpacity={1} 
              fill="url(#colorDebt)" 
              animationDuration={1200}
              dot={{ r: 3, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default React.memo(RevenueAreaChart);
