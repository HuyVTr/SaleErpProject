import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import warehouseService, { formatCurrency, formatDate, STATUS_LABELS } from '../services/warehouseService';

const STATUS_CONFIG = {
  all:       { label: 'Tất cả',    icon: 'list' },
  CONFIRMED: { label: 'Chờ giao',  icon: 'schedule' },
  SHIPPING:  { label: 'Đang giao', icon: 'local_shipping' },
  DELIVERED: { label: 'Đã giao',   icon: 'check_circle' },
};

const STATUS_BADGE = {
  CONFIRMED: { class: 'pending',   label: 'Chờ giao' },
  SHIPPING:  { class: 'shipping',  label: 'Đang giao' },
  DELIVERED: { class: 'delivered', label: 'Đã giao' },
  CANCELLED: { class: 'failed',    label: 'Đã hủy' },
  FAILED:    { class: 'failed',    label: 'G.thất bại' },
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
      const matchesSearch = !search ||
        order.displayID.toLowerCase().includes(search) ||
        order.customerName.toLowerCase().includes(search);
      const matchesStatus = activeFilter === 'all' || order.orderStatus === activeFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allOrders, activeFilter, searchTerm]);

  const statusCounts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const base = !search
      ? allOrders
      : allOrders.filter(o =>
          o.displayID.toLowerCase().includes(search) ||
          o.customerName.toLowerCase().includes(search)
        );
    return {
      all:       base.length,
      CONFIRMED: base.filter(o => o.orderStatus === 'CONFIRMED').length,
      SHIPPING:  base.filter(o => o.orderStatus === 'SHIPPING').length,
      DELIVERED: base.filter(o => o.orderStatus === 'DELIVERED').length,
    };
  }, [allOrders, searchTerm]);

  const getStatusBadge = (status) => {
    const s = STATUS_BADGE[status] || { class: 'pending', label: status };
    return (
      <span className={`wh-badge ${s.class}`}>
        <span className="wh-badge-dot" />
        {s.label}
      </span>
    );
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
            Quản lý và theo dõi tiến trình giao hàng cho các đơn hàng đã xác nhận
          </p>
        </div>
        <button onClick={fetchAllOrders} className="wh-btn-secondary text-sm">
          <span className="material-symbols-outlined text-base">refresh</span>
          Làm mới
        </button>
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
              {` (${statusCounts[key] ?? 0})`}
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
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Ngày đặt</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Tổng tiền</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Số SP</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Trạng thái</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.orderID}
                    className="cursor-pointer"
                    onClick={() => navigate(`/warehouse/delivery/${order.orderID}`)}
                  >
                    <td>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider">
                        {order.displayID}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="font-semibold text-gray-900">{order.customerName}</p>
                        {order.orderDate && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDate(order.orderDate)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="text-gray-500 whitespace-nowrap">
                      {formatDate(order.orderDate || order.date)}
                    </td>
                    <td className="font-bold whitespace-nowrap">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="text-center">
                      <span className="text-sm font-bold text-gray-700">
                        {order.items?.length || 0} SP
                      </span>
                    </td>
                    <td>{getStatusBadge(order.orderStatus)}</td>
                    <td>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/warehouse/delivery/${order.orderID}`);
                        }}
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
