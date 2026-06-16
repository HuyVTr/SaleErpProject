import React from 'react';
import { VNDDisplay, CURRENCY_CLASS_PRIMARY, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

// ─── Display helpers (SQL-aligned) ───────────────────────────────────────────
const RISK_CONFIG = {
  critical: { bg: 'bg-red-50',    text: 'text-red-600',      label: 'Rất nguy cấp', icon: 'priority_high' },
  high:     { bg: 'bg-orange-50', text: 'text-orange-600',   label: 'Cảnh báo cao', icon: 'warning'       },
  medium:   { bg: 'bg-blue-50',   text: 'text-acc-primary',  label: 'Cần theo dõi', icon: 'info'          },
};

const DebtTable = ({ debts, loading, onReminder, onToggleAuto, isMasterAutoEnabled, onSort, sortConfig }) => {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 w-full bg-slate-50/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="material-symbols-outlined text-[14px] opacity-20 group-hover/th:opacity-50">unfold_more</span>;
    return sortConfig.direction === 'asc'
      ? <span className="material-symbols-outlined text-[14px] text-acc-primary">expand_less</span>
      : <span className="material-symbols-outlined text-[14px] text-acc-primary">expand_more</span>;
  };

  // Header với align='center': label căn giữa thật sự, sort icon absolute bên phải
  const Header = ({ label, sortKey, align = 'left' }) => (
    <th
      scope="col"
      tabIndex={sortKey ? 0 : undefined}
      role={sortKey ? "columnheader" : undefined}
      aria-sort={sortKey && sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => sortKey && onSort(sortKey)}
      onKeyDown={(e) => { if (sortKey && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onSort(sortKey); } }}
      className={`px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] transition-colors hover:bg-slate-100/50 outline-none focus-visible:bg-slate-100/80 focus-visible:ring-2 focus-visible:ring-acc-primary ${sortKey ? 'cursor-pointer' : ''} ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
    >
      {align === 'center' ? (
        <div className="relative flex items-center justify-center">
          <span>{label}</span>
          {sortKey && (
            <span className="absolute right-0">{renderSortIcon(sortKey)}</span>
          )}
        </div>
      ) : (
        <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
          {label}
          {sortKey && renderSortIcon(sortKey)}
        </div>
      )}
    </th>
  );

  if (!debts || debts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center py-24 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100/50">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <span className="material-symbols-outlined text-4xl text-slate-200" aria-hidden="true">sentiment_satisfied</span>
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Không tìm thấy khoản nợ phù hợp…</p>
      </div>
    );
  }


  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Desktop Table View (xl+) */}
      <div className="hidden xl:flex flex-1 overflow-auto no-scrollbar flex-col">
        <table className="w-full text-left border-collapse relative acc-responsive-table">
          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20">
            <tr>
              <Header label="Khách Hàng" sortKey="customerName" />
              <Header label="Mã hóa đơn" sortKey="displayID" />
              <Header label="Quá hạn" sortKey="daysOverdue" align="center" />
              <Header label="Số Tiền Nợ" sortKey="remainingAmount" align="left" />
              <Header label="Lần nhắc cuối" sortKey="lastReminderDate" align="center" />
              <th scope="col" className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center hidden sm:table-cell">Tự động</th>
              <th scope="col" className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {debts.map((item, index) => {
              const riskLevel = item.riskLevel || 'medium';
              const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.medium;
              const hasEmail = !!item.email;

              return (
                <tr key={index} className="group cursor-pointer transition-all duration-300 bg-white hover:bg-slate-50/80 even:bg-slate-50/50 backdrop-blur-sm">
                  <td className="px-8 py-5" data-label="Đối tác">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-acc-primary border border-slate-100 group-hover:scale-110 transition duration-300 shadow-inner shrink-0">
                        {item.customerName?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-body-base font-black text-acc-text-main m-0 line-clamp-1">{item.customerName}</span>
                        <div className="flex flex-col mt-0.5">
                          {item.email ? (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 m-0">
                              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">mail</span>
                              {item.email}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 m-0">
                              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">mail_off</span>
                              Chưa có email
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-5" data-label="Mã hóa đơn">
                    <div className="flex flex-col">
                      <span className="text-sm font-black tracking-tight m-0">{item.displayID}</span>
                      <span className="text-[10px] font-bold text-slate-400 m-0">Hóa đơn công nợ</span>
                    </div>
                  </td>

                  <td className="px-8 py-5" data-label="Quá hạn">
                    <div className="flex flex-col items-center gap-1">
                      {item.isOverdue ? (
                        <>
                          <span className="text-sm font-black text-acc-error m-0 whitespace-nowrap">{item.daysOverdue} ngày</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${config.bg} ${config.text} text-[8px] font-black uppercase tracking-wider border border-current/10 shadow-sm`}>
                            {config.label}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Thanh toán tiếp</span>
                          <span className="text-sm font-black text-acc-primary m-0 whitespace-nowrap">{item.nextPaymentDate}</span>
                        </>
                      )}
                    </div>
                  </td>

                  <td className="px-8 py-5 text-left tabular-nums whitespace-nowrap" data-label="SỐ TIỀN CÒN NỢ">
                    <VNDDisplay value={item.remainingAmount || 0} className="text-sm font-black text-acc-primary m-0" />
                  </td>

                  <td className="px-8 py-5 text-center" data-label="Lần nhắc cuối">
                    {item.lastReminderDate ? (
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-acc-text-main m-0">{item.lastReminderDate}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter m-0 hidden xl:inline">Qua Email</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300 font-bold italic">Chưa nhắc</span>
                    )}
                  </td>

                  <td className="px-8 py-5" data-label="Tự động">
                    <div className="flex justify-center">
                      <div
                        role="switch"
                        aria-checked={item.autoRemind}
                        aria-label={`Tự động nhắc nợ cho ${item.customerName}`}
                        tabIndex={isMasterAutoEnabled && hasEmail ? 0 : -1}
                        onClick={(e) => {
                          e.stopPropagation();
                          isMasterAutoEnabled && hasEmail && onToggleAuto?.(item.invoiceID);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            isMasterAutoEnabled && hasEmail && onToggleAuto?.(item.invoiceID);
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-acc-primary/50
                          ${!isMasterAutoEnabled || !item.email ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                          ${item.autoRemind ? 'bg-acc-primary' : 'bg-slate-200'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${item.autoRemind ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-5 text-center" data-label="Thao tác">
                    <div className="flex justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onReminder(item);
                        }}
                        disabled={!hasEmail}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-lg focus-visible:ring-2 focus-visible:ring-acc-primary outline-none
                          ${hasEmail
                            ? 'bg-acc-primary text-white hover:bg-acc-accent shadow-blue-900/10 hover:shadow-blue-900/20'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                          }`}
                      >
                        Gửi nhắc nợ
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tablet/iPad Card View (< xl) */}
      <div className="flex xl:hidden flex-1 overflow-auto no-scrollbar p-4 bg-slate-50/50 flex-col gap-3">
        {/* Thanh sắp xếp thông minh khi ở chế độ card */}
        <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sắp xếp theo</span>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'displayID', label: 'Mã HĐ' },
              { key: 'customerName', label: 'Tên KH' },
              { key: 'remainingAmount', label: 'Số tiền nợ' }
            ].map(item => {
              const isSelected = sortConfig.key === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSort(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none ${
                    isSelected 
                      ? 'bg-acc-primary text-white shadow-md shadow-blue-900/10' 
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {item.label}
                  {isSelected && (
                    <span className="material-symbols-outlined text-[11px] font-bold" aria-hidden="true">
                      {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full h-fit">
          {debts.map((item, index) => {
            const riskLevel = item.riskLevel || 'medium';
            const config = RISK_CONFIG[riskLevel] || RISK_CONFIG.medium;
            const hasEmail = !!item.email;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-acc-primary hover:shadow-lg transition-all duration-300 flex flex-col justify-between gap-3 group"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-acc-primary flex items-center justify-center font-black text-[10px] uppercase shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
                    {item.customerName?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[11px] uppercase tracking-tight line-clamp-2 leading-tight text-slate-900 group-hover:text-acc-primary transition-colors">
                      {item.customerName}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{item.displayID}</p>
                    {item.email ? (
                      <p className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]" aria-hidden="true">mail</span>
                        <span className="truncate max-w-[80px]">{item.email}</span>
                      </p>
                    ) : (
                      <p className="text-[9px] font-bold text-red-400 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]" aria-hidden="true">mail_off</span>
                        Chưa có email
                      </p>
                    )}
                  </div>
                </div>

                {/* Debt amount + overdue */}
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Số tiền nợ</p>
                    <VNDDisplay value={item.remainingAmount || 0} className="text-sm font-black text-acc-primary tabular-nums" />
                  </div>
                  {item.isOverdue && (
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase shrink-0 ${config.bg} ${config.text}`}>
                      {item.daysOverdue}n
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  {item.isOverdue ? (
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${config.bg} ${config.text}`}>
                      {config.label}
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-slate-400">Tiếp: {item.nextPaymentDate}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onReminder(item); }}
                    disabled={!hasEmail}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all shrink-0 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none ${
                      hasEmail
                        ? 'bg-acc-primary text-white hover:bg-acc-accent shadow-sm'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                    title={hasEmail ? 'Gửi nhắc nợ' : 'Chưa có email'}
                    aria-label="Gửi nhắc nợ"
                  >
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">campaign</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(DebtTable);
