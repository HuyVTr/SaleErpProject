import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../components/Common/AccountingToast';
import accountingService from '../../services/accountingService';
import InvoiceTable from '../../components/Tables/InvoiceTable';
import PaymentHistoryTable from '../../components/Tables/PaymentHistoryTable';
import PaymentConfirmationModal from '../../components/Modals/PaymentConfirmationModal';
import PrintableInvoiceTemplate from '../../components/Print/PrintableInvoiceTemplate';
import '../../styles/accounting.css';

const PaymentManagement = () => {
  const location = useLocation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [printData, setPrintData] = useState(null);

  const [isOpenTypeDropdown, setIsOpenTypeDropdown] = useState(false);
  const tableContainerRef = useRef(null);

  useEffect(() => {
    const handleClickOutsideTable = (event) => {
      if (
        selectedInvoice &&
        tableContainerRef.current &&
        !tableContainerRef.current.contains(event.target) &&
        !event.target.closest('.acc-btn-primary') &&
        !event.target.closest('.acc-modal-content') &&
        !event.target.closest('.relative.group')
      ) {
        setSelectedInvoice(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutsideTable);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTable);
    };
  }, [selectedInvoice]);

  // Fetch initial data và tự động xử lý hóa đơn truyền sang
  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoiceData, paymentData] = await Promise.all([
        accountingService.getInvoices(),
        accountingService.getPayments()
      ]);
      
      const invList = Array.isArray(invoiceData) ? invoiceData : (invoiceData?.data || []);
      setInvoices(invList);
      setPayments(Array.isArray(paymentData) ? paymentData : (paymentData?.data || []));

      // Xử lý autoPay từ sale-invoices trỏ qua
      if (location.state?.invoiceID && location.state?.autoPay) {
        const targetInv = invList.find(inv => inv.invoiceID === location.state.invoiceID);
        if (targetInv && targetInv.orderStatus !== 'Đã thanh toán') {
          setSelectedInvoice(targetInv);
          setIsModalOpen(true);
          // Xóa state để tránh mở lại khi reload
          window.history.replaceState({}, document.title);
        }
      }
    } catch (err) {
      console.error("Data Fetch Error:", err);
      showToast("Không thể tải dữ liệu!", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [location.state]);

  // Handle Payment Confirmation
  const handleConfirmPayment = async (paymentData) => {
    try {
      setModalLoading(true);
      await accountingService.recordPayment(selectedInvoice.invoiceID, {
        ...paymentData,
        customerName: selectedInvoice.customerName
      });
      
      showToast(`Đã thu tiền thành công cho hóa đơn ${selectedInvoice.displayID}`, "success");
      setIsModalOpen(false);
      setSelectedInvoice(null);
      await fetchData();
    } catch (err) {
      console.error("Payment Error:", err);
      showToast("Lỗi khi ghi nhận thanh toán!", "error");
    } finally {
      setModalLoading(false);
    }
  };

  // Handle Printing
  const handlePrint = (payment) => {
    const invoice = invoices.find(inv => inv.invoiceID === payment.invoiceID);
    if (!invoice) {
      showToast("Không tìm thấy dữ liệu hóa đơn liên quan!", "error");
      return;
    }

    const payDate = new Date(payment.paymentDate);

    setPrintData({
      detail: {
        ...invoice,
        date: payDate.toLocaleDateString('vi-VN'),
        time: payDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      },
      extendedData: {
        type: 'voucher',
        data: {
          id: payment.id,
          amount: payment.amount?.toLocaleString('vi-VN'),
          method: payment.method === 'Cash' ? 'Tiền mặt' : payment.method === 'Transfer' ? 'Chuyển khoản' : 'Thẻ/POS',
          recordedBy: payment.recordedBy,
          paymentDate: payment.paymentDate,
          customer: payment.customerName || invoice.customerName
        }
      }
    });

    // Trigger window.print sau khi render template
    setTimeout(() => {
      window.print();
      setPrintData(null);
    }, 300);
  };

  // Lọc Hóa đơn chờ thu
  const filteredInvoices = invoices.filter(inv => {
    const status = (inv.orderStatus || '').toString();
    const search = searchQuery.toLowerCase();
    const matchesSearch = 
      (inv.displayID || '').toLowerCase().includes(search) || 
      (inv.customerName || '').toLowerCase().includes(search) ||
      (inv.displayOrderID || '').toLowerCase().includes(search);
      
    return status !== 'Đã thanh toán' && matchesSearch;
  });

  // Lọc Hóa đơn ĐÃ quyết toán
  const filteredCompletedInvoices = invoices.filter(inv => {
    const status = (inv.orderStatus || '').toString();
    const search = searchQuery.toLowerCase();
    const matchesSearch = 
      (inv.displayID || '').toLowerCase().includes(search) || 
      (inv.customerName || '').toLowerCase().includes(search) ||
      (inv.displayOrderID || '').toLowerCase().includes(search);
      
    return status === 'Đã thanh toán' && matchesSearch;
  });

  const filteredPayments = payments.filter(pay => {
    const search = searchQuery.toLowerCase();
    return (
      (pay.displayInvoiceID || '').toLowerCase().includes(search) || 
      (pay.displayID || '').toLowerCase().includes(search) ||
      (pay.customerName || '').toLowerCase().includes(search)
    );
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full animate-fade-up animate-fade-in" style={{ gap: 'var(--space-lg)' }}>
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 px-1">
        <div className="space-y-1">
          <h1 className="text-acc-text-main leading-tight font-black text-3xl sm:text-4xl lg:text-[2rem] uppercase tracking-tight">THANH TOÁN & THU TIỀN</h1>
          <p className="text-body-sm md:text-body-base text-acc-text-muted font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Quản lý dòng tiền vào.</span>
            <span className="inline-flex items-center align-middle px-2.5 py-0.5 rounded-lg bg-blue-50 text-acc-primary font-bold whitespace-nowrap text-xs animate-fade-in" key={`${activeTab}-${filteredInvoices.length}-${filteredCompletedInvoices.length}-${filteredPayments.length}`}>
              {activeTab === 'pending' && `${filteredInvoices.length} chờ thu`}
              {activeTab === 'completed' && `${filteredCompletedInvoices.length} đã xong`}
              {activeTab === 'history' && `${filteredPayments.length} phiếu thu`}
            </span>
          </p>
        </div>
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between hover:border-acc-primary/30 hover:shadow-lg transition-all duration-300">
        <div className="relative flex-1 w-full sm:w-[400px] sm:flex-none group">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã hóa đơn, tên khách…" 
            aria-label="Tìm kiếm mã hóa đơn hoặc tên khách hàng"
            className="w-full bg-slate-50 border-2 border-slate-100 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary transition-all text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-acc-primary transition-colors font-bold" aria-hidden="true">search</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'pending' && selectedInvoice && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="acc-btn-primary flex-1 sm:flex-none py-3.5 px-3 rounded-xl shadow-lg shadow-blue-900/10 active:scale-95 transition-all text-[9px] min-[375px]:text-[10px] font-black uppercase tracking-wider animate-in zoom-in slide-in-from-right-4 duration-300 flex items-center justify-center gap-1 min-[375px]:gap-2 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">payments</span>
              <span>Thu tiền ({selectedInvoice.displayID})</span>
            </button>
          )}

          {/* Table Type Dropdown */}
          <div className="relative flex-1 sm:flex-none sm:w-72 font-manrope">
            <button
              type="button"
              onClick={() => setIsOpenTypeDropdown(!isOpenTypeDropdown)}
              className="w-full bg-slate-50 border-2 border-slate-100 hover:border-acc-primary transition-all rounded-xl px-3 sm:px-4 py-3.5 sm:py-4 flex items-center justify-between gap-1 sm:gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary outline-none text-[10px] sm:text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">filter_alt</span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate">
                  {activeTab === 'pending' ? 'Hóa đơn chờ thu' : activeTab === 'completed' ? 'Hóa đơn đã quyết toán' : 'Lịch sử phiếu thu'}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenTypeDropdown ? 'rotate-180 text-acc-primary' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenTypeDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setIsOpenTypeDropdown(false)}
                />
                
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-acc-primary opacity-80">CHỌN LOẠI BẢNG</span>
                  </div>

                  <div className="p-4 space-y-2">
                    {[
                      { id: 'pending', label: 'Hóa đơn chờ thu', count: filteredInvoices.length },
                      { id: 'completed', label: 'Hóa đơn đã quyết toán', count: filteredCompletedInvoices.length },
                      { id: 'history', label: 'Lịch sử phiếu thu', count: filteredPayments.length }
                    ].map((tab) => {
                      const isSelected = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsOpenTypeDropdown(false);
                          }}
                          className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-all flex items-center justify-between active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-acc-primary text-white shadow-lg shadow-blue-900/30 font-black'
                              : 'bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-acc-primary'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isSelected ? 'bg-white text-acc-primary' : 'bg-slate-200 text-slate-600'}`}>
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Separated Table Container */}
      <div ref={tableContainerRef} className="flex-1 min-h-0 max-h-[36.25rem] md:max-h-[43rem] min-[820px]:max-h-[53rem] min-[1024px]:max-h-[65rem] xl:max-h-none h-fit xl:h-auto flex flex-col overflow-hidden pb-12 px-1">

        {/* Tab Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'pending' ? (
            <InvoiceTable 
              invoices={filteredInvoices}
              loading={loading}
              selectedId={selectedInvoice?.invoiceID}
              onSelect={setSelectedInvoice}
            />
          ) : activeTab === 'completed' ? (
            <InvoiceTable 
              invoices={filteredCompletedInvoices}
              loading={loading}
              selectedId={null}
              isCompleted={true}
              onSelect={() => {}} // Hóa đơn đã xong thì không chọn để thu tiền tiếp
            />
          ) : (
            <PaymentHistoryTable 
              payments={filteredPayments}
              loading={loading}
              onPrint={handlePrint}
            />
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <PaymentConfirmationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        invoice={selectedInvoice}
        onConfirm={handleConfirmPayment}
        loading={modalLoading}
      />

      {/* Hidden Print Template */}
      {printData && (
        <PrintableInvoiceTemplate 
          detail={printData.detail} 
          extendedData={printData.extendedData} 
        />
      )}
    </div>
  );
};

export default PaymentManagement;
