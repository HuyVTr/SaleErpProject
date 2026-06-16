import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '../../components/Common/AccountingToast';
import accountingService from '../../services/accountingService';
import InvoiceTable from '../../components/Tables/InvoiceTable';
import PaymentHistoryTable from '../../components/Tables/PaymentHistoryTable';
import PaymentConfirmationModal from '../../components/Modals/PaymentConfirmationModal';
import PrintableInvoiceTemplate from '../../components/Print/PrintableInvoiceTemplate';
import '../../styles/accounting.css';
import { formatVND } from '../../../../utils/formatVND';

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const getWeekRange = (year, week) => {
  const d = new Date(year, 0, 1);
  const dayNum = d.getDay();
  const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
  const firstMonday = new Date(d.setDate(diff));
  const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
};

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

  // ── Time & Date filter states ──
  const now = new Date();
  const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [timeframe, setTimeframe] = useState('monthly');
  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('days');
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4);
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const yearPickerRef = useRef(null);
  const weekPickerRef = useRef(null);
  const yearsCountPickerRef = useRef(null);
  const datePickerRef = useRef(null);

  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const timeDropdownRef = useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const getTimeframeText = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      return `ngày ${selectedDay}/${m}/${y}`;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      return `tuần ${w}, ${y}`;
    }
    if (timeframe === 'monthly') return `12 tháng năm ${filterYear}`;
    if (timeframe === 'yearly') return `${filterYearsCount} năm qua`;
    return 'Toàn thời gian';
  };

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target)) setShowYearPicker(false);
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target)) setShowWeekPicker(false);
      if (yearsCountPickerRef.current && !yearsCountPickerRef.current.contains(event.target)) setShowYearsCountPicker(false);
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setDatePickerView('months');
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setIsOpenTimeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          amount: formatVND(payment.amount, false),
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

  const getISOWeek = (date) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 0;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const matchesTimeframe = (dateStr) => {
    if (!dateStr) return false;
    let y, m, d;
    const parts = dateStr.split(' ')[0].split(/[-/]/).map(Number);
    if (parts.length >= 3) {
      if (parts[0] > 1000) { // YYYY-MM-DD
        y = parts[0];
        m = parts[1];
        d = parts[2];
      } else { // DD/MM/YYYY
        y = parts[2];
        m = parts[1];
        d = parts[0];
      }
    } else {
      return false;
    }

    if (timeframe === 'daily') {
      const targetY = filterDate ? parseInt(filterDate.split('-')[0]) : now.getFullYear();
      const targetM = filterDate ? parseInt(filterDate.split('-')[1]) : (now.getMonth() + 1);
      const targetD = selectedDay || now.getDate();
      return y === targetY && m === targetM && d === targetD;
    } else if (timeframe === 'weekly') {
      const [yStr, wStr] = (filterWeek || "").split('-W');
      const targetY = parseInt(yStr) || now.getFullYear();
      const targetW = parseInt(wStr) || getISOWeek(now);
      const dateObj = new Date(y, m - 1, d);
      return y === targetY && getISOWeek(dateObj) === targetW;
    } else if (timeframe === 'monthly') {
      const targetY = parseInt(filterYear) || now.getFullYear();
      return y === targetY;
    } else if (timeframe === 'yearly') {
      const yearsCount = parseInt(filterYearsCount) || 5;
      const endY = now.getFullYear();
      const startY = endY - yearsCount + 1;
      return y >= startY && y <= endY;
    }
    return true;
  };

  // Lọc Hóa đơn chờ thu
  const filteredInvoices = invoices.filter(inv => {
    const status = (inv.orderStatus || '').toString();
    const search = searchQuery.toLowerCase();
    const matchesSearch = 
      (inv.displayID || '').toLowerCase().includes(search) || 
      (inv.customerName || '').toLowerCase().includes(search) ||
      (inv.displayOrderID || '').toLowerCase().includes(search);
      
    const matchesTime = matchesTimeframe(inv.invoiceDate || inv.createAt || inv.date);
    return status !== 'Đã thanh toán' && matchesSearch && matchesTime;
  });

  // Lọc Hóa đơn ĐÃ quyết toán
  const filteredCompletedInvoices = invoices.filter(inv => {
    const status = (inv.orderStatus || '').toString();
    const search = searchQuery.toLowerCase();
    const matchesSearch = 
      (inv.displayID || '').toLowerCase().includes(search) || 
      (inv.customerName || '').toLowerCase().includes(search) ||
      (inv.displayOrderID || '').toLowerCase().includes(search);
      
    const matchesTime = matchesTimeframe(inv.invoiceDate || inv.createAt || inv.date);
    return status === 'Đã thanh toán' && matchesSearch && matchesTime;
  });

  const filteredPayments = payments.filter(pay => {
    const search = searchQuery.toLowerCase();
    const matchesSearch = (
      (pay.displayInvoiceID || '').toLowerCase().includes(search) || 
      (pay.displayID || '').toLowerCase().includes(search) ||
      (pay.customerName || '').toLowerCase().includes(search)
    );
    const matchesTime = matchesTimeframe(pay.paymentDate || pay.date);
    return matchesSearch && matchesTime;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full animate-fade-up animate-fade-in" style={{ gap: 'var(--space-lg)' }}>
      {/* Header Title + Select Time */}
      <div className="flex flex-col gap-2 sm:gap-3 shrink-0 px-1">
        <h1 className="text-acc-text-main leading-tight font-black text-3xl sm:text-4xl lg:text-[2rem] uppercase tracking-tight">THANH TOÁN & THU TIỀN</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-acc-text-muted font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Quản lý dòng tiền vào.</span>
            <span className="inline-flex items-center align-middle px-2.5 py-0.5 rounded-lg bg-blue-50 text-acc-primary font-bold whitespace-nowrap animate-fade-in" key={`${activeTab}-${filteredInvoices.length}-${filteredCompletedInvoices.length}-${filteredPayments.length}`}>
              {activeTab === 'pending' && `${filteredInvoices.length} chờ thu`}
              {activeTab === 'completed' && `${filteredCompletedInvoices.length} đã xong`}
              {activeTab === 'history' && `${filteredPayments.length} phiếu thu`}
            </span>
          </p>

          {/* Bộ lọc Thời gian Dropdown */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-end relative z-50">
          <div className="relative font-inter w-full sm:w-auto flex flex-col h-full" ref={timeDropdownRef}>
            <button
              onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
              className="w-full sm:w-auto h-full bg-white border border-slate-300 hover:border-acc-primary transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
              style={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">calendar_month</span>
                <span className="font-black text-slate-700 uppercase tracking-widest">
                  <span className="hidden md:inline">Thời gian: </span>{getTimeframeText()}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenTimeDropdown ? 'rotate-180 text-acc-primary' : ''}`} style={{ fontSize: '14px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenTimeDropdown && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-left sm:origin-top-right">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-acc-primary text-[18px] font-bold">tune</span>
                    <span className="text-[13px] font-black uppercase tracking-widest text-acc-primary">CHỌN THỜI GIAN</span>
                  </div>
                  <button
                    onClick={() => setIsOpenTimeDropdown(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600"
                    aria-label="Đóng"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Chế độ lọc */}
                  <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => {
                          setTimeframe(tf);
                          if (tf === 'daily') {
                            const today = new Date();
                            setSelectedDay(today.getDate());
                            setFilterDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
                          } else {
                            setSelectedDay(null);
                          }
                        }}
                        className={`flex-1 py-2 transition-all text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider ${timeframe === tf ? 'bg-white text-acc-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        {tf === 'daily' ? 'Ngày' : tf === 'weekly' ? 'Tuần' : tf === 'monthly' ? 'Tháng' : 'Năm'}
                      </button>
                    ))}
                  </div>

                  {/* Chi tiết bộ lọc */}
                  <div className="pt-3 border-t border-slate-50 flex flex-col gap-2 relative">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bộ chọn chi tiết</span>
                    <div className="flex justify-center w-full">
                      {timeframe === 'daily' && (() => {
                        const [y, m] = filterDate.split('-').map(Number);
                        return (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={datePickerRef}>
                            <button onClick={() => {
                                      const newDate = new Date(y, m - 1, selectedDay - 1);
                                      setSelectedDay(newDate.getDate());
                                      setFilterDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                                    }} 
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Ngày trước">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                              className={`transition-all flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-acc-primary outline-none ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>Ngày {selectedDay}/{m}/{y}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showDatePicker ? 'rotate-180 text-acc-primary' : ''}`} aria-hidden="true">expand_more</span>
                            </button>
                            {showDatePicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[340px] animate-fade-in">
                                {datePickerView === 'days' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn ngày</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }} 
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-acc-primary uppercase">
                                        Tháng {m}, {y} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="py-1">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, idx) => (
                                        <div key={`empty-${idx}`} className="h-8" />
                                      ))}
                                      {Array.from({ length: getDaysInMonth(y, m) }).map((_, idx) => {
                                        const dayNum = idx + 1;
                                        const isSelected = dayNum === selectedDay;
                                        return (
                                          <button key={dayNum}
                                                  onClick={() => { setSelectedDay(dayNum); setShowDatePicker(false); }}
                                                  className={`h-8 w-8 text-[11px] font-black rounded-lg transition-all flex items-center justify-center ${isSelected ? 'bg-acc-primary text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            {dayNum}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : datePickerView === 'months' ? (
                                  <div className="space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn tháng</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('years'); setDateYearRangeStart(Math.floor(dateTempYear / 12) * 12); }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-acc-primary uppercase">
                                        {dateTempYear} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {monthNames.map((mName, idx) => (
                                        <button key={mName}
                                          onClick={() => {
                                            const newM = idx + 1;
                                            const maxD = getDaysInMonth(dateTempYear, newM);
                                            if (selectedDay > maxD) setSelectedDay(maxD);
                                            setFilterDate(`${dateTempYear}-${String(newM).padStart(2, '0')}`); 
                                            setDatePickerView('days');
                                          }}
                                          className={`text-[11px] font-black py-3 rounded-lg transition-all ${(idx + 1) === m && dateTempYear === y ? 'bg-acc-primary text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
                                          {mName}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <div className="flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }} className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-acc-primary">
                                          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-acc-primary">
                                          <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }} className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-acc-primary">
                                          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {Array.from({ length: 12 }).map((_, i) => {
                                        const yearOpt = dateYearRangeStart + i;
                                        return (
                                          <button key={yearOpt} onClick={(e) => { e.stopPropagation(); setDateTempYear(yearOpt); setDatePickerView('months'); }}
                                            className={`text-[11px] font-black py-3 rounded-lg transition-all ${yearOpt === dateTempYear ? 'bg-acc-primary text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                                            {yearOpt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <button onClick={() => {
                                      const newDate = new Date(y, m - 1, selectedDay + 1);
                                      setSelectedDay(newDate.getDate());
                                      setFilterDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                                    }}
                              className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                              style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Ngày tiếp theo">
                              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                            </button>
                          </div>
                        );
                      })()}

                      {timeframe === 'weekly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={weekPickerRef}>
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w - 1; let newY = y; if (newW < 1) { newY--; newW = 52; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }}
                            className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                            style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Tuần trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                            className={`transition-all flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                          </button>
                          {showWeekPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[340px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-acc-primary">{filterWeek.split('-W')[0]}</span></div>
                              <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none">
                                <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-all ${filterWeek === weekStr ? 'bg-acc-primary text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]">check_circle</span>}</button>); })}</div>
                              </div>
                            </div>
                          )}
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }}
                            className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                            style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Tuần tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'monthly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                          <button onClick={() => setFilterYear(prev => prev - 1)}
                            className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                            style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Năm trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }}
                            className={`transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>Năm {filterYear}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                          </button>
                          {showYearPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-acc-primary"><span className="material-symbols-outlined text-[12px]">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-acc-primary"><span className="material-symbols-outlined text-[12px]">chevron_right</span></button></div></div>
                              <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-all ${filterYear === y ? 'bg-acc-primary text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                            </div>
                          )}
                          <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }}
                            disabled={filterYear >= now.getFullYear()}
                            className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                            style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Năm tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'yearly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }}
                            className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                            style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Giảm số năm">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }}
                            className={`transition-all flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterYearsCount} Năm qua</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                          </button>
                          {showYearsCountPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                              <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-all flex justify-between items-center ${filterYearsCount === v ? 'bg-acc-primary text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]">check</span>}</button>))}</div>
                            </div>
                          )}
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }}
                            className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                            style={{ width: '36px', height: '36px', borderRadius: '9px' }} aria-label="Tăng số năm">
                            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
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
