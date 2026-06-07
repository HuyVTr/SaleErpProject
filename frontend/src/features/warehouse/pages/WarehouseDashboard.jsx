import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import warehouseService, { formatCurrency } from '../services/warehouseService';

const COLORS = { CONFIRMED: '#F59E0B', SHIPPING: '#3B82F6', DELIVERED: '#10B981' };
const STATUS_LABELS = { CONFIRMED: 'Chờ giao', SHIPPING: 'Đang giao', DELIVERED: 'Đã giao' };

const WarehouseDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await warehouseService.getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-extrabold text-gray-400 uppercase tracking-[0.2em] animate-pulse">Đang tải dữ liệu kho…</p>
      </div>
    );
  }

  const orderPieData = stats?.orderStats
    ? Object.entries(stats.orderStats)
        .filter(([key]) => key in COLORS)
        .map(([key, value]) => ({ name: STATUS_LABELS[key], value, key }))
    : [];

  const topStockData = stats?.products
    ? [...stats.products].sort((a, b) => b.stockQuantity - a.stockQuantity).slice(0, 6).map(p => {
        const pName = p.name || 'Sản phẩm';
        return {
          name: pName.length > 20 ? pName.substring(0, 20) + '…' : pName,
          stock: p.stockQuantity,
          value: p.stockQuantity * p.unitPrice,
        };
      })
    : [];

  const statCards = [
    { label: 'Tổng sản phẩm', value: stats?.totalProducts || 0, icon: 'inventory_2', color: 'bg-emerald-50 text-emerald-600', iconBg: 'bg-emerald-100' },
    { label: 'Giá trị tồn kho', value: formatCurrency(stats?.totalStockValue || 0), icon: 'payments', color: 'bg-blue-50 text-blue-600', iconBg: 'bg-blue-100' },
    { label: 'Đang giao hàng', value: stats?.orderStats?.SHIPPING || 0, icon: 'local_shipping', color: 'bg-indigo-50 text-indigo-600', iconBg: 'bg-indigo-100' },
    { label: 'Cảnh báo tồn kho', value: (stats?.lowStockProducts?.length || 0) + (stats?.outOfStockProducts?.length || 0), icon: 'warning', color: 'bg-amber-50 text-amber-600', iconBg: 'bg-amber-100' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3">
          <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">{payload[0].name || payload[0].payload?.name}</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{payload[0].value?.toLocaleString('vi-VN')}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
            Tổng quan Kho hàng
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">
            Theo dõi tồn kho, giao hàng và cảnh báo hết hàng
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/warehouse/delivery')} className="wh-btn-primary">
            <span className="material-symbols-outlined text-lg">local_shipping</span>
            Lệnh giao hàng
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 wh-stagger">
        {statCards.map((card, i) => (
          <div key={i} className="wh-stat-card wh-animate-fade-up">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-xl ${card.color.split(' ')[1]}`}>{card.icon}</span>
              </div>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{card.label}</p>
            <p className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
        {/* Pie Chart - Order Status */}
        <div className="lg:col-span-5 wh-card p-5">
          <h3 className="text-base font-extrabold text-gray-900 uppercase tracking-tight mb-1">Trạng thái đơn hàng</h3>
          <p className="text-xs text-gray-400 font-bold mb-4">Phân bổ theo tiến trình giao hàng</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={orderPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                  {orderPieData.map((entry) => (
                    <Cell key={entry.key} fill={COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {orderPieData.map((entry) => (
              <div key={entry.key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[entry.key] }} />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {entry.name} ({entry.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart - Top Stock */}
        <div className="lg:col-span-7 wh-card p-5">
          <h3 className="text-base font-extrabold text-gray-900 uppercase tracking-tight mb-1">Tồn kho theo sản phẩm</h3>
          <p className="text-xs text-gray-400 font-bold mb-4">Top sản phẩm có số lượng tồn kho cao nhất</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={topStockData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="stock" fill="#3B82F6" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Table */}
      <div className="wh-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">⚠️ Cảnh báo tồn kho thấp</h3>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Sản phẩm cần nhập thêm hàng</p>
          </div>
          <button onClick={() => navigate('/warehouse/stock-import')} className="wh-btn-primary text-xs">
            <span className="material-symbols-outlined text-base">add</span>
            Nhập kho
          </button>
        </div>

        {(stats?.lowStockProducts?.length > 0 || stats?.outOfStockProducts?.length > 0) ? (
          <div className="max-h-[300px] overflow-auto rounded-xl border border-gray-100 scrollbar-thin scrollbar-thumb-slate-200">
            <table className="wh-table">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Mã SP</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Tên sản phẩm</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Danh mục</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Tồn kho</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Tối thiểu</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {[...(stats?.outOfStockProducts || []), ...(stats?.lowStockProducts || [])].map((p) => (
                  <tr key={p.id}>
                    <td><span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{p.sku}</span></td>
                    <td className="font-semibold">{p.name}</td>
                    <td className="text-gray-500">{p.category}</td>
                    <td className="font-bold">{p.stockQuantity} {p.unit}</td>
                    <td className="text-gray-400">{p.minStock}</td>
                    <td>
                      {p.stockQuantity === 0 ? (
                        <span className="wh-badge out-of-stock"><span className="wh-badge-dot" />Hết hàng</span>
                      ) : (
                        <span className="wh-badge low-stock"><span className="wh-badge-dot" />Sắp hết</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="material-symbols-outlined text-5xl text-emerald-200 mb-3">check_circle</span>
            <p className="text-sm font-bold text-gray-400">Tất cả sản phẩm đều đủ hàng!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseDashboard;
