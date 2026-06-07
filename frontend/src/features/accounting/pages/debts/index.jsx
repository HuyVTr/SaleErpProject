import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useToast } from '../../components/Common/AccountingToast';
import accountingService from '../../services/accountingService';
import DebtTable from '../../components/Tables/DebtTable';
import DashboardStat from '../../components/Stats/DashboardStat';
import { WalletIcon, DebtIcon, CustomerIcon } from '../../components/Icons/AccountingIcons';
import '../../styles/accounting.css';

const getResponsiveValueClass = (val) => {
  const str = val ? String(val) : '';
  const len = str.length;
  if (len <= 10) {
    return "text-base sm:text-lg lg:text-lg xl:text-xl";
  } else if (len <= 15) {
    return "text-sm sm:text-base lg:text-[13px] xl:text-lg";
  } else if (len <= 20) {
    return "text-xs sm:text-sm lg:text-[11px] xl:text-base";
  } else {
    return "text-[10px] sm:text-xs lg:text-[10px] xl:text-sm";
  }
};

const DebtTracker = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState([]);
  const [filteredDebts, setFilteredDebts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOpenRiskDropdown, setIsOpenRiskDropdown] = useState(false);
  const [autoDays, setAutoDays] = useState(localStorage.getItem('debt_auto_days') || "7");
  const [isAutoEnabled, setIsAutoEnabled] = useState(localStorage.getItem('debt_auto_enabled') === 'true');
  const [sortConfig, setSortConfig] = useState({ key: 'remainingAmount', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, riskFilter]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleAuto = (id) => {
    const item = debts.find(d => d.invoiceID === id);
    if (item && !item.email) {
      showToast(`Không thể bật tự động cho ${item.customerName} vì chưa có email`, "warning");
      return;
    }

    setDebts(prev => prev.map(debt => 
      debt.invoiceID === id ? { ...debt, autoRemind: !debt.autoRemind } : debt
    ));
    showToast("Đã cập nhật trạng thái tự động nhắc nợ", "success");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await accountingService.getDebtReport();
        setDebts(data.data || []);
        setFilteredDebts(data.data || []);
        setSummary(data.summary);
      } catch (err) {
        console.error("Debt API Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Logic lọc dữ liệu
  useEffect(() => {
    let result = debts;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d =>
        // SQL-aligned: tìm theo customerName (computed) hoặc invoiceID
        (d.customerName      || '').toLowerCase().includes(q) ||
        (String(d.invoiceID) || '').toLowerCase().includes(q) ||
        (d.companyName       || '').toLowerCase().includes(q)
      );
    }
    
    if (riskFilter !== 'all') {
      result = result.filter(d => d.riskLevel === riskFilter);
    }

    // Logic Sắp xếp
    if (sortConfig.key) {
      result = [...result].sort((a, b) => {
        let aVal, bVal;

        // Xử lý các trường đặc biệt
        if (sortConfig.key === 'lastReminderDate') {
          const parseDateStr = (d) => {
            if (!d) return 0;
            const [day, month, year] = d.split('/').map(Number);
            return new Date(year, month - 1, day).getTime();
          };
          aVal = parseDateStr(a.lastReminderDate);
          bVal = parseDateStr(b.lastReminderDate);
        } else if (sortConfig.key === 'displayID') {
          aVal = Number(a.invoiceID) || 0;
          bVal = Number(b.invoiceID) || 0;
        } else {
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
        }

        if (aVal !== bVal) {
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        }

        // Tie-breaker: invoiceID (ID lớn hơn là mới hơn)
        const idA = Number(a.invoiceID) || 0;
        const idB = Number(b.invoiceID) || 0;
        return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
      });
    }
    
    setFilteredDebts(result);
  }, [searchQuery, riskFilter, debts, sortConfig]);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDebts.length / itemsPerPage) || 1;
  const paginatedDebts = filteredDebts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const checkDirtyAndAttemptClose = () => {
    const originalDays = localStorage.getItem('debt_auto_days') || "7";
    const originalEnabled = localStorage.getItem('debt_auto_enabled') === 'true';
    const isDirty = autoDays !== originalDays || isAutoEnabled !== originalEnabled;
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      setIsSettingsOpen(false);
    }
  };

  const handleConfirmCloseModal = (confirm) => {
    setShowConfirmClose(false);
    if (confirm) {
      setIsSettingsOpen(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem('debt_auto_days', autoDays);
    localStorage.setItem('debt_auto_enabled', isAutoEnabled);
    setIsSettingsOpen(false);
    showToast(`Đã lưu cấu hình: Tự động nhắc nợ đang ${isAutoEnabled ? 'BẬT' : 'TẮT'}`, "success");
  };

  // ── Email validation: gửi nhắc nợ đơn lẻ qua Backend
  const handleReminder = async (item) => {
    if (!item.email) {
      showToast(`Không thể gửi: ${item.customerName} chưa có email`, 'error');
      return;
    }
    
    try {
      // Gọi service - khi ghép BE sẽ gọi endpoint /api/reminders/send
      await accountingService.sendDebtReminder(item.invoiceID);
      showToast(`Đã gửi nhắc nợ tới ${item.email}`, 'success');
    } catch (error) {
      showToast("Không thể kết nối máy chủ gửi mail", "error");
    }
  };

  // ── Batch reminder: gửi hàng loạt tới các KH có email
  const handleBatchReminder = async () => {
    const withEmail = filteredDebts.filter(d => !!d.email);
    const noEmail   = filteredDebts.filter(d => !d.email);
    
    if (withEmail.length === 0) {
      showToast('Không có khách hàng nào có email để gửi', 'error');
      return;
    }

    try {
      const ids = withEmail.map(d => d.invoiceID);
      // Gọi service - khi ghép BE sẽ gọi endpoint /api/reminders/batch-send
      await accountingService.sendBatchReminders(ids);

      const msg = noEmail.length > 0
        ? `Đã gửi ${withEmail.length} nhắc nợ · ${noEmail.length} KH chưa có email (bỏ qua)`
        : `Đã gửi nhắc nợ tới ${withEmail.length} khách hàng`;
      showToast(msg, 'success');
    } catch (error) {
      showToast("Lỗi khi gửi nhắc nợ hàng loạt", "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full animate-fade-up" style={{ gap: 'var(--space-md)' }}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 shrink-0 px-2 md:px-2">
        <div className="space-y-1 md:space-y-2">
          <h1 className="text-acc-text-main leading-tight font-black text-3xl sm:text-4xl lg:text-[2rem] uppercase tracking-tight">QUẢN LÝ CÔNG NỢ</h1>
          <p className="text-body-sm md:text-body-base text-acc-text-muted font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Theo dõi nợ quá hạn.</span>
            <span className="inline-flex items-center align-middle px-2.5 py-0.5 rounded-lg bg-blue-50 text-acc-primary font-bold whitespace-nowrap text-xs animate-fade-in" key={filteredDebts.length}>
              {filteredDebts.length} khách hàng
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 md:flex items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full md:w-[60px] h-10 md:h-[60px] bg-white rounded-xl md:rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-acc-text-muted hover:text-acc-primary hover:border-acc-primary/30 transition shadow-sm focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
            aria-label="Cấu hình tự động"
          >
            <span className="material-symbols-outlined text-[20px] md:text-[28px]" aria-hidden="true">settings</span>
            <span className="font-black text-[12px] md:hidden tracking-tight uppercase">Cấu hình</span>
          </button>

          <button
            onClick={handleBatchReminder}
            className="acc-btn-primary w-full md:w-auto bg-acc-error hover:bg-red-700 shadow-lg shadow-red-900/10 hover:shadow-red-900/20 h-10 md:h-[60px] py-0 md:py-4 px-4 md:px-8 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-acc-error outline-none"
          >
            <span className="material-symbols-outlined text-lg md:text-xl" aria-hidden="true">campaign</span>
            <span className="font-black text-[12px] md:text-sm tracking-tight">
              <span className="inline md:hidden">NHẮC LOẠT</span>
              <span className="hidden md:inline">GỬI NHẮC NỢ HÀNG LOẠT</span>
            </span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 px-2 md:px-0">
        <DashboardStat 
          label="Tổng nợ phải thu" 
          value={summary?.totalDebt} 
          growth={summary?.totalDebtGrowth} 
          icon={WalletIcon} 
          color="text-blue-600" 
          loading={loading} 
          tooltipAlign="right"
        />
        <DashboardStat 
          label="Nợ quá hạn" 
          value={summary?.overdueDebt} 
          growth={summary?.overdueDebtGrowth} 
          icon={DebtIcon} 
          color="text-red-500" 
          loading={loading} 
          tooltipAlign="left"
        />
        <DashboardStat 
          label="Số lượng khách hàng" 
          value={summary?.customerCount} 
          growth={summary?.customerCountGrowth} 
          icon={CustomerIcon} 
          color="text-indigo-500" 
          loading={loading} 
          tooltipAlign="left"
        />
      </div>

      {/* Unified Search & Filter Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-row gap-2 sm:gap-6 items-center justify-between hover:border-acc-primary/30 hover:shadow-lg transition-all duration-300">
        <div className="relative flex-1 sm:w-[400px] sm:flex-none group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm khách hàng, mã hóa đơn…"
            aria-label="Tìm kiếm khách hàng hoặc mã hóa đơn"
            className="w-full bg-slate-50 border-2 border-slate-100 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary transition-all text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-acc-primary transition-colors font-bold" aria-hidden="true">search</span>
        </div>

        {/* Risk Filter Dropdown */}
        <div className="relative w-auto sm:w-72 font-manrope">
          <button
            type="button"
            onClick={() => setIsOpenRiskDropdown(!isOpenRiskDropdown)}
            className="w-full bg-slate-50 border-2 border-slate-100 hover:border-acc-primary transition-all rounded-xl px-3 sm:px-4 py-4 flex items-center justify-between gap-1 sm:gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary outline-none text-[10px] sm:text-xs"
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">filter_alt</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">
                {riskFilter === 'all' ? 'Tất cả mức độ' : riskFilter === 'critical' ? 'Rất nguy cấp' : riskFilter === 'high' ? 'Cảnh báo cao' : 'Cần theo dõi'}
              </span>
            </div>
            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenRiskDropdown ? 'rotate-180 text-acc-primary' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
              keyboard_arrow_down
            </span>
          </button>

            {isOpenRiskDropdown && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsOpenRiskDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] font-black uppercase tracking-widest text-acc-primary opacity-80">LỌC MỨC ĐỘ RỦI RO</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      { id: 'all',      label: 'Tất cả mức độ',  count: null },
                      { id: 'critical', label: 'Rất nguy cấp',   count: filteredDebts.filter(d => d.riskLevel === 'critical').length },
                      { id: 'high',     label: 'Cảnh báo cao',   count: filteredDebts.filter(d => d.riskLevel === 'high').length },
                      { id: 'medium',   label: 'Cần theo dõi',   count: filteredDebts.filter(d => d.riskLevel === 'medium').length },
                    ].map((opt) => {
                      const isSelected = riskFilter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setRiskFilter(opt.id);
                            setIsOpenRiskDropdown(false);
                          }}
                          className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-all flex items-center justify-between active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-acc-primary text-white shadow-lg shadow-blue-900/30 font-black'
                              : 'bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-acc-primary'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {opt.count !== null && opt.count > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isSelected ? 'bg-white text-acc-primary' : 'bg-slate-200 text-slate-600'}`}>
                              {opt.count}
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

      {/* Table Section */}
      <div className="flex-1 min-h-0 max-h-[36.25rem] md:max-h-[43rem] min-[820px]:max-h-[53rem] min-[1024px]:max-h-[65rem] xl:max-h-none h-fit xl:h-auto flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <DebtTable 
            debts={paginatedDebts}
            loading={loading}
            onReminder={handleReminder}
            onToggleAuto={handleToggleAuto}
            isMasterAutoEnabled={isAutoEnabled}
            sortConfig={sortConfig}
            onSort={handleSort}
          />

        {/* Footer with Pagination */}
        <div className="bg-slate-50 border-t border-slate-200/60 px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex flex-row items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Hiển thị {filteredDebts.length ? (currentPage - 1) * itemsPerPage + 1 : 0}-{Math.min(filteredDebts.length, currentPage * itemsPerPage)} của {filteredDebts.length}
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
            <span className="text-slate-400 uppercase text-[9px] font-black tracking-widest">Tổng nợ:</span>
            <span className="tabular-nums text-acc-primary text-sm font-black">
              {filteredDebts.reduce((sum, d) => sum + (d.remainingAmount || 0), 0).toLocaleString('vi-VN')} VND
            </span>
          </div>
        </div>
      </div>

      {/* Settings Modal - Glassmorphism UI */}
      {isSettingsOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" 
            onClick={checkDirtyAndAttemptClose} 
          />
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoom-in pointer-events-auto">
            <div className="p-8 pb-4 flex items-center justify-between">
              <h3 className="text-xl font-black text-acc-text-main">Cấu hình tự động</h3>
              <button 
                onClick={checkDirtyAndAttemptClose}
                className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                aria-label="Đóng"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            
            <div className="p-8 pt-2 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-body-base font-black text-acc-text-main">Chế độ nhắc nợ</p>
                    <p className="text-body-xs text-acc-text-light font-medium">Bật/tắt tự động gửi mail cho toàn hệ thống</p>
                  </div>
                  <div 
                    role="switch"
                    aria-checked={isAutoEnabled}
                    aria-label="Bật/tắt tự động nhắc nợ toàn hệ thống"
                    tabIndex={0}
                    onClick={() => setIsAutoEnabled(!isAutoEnabled)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsAutoEnabled(!isAutoEnabled);
                      }
                    }}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-acc-primary/20 ${isAutoEnabled ? 'bg-acc-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isAutoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50/50 border border-blue-100/50 rounded-2xl">
                  <span className="material-symbols-outlined text-acc-primary" aria-hidden="true">info</span>
                  <p className="text-body-sm text-acc-primary font-bold">Hệ thống sẽ tự động gửi email nhắc nợ sau một số ngày nhất định kể từ khi quá hạn.</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="auto-days-range" className="text-label-xs text-acc-text-light font-black uppercase">Thời gian nhắc nợ (Ngày)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      id="auto-days-range"
                      type="range" 
                      min="1" 
                      max="30" 
                      step="1"
                      className="flex-1 accent-acc-primary h-2 bg-slate-100 rounded-full cursor-pointer focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                      value={autoDays}
                      onChange={(e) => setAutoDays(e.target.value)}
                    />
                    <div className="w-16 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center font-black text-acc-primary tabular-nums">
                      {autoDays}
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-acc-text-light uppercase px-1">
                    <span>1 ngày</span>
                    <span>30 ngày</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={checkDirtyAndAttemptClose}
                  className="flex-1 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest text-acc-text-light hover:bg-slate-50 transition focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={saveSettings}
                  className="flex-1 py-4 bg-acc-primary text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-acc-accent shadow-lg shadow-blue-900/10 transition focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Confirm Dialog Modal */}
      {showConfirmClose && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm animate-fade-in" onClick={() => handleConfirmCloseModal(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-zoom-in pointer-events-auto border border-slate-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl font-bold">warning</span>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">Thay đổi chưa lưu</h4>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  Bạn có thay đổi chưa lưu trong cấu hình. Bạn có chắc chắn muốn đóng và hủy bỏ thiết lập không?
                </p>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={() => handleConfirmCloseModal(false)}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl font-black text-[10px] uppercase tracking-wider text-slate-500 transition focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => handleConfirmCloseModal(true)}
                  className="flex-1 py-3 bg-acc-primary text-white hover:bg-blue-700 rounded-xl font-black text-[10px] uppercase tracking-wider transition shadow-md shadow-blue-900/10 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  Đồng ý đóng
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DebtTracker;
