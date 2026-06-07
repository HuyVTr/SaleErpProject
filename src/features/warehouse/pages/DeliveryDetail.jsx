import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import warehouseService, { formatCurrency, formatDate } from '../services/warehouseService';

const STATUS_FLOW = ['confirmed', 'pending', 'shipping', 'delivered'];
const STATUS_LABELS = { confirmed: 'Đã xác nhận', pending: 'Chờ giao', shipping: 'Đang giao', delivered: 'Giao thành công', failed: 'Giao thất bại' };
const STATUS_ICONS = { confirmed: 'task_alt', pending: 'schedule', shipping: 'local_shipping', delivered: 'check_circle', failed: 'cancel' };

const DeliveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await warehouseService.getOrderDetail(id);
        setOrder(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleUpdateStatus = async (newStatus, note = '') => {
    setUpdating(true);
    try {
      const updated = await warehouseService.updateDeliveryStatus(id, newStatus, note);
      setOrder(updated);
      showToast(`Cập nhật trạng thái: ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkFailed = () => {
    if (!failReason.trim()) return;
    handleUpdateStatus('failed', failReason);
    setShowFailModal(false);
    setFailReason('');
  };

  const getNextAction = () => {
    if (!order) return null;
    const s = order.deliveryStatus;
    if (s === 'pending') return { label: 'Bắt đầu giao hàng', status: 'shipping', icon: 'local_shipping', note: 'Đã chuyển cho đơn vị vận chuyển' };
    if (s === 'shipping') return { label: 'Xác nhận giao thành công', status: 'delivered', icon: 'check_circle', note: 'Khách hàng đã nhận hàng' };
    return null;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-extrabold text-gray-400 uppercase tracking-[0.2em]">Đang tải…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <span className="material-symbols-outlined text-6xl text-gray-200 mb-3">error</span>
        <p className="text-sm font-bold text-gray-400">Không tìm thấy đơn hàng {id}</p>
        <button onClick={() => navigate('/warehouse/delivery')} className="wh-btn-primary mt-4 text-sm">
          <span className="material-symbols-outlined text-base">arrow_back</span> Quay lại
        </button>
      </div>
    );
  }

  const nextAction = getNextAction();
  const currentStatusIndex = STATUS_FLOW.indexOf(order.deliveryStatus === 'failed' ? 'shipping' : order.deliveryStatus);

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 min-h-0">
      {/* Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 wh-animate-scale-in">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/warehouse/delivery')} className="wh-btn-secondary p-2.5">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
                Đơn hàng {order.id}
              </h1>
              <span className={`wh-badge ${order.deliveryStatus}`}>
                <span className="wh-badge-dot" />{STATUS_LABELS[order.deliveryStatus]}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">
              Ngày đặt: {formatDate(order.orderDate)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {nextAction && (
            <button
              onClick={() => handleUpdateStatus(nextAction.status, nextAction.note)}
              disabled={updating}
              className="wh-btn-primary"
            >
              <span className={`material-symbols-outlined text-lg ${updating ? 'animate-spin' : ''}`}>
                {updating ? 'sync' : nextAction.icon}
              </span>
              {updating ? 'Đang xử lý…' : nextAction.label}
            </button>
          )}
          {(order.deliveryStatus === 'shipping') && (
            <button onClick={() => setShowFailModal(true)} className="wh-btn-secondary text-red-600 border-red-200 hover:bg-red-50">
              <span className="material-symbols-outlined text-lg">cancel</span>
              Giao thất bại
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="wh-card p-5">
        <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Tiến trình giao hàng</h3>
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-gray-100 rounded-full" />
          <div
            className="absolute top-5 left-[10%] h-1 bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(currentStatusIndex / (STATUS_FLOW.length - 1) * 80, 80)}%` }}
          />

          {STATUS_FLOW.map((status, i) => {
            const isCompleted = i < currentStatusIndex || (order.deliveryStatus === 'delivered' && i <= currentStatusIndex);
            const isCurrent = i === currentStatusIndex && order.deliveryStatus !== 'delivered';
            const isFailed = order.deliveryStatus === 'failed' && status === 'shipping';

            return (
              <div key={status} className="flex flex-col items-center z-10 relative" style={{ width: '25%' }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${isFailed ? 'bg-red-500 text-white shadow-lg shadow-red-200' :
                    isCompleted || (order.deliveryStatus === 'delivered' && i === currentStatusIndex) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                      isCurrent ? 'bg-white border-2 border-emerald-500 text-emerald-600 shadow-md' :
                        'bg-gray-100 text-gray-300'
                  }`}>
                  <span className="material-symbols-outlined text-xl">
                    {isFailed ? 'close' : isCompleted || (order.deliveryStatus === 'delivered' && i === currentStatusIndex) ? 'check' : STATUS_ICONS[status]}
                  </span>
                </div>
                <p className={`text-[10px] font-bold mt-2 text-center uppercase tracking-wider ${isFailed ? 'text-red-500' : isCompleted || isCurrent ? 'text-emerald-600' : 'text-gray-300'
                  }`}>
                  {isFailed ? 'Thất bại' : STATUS_LABELS[status]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Order Info */}
        <div className="lg:col-span-7 space-y-5">
          {/* Customer Info */}
          <div className="wh-card p-5">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Thông tin giao hàng</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Khách hàng</p>
                <p className="text-sm font-bold text-gray-900">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Số điện thoại</p>
                <p className="text-sm font-bold text-gray-900">{order.customerPhone}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Địa chỉ giao hàng</p>
                <p className="text-sm font-bold text-gray-900">{order.deliveryAddress}</p>
              </div>
              {order.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Ghi chú</p>
                  <p className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="wh-card p-5">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Chi tiết sản phẩm</h3>
            <div className="max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-slate-200 rounded-xl border border-gray-100">
              <table className="wh-table">
                <thead>
                  <tr>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10">Sản phẩm</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Số lượng</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Đơn giá</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{item.productName}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right font-bold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="text-right font-extrabold text-gray-900 uppercase text-xs tracking-wider">Tổng cộng</td>
                    <td className="text-right font-extrabold text-emerald-600 text-lg">{formatCurrency(order.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-5">
          <div className="wh-card p-5 sticky top-5">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-5">Lịch sử trạng thái</h3>
            <div className="wh-timeline">
              {order.statusHistory.map((entry, i) => {
                const isLatest = i === order.statusHistory.length - 1;
                const dotClass = entry.status === 'failed' ? 'error' :
                  entry.status === 'delivered' ? 'completed' :
                    isLatest ? 'active' : 'completed';

                return (
                  <div key={i} className="wh-timeline-item">
                    <div className={`wh-timeline-dot ${dotClass}`} />
                    <div className="ml-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined text-base ${entry.status === 'failed' ? 'text-red-500' :
                            entry.status === 'delivered' ? 'text-emerald-500' :
                              'text-blue-500'
                          }`}>
                          {STATUS_ICONS[entry.status] || 'info'}
                        </span>
                        <span className="text-xs font-extrabold text-gray-900 uppercase tracking-wider">
                          {STATUS_LABELS[entry.status] || entry.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-0.5">{entry.note}</p>
                      <p className="text-[10px] text-gray-300 font-bold">{entry.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Fail Modal */}
      {showFailModal && (
        <div className="wh-modal-backdrop" onClick={() => setShowFailModal(false)}>
          <div className="wh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-red-500">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900">Giao hàng thất bại</h3>
                  <p className="text-xs text-gray-400">Đơn hàng sẽ được chuyển lại cho Sales xử lý</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="wh-label">Lý do thất bại *</label>
                <textarea
                  value={failReason}
                  onChange={(e) => setFailReason(e.target.value)}
                  placeholder="Nhập lý do giao hàng thất bại..."
                  rows={3}
                  className="wh-input resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowFailModal(false)} className="wh-btn-secondary">Hủy</button>
                <button
                  onClick={handleMarkFailed}
                  disabled={!failReason.trim() || updating}
                  className="wh-btn-primary bg-red-500 hover:bg-red-600 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">cancel</span>
                  Xác nhận thất bại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDetail;
