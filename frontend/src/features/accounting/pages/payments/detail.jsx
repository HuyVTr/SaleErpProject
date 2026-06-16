import React from 'react';
import '../../styles/accounting.css';
import { VNDDisplay } from '../../../../utils/formatVND';

const PaymentDetail = () => {
  return (
    <div className="space-y-6 animate-fade-up" style={{ paddingBottom: 'var(--space-xl)' }}>
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-label-xs text-acc-text-light">
            Quản lý Thanh toán <span className="mx-2 opacity-30">/</span> <span className="text-acc-primary font-bold">Chi tiết Phiếu thu</span>
          </p>
          <h1 className="text-display-sm text-acc-text-main">Phiếu thu #PT-00821</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="acc-badge bg-green-50 text-green-600 border border-green-100">
            Đã xác nhận
          </span>
          <button aria-label="In phiếu thu" className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-acc-text-muted hover:text-acc-primary transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">print</span>
          </button>
          <button aria-label="Chia sẻ" className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-acc-text-muted hover:text-acc-primary transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none">
            <span className="material-symbols-outlined text-xl" aria-hidden="true">share</span>
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-12" style={{ gap: 'var(--space-lg)' }}>
        {/* Left Side: Receipt Details */}
        <div className="col-span-12 lg:col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Summary Info */}
          <div className="acc-card shadow-float" style={{ padding: 'var(--space-lg)' }}>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-xl)' }}>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-label-xs text-acc-text-light uppercase">Người nộp tiền</p>
                  <p className="text-heading-sm text-acc-text-main">Cty CP Kiến Trúc Việt</p>
                  <p className="text-body-sm text-acc-text-muted">Đại diện: Nguyễn Văn A</p>
                </div>
                <div className="space-y-2">
                  <p className="text-label-xs text-acc-text-light uppercase">Lý do nộp</p>
                  <p className="text-body-sm text-acc-text-main font-medium">Thanh toán đợt 2 cho Hóa đơn #IV-99201</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-label-xs text-acc-text-light uppercase">Thông tin giao dịch</p>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-body-sm text-acc-text-muted">Ngày thu:</span>
                      <span className="text-body-sm font-bold text-acc-text-main tabular-nums">28/05/2024</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-body-sm text-acc-text-muted">Phương thức:</span>
                      <span className="text-body-sm font-bold text-acc-primary">Chuyển khoản (Techcombank)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-body-sm text-acc-text-muted">Chứng từ gốc:</span>
                      <span className="text-body-sm font-bold text-acc-text-main underlines cursor-pointer opacity-60">Xem tệp đính kèm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Amount In Words Section */}
          <div className="acc-card shadow-float bg-slate-50/50" style={{ padding: 'var(--space-xl)' }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-label-xs text-acc-text-light uppercase">Tổng số tiền đã thu</p>
                <VNDDisplay value={150000000} isStat={true} customColorClass="text-acc-primary" textSizeClass="text-display-sm" />
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-label-xs text-acc-text-light uppercase mb-2">Bằng chữ</p>
                <p className="text-body-sm italic text-acc-text-main font-medium">Một trăm năm mươi triệu đồng chẵn.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Sidebar Info */}
        <div className="col-span-12 lg:col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {/* Accountant Signature Box */}
          <div className="acc-card shadow-float text-center" style={{ padding: 'var(--space-xl)' }}>
             <p className="text-label-xs text-acc-text-light uppercase mb-10">Người lập phiếu</p>
             <div className="w-32 h-32 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 opacity-20">
                <span className="material-symbols-outlined text-6xl" aria-hidden="true">draw</span>
             </div>
             <p className="text-body-sm font-black text-acc-text-main">Lê Minh Tuấn</p>
             <p className="text-label-xs text-acc-text-muted">Kế toán thanh toán</p>
          </div>

          {/* Connected Invoice */}
          <div className="acc-card shadow-float" style={{ padding: 'var(--space-xl)' }}>
             <h3 className="text-label-xs text-acc-text-light uppercase mb-4">Hóa đơn liên quan</h3>
             <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex justify-between items-center group cursor-pointer hover:bg-blue-50 transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none">
                <div>
                   <p className="text-body-sm font-black text-acc-primary">#IV-99201</p>
                   <p className="text-label-xs text-acc-text-muted">Cty CP Kiến Trúc Việt</p>
                </div>
                <span className="material-symbols-outlined text-acc-primary group-hover:translate-x-1 transition-transform" aria-hidden="true">chevron_right</span>
             </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
             <button className="acc-btn-primary w-full py-4 text-label-xs flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">download</span> Tải tệp PDF
             </button>
             <button className="w-full py-4 text-label-xs font-bold text-acc-text-muted hover:text-acc-primary transition-all border border-slate-100 rounded-xl bg-white focus-visible:ring-2 focus-visible:ring-acc-primary outline-none">
                Gửi qua Email / Zalo
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetail;




