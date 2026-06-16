import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import accountingService from '../../services/accountingService';
import '../../styles/accounting.css';
import { useSwipeToClose } from '../../utils/useSwipeToClose';
import { formatVND, CURRENCY_CLASS_PRIMARY, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

const InvoiceDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(location.state?.invoice || null);
  const [loading, setLoading] = useState(!invoice);

  const swipeHandlers = useSwipeToClose(() => navigate('/accounting/sales-invoices'));

  useEffect(() => {
    if (!invoice) {
      // In a real app, we'd get ID from URL params. 
      // For now, let's just fetch the list and pick the first one or use mock if none.
      const fetchDetail = async () => {
        try {
          const invoices = await accountingService.getInvoices();
          if (invoices.length > 0) {
            setInvoice(invoices[0]);
          }
        } catch (error) {
          console.error("Lỗi khi tải chi tiết hóa đơn:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchDetail();
    }
  }, [invoice]);

  if (loading) return <div className="flex-1 flex items-center justify-center font-black text-acc-primary animate-pulse uppercase tracking-widest">Đang tải dữ liệu…</div>;
  if (!invoice) return <div className="flex-1 flex items-center justify-center text-slate-400 font-black uppercase">Không tìm thấy thông tin hóa đơn</div>;

  const subtotal = (invoice.items || []).reduce((sum, it) => sum + (it.quantity * it.price), 0);
  const tax = subtotal * 0.1;
  const finalTotal = subtotal + tax;
  const paid = Number(invoice.paidAmount) || 0;
  const remaining = Math.max(0, (invoice.totalAmount || finalTotal) - paid);
  const percent = Math.min(100, Math.round((paid / (invoice.totalAmount || finalTotal)) * 100));

  return (
    <div {...swipeHandlers} className="flex-1 flex flex-col h-full bg-slate-50 gap-4 sm:gap-6 lg:gap-5 animate-fade-up pb-8 overflow-y-auto xl:overflow-visible no-scrollbar pr-1 font-manrope">
      {/* HEADER SECTION & BREADCRUMBS */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 px-1 shrink-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
             <button 
               onClick={() => navigate('/accounting/sales-invoices')}
               className="text-[10px] font-black text-acc-text-light uppercase tracking-widest hover:text-acc-primary transition-colors flex items-center gap-1"
             >
               <span className="material-symbols-outlined text-sm">arrow_back</span>
               Quay lại danh sách
             </button>
             <span className="text-[10px] text-slate-300">/</span>
             <span className="text-[10px] font-black text-acc-primary uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-lg active:scale-95 transition-transform" translate="no">Hóa đơn #{invoice.displayID || invoice.invoiceID}</span>
          </div>
          <h1 className="text-acc-text-main leading-tight font-black text-3xl sm:text-4xl lg:text-[2rem] uppercase tracking-tight">Chi tiết Hóa đơn</h1>
          <p className="text-sm sm:text-base text-acc-text-muted font-medium">Mã đơn hàng: <span className="text-acc-primary font-black" translate="no">{invoice.displayOrderID || invoice.orderID || 'N/A'}</span></p>
        </div>
        
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <span className={`acc-badge px-4 py-2 min-w-[150px] text-center shadow-sm ${
            invoice.orderStatus === 'Đã thanh toán' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
            invoice.orderStatus === 'Quá hạn' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
            'bg-amber-50 text-amber-600 border-amber-100'
          }`}>
            {invoice.orderStatus || 'Chờ thanh toán'}
          </span>
          <div className="flex items-center gap-2">
            <button aria-label="In hóa đơn" className="w-11 h-11 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200/60 flex items-center justify-center text-acc-text-muted hover:text-acc-primary hover:border-acc-primary transition-all active:scale-90 duration-200">
               <span className="material-symbols-outlined text-xl">print</span>
            </button>
            <button aria-label="Chia sẻ hóa đơn" className="w-11 h-11 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200/60 flex items-center justify-center text-acc-text-muted hover:text-acc-primary hover:border-acc-primary transition-all active:scale-90 duration-200">
               <span className="material-symbols-outlined text-xl">ios_share</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-5 lg:gap-6">
        
        {/* LEFT COLUMN: Main Info & Table (Scrollable Area) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col min-h-0 gap-5">
          
          {/* Summary Info Card */}
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl p-6 shrink-0 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-acc-primary group-hover:w-2 transition-all"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-acc-text-light uppercase tracking-widest">Khách hàng</p>
                <h4 className="text-sm font-black text-acc-text-main leading-snug" translate="no">{invoice.customerName || 'Khách hàng lẻ'}</h4>
                <p className="text-[11px] text-acc-text-muted font-bold leading-none">{invoice.email || invoice.phoneNumber || 'Không có thông tin liên hệ'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-acc-text-light uppercase tracking-widest">Ngày lập & Hạn định</p>
                <h4 className="text-sm font-black text-acc-text-main leading-snug">{invoice.date || 'N/A'}</h4>
                <p className={`text-[11px] font-black uppercase tracking-tight ${
                  invoice.status === 'paid' ? 'text-emerald-500' : 
                  invoice.orderStatus === 'Quá hạn' ? 'text-acc-error' : 'text-acc-text-muted'
                }`}>
                  {invoice.status === 'paid' 
                    ? `đã thanh toán vào ${invoice.paidAt || 'N/A'}` 
                    : (invoice.finalDueDate ? `Gia hạn: ${invoice.finalDueDate}` : `Hạn chót: ${invoice.dueDate || 'N/A'}`)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-acc-text-light uppercase tracking-widest">Nhân viên kinh doanh</p>
                <h4 className="text-sm font-black text-acc-text-main leading-snug">{invoice.salespersonName || 'Không xác định'}</h4>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[11px] text-acc-primary font-bold uppercase tracking-widest">Phòng Kinh doanh</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Đơn hàng: <span className="text-acc-text-main" translate="no">{invoice.displayOrderID || invoice.orderID || 'N/A'}</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table Container */}
          <div className="flex-1 min-h-0 bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200 p-2">
               <table className="w-full text-left border-collapse relative acc-responsive-table">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 text-[9px] font-black text-acc-text-muted uppercase tracking-[0.2em] w-64 text-center">Danh mục hàng hóa</th>
                      <th className="px-4 py-4 text-[9px] font-black text-acc-text-muted uppercase tracking-[0.2em] text-left">Sản phẩm</th>
                      <th className="px-4 py-4 text-[9px] font-black text-acc-text-muted uppercase tracking-[0.2em] text-left w-40">SL</th>
                      <th className="px-6 py-4 text-[9px] font-black text-acc-text-muted uppercase tracking-[0.2em] text-left w-64">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(!invoice.items || invoice.items.length === 0) ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-10 text-center text-slate-400 font-medium italic">
                          Không có sản phẩm nào trong hóa đơn này.
                        </td>
                      </tr>
                    ) : invoice.items.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-all duration-200 group">
                        <td className="px-6 py-5 text-center" data-label="Danh mục">
                          <div className="flex flex-col items-center justify-center">
                            <span className="bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter text-[9px] px-2.5 py-1 block w-fit max-w-[150px] truncate">
                              {item.categoryName || 'Sản phẩm'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5" data-label="Sản phẩm">
                           <div className="flex flex-col">
                              <p className="text-sm font-black text-acc-text-main leading-tight italic truncate max-w-[400px]" title={item.name || item.productName}>
                                {item.name || item.productName || 'Sản phẩm không xác định'}
                              </p>
                              <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-1 whitespace-nowrap">Mã: {item.productID || item.id || i + 1}</p>
                           </div>
                        </td>
                        <td className="px-4 py-5 text-left tabular-nums" data-label="Số lượng">
                          <span className="text-sm font-black text-acc-text-main">{item.quantity}</span>
                        </td>
                        <td className="px-6 py-5 text-left tabular-nums" data-label="Thành tiền">
                          <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(item.quantity * item.price, false)}</span>{' '}
                          <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>

            {/* Subtotal & Totals Area */}
            <div className="bg-slate-50 border-t border-slate-100 p-6 shrink-0">
               <div className="flex flex-col items-end gap-3">
                  <div className="flex justify-between w-full sm:w-72">
                    <span className="text-[10px] font-black text-acc-text-light uppercase tracking-widest">Tạm tính:</span>
                    <span className="text-sm font-black text-acc-text-main tabular-nums">
                      <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(subtotal, false)}</span>{' '}
                      <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                    </span>
                  </div>
                  <div className="flex justify-between w-full sm:w-72">
                    <span className="text-[10px] font-black text-acc-text-light uppercase tracking-widest">Thuế VAT (10%):</span>
                    <span className="text-sm font-black text-acc-text-main tabular-nums">
                      <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(tax, false)}</span>{' '}
                      <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                    </span>
                  </div>
                  <div className="w-full sm:w-80 h-px bg-slate-200 my-1"></div>
                  <div className="flex justify-between w-full sm:w-80 text-acc-primary">
                    <span className="text-sm font-black uppercase tracking-tight">Tổng cộng:</span>
                    <span className="text-xl font-black tabular-nums">
                      <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(invoice.totalAmount || finalTotal, false)}</span>{' '}
                      <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                    </span>
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Payment & Actions */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5 overflow-y-auto lg:overflow-visible pr-1 no-scrollbar pt-2">
          
          {/* Status Overlay Card */}
          <div className="bg-acc-primary rounded-[2rem] shadow-2xl p-6 text-white relative overflow-hidden group shrink-0">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-8xl">account_balance_wallet</span>
             </div>
             <div className="relative z-10 space-y-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Dư nợ cần thu</p>
                   <h3 className="text-3xl font-black tabular-nums scale-y-110 origin-left tracking-tight">
                      <span>{formatVND(remaining, false)}</span>{' '}
                      <span className="text-sm font-normal opacity-70">VND</span>
                   </h3>
                </div>
                <div className="flex flex-col gap-2">
                   <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/5">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span className="text-[10px] font-black uppercase tracking-wider">
                         Đã thu: {formatVND(paid, false)} VND
                      </span>
                   </div>
                   <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                   </div>
                </div>
             </div>
          </div>

          {/* Payment Form Card */}
          <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl p-6 shrink-0">
             <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-acc-primary">payments</span>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-acc-text-main">Ghi nhận thanh toán</h3>
             </div>
             
             <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
               <div className="space-y-2">
                  <label htmlFor="receive-amount-input" className="text-[10px] font-black text-acc-text-light uppercase tracking-widest">Số tiền nhận (VND)</label>
                  <div className="relative">
                    <input 
                      id="receive-amount-input"
                      name="receiveAmount"
                      type="text" 
                      defaultValue={formatVND(remaining, false)}
                      className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-4 text-base font-black text-acc-primary outline-none ring-2 ring-transparent focus:ring-acc-primary/10 transition-all tabular-nums"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Input</span>
                  </div>
               </div>

               <div className="space-y-2">
                  <span className="text-[10px] font-black text-acc-text-light uppercase tracking-widest block">Phương thức thanh toán</span>
                  <div className="grid grid-cols-2 gap-2">
                     <button type="button" className="flex items-center justify-center gap-2 py-3 bg-blue-50 border-2 border-acc-primary text-acc-primary rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-95">
                        <span className="material-symbols-outlined text-base">account_bank</span> Chuyển khoản
                     </button>
                     <button type="button" className="flex items-center justify-center gap-2 py-3 bg-slate-50 border-2 border-transparent text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-base">savings</span> Tiền mặt
                     </button>
                  </div>
               </div>

               <button className="w-full acc-btn-primary py-4 rounded-2xl shadow-xl shadow-blue-800/15 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-acc-primary">
                  Xác nhận giao dịch
               </button>
             </form>
          </div>

          {/* Side Actions Grid */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
             <button className="bg-white border border-slate-200/60 p-4 rounded-[1.5rem] flex flex-col items-center gap-2 hover:bg-slate-50 transition-all shadow-sm group">
                <span className="material-symbols-outlined text-acc-primary group-hover:scale-110 transition-transform">mail</span>
                <span className="text-[9px] font-black text-acc-text-muted uppercase tracking-wider">Gửi Email</span>
             </button>
             <button className="bg-white border border-slate-200/60 p-4 rounded-[1.5rem] flex flex-col items-center gap-2 hover:bg-slate-50 transition-all shadow-sm group">
                <span className="material-symbols-outlined text-acc-primary group-hover:scale-110 transition-transform">download_for_offline</span>
                <span className="text-[9px] font-black text-acc-text-muted uppercase tracking-wider">Tải PDF</span>
             </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
