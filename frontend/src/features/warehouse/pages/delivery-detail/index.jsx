import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import warehouseService, { formatDate } from '../../services/warehouseService';
import { VNDDisplay } from '../../../../utils/formatVND';

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

const STATUS_BADGE_STYLE = {
  CONFIRMED: 'bg-orange-50 text-orange-600 border-orange-100',
  SHIPPING:  'bg-blue-50 text-blue-600 border-blue-100',
  DELIVERED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  CANCELLED: 'bg-red-50 text-red-600 border-red-100',
  FAILED:    'bg-red-50 text-red-600 border-red-100',
};

const DeliveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [resultPopup, setResultPopup] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Swipe to back logic
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    e.stopPropagation();
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    if (!touchStart) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    if (!touchStart || !touchEnd) return;

    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (distanceX > minSwipeDistance) {
        navigate('/warehouse/delivery');
      }
    }
  };

  const renderActionButtons = (isMobileView = false) => {
    return (
      <>
        {nextAction && order.orderStatus === 'CONFIRMED' && !stockCheck.ok && (
          <div className={`flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-700 ${isMobileView ? 'w-full justify-center' : ''}`}>
            <span className="material-symbols-outlined text-base text-amber-500" aria-hidden="true">warning</span>
            Thiếu hàng <span className="tabular-nums">{stockCheck.shortages.length}</span> sản phẩm
          </div>
        )}

        {nextAction && (
          <button
            onClick={() => setConfirmAction({
              title: nextAction.label,
              description: 'Xác nhận hành động trước khi tiếp tục',
              message: `Bạn có chắc chắn muốn "${nextAction.label}" cho đơn ${order.displayID}?`,
              icon: nextAction.icon,
              iconBg: 'bg-blue-50',
              iconColor: 'text-[#00288E]',
              confirmLabel: 'Xác nhận',
              confirmIcon: nextAction.icon,
              confirmClass: 'bg-[#00288E] hover:bg-[#001D6E] shadow-blue-900/20',
              onConfirm: () => handleUpdateStatus(nextAction.status, nextAction.note),
            })}
            disabled={updating}
            className={`bg-[#00288E] text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#001D6E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 shadow-lg shadow-blue-900/10 disabled:opacity-60 ${isMobileView ? 'flex-1 py-4 text-xs' : ''}`}
          >
            <span className={`material-symbols-outlined text-lg ${updating ? 'animate-spin' : ''}`} aria-hidden="true">
              {updating ? 'sync' : nextAction.icon}
            </span>
            {updating ? 'Đang xử lý…' : nextAction.label}
          </button>
        )}

        {order.orderStatus === 'SHIPPING' && (
          <button
            onClick={() => setShowFailModal(true)}
            className={`bg-white border-2 border-red-100 text-red-600 px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 ${isMobileView ? 'flex-1 py-4 text-xs' : ''}`}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">cancel</span>
            Giao thất bại
          </button>
        )}

        {order.orderStatus === 'FAILED' && (
          <button
            onClick={() => setConfirmAction({
              title: 'Giao lại đơn hàng',
              description: 'Xác nhận hành động trước khi tiếp tục',
              message: `Bạn có chắc chắn muốn kích hoạt giao lại đơn ${order.displayID}? Đơn sẽ chuyển về trạng thái "Chờ giao" để kho chuẩn bị giao lại.`,
              icon: 'restart_alt',
              iconBg: 'bg-blue-50',
              iconColor: 'text-[#00288E]',
              confirmLabel: 'Giao lại',
              confirmIcon: 'restart_alt',
              confirmClass: 'bg-[#00288E] hover:bg-[#001D6E] shadow-blue-900/20',
              onConfirm: handleRetryDelivery,
            })}
            disabled={updating}
            className={`bg-[#00288E] text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#001D6E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 shadow-lg shadow-blue-900/10 disabled:opacity-60 ${isMobileView ? 'flex-1 py-4 text-xs' : ''}`}
          >
            <span className={`material-symbols-outlined text-lg ${updating ? 'animate-spin' : ''}`} aria-hidden="true">
              {updating ? 'sync' : 'restart_alt'}
            </span>
            {updating ? 'Đang xử lý…' : 'Giao lại đơn hàng'}
          </button>
        )}
      </>
    );
  };

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
      const msg = err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!';
      toast(msg, 'error');
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
      setResultPopup({
        title: 'Đã ghi nhận giao thất bại',
        message: `Đơn ${order.displayID} đã được chuyển sang trạng thái "Giao thất bại". Bạn có thể kích hoạt giao lại bất cứ lúc nào.`,
        icon: 'cancel',
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-500',
      });
      await fetchOrder();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Kích hoạt giao lại đơn hàng sau khi giao thất bại
  const handleRetryDelivery = async () => {
    setUpdating(true);
    try {
      await warehouseService.retryDelivery(order.orderID);
      setResultPopup({
        title: 'Đã kích hoạt giao lại',
        message: `Đơn ${order.displayID} đã được chuyển về trạng thái "Chờ giao" để kho chuẩn bị giao lại.`,
        icon: 'restart_alt',
        iconBg: 'bg-blue-50',
        iconColor: 'text-[#00288E]',
      });
      await fetchOrder();
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!';
      toast(msg, 'error');
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
        <span className="material-symbols-outlined text-6xl text-gray-200 mb-3" aria-hidden="true">error</span>
        <p className="text-sm font-bold text-gray-400">Không tìm thấy đơn hàng #{id}</p>
        <button onClick={() => navigate('/warehouse/delivery')} className="wh-btn-primary mt-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
          <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span> Quay lại
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

  // Bảng sản phẩm: tự giãn theo số dòng nếu <= 5, vượt quá 5 thì khóa chiều cao ở mức
  // 5 dòng (header + 5*row) và bật scroll nội bộ thay vì kéo giãn cả thẻ.
  const itemRows = (order.items || []).length;
  const tableMaxHeightStyle = itemRows > 5 ? { maxHeight: '492px' } : undefined;

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="font-inter w-full h-full flex flex-col gap-5 overflow-y-auto scrollbar-none animate-fade-in pb-24 lg:pb-6"
    >
      {/* Toast */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-[300] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 wh-animate-scale-in ${
          toastType === 'error' ? 'bg-red-600' :
          toastType === 'warning' ? 'bg-amber-600' :
          'bg-emerald-600'
        }`}>
          <span className="material-symbols-outlined text-lg" aria-hidden="true">
            {toastType === 'error' ? 'error' : toastType === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 shrink-0 px-2 md:px-0">
        <div className="flex items-center gap-6">
          <Link
            to="/warehouse/delivery"
            className="hidden sm:flex w-14 h-14 items-center justify-center bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-[background-color,border-color] duration-300 shadow-sm active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-600 transition-colors" aria-hidden="true">arrow_back</span>
          </Link>
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
                {order.displayID}
              </h1>
              <span
                style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }}
                className={`${STATUS_BADGE_STYLE[order.orderStatus] || 'bg-slate-50 text-slate-600 border-slate-100'} font-black rounded-lg border uppercase tracking-tighter whitespace-nowrap`}
              >
                {STATUS_LABELS[order.orderStatus] || order.orderStatus}
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
              Ngày đặt <span className="tabular-nums">{formatDate(order.orderDate || order.date)}</span>{" "}
              <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in">
                {order.customerName}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons (Desktop) */}
        <div className="hidden lg:flex gap-2 flex-wrap items-center">
          {renderActionButtons(false)}
        </div>
      </div>

      {/* Mobile & iPad Sticky Taskbar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md p-4 border-t border-slate-200/80 shadow-[0_-15px_30px_rgba(0,0,0,0.08)] flex gap-3 justify-center items-center rounded-t-2xl animate-fade-in" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 16px))' }}>
        {renderActionButtons(true)}
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Tiến trình giao hàng</h3>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-slate-100 rounded-full" />
          <div
            className="absolute top-5 left-[10%] h-1 bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(currentStatusIndex / (STATUS_FLOW.length - 1) * 80, 80)}%` }}
          />
          {STATUS_FLOW.map((status, i) => {
            const isCompleted = i < currentStatusIndex || order.orderStatus === 'DELIVERED';
            const isCurrent = i === currentStatusIndex && order.orderStatus !== 'DELIVERED';

            return (
              <div key={status} className="flex flex-col items-center z-10 relative" style={{ width: '33.33%' }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                    : isCurrent
                    ? 'bg-white border-2 border-emerald-500 text-emerald-600 shadow-md'
                    : 'bg-slate-100 text-slate-300'
                }`}>
                  <span className="material-symbols-outlined text-xl" aria-hidden="true">
                    {isCompleted ? 'check' : STATUS_ICONS[status]}
                  </span>
                </div>
                <p className={`text-[10px] font-black mt-2 text-center uppercase tracking-wider ${
                  isCompleted || isCurrent ? 'text-emerald-600' : 'text-slate-300'
                }`}>
                  {STATUS_LABELS[status]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left column: Order Info */}
        <div className="xl:col-span-7 flex flex-col gap-5">
          {/* Customer Info */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600" aria-hidden="true">person_search</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin khách hàng</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đối tượng thụ hưởng đơn hàng</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-1.5">Khách hàng</p>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.customerName}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-1.5">Ngày đặt</p>
                <p className="text-sm font-black text-slate-900 uppercase tracking-tight tabular-nums">{formatDate(order.orderDate || order.date)}</p>
              </div>
              {order.notes && (
                <div className="sm:col-span-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-1.5">Ghi chú</p>
                  <p className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{order.notes}</p>
                </div>
              )}
              {order.deliveryNote && (() => {
                const isSuccess = order.orderStatus === 'DELIVERED';
                const noteIcon = isSuccess ? 'check_circle' : 'warning';
                const noteLabelClass = isSuccess ? 'text-emerald-400' : 'text-red-400';
                const noteBoxClass = isSuccess
                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-100'
                  : 'text-red-700 bg-red-50 border border-red-100';
                return (
                  <div className="sm:col-span-2">
                    <p className={`text-[10px] font-black ${noteLabelClass} uppercase tracking-[0.2em] ml-1 mb-1.5 flex items-center gap-1`}>
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">{noteIcon}</span> Ghi chú giao hàng
                    </p>
                    <p className={`text-sm font-medium ${noteBoxClass} rounded-xl px-4 py-3`}>{order.deliveryNote}</p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Order Items with Stock Check */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500 flex flex-col">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600" aria-hidden="true">inventory_2</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Chi tiết sản phẩm</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đối chiếu tồn kho thực tế</p>
                </div>
              </div>
              {!stockCheck.ok && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">warning</span>
                  <span className="tabular-nums">{stockCheck.shortages.length}</span> sản phẩm thiếu hàng
                </span>
              )}
            </div>
            {/* Desktop View */}
            <div
              className={`hidden xl:block overflow-x-auto ${itemRows > 5 ? 'overflow-y-auto' : 'overflow-y-visible'} scrollbar-none pr-1`}
              style={tableMaxHeightStyle}
            >
              <table className="w-full text-left whitespace-nowrap relative border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Sản phẩm</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Yêu cầu</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Tồn kho</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Đơn giá</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Thành tiền</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center sticky top-0 bg-white z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">Kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items || []).map((item, i) => {
                    const stockOk = (item.stockQuantity || 0) >= item.quantity;
                    const stockOut = (item.stockQuantity || 0) === 0;
                    return (
                      <tr key={i} className={`group transition-colors hover:bg-slate-50/40 ${!stockOk ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50/50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100/50 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">image</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-900 uppercase tracking-tight text-sm truncate max-w-[180px] sm:max-w-[220px]" title={item.productName}>{item.productName}</p>
                              {item.sku && <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest tabular-nums">SKU: {item.sku}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 tabular-nums">{item.quantity}</td>
                        <td className={`px-6 py-4 text-right font-black tabular-nums ${stockOk ? 'text-emerald-600' : 'text-red-500'}`}>
                          {item.stockQuantity ?? 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-500 font-medium tabular-nums"><VNDDisplay value={item.unitPrice} /></td>
                        <td className="px-6 py-4 text-right font-black text-blue-600 tabular-nums"><VNDDisplay value={item.total} customColorClass="text-blue-600" /></td>
                        <td className="px-6 py-4 text-center">
                          {stockOut ? (
                            <span style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }} className="bg-red-50 text-red-600 border-red-100 font-black rounded-lg border uppercase tracking-tighter whitespace-nowrap">Hết hàng</span>
                          ) : !stockOk ? (
                            <span style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }} className="bg-amber-50 text-amber-600 border-amber-100 font-black rounded-lg border uppercase tracking-tighter whitespace-nowrap">Thiếu <span className="tabular-nums">{item.quantity - item.stockQuantity}</span></span>
                          ) : (
                            <span style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }} className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black rounded-lg border uppercase tracking-tighter whitespace-nowrap">Đủ hàng</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-100">
                    <td colSpan={4} className="px-6 py-4 text-right font-black text-slate-900 uppercase text-[10px] tracking-widest">
                      Tổng cộng (đã gồm VAT 10%)
                    </td>
                    <td className="px-6 py-4 text-right font-black text-blue-600 text-lg tabular-nums">
                      <VNDDisplay value={order.totalAmount} isStat={true} customColorClass="text-blue-600" textSizeClass="text-lg" />
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile & iPad View */}
            <div className="xl:hidden flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[385px] scrollbar-none p-1">
                {(order.items || []).map((item, i) => {
                  const stockOk = (item.stockQuantity || 0) >= item.quantity;
                  const stockOut = (item.stockQuantity || 0) === 0;
                  return (
                    <div
                      key={i}
                      className={`bg-white rounded-xl p-4 border border-slate-200 hover:border-blue-500 shadow-sm transition-shadow flex flex-col gap-3 ${!stockOk ? 'bg-amber-50/10' : ''}`}
                    >
                      {/* SKU + Stock badge */}
                      <div className="flex items-center justify-between gap-2">
                        {item.sku ? (
                          <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full tracking-wider tabular-nums">
                            SKU: {item.sku}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300">Không có SKU</span>
                        )}
                        {stockOut ? (
                          <span className="bg-red-50 text-red-600 border-red-100 font-black rounded-lg border text-[9px] px-2.5 py-1 uppercase tracking-tighter">Hết hàng</span>
                        ) : !stockOk ? (
                          <span className="bg-amber-50 text-amber-600 border-amber-100 font-black rounded-lg border text-[9px] px-2.5 py-1 uppercase tracking-tighter">Thiếu <span className="tabular-nums">{item.quantity - item.stockQuantity}</span></span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black rounded-lg border text-[9px] px-2.5 py-1 uppercase tracking-tighter">Đủ hàng</span>
                        )}
                      </div>
                      {/* Product Name */}
                      <p className="font-black text-slate-900 text-xs leading-relaxed line-clamp-2 min-h-[2.5rem]">{item.productName}</p>
                      {/* Price & Quantity Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-100 pt-3 mt-auto">
                        <div className="space-y-1">
                          <p className="text-slate-400 font-bold uppercase tracking-wider">Đơn giá</p>
                        <div className="font-bold text-slate-600 tabular-nums">
                          <VNDDisplay value={item.unitPrice} />
                        </div>
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-slate-400 font-bold uppercase tracking-wider">Yêu cầu / Tồn</p>
                        <p className="font-bold text-slate-800 tabular-nums">
                          {item.quantity} <span className="text-slate-300">/</span> <span className={stockOk ? 'text-emerald-600' : 'text-red-500'}>{item.stockQuantity ?? '0'}</span>
                        </p>
                      </div>
                    </div>
                    {/* Total Amount */}
                    <div className="flex justify-between items-center bg-slate-50/70 px-2.5 py-1.5 rounded-lg border border-slate-100/50 mt-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Thành tiền</span>
                      <span className="font-black text-blue-600 text-[11px] tabular-nums">
                        <VNDDisplay value={item.total} customColorClass="text-blue-600" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Total Footer */}
            <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
              <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Tổng cộng (đã gồm VAT 10%):</span>
              <span className="font-black text-blue-600 text-lg tabular-nums">
                <VNDDisplay value={order.totalAmount} isStat={true} customColorClass="text-blue-600" textSizeClass="text-lg" />
              </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Status History — kích thước cố định, không kéo giãn theo cột trái */}
        <div className="xl:col-span-5">
          <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500 sticky top-5">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-600" aria-hidden="true">history</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Lịch sử trạng thái</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dòng thời gian xử lý đơn</p>
              </div>
            </div>
            <div className="space-y-6 min-h-[520px] max-h-[520px] overflow-y-auto overflow-x-hidden pr-1 scrollbar-none">
              {(order.statusHistory || []).map((entry, i) => {
                const isLatest = i === (order.statusHistory?.length || 0) - 1;
                const isFailed = entry.status === 'FAILED' || entry.status === 'CANCELLED';
                const isSuccess = entry.status === 'DELIVERED';

                return (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isFailed ? 'bg-red-50 text-red-500 border border-red-100' :
                        isSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        isLatest ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}>
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">{STATUS_ICONS[entry.status] || 'info'}</span>
                      </div>
                      {i < (order.statusHistory?.length || 0) - 1 && (
                        <div className="w-[2px] flex-1 bg-slate-100 mt-1.5 min-h-[24px]" />
                      )}
                    </div>
                    <div className="pb-1">
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        {STATUS_LABELS[entry.status] || entry.status}
                      </span>
                      <p className="text-xs text-slate-500 font-medium mt-1">{entry.note}</p>
                      <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest mt-1 tabular-nums">{entry.date}</p>
                    </div>
                  </div>
                );
              })}
              {(!order.statusHistory || order.statusHistory.length === 0) && (
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center py-8">Chưa có lịch sử trạng thái</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fail Modal */}
      {showFailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => !updating && setShowFailModal(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-300 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-6">
                <span className="material-symbols-outlined text-3xl sm:text-4xl" aria-hidden="true">warning</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Giao hàng thất bại?</h2>
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                Đơn <span className="text-slate-600">{order.displayID}</span> sẽ được đánh dấu giao thất bại và chờ kho kích hoạt giao lại.
              </p>
            </div>

            <div className="mt-6 sm:mt-8 text-left">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Lý do thất bại *</label>
              <textarea
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Ví dụ: Khách hàng không có mặt tại địa chỉ, địa chỉ không chính xác…"
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 resize-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>

            <div className="flex gap-4 mt-8 sm:mt-10">
              <button
                onClick={() => setShowFailModal(false)}
                disabled={updating}
                className="flex-1 px-4 py-3 sm:py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 hover:text-slate-600 transition-colors active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleMarkFailed}
                disabled={!failReason.trim() || updating}
                className="flex-1 px-4 py-3 sm:py-4 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-200 hover:bg-rose-700 transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">cancel</span>
                Xác nhận thất bại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup xác nhận hành động (dùng chung cho các nút quan trọng) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => !updating && setConfirmAction(null)}>
          <div className="bg-white rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-300 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 ${confirmAction.iconBg || 'bg-blue-50'} ${confirmAction.iconColor || 'text-blue-600'} rounded-xl flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-6`}>
                <span className="material-symbols-outlined text-3xl sm:text-4xl" aria-hidden="true">{confirmAction.icon || 'help'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{confirmAction.title}</h2>
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {confirmAction.message}
              </p>
            </div>

            <div className="flex gap-4 mt-8 sm:mt-10">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={updating}
                className="flex-1 px-4 py-3 sm:py-4 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 hover:text-slate-600 transition-colors active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Hủy bỏ
              </button>
              <button
                onClick={async () => {
                  const action = confirmAction;
                  setConfirmAction(null);
                  await action.onConfirm();
                }}
                disabled={updating}
                className={`flex-1 px-4 py-3 sm:py-4 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${confirmAction.confirmClass || 'bg-[#00288E] hover:bg-[#001D6E] shadow-blue-900/20'}`}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">{confirmAction.confirmIcon || 'check'}</span>
                {confirmAction.confirmLabel || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup kết quả (thay cho toast góc màn hình với các thông báo quan trọng) */}
      {resultPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setResultPopup(null)}>
          <div className="bg-white rounded-2xl p-6 sm:p-10 max-w-md w-full shadow-2xl animate-in zoom-in duration-300 border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className={`w-16 h-16 sm:w-20 sm:h-20 ${resultPopup.iconBg || 'bg-emerald-50'} ${resultPopup.iconColor || 'text-emerald-600'} rounded-xl flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-6`}>
                <span className="material-symbols-outlined text-3xl sm:text-4xl" aria-hidden="true">{resultPopup.icon || 'check_circle'}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{resultPopup.title}</h2>
              <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                {resultPopup.message}
              </p>
            </div>

            <div className="mt-8 sm:mt-10">
              <button
                onClick={() => setResultPopup(null)}
                className="w-full px-4 py-3 sm:py-4 bg-[#00288E] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-[#001D6E] transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDetail;
