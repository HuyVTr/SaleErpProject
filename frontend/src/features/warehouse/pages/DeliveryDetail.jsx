import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import warehouseService, { formatCurrency, formatDate } from '../services/warehouseService';

// Luồng trạng thái chính (đồng bộ với Sales)
const STATUS_FLOW = ['CONFIRMED', 'SHIPPING', 'DELIVERED'];

const STATUS_LABELS = {
  CONFIRMED: 'Chờ giao',
  SHIPPING:  'Đang giao',
  DELIVERED: 'Giao thành công',
  CANCELLED: 'Đã hủy',
  FAILED:    'Giao thất bại',
};

const STATUS_ICONS = {
  CONFIRMED: 'schedule',
  SHIPPING:  'local_shipping',
  DELIVERED: 'check_circle',
  CANCELLED: 'cancel',
  FAILED:    'cancel',
};

const STATUS_BADGE_CLASS = {
  CONFIRMED: 'pending',
  SHIPPING:  'shipping',
  DELIVERED: 'delivered',
  CANCELLED: 'failed',
  FAILED:    'failed',
};

const DeliveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await warehouseService.getOrderDetail(id);
      setOrder(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const toast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Chuyển sang trạng thái tiếp theo
  const handleUpdateStatus = async (newStatus, note = '') => {
    setUpdating(true);
    try {
      await warehouseService.updateDeliveryStatus(order.orderID, newStatus, note);
      toast(`Đã cập nhật: ${STATUS_LABELS[newStatus]}`);
      await fetchOrder(); // Reload để lấy state mới nhất
    } catch (err) {
      console.error(err);
      toast('Có lỗi xảy ra, vui lòng thử lại!', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Xử lý giao hàng thất bại
  const handleMarkFailed = async () => {
    if (!failReason.trim()) return;
    setUpdating(true);
    try {
      await warehouseService.markDeliveryFailed(order.orderID, failReason);
      setShowFailModal(false);
      setFailReason('');
      toast('Đã ghi nhận giao thất bại. Đơn hàng được chuyển lại Sales.', 'warning');
      await fetchOrder();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Xác định hành động tiếp theo dựa trên trạng thái hiện tại
  const getNextAction = () => {
    if (!order) return null;
    const s = order.orderStatus;
    if (s === 'CONFIRMED') return {
      label: 'Bắt đầu giao hàng',
      status: 'SHIPPING',
      icon: 'local_shipping',
      note: 'Kho đã chuẩn bị hàng, đang giao',
      color: 'wh-btn-primary',
    };
    if (s === 'SHIPPING') return {
      label: 'Xác nhận giao thành công',
      status: 'DELIVERED',
      icon: 'check_circle',
      note: 'Khách hàng đã ký nhận hàng',
      color: 'wh-btn-primary',
    };
    return null;
  };

  // Kiểm tra xem có đủ tồn kho để giao không
  const checkStockAvailability = () => {
    if (!order?.items) return { ok: true, shortages: [] };
    const shortages = order.items.filter(item => (item.stockQuantity || 0) < item.quantity);
    return { ok: shortages.length === 0, shortages };
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
        <p className="text-sm font-bold text-gray-400">Không tìm thấy đơn hàng #{id}</p>
        <button onClick={() => navigate('/warehouse/delivery')} className="wh-btn-primary mt-4 text-sm">
          <span className="material-symbols-outlined text-base">arrow_back</span> Quay lại
        </button>
      </div>
    );
  }

  const nextAction = getNextAction();
  const stockCheck = checkStockAvailability();
  const currentStatusIndex = STATUS_FLOW.indexOf(
    order.orderStatus === 'DELIVERED' ? 'DELIVERED' :
    order.orderStatus === 'SHIPPING' ? 'SHIPPING' : 'CONFIRMED'
  );

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 min-h-0">
      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-[300] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 wh-animate-scale-in ${
          toastType === 'error' ? 'bg-red-600' :
          toastType === 'warning' ? 'bg-amber-600' :
          'bg-emerald-600'
        }`}>
          <span className="material-symbols-outlined text-lg">
            {toastType === 'error' ? 'error' : toastType === 'warning' ? 'warning' : 'check_circle'}
          </span>
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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
                {order.displayID}
              </h1>
              <span className={`wh-badge ${STATUS_BADGE_CLASS[order.orderStatus] || 'pending'}`}>
                <span className="wh-badge-dot" />{STATUS_LABELS[order.orderStatus] || order.orderStatus}
              </span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-1">
              Ngày đặt: {formatDate(order.orderDate || order.date)} · {order.customerName}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Cảnh báo thiếu hàng nếu muốn bắt đầu giao */}
          {nextAction && order.orderStatus === 'CONFIRMED' && !stockCheck.ok && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700">
              <span className="material-symbols-outlined text-base text-amber-500">warning</span>
              Thiếu hàng {stockCheck.shortages.length} sản phẩm
            </div>
          )}

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

          {order.orderStatus === 'SHIPPING' && (
            <button
              onClick={() => setShowFailModal(true)}
              className="wh-btn-secondary text-red-600 border-red-200 hover:bg-red-50"
            >
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
          <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-gray-100 rounded-full" />
          <div
            className="absolute top-5 left-[10%] h-1 bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(currentStatusIndex / (STATUS_FLOW.length - 1) * 80, 80)}%` }}
          />
          {STATUS_FLOW.map((status, i) => {
            const isCompleted = i < currentStatusIndex || order.orderStatus === 'DELIVERED';
            const isCurrent = i === currentStatusIndex && order.orderStatus !== 'DELIVERED';

            return (
              <div key={status} className="flex flex-col items-center z-10 relative" style={{ width: '33.33%' }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : isCurrent
                    ? 'bg-white border-2 border-emerald-500 text-emerald-600 shadow-md'
                    : 'bg-gray-100 text-gray-300'
                }`}>
                  <span className="material-symbols-outlined text-xl">
                    {isCompleted ? 'check' : STATUS_ICONS[status]}
                  </span>
                </div>
                <p className={`text-[10px] font-bold mt-2 text-center uppercase tracking-wider ${
                  isCompleted || isCurrent ? 'text-emerald-600' : 'text-gray-300'
                }`}>
                  {STATUS_LABELS[status]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column: Order Info */}
        <div className="lg:col-span-7 space-y-5">
          {/* Customer Info */}
          <div className="wh-card p-5">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">Thông tin khách hàng</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Khách hàng</p>
                <p className="text-sm font-bold text-gray-900">{order.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Ngày đặt</p>
                <p className="text-sm font-bold text-gray-900">{formatDate(order.orderDate || order.date)}</p>
              </div>
              {order.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Ghi chú</p>
                  <p className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{order.notes}</p>
                </div>
              )}
              {order.deliveryNote && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">⚠️ Ghi chú giao hàng</p>
                  <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{order.deliveryNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Items with Stock Check */}
          <div className="wh-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Chi tiết sản phẩm</h3>
              {!stockCheck.ok && (
                <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  ⚠️ {stockCheck.shortages.length} sản phẩm thiếu hàng
                </span>
              )}
            </div>
            <div className="max-h-[360px] overflow-auto scrollbar-thin scrollbar-thumb-slate-200 rounded-xl border border-gray-100">
              <table className="wh-table">
                <thead>
                  <tr>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10">Sản phẩm</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Yêu cầu</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Tồn kho</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Đơn giá</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Thành tiền</th>
                    <th className="sticky top-0 bg-[#F8FAFC] z-10 text-center">Kho</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items || []).map((item, i) => {
                    const stockOk = (item.stockQuantity || 0) >= item.quantity;
                    const stockOut = (item.stockQuantity || 0) === 0;
                    return (
                      <tr key={i} className={!stockOk ? 'bg-amber-50/40' : ''}>
                        <td>
                          <div>
                            <p className="font-semibold text-gray-900">{item.productName}</p>
                            {item.sku && <p className="text-xs text-gray-400">{item.sku}</p>}
                          </div>
                        </td>
                        <td className="text-right font-bold">{item.quantity}</td>
                        <td className={`text-right font-bold ${stockOk ? 'text-emerald-600' : 'text-red-500'}`}>
                          {item.stockQuantity ?? 'N/A'}
                        </td>
                        <td className="text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                        <td className="text-right font-bold">{formatCurrency(item.total)}</td>
                        <td className="text-center">
                          {stockOut ? (
                            <span className="wh-badge out-of-stock"><span className="wh-badge-dot" />Hết hàng</span>
                          ) : !stockOk ? (
                            <span className="wh-badge low-stock"><span className="wh-badge-dot" />Thiếu {item.quantity - item.stockQuantity}</span>
                          ) : (
                            <span className="wh-badge in-stock"><span className="wh-badge-dot" />Đủ hàng</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={4} className="text-right font-extrabold text-gray-900 uppercase text-xs tracking-wider">
                      Tổng cộng (đã gồm VAT 10%)
                    </td>
                    <td className="text-right font-extrabold text-emerald-600 text-lg">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Status History */}
        <div className="lg:col-span-5">
          <div className="wh-card p-5 sticky top-5">
            <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-5">Lịch sử trạng thái</h3>
            <div className="wh-timeline">
              {(order.statusHistory || []).map((entry, i) => {
                const isLatest = i === (order.statusHistory?.length || 0) - 1;
                const isFailed = entry.status === 'FAILED' || entry.status === 'CANCELLED';
                const isSuccess = entry.status === 'DELIVERED';
                const dotClass = isFailed ? 'error' : isSuccess ? 'completed' : isLatest ? 'active' : 'completed';

                return (
                  <div key={i} className="wh-timeline-item">
                    <div className={`wh-timeline-dot ${dotClass}`} />
                    <div className="ml-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined text-base ${
                          isFailed ? 'text-red-500' :
                          isSuccess ? 'text-emerald-500' :
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
              {(!order.statusHistory || order.statusHistory.length === 0) && (
                <p className="text-xs text-gray-300 text-center py-4">Chưa có lịch sử trạng thái</p>
              )}
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
                  placeholder="Ví dụ: Khách hàng không có mặt tại địa chỉ, địa chỉ không chính xác..."
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
