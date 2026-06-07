import React, { useState, useMemo } from 'react';

const PaymentHistoryTable = ({ payments, loading, onPrint }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'paymentDate', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [payments]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPayments = useMemo(() => {
    if (!payments) return [];
    let sortableItems = [...payments];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'displayID') {
          aValue = Number(a.paymentID) || 0;
          bValue = Number(b.paymentID) || 0;
        } else if (sortConfig.key === 'displayInvoiceID') {
          aValue = Number(a.invoiceID) || 0;
          bValue = Number(b.invoiceID) || 0;
        } else if (sortConfig.key === 'paymentDate') {
          aValue = new Date(a.paymentDate).getTime();
          bValue = new Date(b.paymentDate).getTime();
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.localeCompare(bValue, undefined, { numeric: true, sensitivity: 'base' });
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }

        // Tie-breaker: ID (Số lớn hơn là mới hơn)
        const idA = Number(a.paymentID) || 0;
        const idB = Number(b.paymentID) || 0;
        return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
      });
    }
    return sortableItems;
  }, [payments, sortConfig]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedPayments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    return sortedPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedPayments, currentPage]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 w-full bg-slate-50/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="text-center py-24 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100/50">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <span className="material-symbols-outlined text-4xl text-slate-200">history</span>
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Chưa có lịch sử giao dịch</p>
      </div>
    );
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return <span className="material-symbols-outlined text-[12px] ml-1 opacity-0 group-hover/th:opacity-100 transition-opacity" aria-hidden="true">unfold_more</span>;
    return (
      <span className="material-symbols-outlined text-[14px] ml-1 text-acc-primary font-bold" aria-hidden="true">
        {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
      </span>
    );
  };

  return (
    <div className="flex-1 h-full min-h-0 max-h-[580px] md:max-h-[43rem] min-[820px]:max-h-[53rem] min-[1024px]:max-h-[65rem] xl:max-h-none bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-fade-up">

      {/* Desktop Table View (xl+) */}
      <div className="hidden xl:flex flex-1 overflow-auto no-scrollbar flex-col">
        <table className="w-full text-left border-collapse relative acc-responsive-table">
          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-20">
            <tr>
              <th 
                tabIndex={0}
                role="columnheader"
                aria-sort={sortConfig.key === 'displayID' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 group/th transition-colors outline-none focus-visible:bg-slate-100"
                onClick={() => handleSort('displayID')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('displayID'); } }}
              >
                <div className="flex items-center">Phiếu thu {renderSortIcon('displayID')}</div>
              </th>
              <th 
                tabIndex={0}
                role="columnheader"
                aria-sort={sortConfig.key === 'paymentDate' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 group/th transition-colors outline-none focus-visible:bg-slate-100"
                onClick={() => handleSort('paymentDate')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('paymentDate'); } }}
              >
                <div className="flex items-center">Ngày thu {renderSortIcon('paymentDate')}</div>
              </th>
              <th 
                tabIndex={0}
                role="columnheader"
                aria-sort={sortConfig.key === 'displayInvoiceID' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 group/th transition-colors outline-none focus-visible:bg-slate-100"
                onClick={() => handleSort('displayInvoiceID')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('displayInvoiceID'); } }}
              >
                <div className="flex items-center">Khách hàng / Mã hóa đơn {renderSortIcon('displayInvoiceID')}</div>
              </th>
              <th 
                tabIndex={0}
                role="columnheader"
                aria-sort={sortConfig.key === 'amount' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-left cursor-pointer hover:bg-slate-100 group/th transition-colors outline-none focus-visible:bg-slate-100"
                onClick={() => handleSort('amount')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('amount'); } }}
              >
                <div className="flex items-center">Số tiền {renderSortIcon('amount')}</div>
              </th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Phương thức</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedPayments.map((payment) => (
              <tr 
                key={payment.paymentID} 
                className="group bg-white hover:bg-slate-50/80 even:bg-slate-50/50 backdrop-blur-sm transition-all duration-300 cursor-pointer"
              >
                <td className="px-8 py-5" data-label="Phiếu thu">
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight m-0">{payment.displayID}</span>
                    <span className="text-[10px] text-slate-400 font-bold m-0">Xác nhận: {payment.recordedBy || 'Hệ thống'}</span>
                  </div>
                </td>
                <td className="px-8 py-5" data-label="Ngày thu">
                  <span className="text-sm font-bold text-acc-text-main m-0">
                    {new Date(payment.paymentDate).toLocaleDateString('vi-VN')}
                  </span>
                </td>
                <td className="px-8 py-5" data-label="Khách hàng / Mã hóa đơn">
                  <div className="flex flex-col items-start">
                    <span className="text-body-base font-black whitespace-nowrap m-0">{payment.customerName || 'Khách hàng lẻ'}</span>
                    <span className="text-[10px] text-slate-400 font-bold m-0">
                      Hóa đơn: <span className="text-acc-primary font-black">{payment.displayInvoiceID}</span> · {new Date(payment.paymentDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-5 text-left tabular-nums whitespace-nowrap" data-label="Số tiền">
                  <span className="text-sm font-black tracking-tighter m-0">
                    {payment.amount?.toLocaleString('vi-VN')}&nbsp;<small className="text-[10px] opacity-70 font-bold">VND</small>
                  </span>
                </td>
                <td className="px-8 py-5 text-center" data-label="Phương thức">
                  <span className={`acc-badge text-[10px] font-black border whitespace-nowrap px-3 py-1 rounded-full ${
                    payment.paymentMethod === 'CASH' ? 'bg-green-50 text-green-600 border-green-100' :
                    payment.paymentMethod === 'TRANSFER' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                    'bg-slate-50 text-slate-600 border-slate-100'
                  }`}>
                    {payment.paymentMethod === 'CASH' ? 'TIỀN MẶT' : 
                     payment.paymentMethod === 'TRANSFER' ? 'CHUYỂN KHOẢN' : 'THẺ / POS'}
                  </span>
                </td>
                <td className="px-8 py-5 text-center" data-label="Thao tác">
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrint(payment);
                    }}
                    aria-label="In phiếu thu"
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-acc-primary hover:text-white hover:shadow-lg transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none mx-auto"
                    title="In phiếu thu"
                  >
                    <span className="material-symbols-outlined text-lg font-bold" aria-hidden="true">print</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablet/iPad Card View (< xl) */}
      <div className="flex xl:hidden flex-1 overflow-auto no-scrollbar p-4 bg-slate-50/50">
        <div className="grid grid-cols-2 gap-3 w-full h-fit">
          {paginatedPayments.map((payment) => {
            const methodConfig = payment.paymentMethod === 'CASH'
              ? { label: 'Tiền mặt', cls: 'bg-emerald-100 text-emerald-700' }
              : payment.paymentMethod === 'TRANSFER'
              ? { label: 'Chuyển khoản', cls: 'bg-blue-100 text-blue-700' }
              : { label: 'Thẻ / POS', cls: 'bg-slate-100 text-slate-600' };

            return (
              <div
                key={payment.paymentID}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-acc-primary hover:shadow-lg transition-all duration-300 cursor-pointer active:scale-95 flex flex-col justify-between gap-3 group"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-acc-primary flex items-center justify-center shrink-0 border border-slate-100 group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[11px] uppercase tracking-tight line-clamp-1 text-slate-900 group-hover:text-acc-primary transition-colors">
                      {payment.customerName || 'Khách hàng lẻ'}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">{payment.displayID}</p>
                    <p className="text-[9px] font-bold text-slate-400">
                      HĐ: <span className="text-acc-primary font-black">{payment.displayInvoiceID}</span>
                    </p>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Số tiền</p>
                  <p className="text-sm font-black text-acc-primary tabular-nums">
                    {payment.amount?.toLocaleString('vi-VN')}
                    <small className="text-[9px] font-bold ml-1 opacity-60">VND</small>
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wide ${methodConfig.cls}`}>
                    {methodConfig.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400">
                      {new Date(payment.paymentDate).toLocaleDateString('vi-VN')}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onPrint(payment); }}
                      aria-label="In phiếu thu"
                      className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-acc-primary hover:text-white transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                      title="In phiếu thu"
                    >
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">print</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with Pagination */}
      <div className="bg-slate-50 border-t border-slate-200/60 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-sm">
        <div className="flex flex-row items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Hiển thị {payments.length ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(payments.length, currentPage * itemsPerPage)} của {payments.length}
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <span className="text-[10px] font-black uppercase text-slate-600 px-2 tracking-wider">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-black text-acc-text-main w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-slate-400 uppercase text-[9px] font-black tracking-widest">Tổng thực thu:</span>
          <span className="tabular-nums text-acc-primary text-sm font-black">
            {payments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('vi-VN')} VND
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistoryTable;
