import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const RevenueChart = ({ data, formatCurrency }) => {
  const containerRef = React.useRef(null);
  const [containerWidth, setContainerWidth] = React.useState(600);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Responsive thresholds
  const isMobile = containerWidth < 480;
  const isTablet = containerWidth < 768;

  const tickFontSize = isMobile ? 9 : isTablet ? 10 : 12;
  const yAxisWidth = isMobile ? 38 : 50;
  const chartMargin = isMobile
    ? { top: 8, right: 8, left: 0, bottom: 8 }
    : isTablet
    ? { top: 8, right: 12, left: 0, bottom: 8 }
    : { top: 10, right: 20, left: 0, bottom: 10 };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 max-w-[160px] sm:max-w-none">
          <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <div className="flex items-center gap-1 sm:gap-2 whitespace-nowrap">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600">DT:</span>
            {formatCurrency(payload[0].value)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div ref={containerRef} className="w-full">
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 250} minWidth={0} minHeight={0}>
        <AreaChart data={data || []} margin={chartMargin}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00288E" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00288E" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: tickFontSize, fill: '#64748B', fontWeight: 600 }} 
            dy={8}
            padding={{ left: isMobile ? 5 : 20, right: isMobile ? 5 : 20 }}
            interval={0}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: isMobile ? 8 : 10, fill: '#64748B', fontWeight: 600 }} 
            tickFormatter={(value) => {
              if (value === 0) return "0";
              if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
              if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
              return value.toString();
            }} 
            width={yAxisWidth} 
          />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="revenue" stroke="#00288E" strokeWidth={isMobile ? 2 : 3} fillOpacity={1} fill="url(#colorRevenue)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(RevenueChart);
