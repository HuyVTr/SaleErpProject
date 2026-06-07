import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import warehouseService, { formatCurrency, formatDate } from '../services/warehouseService';

const STATUS_CONFIG = {
  all: { label: 'Tất cả', icon: 'list' },
  pending: { label: 'Chờ giao', icon: 'schedule' },
  shipping: { label: 'Đang giao', icon: 'local_shipping' },
  delivered: { label: 'Đã giao', icon: 'check_circle' },
  failed: { label: 'Thất bại', icon: 'cancel' },
};

const DeliveryOrders = () => {
  const navigate = useNavigate();
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAllOrders = async () => {
    setLoading(true);
    try {
      const data = await warehouseService.getDeliveryOrders({});
      setAllOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return allOrders.filter((order) => {
      const matchesSearch = !search || order.id.toLowerCase().includes(search) || order.customerName.toLowerCase().includes(search);
      const matchesStatus = activeFilter === 'all' || order.deliveryStatus === activeFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allOrders, activeFilter, searchTerm]);

  const statusCounts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const baseOrders = !search
      ? allOrders
      : allOrders.filter((order) => order.id.toLowerCase().includes(search) || order.customerName.toLowerCase().includes(search));

    return {
      all: baseOrders.length,
      pending: baseOrders.filter(o => o.deliveryStatus === 'pending').length,
      shipping: baseOrders.filter(o => o.deliveryStatus === 'shipping').length,
      delivered: baseOrders.filter(o => o.deliveryStatus === 'delivered').length,
      failed: baseOrders.filter(o => o.deliveryStatus === 'failed').length,
    };
  }, [allOrders, searchTerm]);

  const getStatusBadge = (status) => {
    const map = {
      pending: { class: 'pending', label: 'Chờ giao' },
      shipping: { class: 'shipping', label: 'Đang giao' },
      delivered: { class: 'delivered', label: 'Đã giao' },
      failed: { class: 'failed', label: 'Thất bại' },
    };
    const s = map[status] || map.pending;
    return <span className={`wh-badge ${s.class}`}><span className="wh-badge-dot" />{s.label}</span>;
  };

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
            Lệnh giao hàng
          </h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">
            Quản lý và theo dõi tiến trình giao hàng cho đơn hàng đã xác nhận
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="wh-filter-tabs flex-1 sm:flex-initial">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`wh-filter-tab ${activeFilter === key ? 'active' : ''}`}
            >
              {config.label}
              {key === 'all' ? '' : ` (${statusCounts[key] || 0})`}
            </button>
          ))}
        </div>
        <div className="relative sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg">search</span>
          <input
            type="text"
            placeholder="Tìm mã đơn, khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="wh-input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="wh-card flex-1 flex flex-col overflow-hidden min-h-0">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="wh-skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-200 mb-3">inbox</span>
            <p className="text-sm font-bold text-gray-400">Không tìm thấy đơn hàng nào</p>
            <p className="text-xs text-gray-300 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="wh-table wh-responsive-table">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Mã đơn</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Khách hàng</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Địa chỉ giao</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Ngày đặt</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Tổng tiền</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Trạng thái</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="cursor-pointer" onClick={() => navigate(`/warehouse/delivery/${order.id}`)}>
                    <td>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider">
                        {order.id}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-gray-900">{order.customerName}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{order.customerPhone}</p>
                      </div>
                    </td>
                    <td>
                      <p className="text-sm text-gray-600 max-w-[200px] truncate">{order.deliveryAddress}</p>
                    </td>
                    <td className="text-gray-500 whitespace-nowrap">{formatDate(order.orderDate)}</td>
                    <td className="font-bold whitespace-nowrap">{formatCurrency(order.totalAmount)}</td>
                    <td>{getStatusBadge(order.deliveryStatus)}</td>
                    <td>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/warehouse/delivery/${order.id}`); }}
                        className="wh-btn-secondary text-xs px-3 py-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryOrders;
