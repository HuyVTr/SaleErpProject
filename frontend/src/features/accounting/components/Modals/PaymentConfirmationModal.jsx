import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const PaymentConfirmationModal = ({ isOpen, onClose, invoice, onConfirm, loading }) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('Transfer'); // Cash, Transfer, Card
  const [note, setNote] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');

  useEffect(() => {
    if (invoice) {
      // Dùng field `remaining` đã được tính sẵn từ service (bao gồm VAT)
      const remainingAmount = invoice.remaining ?? Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));
      setAmount(remainingAmount);
    }
  }, [invoice]);

  if (!isOpen || !invoice) return null;

  // Dùng field `remaining` đã được tính sẵn từ service (bao gồm VAT)
  const remainingBefore = invoice.remaining ?? Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));
  const remainingAfter = Math.max(0, remainingBefore - parseFloat(amount || 0));
  const isPartial = remainingAfter > 0;

  const handleCloseAttempt = () => {
    const isDirty = parseFloat(amount) !== remainingBefore || note.trim() !== '' || nextPaymentDate !== '';
    if (isDirty) {
      if (window.confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng và hủy bỏ thao tác thu tiền này không?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const paymentMethods = [
    { id: 'Cash', label: 'Tiền mặt', icon: 'payments', color: '#10b981' },
    { id: 'Transfer', label: 'Chuyển khoản', icon: 'account_balance', color: '#3b82f6' },
    { id: 'Card', label: 'Thẻ / POS', icon: 'credit_card', color: '#8b5cf6' },
  ];

  const handleConfirm = () => {
    onConfirm({
      amount: parseFloat(amount),
      method,
      note,
      nextPaymentDate: isPartial ? nextPaymentDate : null,
      paymentDate: new Date().toISOString().split('T')[0], // Match SQL DATE type
      status: 'COMPLETED' // Default status for new payment
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 acc-modal-overlay">
      {/* 
          NOTE KỸ THUẬT: KHÔNG ĐƯỢC CHỈNH SỬA CODE PLATFORM DESKTOP NGOÀI KÍCH THƯỚC MODAL.
          Kích thước đã được tăng lên max-w-3xl cho Desktop/Ipad để tránh xuống dòng văn bản.
          Vẫn sử dụng acc-modal-content để tự động chuyển sang Full Screen trên Mobile.
      */}
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={handleCloseAttempt}
      />
      
      {/* Modal Content */}
      <div 
        className="relative bg-white w-full max-w-3xl max-h-[92vh] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoom-in flex flex-col acc-modal-content"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="p-6 sm:p-10 overflow-y-auto no-scrollbar flex-1">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 sm:mb-10">
            <div>
              <h2 className="text-xl sm:text-3xl text-acc-text-main font-black">Xác nhận thu tiền</h2>
              <p className="text-xs sm:text-body-sm text-acc-text-muted font-medium">Đơn hàng {invoice.id} • {invoice.customerName || invoice.customerID}</p>
            </div>
            <button 
              onClick={handleCloseAttempt}
              aria-label="Đóng modal"
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
            >
              <span className="material-symbols-outlined text-acc-text-muted" aria-hidden="true">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Section: Inputs */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-label-xs text-acc-text-light uppercase tracking-wider" htmlFor="payment-amount">Số tiền thu thực tế</label>
                <div className="relative group">
                  <input 
                    id="payment-amount"
                    type="number"
                    name="amount"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-acc-primary focus:ring-4 focus:ring-acc-primary/10 focus:bg-white rounded-2xl px-5 py-4 text-heading-md text-acc-text-main transition-all outline-none focus-visible:ring-2 focus-visible:ring-acc-primary"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                    <button 
                      type="button"
                      onClick={() => setAmount(remainingBefore)}
                      className="px-3 py-1.5 text-[10px] font-black bg-white border border-slate-200 rounded-lg shadow-sm hover:border-acc-primary hover:text-acc-primary transition-colors uppercase focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                    >
                      Trả hết
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional Field: Next Payment Date for Partial Payment */}
              {isPartial && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-label-xs text-acc-error font-black uppercase tracking-wider flex items-center gap-2" htmlFor="next-date">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">event_repeat</span>
                    Hẹn ngày thanh toán đợt sau
                  </label>
                  <input 
                    id="next-date"
                    type="date"
                    name="nextPaymentDate"
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                    className="w-full bg-red-50/50 border-2 border-red-100 focus:border-acc-error focus:ring-4 focus:ring-acc-error/10 focus:bg-white rounded-2xl px-5 py-3 text-body-sm text-acc-error font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-acc-error"
                  />
                  <p className="text-[10px] text-red-400 font-medium italic tabular-nums">* Khách hàng còn nợ {remainingAfter.toLocaleString('vi-VN')} VND</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-label-xs text-acc-text-light uppercase tracking-wider">Phương thức</label>
                <div className="grid grid-cols-3 gap-3">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition gap-2 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none ${
                        method === m.id 
                        ? 'border-acc-primary bg-blue-50/50 shadow-sm' 
                        : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <span className="material-symbols-outlined" style={{ color: method === m.id ? 'var(--acc-primary)' : m.color }} aria-hidden="true">{m.icon}</span>
                      <span className={`text-[10px] font-bold ${method === m.id ? 'text-acc-primary' : 'text-acc-text-muted'}`}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-label-xs text-acc-text-light uppercase tracking-wider" htmlFor="payment-note">Ghi chú</label>
                <textarea 
                  id="payment-note"
                  name="note"
                  autoComplete="off"
                  spellCheck={false}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nội dung phiếu thu…"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-acc-primary focus:ring-4 focus:ring-acc-primary/10 focus:bg-white rounded-2xl px-5 py-3 text-body-sm text-acc-text-main transition-all outline-none resize-none h-16 focus-visible:ring-2 focus-visible:ring-acc-primary"
                />
              </div>
            </div>

            {/* Right Section: Summary */}
            <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h4 className="text-label-xs text-acc-text-light uppercase tracking-widest text-center border-bottom pb-4 border-slate-200">Tóm tắt quyết toán</h4>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="text-acc-text-muted">Tổng nợ hiện tại:</span>
                    <span className="font-bold text-acc-text-main tabular-nums">{remainingBefore.toLocaleString('vi-VN')} VND</span>
                  </div>
                  <div className="flex justify-between items-center text-body-sm">
                    <span className="text-acc-text-muted">Số tiền thu mới:</span>
                    <span className="font-bold text-acc-primary tabular-nums">-{parseFloat(amount || 0).toLocaleString('vi-VN')} VND</span>
                  </div>
                  <div className="pt-4 border-t border-dashed border-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-label-xs text-acc-text-light uppercase">Nợ còn lại:</span>
                      <span className={`text-heading-sm font-black tabular-nums ${remainingAfter === 0 ? 'text-green-600' : 'text-acc-error'}`}>
                        {remainingAfter.toLocaleString('vi-VN')} VND
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  disabled={loading || amount <= 0}
                  onClick={handleConfirm}
                  className="w-full acc-btn-primary py-4 rounded-2xl text-label-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 active:scale-95 transition text-white focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg" aria-hidden="true">verified_user</span>
                      Hoàn tất thu tiền
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={handleCloseAttempt}
                  className="w-full py-4 text-label-xs font-black text-acc-text-muted hover:text-acc-text-main transition-colors focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  Hủy thao tác
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PaymentConfirmationModal;
