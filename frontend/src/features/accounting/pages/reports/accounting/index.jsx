import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import accountingService from '../../../services/accountingService';
import { exportToExcel } from '../../../utils/exportUtils';
import { useToast } from '../../../components/Common/AccountingToast';
import { getCurrentUser } from '../../../services/userService';
import { prepareReportMetadata } from '../../../utils/excelDateUtils';
import { getCompanyInfo } from '../../../constants/companyInfo';
import RevenueAreaChart from '../../../components/Charts/RevenueAreaChart';
import CategoryShareChart from '../../../components/Charts/CategoryShareChart';
import SalesPerformanceTable from '../../../components/Tables/SalesPerformanceTable';
import PrintableAccountingReportTemplate from '../../../components/Print/PrintableAccountingReportTemplate';
import DailyActivityGrid from '../../../components/Charts/DailyActivityGrid';
import { formatVND } from '../../../../../utils/formatVND';

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

const AccountingReport = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('monthly');
  const [revenueData, setRevenueData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]); // Dữ liệu riêng cho biểu đồ nhiệt (luôn là tháng)
  const [categoryData, setCategoryData] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [chartView, setChartView] = useState('area'); // 'area' or 'heat'

  // Date filters (Synced from Dashboard)
  const now = new Date();
  
  const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Logic: Tự động chuyển về Heatmap trên Mobile dọc
  useEffect(() => {
    const checkOrientation = () => {
      const isMobile = window.innerWidth < 640;
      const isPortrait = window.innerHeight > window.innerWidth;
      if (isMobile && isPortrait && timeframe === 'daily' && chartView === 'area') {
        setChartView('heat');
      }
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, [timeframe, chartView]);

  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('days');   const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4); 
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const yearPickerRef = useRef(null);
  const weekPickerRef = useRef(null);
  const yearsCountPickerRef = useRef(null);
  const datePickerRef = useRef(null);

  // New Dropdown States & Refs for high-end minimalist UI
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const [isOpenActionDropdown, setIsOpenActionDropdown] = useState(false);
  const timeDropdownRef = useRef(null);
  const actionDropdownRef = useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

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
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target)) {
        setIsOpenActionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const options = { filterWeek, filterYear, filterYearsCount, filterDate, selectedDay };
      const heatmapOptions = { filterWeek, filterYear, filterYearsCount, filterDate }; // Không lấy theo ngày để heatmap luôn có data tháng
      
      const [rev, heat, cat, perf] = await Promise.all([
        accountingService.getRevenueData(timeframe, options),
        timeframe === 'daily' ? accountingService.getRevenueData('daily', heatmapOptions) : Promise.resolve([]),
        accountingService.getCategoryRevenueReport(timeframe, options),
        accountingService.getSalesPerformanceReport(timeframe, options)
      ]);

      setRevenueData(rev);
      setHeatmapData(heat);
      setCategoryData(cat);
      setPerformanceData(perf);
    } catch (err) {
      console.error("Report Fetch Error:", err);
      setError("Không thể tải báo cáo từ hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllReports();
  }, [timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay]);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      showToast("Đang chuẩn bị báo cáo tài chính chuyên nghiệp...", "info");
      
      const style = document.createElement('style');
      style.innerHTML = `
        @media print {
          #root, .acc-modal-overlay { display: none !important; }
          body > *:not(#printable-accounting-report) { display: none !important; }
        }
      `;
      document.head.appendChild(style);
      
      setTimeout(() => {
        window.print();
        document.head.removeChild(style);
        setIsExporting(false);
        showToast("Xuất báo cáo PDF thành công!", "success");
      }, 500);
    } catch {
      showToast("Không thể xuất báo cáo", "error");
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      setIsExporting(true);

      const periodLabel = getTimeframeText();

      // Safely get user info - handle 401 error
      let userInfo = {
        fullName: 'Unknown User',
        email: 'unknown@hizo.com.vn',
        department: 'Sales',
        phone: ''
      };

      try {
        const currentUser = getCurrentUser();
        if (currentUser && currentUser.fullName) {
          userInfo = currentUser;
        }
      } catch (authError) {
        console.warn('Warning: Could not fetch user info:', authError);
        if (authError.response?.status === 401) {
          showToast('⚠️ Phiên làm việc hết hạn, vui lòng đăng nhập lại', 'warning');
        }
        // Continue with fallback user info
      }

      // Safely get company info
      let companyInfo = {
        name: 'Hizo Groups',
        address: 'TP. Hồ Chí Minh',
        phone: '(028) 1234-5678',
        email: 'contact@hizo.com.vn'
      };

      try {
        const company = getCompanyInfo();
        if (company) {
          companyInfo = company;
        }
      } catch (error) {
        console.warn('Warning: Could not fetch company info:', error);
        // Use default company info
      }

      const reportMetadata = prepareReportMetadata({
        timeframe,
        filterDate,
        filterWeek,
        filterYear,
        selectedDay,
        filterYearsCount,
        revenueData,
        categoryData,
        performanceData
      });

      // 1. Prepare Summary Data
      const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);
      const totalOrders = revenueData.reduce((sum, item) => sum + (item.invoiceCount || 0), 0);
      const topSales = performanceData.length > 0 ? [...performanceData].sort((a, b) => b.revenue - a.revenue)[0].name : 'N/A';

      const summaryData = [
        { 'Chỉ số': 'TỔNG DOANH THU', 'Giá trị': formatVND(totalRevenue) },
        { 'Chỉ số': 'SỐ ĐƠN HÀNG', 'Giá trị': totalOrders },
        { 'Chỉ số': 'NHÂN VIÊN XUẤT SẮC', 'Giá trị': topSales },
        { 'Chỉ số': 'KỲ BÁO CÁO', 'Giá trị': periodLabel }
      ];

      // 2. Prepare Trend Data
      const trendExcelData = revenueData.map(item => ({
        'Thời gian': item.label,
        'Doanh thu (VND)': item.revenue,
        'Công nợ (VND)': item.expense,
        'Số hóa đơn': item.invoiceCount || 0,
        'Thực thu (VND)': item.collected
      }));

      // 3. Prepare Category Data
      const categoryExcelData = categoryData.map(cat => ({
        'Danh mục': cat.name,
        'Doanh thu (VND)': cat.value,
        'Tỷ trọng (%)': totalRevenue > 0 ? ((cat.value / totalRevenue) * 100).toFixed(1) + '%' : '0%'
      }));

      // 4. Prepare Performance Data
      const performanceExcelData = performanceData.map(p => ({
        'Nhân viên': p.name,
        'Doanh thu đạt được (VND)': p.revenue,
        'Đơn hàng': p.orderCount,
        'Mục tiêu (VND)': p.target,
        'Hoàn thành (%)': p.achievement.toFixed(1) + '%',
        'Hoa hồng dự kiến (VND)': p.commission
      }));

      exportToExcel({
        sheets: [
          { name: 'Tổng quan', data: summaryData, title: 'TÓM TẮT CHỈ SỐ TÀI CHÍNH' },
          { name: 'Xu hướng', data: trendExcelData, title: `XU HƯỚNG DOANH THU - ${periodLabel.toUpperCase()}` },
          { name: 'Danh mục', data: categoryExcelData, title: 'PHÂN TÍCH THEO DANH MỤC' },
          { name: 'Nhân viên', data: performanceExcelData, title: 'HIỆU SUẤT NHÂN VIÊN KINH DOANH' }
        ],
        filename: `Bao_cao_Tai_chinh_Hizo_${reportMetadata.dateRange.label.replace(/[/\s]/g, '_')}.xlsx`,
        reportMetadata,
        userInfo,
        companyInfo
      });

      showToast("✅ Xuất Excel thành công!", "success");
    } catch (err) {
      console.error("Excel Export Error:", err);
      showToast(`❌ Lỗi khi xuất Excel: ${err.message}`, "error");
    } finally {
      setIsExporting(false);
    }
  };

  const getTimeframeText = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      if (selectedDay) return `ngày ${selectedDay}/${m}/${y}`;
      return `tháng ${m}/${y}`;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      return `tuần ${w}, ${y}`;
    }
    if (timeframe === 'monthly') return `năm ${filterYear}`;
    if (timeframe === 'yearly') return `${filterYearsCount} năm qua`;
    return '';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full animate-fade-up" style={{ gap: 'var(--space-lg)' }}>
      {/* ẨN: TEMPLATE IN BÁO CÁO CHUYÊN NGHIỆP - Dùng Portal để đẩy ra ngoài #root */}
      {performanceData && createPortal(
        <PrintableAccountingReportTemplate 
          performanceData={performanceData}
          categoryData={categoryData}
          revenueData={revenueData}
          timeframeText={getTimeframeText()}
          summaryStats={{
            totalRevenue: revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0),
            totalOrders: revenueData.reduce((sum, item) => sum + (item.invoiceCount || 0), 0),
            topSalesperson: (() => {
              const activeSales = performanceData.filter(p => (p.revenue || 0) > 0);
              if (activeSales.length === 0) return 'Không có';
              return activeSales.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current, activeSales[0]).name;
            })(),
            growthRate: revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0) > 0 ? 12.5 : 0
          }}
        />,
        document.body
      )}

      {/* Header & Main Controls */}
      <div className="flex flex-col gap-2 sm:gap-3 shrink-0 px-2 xl:px-1 xl:pr-8">
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-acc-text-main leading-tight font-black text-2xl md:text-3xl lg:text-[1.8rem] xl:text-[2rem] uppercase tracking-tight whitespace-nowrap">PHÂN TÍCH & BÁO CÁO</h1>
          {timeframe === 'daily' && (
            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-tight flex items-start sm:items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5 sm:mt-0">info</span>
              <span>
                Mẹo: Chọn một ô trên biểu đồ nhiệt để xem và in báo cáo chi tiết cho từng ngày
                <span className="inline md:hidden">. Ngoài ra, xoay ngang điện thoại để xem được biểu đồ tăng trưởng</span>
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-acc-text-muted font-medium max-w-2xl flex items-center gap-2">
            Dữ liệu phân tích <span className="text-acc-primary font-black bg-blue-50 px-2 sm:px-2.5 py-0.5 rounded-lg">{getTimeframeText()}</span>
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto sm:justify-end relative z-50">
          {/* 1. Bộ lọc Thời gian Dropdown */}
          <div className="relative font-inter w-full sm:w-auto flex flex-col h-full" ref={timeDropdownRef}>
            <button 
              onClick={() => {
                setIsOpenTimeDropdown(!isOpenTimeDropdown);
                setIsOpenActionDropdown(false);
              }}
              className="w-full sm:w-auto h-full bg-white border border-slate-300 hover:border-acc-primary transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-acc-primary focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
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

                  {/* Chi tiết bộ lọc tùy biến */}
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
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần trước">
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
                              <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                                <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-all ${filterWeek === weekStr ? 'bg-acc-primary text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]">check_circle</span>}</button>); })}</div>
                              </div>
                            </div>
                          )}
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'monthly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                          <button onClick={() => setFilterYear(prev => prev - 1)} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm trước">
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
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm tiếp theo">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'yearly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-acc-primary transition-all"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Giảm số năm">
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
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tăng số năm">
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

          {/* 2. Thao tác Dropdown */}
          <div className="relative font-inter w-full sm:w-auto flex flex-col h-full" ref={actionDropdownRef}>
            <button 
              onClick={() => {
                setIsOpenActionDropdown(!isOpenActionDropdown);
                setIsOpenTimeDropdown(false);
              }}
              className="w-full sm:w-auto h-full bg-acc-primary text-white hover:opacity-90 transition-all rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-md active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-2"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined font-bold text-white" style={{ fontSize: '18px' }} aria-hidden="true">settings</span>
                <span className="font-black uppercase tracking-widest text-white">Thao tác</span>
              </div>
              <span className={`material-symbols-outlined text-white transition-transform duration-300 ${isOpenActionDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '14px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenActionDropdown && (
              <div className="absolute right-0 top-full mt-2 w-[220px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-right py-2">
                {/* Excel Option */}
                <button 
                  onClick={() => {
                    handleExportExcel();
                    setIsOpenActionDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: '20px' }} aria-hidden="true">grid_on</span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">Xuất Excel</span>
                    <span className="text-[8px] text-slate-400 font-bold">Tải báo cáo định dạng XLSX</span>
                  </div>
                </button>

                {/* PDF Option */}
                <button 
                  onClick={() => {
                    handleExportPDF();
                    setIsOpenActionDropdown(false);
                  }}
                  disabled={isExporting}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left disabled:opacity-50 focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-acc-primary outline-none"
                >
                  <span className={`material-symbols-outlined text-rose-600 ${isExporting ? 'animate-spin' : ''}`} style={{ fontSize: '20px' }} aria-hidden="true">
                    {isExporting ? 'sync' : 'picture_as_pdf'}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-800 tracking-wider">{isExporting ? 'Đang xuất...' : 'Xuất PDF'}</span>
                    <span className="text-[8px] text-slate-400 font-bold">In hoặc tải bản PDF báo cáo</span>
                  </div>
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-acc-error rounded-2xl flex items-center gap-4 animate-shake px-4 py-3 sm:px-6">
          <span className="material-symbols-outlined text-xl font-bold" aria-hidden="true">error_outline</span>
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-none pt-4 pb-10" id="accounting-report-vignette">
        <div className="grid grid-cols-12 gap-6">
          
          {/* 1. Revenue Timeline Chart */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-8" id="revenue-chart-container">
            <div className="acc-card h-full flex flex-col group hover:shadow-2xl transition-all duration-500 border-none bg-white"
                 style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
              <div className="flex flex-row items-center justify-between gap-4 mb-6 md:mb-8">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-acc-primary group-hover:rotate-12 transition-transform duration-500">
                    <span className="material-symbols-outlined text-xl sm:text-2xl font-black">timeline</span>
                  </div>
                  <div>
                    <h3 className="font-black text-acc-text-main uppercase tracking-wider leading-tight"
                        style={{ fontSize: 'clamp(11px, 1.2vw, 14px)' }}>Xu hướng doanh thu</h3>
                    <p className="font-bold text-acc-text-muted uppercase"
                       style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}>
                      Chi tiết theo {timeframe === 'daily' ? 'Ngày' : timeframe === 'weekly' ? 'Thứ' : timeframe === 'monthly' ? 'Tháng' : 'Năm'}
                    </p>
                  </div>
                </div>

                {/* Chart View Toggle (Only for Daily) */}
                {timeframe === 'daily' && (
                  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner shrink-0">
                    <button 
                      onClick={() => setChartView('area')}
                      className={`hidden sm:flex px-3 py-1.5 rounded-lg items-center gap-2 transition-all duration-300 landscape:flex ${chartView === 'area' ? 'bg-white text-acc-primary shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                      aria-label="Xem dạng biểu đồ đường"
                    >
                      <span className="material-symbols-outlined text-[16px] sm:text-[18px]" aria-hidden="true">show_chart</span>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-nowrap">Biểu đồ</span>
                    </button>
                    <button 
                      onClick={() => setChartView('heat')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all duration-300 ${chartView === 'heat' ? 'bg-white text-acc-primary shadow-sm scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                      aria-label="Xem dạng bản đồ nhiệt"
                    >
                      <span className="material-symbols-outlined text-[16px] sm:text-[18px]" aria-hidden="true">grid_view</span>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-nowrap hidden xs:inline">Bản đồ nhiệt</span>
                      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-nowrap xs:hidden text-acc-primary">NHIỆT</span>
                    </button>
                  </div>
                )}
              </div>
              
              {/* Hint cho Mobile Dọc */}
              {timeframe === 'daily' && chartView === 'heat' && (
                <div className="sm:hidden flex items-center justify-center gap-2 mb-6 animate-pulse landscape:hidden bg-slate-50/50 py-2 rounded-xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-acc-primary text-sm">screen_rotation</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lật ngang để xem biểu đồ chi tiết</span>
                </div>
              )}
              <div className="flex-1 min-h-[350px]">
                {timeframe === 'daily' && chartView === 'heat' ? (
                  <DailyActivityGrid 
                    apiData={heatmapData}
                    loading={loading}
                    dateFilter={filterDate}
                    onSelectDay={(day) => setSelectedDay(prev => prev === day ? null : day)}
                    selectedDay={selectedDay}
                  />
                ) : (
                  <RevenueAreaChart 
                    data={revenueData} 
                    loading={loading} 
                    timeframe={timeframe}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 2. Product Category Distribution */}
          <div className="col-span-12 lg:col-span-5 xl:col-span-4" id="category-chart-container">
            <div className="acc-card h-full flex flex-col group hover:shadow-2xl transition-all duration-500 border-none bg-white" 
                 style={{ padding: 'clamp(1rem, 2vw, 1.5rem)' }}>
               <div className="flex items-center gap-4 mb-6 md:mb-8">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:rotate-12 transition-transform duration-500">
                    <span className="material-symbols-outlined text-xl sm:text-2xl font-black">pie_chart</span>
                  </div>
                  <div>
                    <h3 className="font-black text-acc-text-main uppercase tracking-wider" 
                        style={{ fontSize: 'clamp(12px, 1.2vw, 14px)' }}>Tỷ trọng sản phẩm</h3>
                    <p className="font-bold text-acc-text-muted uppercase text-nowrap" 
                       style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}>Theo danh mục</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center" 
                     style={{ minHeight: 'clamp(280px, 25vh, 350px)' }}>
                  <CategoryShareChart data={categoryData} loading={loading} />
                </div>
            </div>
          </div>

          {/* 3. Sales Performance Table */}
          <div className="col-span-12" id="performance-table-container">
            <div className="acc-card flex flex-col group border-none bg-white shadow-float overflow-hidden" 
                 style={{ padding: 'clamp(1rem, 3vw, 2rem)' }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <span className="material-symbols-outlined text-xl sm:text-2xl font-black">groups</span>
                  </div>
                  <div>
                    <h3 className="font-black text-acc-text-main uppercase tracking-wider" 
                        style={{ fontSize: 'clamp(12px, 1.2vw, 14px)' }}>Hiệu suất nhân viên</h3>
                    <p className="font-bold text-acc-text-muted uppercase" 
                       style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}>Chỉ tiêu và hoa hồng</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full uppercase self-start md:self-auto" 
                     style={{ fontSize: 'clamp(8px, 0.8vw, 10px)' }}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Dữ liệu thời gian thực
                </div>
              </div>
              
              <div className="overflow-x-auto pr-1">
                <SalesPerformanceTable data={performanceData} loading={loading} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AccountingReport;
