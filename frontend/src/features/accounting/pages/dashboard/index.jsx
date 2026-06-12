import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import accountingService from '../../services/accountingService';
import { useToast } from '../../components/Common/AccountingToast';
import { exportToPDF } from '../../utils/exportUtils';
import '../../styles/accounting.css';

// Import components
import DashboardStat from '../../components/Stats/DashboardStat';
import RevenueAreaChart from '../../components/Charts/RevenueAreaChart';
import DailyActivityGrid from '../../components/Charts/DailyActivityGrid';
import NotificationFeed from '../../components/Notifications/NotificationFeed';
import { 
  RevenueIcon, DebtIcon, InvoiceIcon, WalletIcon, DownloadIcon 
} from '../../components/Icons/AccountingIcons';
import PrintableDashboardTemplate from '../../components/Print/PrintableDashboardTemplate';

const AccountingDashboard = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [timeframe, setTimeframe] = useState('monthly');
  
  // Date filters
  const now = new Date();
  
  const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now)); // format: "2024-W15"
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4); 
  const yearPickerRef = React.useRef(null);
  const weekPickerRef = React.useRef(null);
  const yearsCountPickerRef = React.useRef(null);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('months'); 
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);
  const datePickerRef = React.useRef(null);
  
  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const [error, setError] = useState(null);

  // Close pickers on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target)) setShowYearPicker(false);
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target)) setShowWeekPicker(false);
      if (yearsCountPickerRef.current && !yearsCountPickerRef.current.contains(event.target)) setShowYearsCountPicker(false);
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setDatePickerView('months');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStats = async (tf, options) => {
    try {
      setLoading(true);
      const result = await accountingService.getDashboardStats(tf, options);
      setStats(result);
    } catch (err) {
      setError("Dữ liệu hệ thống chưa sẵn sàng");
    } finally {
      setLoading(false);
    }
  };

  const fetchChart = async (tf, options) => {
    try {
      setChartLoading(true);
      const result = await accountingService.getRevenueData(tf, options);
      setChartData(Array.isArray(result) ? result : (result?.chartData || []));
    } catch (err) {
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    // Re-fetch stats initially (not strictly needed but good for first load with defaults)
    const options = { filterWeek, filterYear, filterYearsCount, filterDate, selectedDay };
    fetchStats(timeframe, options);
  }, []);

  useEffect(() => {
    setChartData([]);
    const chartOptions = { filterWeek, filterYear, filterYearsCount, filterDate };
    const statsOptions = { filterWeek, filterYear, filterYearsCount, filterDate, selectedDay };
    fetchChart(timeframe, chartOptions);
    fetchStats(timeframe, statsOptions);
  }, [timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!stats) return;
    try {
      setIsExporting(true);
      showToast("Đang chuẩn bị báo cáo tài chính…", "info");
      
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; width: 297mm !important; height: 210mm !important; background: white !important; }
          #root { display: none !important; }
          #printable-dashboard { display: block !important; width: 297mm !important; padding: 15mm !important; margin: 0 auto !important; background: white !important; visibility: visible !important; }
          * { -webkit-print-color-adjust: exact !important; }
          @page { size: landscape; margin: 0; }
        }
      `;
      document.head.appendChild(style);
      setTimeout(() => {
        window.print();
        document.head.removeChild(style);
        setIsExporting(false);
        showToast("Xuất báo cáo thành công!", "success");
      }, 500);
    } catch (err) {
      showToast("Lỗi khi tạo PDF", "error");
      setIsExporting(false);
    }
  };

  const timeframeLabels = {
    daily: 'Hôm nay',
    weekly: 'Tuần này',
    monthly: 'Tháng này',
    yearly: 'Năm nay',
    all: 'Toàn thời gian'
  };

   const formatCurrency = (val) => {
    if (val === undefined || val === null) return "0 VND";
    if (typeof val === 'string') return val.replace(/[đ₫]/g, ' VND');
    return val.toLocaleString('vi-VN') + ' VND';
  };

  if (loading && !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white min-h-[400px]">
        <div className="w-12 h-12 border-4 border-acc-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-black text-acc-text-muted uppercase tracking-[0.2em] animate-pulse">Đang tải dữ liệu…</p>
      </div>
    );
  }

  const getTimeframeText = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      return `ngày ${selectedDay}/${m}/${y}`;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      const simple = new Date(y, 0, 1 + (w - 1) * 7);
      const ISOweekStart = new Date(simple);
      const dow = simple.getDay();
      if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
      else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
      const end = new Date(ISOweekStart);
      end.setDate(ISOweekStart.getDate() + 6);
      const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
      return `tuần ${w} (${fmt(ISOweekStart)} - ${fmt(end)})`;
    }
    if (timeframe === 'monthly') return `12 tháng năm ${filterYear}`;
    if (timeframe === 'yearly') return `${filterYearsCount} năm qua (tới ${now.getFullYear()})`;
    if (timeframe === 'all') return 'Tổng quan toàn thời gian';
    return timeframeLabels[timeframe];
  };

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-6 lg:gap-3 overflow-y-auto xl:overflow-visible no-scrollbar pb-6" id="accounting-dashboard-content">
      {/* Header Section */}
      <div className="flex flex-col gap-2 sm:gap-3 px-2 lg:px-1 shrink-0">
        <h1 className="text-acc-text-main leading-tight font-black text-3xl sm:text-4xl lg:text-[2rem] uppercase tracking-tight">TRUNG TÂM TÀI CHÍNH</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-acc-text-muted font-medium leading-relaxed">
            Phân tích dữ liệu{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-acc-primary font-bold whitespace-nowrap animate-fade-in" key={`${timeframe}-${selectedDay}-${filterWeek}-${filterYear}`}>
              {getTimeframeText()}
            </span>
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto relative z-50">
          <button 
            onClick={() => {
              setTimeframe('all');
              setSelectedDay(now.getDate());
              setFilterYear(now.getFullYear());
              setFilterDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
            }}
            aria-label="Làm mới toàn bộ dữ liệu thống kê"
            className="px-5 h-10 sm:h-auto py-0 sm:py-2.5 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest shadow-sm w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-2"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Làm mới
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="acc-btn-primary px-5 h-10 sm:h-auto py-0 sm:py-2.5 flex items-center justify-center gap-3 shadow-xl shadow-blue-800/10 active:scale-95 transition-[transform,opacity,background-color,box-shadow] duration-300 text-[11px] sm:text-label-xs disabled:opacity-50 w-full sm:w-auto rounded-xl sm:rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-2"
            aria-label="Xuất báo cáo tài chính sang PDF"
          >
            <span className={`material-symbols-outlined text-lg ${isExporting ? 'animate-spin' : ''}`} aria-hidden="true">
              {isExporting ? 'sync' : 'picture_as_pdf'}
            </span>
            {isExporting ? 'Đang chuẩn bị…' : `XUẤT BÁO CÁO`}
          </button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <section className="space-y-3 lg:space-y-0">
        <h4 className="px-1 text-[9px] font-black text-acc-text-light uppercase tracking-[0.2em] lg:hidden">Chỉ số quan trọng</h4>
        <div 
        className="grid grid-cols-2 lg:grid-cols-4 shrink-0 gap-3 sm:gap-4 lg:-mt-2 acc-summary-grid" 
      >
          {/* Derived stats with fallback calculation */}
          {(() => {
            const rawRev = stats?.totalRevenue;
            const rawDebt = stats?.totalDebt;
            const rawCollected = stats?.totalCollected;

            // Helper to handle both numbers and strings with dots (vi-VN formatting)
            const parseAmount = (val) => {
              if (typeof val === 'number') return val;
              if (typeof val === 'string') return Number(val.replace(/\./g, '').replace(/,/g, '.')) || 0;
              return 0;
            };

            const revNum = parseAmount(rawRev);
            const debtNum = parseAmount(rawDebt);
            const collectedValue = rawCollected !== undefined ? rawCollected : (revNum - debtNum);

            return (
              <>
                <DashboardStat 
                  label="Tổng Doanh thu" 
                  value={formatCurrency(rawRev)} 
                  growth={stats?.revenueGrowth} 
                  icon={RevenueIcon} 
                  color="text-blue-600" 
                  loading={loading} 
                  tooltipAlign="right"
                />
                <DashboardStat 
                  label="Tổng Công nợ" 
                  value={formatCurrency(rawDebt)} 
                  growth={stats?.debtGrowth} 
                  icon={DebtIcon} 
                  color="text-amber-500" 
                  loading={loading} 
                />
                <DashboardStat 
                  label="Hóa đơn" 
                  value={stats?.pendingInvoices} 
                  growth={stats?.invoiceGrowth} 
                  icon={InvoiceIcon} 
                  color="text-indigo-500" 
                  loading={loading} 
                  tooltipAlign="left"
                />
                <DashboardStat 
                  label="Thực thu" 
                  value={formatCurrency(collectedValue)} 
                  growth={stats?.collectedGrowth} 
                  icon={WalletIcon} 
                  color="text-emerald-500" 
                  loading={loading} 
                />
              </>
            );
          })()}
        </div>
      </section>

      {/* Analysis Section */}
      <div className="flex-1 min-h-0 flex flex-col xl:grid xl:grid-cols-12 gap-4 xl:gap-5 xl:overflow-visible pr-1 pt-4 pb-4 xl:-mt-3">
        <div className="w-full xl:col-span-8 flex flex-col xl:min-h-0">
          <div className="acc-card flex-1 flex flex-col overflow-hidden p-4 sm:p-5 lg:p-6 pb-2">
            <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-acc-text-main uppercase tracking-tight">Phân tích Doanh thu</h3>
                <p className="text-xs text-acc-text-light font-bold">Biểu đồ biến động thực tế</p>
              </div>
              
              <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto py-1">
                 <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/50 shadow-inner w-full sm:w-max" role="tablist" aria-label="Lựa chọn khung thời gian">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                      <button 
                        key={tf} 
                        onClick={() => setTimeframe(tf)} 
                        role="tab"
                        aria-selected={timeframe === tf}
                        className={`flex-1 sm:px-5 py-2.5 rounded-xl text-[10px] sm:text-[10px] font-black uppercase tracking-widest transition-[transform,background-color,color,box-shadow] duration-300 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-1 ${timeframe === tf ? 'bg-white text-acc-primary shadow-md scale-102 sm:scale-105' : 'text-slate-500 hover:text-acc-text-main'}`}>
                        {tf === 'daily' ? 'Ngày' : tf === 'weekly' ? 'Tuần' : tf === 'monthly' ? 'Tháng' : 'Năm'}
                      </button>
                    ))}
                 </div>
                 
                 {/* Sub-filters dynamically displayed based on timeframe */}
                 <div className="flex flex-wrap sm:flex-nowrap gap-3 items-center w-full sm:w-max animate-fade-in sm:pl-4 sm:border-l border-slate-200/50 relative z-50">
                   {timeframe === 'daily' && (() => {
                     const [y, m] = filterDate.split('-').map(Number);
                     return (
                       <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm" ref={datePickerRef}>
                         <button 
                           onClick={() => {
                             let newM = m - 1; let newY = y;
                             if (newM < 1) { newM = 12; newY--; }
                             setFilterDate(`${newY}-${String(newM).padStart(2, '0')}`);
                           }}
                           className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                         >
                           <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                         </button>

                         <button 
                           onClick={(e) => { 
                             e.stopPropagation(); 
                             setDateTempYear(y); 
                             setShowDatePicker(!showDatePicker); 
                             setDatePickerView('months'); 
                           }}
                           className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 hover:bg-slate-50 group ${showDatePicker ? 'bg-slate-50 shadow-inner' : ''}`}
                         >
                           <span className="text-[10px] font-black text-acc-text-main uppercase tracking-widest whitespace-nowrap">
                             Tháng {m}, {y}
                           </span>
                           <span className={`material-symbols-outlined text-[14px] text-slate-300 transition-transform ${showDatePicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                         </button>

                         {showDatePicker && (
                           <div className="absolute top-full mt-2 right-0 z-[100] bg-white shadow-2xl rounded-2.5xl border border-slate-100 p-5 min-w-[320px] animate-fade-in origin-top-right">
                             {datePickerView === 'months' ? (
                               <div className="space-y-4">
                                 <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                   <span className="text-[10px] font-black text-acc-text-muted uppercase tracking-widest">Chọn tháng</span>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); setDatePickerView('years'); setDateYearRangeStart(Math.floor(dateTempYear / 12) * 12); }}
                                     className="flex items-center gap-2 px-3 py-1 bg-acc-primary/5 rounded-lg border border-acc-primary/10 hover:bg-acc-primary/10 transition-colors group"
                                   >
                                     <span className="text-[12px] font-black text-acc-primary uppercase">{dateTempYear}</span>
                                     <span className="material-symbols-outlined text-[14px] text-acc-primary group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                                   </button>
                                 </div>
                                 <div className="grid grid-cols-3 gap-2">
                                   {monthNames.map((mName, idx) => (
                                     <button
                                       key={mName}
                                       onClick={() => { setFilterDate(`${dateTempYear}-${String(idx + 1).padStart(2, '0')}`); setShowDatePicker(false); }}
                                       className={`text-[10px] font-black py-2.5 rounded-xl transition-all ${
                                           (idx + 1) === m && dateTempYear === y
                                           ? 'bg-acc-primary text-white shadow-lg shadow-blue-500/30' 
                                           : 'text-acc-text-light hover:bg-slate-50'
                                       }`}
                                     >
                                       {mName}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                             ) : (
                               <div className="space-y-4 animate-fade-in">
                                 <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                   <div className="flex items-center gap-2">
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }}
                                         className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-acc-primary transition-colors"
                                     >
                                         <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                                     </button>
                                     <span className="text-[10px] font-black text-acc-text-muted uppercase tracking-widest">Chọn Năm</span>
                                   </div>
                                   
                                   <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg">
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }}
                                         className="w-6 h-6 rounded flex items-center justify-center hover:bg-white hover:shadow-sm text-acc-primary transition-all active:scale-90"
                                     >
                                         <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                     </button>
                                     <span className="text-[9px] font-black text-acc-text-muted px-1">
                                         {dateYearRangeStart} - {dateYearRangeStart + 11}
                                     </span>
                                     <button 
                                         onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }}
                                         className="w-6 h-6 rounded flex items-center justify-center hover:bg-white hover:shadow-sm text-acc-primary transition-all active:scale-90"
                                     >
                                         <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                     </button>
                                   </div>
                                 </div>
                                 <div className="grid grid-cols-3 gap-2 py-1">
                                   {Array.from({length: 12}).map((_, i) => {
                                     const yearOpt = dateYearRangeStart + i;
                                     return (
                                       <button
                                         key={yearOpt}
                                         onClick={(e) => { e.stopPropagation(); setDateTempYear(yearOpt); setDatePickerView('months'); }}
                                         className={`text-[11px] font-black py-3 rounded-xl transition-all ${
                                             yearOpt === dateTempYear 
                                             ? 'bg-acc-primary text-white shadow-lg shadow-blue-500/30' 
                                             : 'text-acc-text-light hover:bg-slate-50'
                                         }`}
                                       >
                                         {yearOpt}
                                       </button>
                                     );
                                   })}
                                 </div>
                               </div>
                             )}
                           </div>
                         )}

                         <button 
                           onClick={() => {
                             let newM = m + 1; let newY = y;
                             if (newM > 12) { newM = 1; newY++; }
                             setFilterDate(`${newY}-${String(newM).padStart(2, '0')}`);
                           }}
                           className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                         >
                           <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                         </button>
                       </div>
                     );
                   })()}
                   {timeframe === 'weekly' && (
                     <div className="flex items-center gap-0.5 sm:gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm" ref={weekPickerRef}>
                       <button 
                         onClick={() => {
                           const [y, w] = filterWeek.split('-W').map(Number);
                           let newW = w - 1;
                           let newY = y;
                           if (newW < 1) { newY--; newW = 52; }
                           setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`);
                         }}
                         className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                       >
                         <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                       </button>

                       <button 
                         onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                         className={`px-1.5 sm:px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 sm:gap-2 hover:bg-slate-50 group ${showWeekPicker ? 'bg-slate-50 shadow-inner' : ''}`}
                       >
                         <span className="text-[10px] font-black text-acc-text-main uppercase tracking-tight sm:tracking-widest whitespace-nowrap">
                           {filterWeek.replace('-W', ', Tuần ')}
                         </span>
                         <span className={`material-symbols-outlined text-[14px] text-slate-300 transition-transform ${showWeekPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                       </button>

                       {/* Week Picker Dropdown */}
                       {showWeekPicker && (
                         <div className="absolute top-full mt-2 right-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[260px] animate-fade-in origin-top-right">
                           <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần (7 ngày)</span>
                             <span className="text-[10px] font-bold text-acc-primary">{filterWeek.split('-W')[0]}</span>
                           </div>
                           <div className="max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                             <div className="flex flex-col gap-1">
                               {[...Array(52)].map((_, i) => {
                                 const weekNum = i + 1;
                                 const currentY = parseInt(filterWeek.split('-W')[0]);
                                 const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`;
                                 
                                 // Calculate range
                                 const getRange = (y, w) => {
                                   const simple = new Date(y, 0, 1 + (w - 1) * 7);
                                   const dow = simple.getDay();
                                   const ISOweekStart = new Date(simple);
                                   if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
                                   else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
                                   
                                   const start = new Date(ISOweekStart);
                                   const end = new Date(ISOweekStart);
                                   end.setDate(start.getDate() + 6);
                                   
                                   const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
                                   return `${fmt(start)} - ${fmt(end)}`;
                                 };

                                 const rangeText = getRange(currentY, weekNum);

                                 return (
                                   <button
                                     key={i}
                                     onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }}
                                     className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${filterWeek === weekStr ? 'bg-acc-primary text-white shadow-lg shadow-blue-500/20' : 'hover:bg-slate-50 text-slate-600'}`}
                                   >
                                     <div className="flex flex-col items-start">
                                       <span className={`text-[10px] font-black uppercase tracking-tight ${filterWeek === weekStr ? 'text-white' : 'text-acc-text-main'}`}>Tuần {weekNum}</span>
                                       <span className={`text-[9px] font-bold opacity-60 ${filterWeek === weekStr ? 'text-white' : 'text-slate-400'}`}>{rangeText}</span>
                                     </div>
                                     {filterWeek === weekStr && <span className="material-symbols-outlined text-[16px]">check_circle</span>}
                                   </button>
                                 );
                               })}
                             </div>
                           </div>
                         </div>
                       )}

                       <button 
                         onClick={() => {
                           const [y, w] = filterWeek.split('-W').map(Number);
                           let newW = w + 1;
                           let newY = y;
                           if (newW > 52) { newY++; newW = 1; }
                           setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`);
                         }}
                         className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                       >
                         <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                       </button>
                     </div>
                   )}

                   {timeframe === 'monthly' && (
                     <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm" ref={yearPickerRef}>
                       <button 
                         onClick={() => setFilterYear(prev => prev - 1)}
                         className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                       >
                         <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                       </button>
                       
                       <button 
                         onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }}
                         className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-2 hover:bg-slate-50 group ${showYearPicker ? 'bg-slate-50 shadow-inner' : ''}`}
                       >
                         <span className="text-[10px] font-black text-acc-text-main uppercase tracking-widest whitespace-nowrap">
                           Năm {filterYear}
                         </span>
                         <span className={`material-symbols-outlined text-[14px] text-slate-300 transition-transform ${showYearPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                       </button>

                       {/* Year Picker Dropdown */}
                       {showYearPicker && (
                         <div className="absolute top-full mt-2 right-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[220px] animate-fade-in origin-top-right">
                           <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                             <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }}
                                 className="w-6 h-6 rounded flex items-center justify-center hover:bg-white hover:shadow-sm text-acc-primary transition-all"
                               >
                                 <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                               </button>
                               <span className="text-[8px] font-black text-acc-text-muted px-1">{yearRangeStart} - {yearRangeStart + 9}</span>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }}
                                 className="w-6 h-6 rounded flex items-center justify-center hover:bg-white hover:shadow-sm text-acc-primary transition-all"
                               >
                                 <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                               </button>
                             </div>
                           </div>
                           <div className="grid grid-cols-2 gap-2">
                             {[...Array(10)].map((_, i) => {
                               const y = yearRangeStart + i;
                               return (
                                 <button
                                   key={y}
                                   onClick={() => { setFilterYear(y); setShowYearPicker(false); }}
                                   className={`text-[10px] font-black py-2.5 rounded-xl transition-all ${filterYear === y ? 'bg-acc-primary text-white shadow-lg' : 'hover:bg-slate-50 text-slate-500'}`}
                                 >
                                   {y}
                                 </button>
                               );
                             })}
                           </div>
                         </div>
                       )}

                       <button 
                         onClick={() => {
                           if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1);
                         }}
                         disabled={filterYear >= now.getFullYear()}
                         className="w-7 h-7 rounded-lg hover:bg-slate-50 disabled:opacity-30 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                       >
                         <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                       </button>
                     </div>
                   )}

                   {timeframe === 'yearly' && (
                     <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm" ref={yearsCountPickerRef}>
                       <button 
                         onClick={() => {
                           const options = [3, 5, 10, 20];
                           const idx = options.indexOf(filterYearsCount);
                           setFilterYearsCount(options[Math.max(0, idx - 1)]);
                         }}
                         className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                       >
                         <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                       </button>

                       <button 
                         onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }}
                         className={`px-4 py-1.5 rounded-lg transition-all flex items-center gap-2 hover:bg-slate-50 group ${showYearsCountPicker ? 'bg-slate-50 shadow-inner' : ''}`}
                       >
                         <span className="text-[10px] font-black text-acc-text-main uppercase tracking-widest whitespace-nowrap">
                           {filterYearsCount} Năm qua
                         </span>
                         <span className={`material-symbols-outlined text-[14px] text-slate-300 transition-transform ${showYearsCountPicker ? 'rotate-180 text-acc-primary' : ''}`}>expand_more</span>
                       </button>

                       {/* Years Count Picker Dropdown */}
                       {showYearsCountPicker && (
                         <div className="absolute top-full mt-2 right-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[160px] animate-fade-in origin-top-right">
                           <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50 pb-2">Số lượng năm</div>
                           <div className="flex flex-col gap-1">
                             {[3, 5, 10, 20].map((v) => (
                               <button
                                 key={v}
                                 onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }}
                                 className={`px-3 py-2.5 rounded-xl text-left transition-all flex justify-between items-center ${filterYearsCount === v ? 'bg-acc-primary text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}
                               >
                                 <span className="text-[10px] font-black uppercase tracking-tight">{v} Năm</span>
                                 {filterYearsCount === v && <span className="material-symbols-outlined text-[16px]">check</span>}
                               </button>
                             ))}
                           </div>
                         </div>
                       )}

                       <button 
                         onClick={() => {
                           const options = [3, 5, 10, 20];
                           const idx = options.indexOf(filterYearsCount);
                           setFilterYearsCount(options[Math.min(options.length - 1, idx + 1)]);
                         }}
                         className="w-7 h-7 rounded-lg hover:bg-slate-50 flex items-center justify-center transition-all text-slate-400 hover:text-acc-primary"
                       >
                         <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                       </button>
                     </div>
                   )}

                   {/* Heatmap Legend - Only for daily view */}
                   {timeframe === 'daily' && (
                     <div className="flex gap-3 items-center ml-4 pl-4 border-l border-slate-200/50 animate-fade-in">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-100 border border-slate-200"></div>
                            <span className="text-[8px] text-acc-text-light font-black uppercase tracking-widest">Thấp</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-acc-primary shadow-sm shadow-blue-400/30"></div>
                            <span className="text-[8px] text-acc-text-light font-black uppercase tracking-widest">Cao</span>
                        </div>
                     </div>
                   )}

                   {/* Area Chart Legend - For Weekly, Monthly, Yearly */}
                   {timeframe !== 'daily' && (
                     <div className="flex gap-4 items-center ml-auto sm:ml-4 sm:pl-4 sm:border-l border-slate-200/50 animate-fade-in">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-1 rounded-full bg-acc-primary shadow-sm"></div>
                            <span className="text-[8px] text-acc-text-light font-black uppercase tracking-widest">Doanh thu</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-1 rounded-full bg-amber-500 shadow-sm"></div>
                            <span className="text-[8px] text-acc-text-light font-black uppercase tracking-widest">Công nợ</span>
                        </div>
                     </div>
                   )}
                 </div>
              </div>
            </div>

            <div className="flex-1 mt-2 sm:mt-4">
              {timeframe === 'daily' ? (
                <DailyActivityGrid 
                  loading={chartLoading} 
                  apiData={chartData} 
                  dateFilter={filterDate}
                  onSelectDay={(day) => setSelectedDay(day)}
                  selectedDay={selectedDay}
                />
              ) : (
                <RevenueAreaChart data={chartData} timeframe={timeframe} />
              )}
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="w-full xl:col-span-4 flex flex-col min-h-[30rem] xl:min-h-0 mb-6 xl:mb-0">
          <div className="acc-card flex-1 flex flex-col overflow-hidden bg-white p-4 sm:p-5 lg:p-6">
            <div className="flex justify-between items-center shrink-0 mb-8">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-acc-text-main uppercase tracking-tight">Giao dịch mới</h3>
                <p className="text-xs text-acc-text-light font-bold">Thông báo nghiệp vụ</p>
              </div>
              <span className="w-10 h-10 bg-acc-primary text-white text-[12px] font-black rounded-xl flex items-center justify-center shadow-lg shadow-blue-800/20">
                {stats?.notifications?.length || 0}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              <NotificationFeed notifications={stats?.notifications} loading={loading} />
            </div>
          </div>
        </div>
      </div>

      {createPortal(
        <PrintableDashboardTemplate 
          stats={stats} 
          chartData={chartData}
          timeframeLabels={timeframeLabels} 
          timeframe={timeframe} 
          dynamicLabel={getTimeframeText()} 
        />,
        document.body
      )}
    </div>
  );
};

export default AccountingDashboard;
