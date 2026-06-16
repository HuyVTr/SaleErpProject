import React, { useState, useMemo } from 'react';
import { VNDDisplay, CURRENCY_CLASS_PRIMARY, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

const InvoiceTable = ({ invoices, onSelect, selectedId, loading, isCompleted = false }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'displayID', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [invoices]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedInvoices = useMemo(() => {
    if (!invoices) return [];
    let sortableItems = [...invoices];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        // Xử lý đặc biệt cho các trường ID để sort theo số
        if (sortConfig.key === 'displayID') {
          aValue = Number(a.invoiceID) || 0;
          bValue = Number(b.invoiceID) || 0;
        } else if (sortConfig.key === 'displayOrderID') {
          aValue = Number(a.orderID) || 0;
          bValue = Number(b.orderID) || 0;
        } else if (sortConfig.key === 'value') {
          // Ưu tiên dùng field `remaining` đã tính sẵn từ service (có VAT)
          const aRemaining = a.remaining ?? Math.max(0, (a.totalAmount || 0) - (a.paidAmount || 0));
          const bRemaining = b.remaining ?? Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0));
          aValue = isCompleted ? (a.totalAmount || 0) : aRemaining;
          bValue = isCompleted ? (b.totalAmount || 0) : bRemaining;
        } else {
          aValue = a[sortConfig.key] || '';
          bValue = b[sortConfig.key] || '';
        }

        // Nếu là string thì dùng natural sort (hỗ trợ số trong chuỗi)
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
        const idA = Number(a.invoiceID) || 0;
        const idB = Number(b.invoiceID) || 0;
        return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
      });
    } else {
      // Sắp xếp mặc định theo ID DESC nếu key là null (phòng hờ)
      sortableItems.sort((a, b) => (Number(b.invoiceID) || 0) - (Number(a.invoiceID) || 0));
    }
    return sortableItems;
  }, [invoices, sortConfig, isCompleted]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = useMemo(() => {
    return sortedInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedInvoices, currentPage]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 w-full bg-slate-50/50 rounded-2xl"></div>
        ))}
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="text-center py-24 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100/50">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <span className="material-symbols-outlined text-4xl text-slate-200">inventory_2</span>
        </div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Không có hóa đơn nào chờ thu</p>
        <p className="text-xs text-slate-300 mt-2 font-medium">Tất cả công nợ đã được quyết toán sạch sẽ!</p>
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

  const totalValue = invoices.reduce((sum, inv) => {
    // Ưu tiên dùng field `remaining` đã tính sẵn từ service (bao gồm VAT)
    const remaining = inv.remaining ?? Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0));
    return sum + (isCompleted ? (inv.totalAmount || 0) : remaining);
  }, 0);

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
                <div className="flex items-center">Mã hóa đơn {renderSortIcon('displayID')}</div>
              </th>
              <th 
                tabIndex={0}
                role="columnheader"
                aria-sort={sortConfig.key === 'customerName' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 group/th transition-colors text-left outline-none focus-visible:bg-slate-100"
                onClick={() => handleSort('customerName')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('customerName'); } }}
              >
                <div className="flex items-center">Khách hàng {renderSortIcon('customerName')}</div>
              </th>
              <th 
                tabIndex={0}
                role="columnheader"
                aria-sort={sortConfig.key === 'value' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] cursor-pointer hover:bg-slate-100 group/th transition-colors text-left outline-none focus-visible:bg-slate-100"
                onClick={() => handleSort('value')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('value'); } }}
              >
                <div className="flex items-center justify-start">
                  {isCompleted ? 'Tổng hóa đơn' : 'Giá trị còn lại'} {renderSortIcon('value')}
                </div>
              </th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Trạng thái</th>
              {!isCompleted && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center whitespace-nowrap">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedInvoices.map((invoice) => {
              const isSelected = selectedId === invoice.invoiceID;
              // Ưu tiên field `remaining` đã tính sẵn từ service (bao gồm VAT)
              const remaining = invoice.remaining ?? Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));
              // Table "Đã quyết toán": hiển thị totalAmount (với VAT)
              // Table "Chờ thu": hiển thị phần còn lại chưa thu (với VAT)
              const displayValue = isCompleted ? (invoice.totalAmount || 0) : remaining;

              return (
                <tr 
                  key={invoice.invoiceID} 
                  onClick={() => onSelect(invoice)}
                  className={`group cursor-pointer transition-all duration-300 even:bg-slate-50/50 backdrop-blur-sm ${
                    isSelected 
                    ? 'acc-selected-row' 
                    : 'bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <td className="px-8 py-5" data-label="Mã hóa đơn">
                    <div className="flex flex-col">
                      <span className="text-sm font-black tracking-tight m-0">{invoice.displayID}</span>
                      <span className={`text-[10px] font-bold m-0 ${isSelected ? 'opacity-60' : 'text-slate-400'}`}>{invoice.displayOrderID || 'Hợp đồng lẻ'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-left" data-label="Khách hàng">
                     <div className="flex flex-col items-start">
                      <span className="text-body-base font-black whitespace-nowrap m-0">{invoice.customerName || invoice.customerID}</span>
                      <span className={`text-[10px] font-bold m-0 ${isSelected ? 'opacity-60' : 'text-slate-400'}`}>{invoice.date}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-left tabular-nums whitespace-nowrap" data-label="Giá trị">
                    <VNDDisplay value={displayValue || 0} />
                  </td>
                  <td className="px-8 py-5 text-center" data-label="Trạng thái">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-colors whitespace-nowrap ${
                      invoice.orderStatus === 'Đã thanh toán' 
                      ? 'bg-emerald-500 text-white' 
                      : (isSelected ? 'bg-acc-primary/10 text-acc-primary ring-1 ring-acc-primary/20' : 'bg-amber-100 text-amber-600')
                    }`}>
                      {invoice.orderStatus || 'Chờ thu'}
                    </span>
                  </td>
                  {!isCompleted && (
                    <td className="px-8 py-5 text-center" data-label="Thao tác">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition mx-auto ${
                        isSelected ? 'bg-white/20 text-white ring-1 ring-white/30' : 'text-acc-primary bg-blue-50/50 group-hover:bg-acc-primary group-hover:text-white group-hover:shadow-lg shadow-acc-primary/20'
                      }`}>
                        <span className="material-symbols-outlined text-lg font-bold" aria-hidden="true">
                          {isSelected ? 'check_circle' : 'payments'}
                        </span>
                      </div>
                    </td>
                  )}
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
              { key: 'value', label: isCompleted ? 'Tổng giá trị' : 'Còn lại' }
            ].map(item => {
              const isSelected = sortConfig.key === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleSort(item.key)}
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
          {paginatedInvoices.map((invoice) => {
            const isSelected = selectedId === invoice.invoiceID;
            const remaining = invoice.remaining ?? Math.max(0, (invoice.totalAmount || 0) - (invoice.paidAmount || 0));
            const displayValue = isCompleted ? (invoice.totalAmount || 0) : remaining;
            return (
              <div
                key={invoice.invoiceID}
                onClick={() => onSelect(invoice)}
                className={`rounded-2xl p-4 border cursor-pointer transition-all duration-300 active:scale-95 flex flex-col justify-between gap-3 group ${
                  isSelected
                    ? 'bg-acc-primary border-acc-primary shadow-lg shadow-acc-primary/20'
                    : 'bg-white border-slate-200 hover:border-acc-primary hover:shadow-lg'
                }`}
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] uppercase shrink-0 border transition-transform group-hover:scale-105 ${
                    isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-blue-50 text-acc-primary border-slate-100'
                  }`}>
                    {invoice.customerName?.substring(0, 2).toUpperCase() || 'KH'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-black text-[11px] uppercase tracking-tight line-clamp-2 leading-tight ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-acc-primary'} transition-colors`}>
                      {invoice.customerName}
                    </p>
                    <p className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                      {invoice.displayID}
                    </p>
                    {invoice.displayOrderID && (
                      <p className={`text-[9px] font-bold ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                        {invoice.displayOrderID}
                      </p>
                    )}
                  </div>
                </div>

                {/* Value */}
                <div>
                  <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                    {isCompleted ? 'Tổng giá trị' : 'Còn lại'}
                  </p>
                  <VNDDisplay value={displayValue || 0} className={`text-sm font-black tabular-nums ${isSelected ? 'text-white' : `text-acc-primary ${CURRENCY_CLASS_PRIMARY}`}`} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                    invoice.orderStatus === 'Đã thanh toán'
                      ? (isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700')
                      : (isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-600')
                  }`}>
                    {invoice.orderStatus || 'Chờ thu'}
                  </span>
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>{invoice.date}</span>
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
            Hiển thị {invoices.length ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(invoices.length, currentPage * itemsPerPage)} của {invoices.length}
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
          <span className="text-slate-400 uppercase text-[9px] font-black tracking-widest">{isCompleted ? 'Tổng giá trị:' : 'Tổng chờ thu:'}</span>
          <VNDDisplay value={totalValue} className="tabular-nums text-acc-primary text-sm font-black" />
        </div>
      </div>
    </div>
  );
};

export default React.memo(InvoiceTable);
