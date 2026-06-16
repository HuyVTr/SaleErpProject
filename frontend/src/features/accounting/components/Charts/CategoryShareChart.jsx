import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { VNDDisplay, CURRENCY_CLASS_PRIMARY, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

const COLORS = ['#00288E', '#0052CC', '#4C9AFF', '#B3D4FF', '#DEEBFF'];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-3 animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
        <VNDDisplay value={data.value} className={`text-sm font-black text-acc-text-main ${CURRENCY_CLASS_PRIMARY}`} />
      </div>
    );
  }
  return null;
};

const CategoryShareChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-acc-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Filter out items with 0 value to clean up the chart and legend
  const filteredData = (data || []).filter(item => item.value > 0);

  if (filteredData.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 opacity-40">
        <span className="material-symbols-outlined text-4xl mb-2">pie_chart</span>
        <p className="text-body-sm font-medium">Không có dữ liệu phân tích</p>
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent }) => {
    // Positioning labels just outside the outer radius for better readability
    const radius = outerRadius * 1.25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#64748b" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-[10px] font-black"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="w-full min-h-[350px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={0}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={5}
            dataKey="value"
            label={renderCustomizedLabel}
            labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            animationDuration={1500}
            animationBegin={300}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(CategoryShareChart);
