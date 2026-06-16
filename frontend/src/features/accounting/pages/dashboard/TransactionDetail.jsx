import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import accountingService from '../../services/accountingService';
import PrintableInvoiceTemplate from '../../components/Print/PrintableInvoiceTemplate';
import { useSwipeToClose } from '../../utils/useSwipeToClose';
import { useToast } from '../../../../components/feedback/ToastProvider';
import { formatVND, CURRENCY_CLASS_PRIMARY, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

// Từ điển nhãn tiếng Việt dùng chung
const TRANSACTION_LABEL_MAP = {
   orderId: 'Mã đơn hàng',
   customer: 'Khách hàng',
   method: 'Phương thức',
   bank: 'Ngân hàng',
   date: 'Ngày thực hiện',
   approval: 'Người phê duyệt',
   location: 'Vị trí',
   status: 'Trạng thái',
   description: 'Diễn giải',
   tax: 'Tiền thuế',
   revenue: 'Doanh thu',
   profit: 'Lợi nhuận',
   items: 'Số mặt hàng',
   stock_val: 'Giá trị kho',
   alert_level: 'Mức cảnh báo',
   ref_code: 'Mã tham chiếu',
   order_ref: 'Mã đơn tham chiếu'
};

// Component nội bộ để cập nhật thời gian tương đối real-time
const RelativeTimeDisplay = ({ timestamp }) => {
   const [rel, setRel] = useState('…');
   
   useEffect(() => {
      if (!timestamp) return;
      const update = () => setRel(accountingService.getRelativeTime(timestamp));
      update();
      const timer = setInterval(update, 10000);
      return () => clearInterval(timer);
   }, [timestamp]);

   return <span>{rel}</span>;
};

const TransactionDetail = () => {
   const { id } = useParams();
   const navigate = useNavigate();
   const swipeHandlers = useSwipeToClose(() => navigate('/accounting'));
   const { showToast } = useToast();
   const [detail, setDetail] = useState(null);
   const [extendedData, setExtendedData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

   const handlePrint = () => {
      window.print();
   };

   const handleDownloadPDF = async () => {
      if (isGeneratingPDF) return;
      setIsGeneratingPDF(true);

      try {
         const element = document.getElementById('printable-area');
         if (!element) throw new Error("Printable area not found");

         const originalStyle = {
            display: element.style.display,
            position: element.style.position,
            left: element.style.left,
            top: element.style.top,
            width: element.style.width,
            padding: element.style.padding,
            visibility: element.style.visibility
         };

         element.style.display = 'block';
         element.style.position = 'fixed';
         element.style.left = '-9999px';
         element.style.top = '0';
         element.style.width = '1000px';
         element.style.padding = '40px';
         element.style.visibility = 'visible';

         const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 1000
         });

         Object.assign(element.style, originalStyle);

         const imgData = canvas.toDataURL('image/png', 1.0);
         const pdf = new jsPDF('p', 'mm', 'a4');
         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = pdf.internal.pageSize.getHeight();
         const margin = 10;
         const contentWidth = pdfWidth - (margin * 2);
         const contentHeight = (canvas.height * contentWidth) / canvas.width;

         let finalHeight = contentHeight;
         let finalWidth = contentWidth;
         if (contentHeight > pdfHeight - (margin * 2)) {
            finalHeight = pdfHeight - (margin * 2);
            finalWidth = (canvas.width * finalHeight) / canvas.height;
         }

         const xOffset = (pdfWidth - finalWidth) / 2;
         const yOffset = margin;

         pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');
         pdf.save(`HizoGroup_ChungTu_${id}_${new Date().getTime()}.pdf`);
      } catch (error) {
         console.error("Lỗi khi tải PDF:", error);
         showToast("Có lỗi xảy ra khi tạo file PDF. Vui lòng thử lại.", "error");
      } finally {
         setIsGeneratingPDF(false);
      }
   };

   useEffect(() => {
      const fetchAllData = async () => {
         setLoading(true);
         try {
            // Decode the URL-encoded notification ID (e.g., notif-pay-1)
            const decodedId = decodeURIComponent(id);
            const [basicInfo, detailInfo] = await Promise.all([
               accountingService.getNotificationDetail(decodedId),
               accountingService.getExtendedNotificationDetail(decodedId)
            ]);

            if (basicInfo) {
               setDetail(basicInfo);
               setExtendedData(detailInfo);
            }
         } catch (error) {
            console.error("Error fetching transaction details:", error);
         } finally {
            setLoading(false);
         }
      };

      if (id) fetchAllData();
      setIsModalOpen(false);
   }, [id]);

   if (loading) {
      return (
         <div className="flex-1 flex items-center justify-center bg-white min-h-screen">
            <div className="flex flex-col items-center gap-4">
               <div className="w-12 h-12 border-4 border-acc-primary border-t-transparent rounded-full animate-spin"></div>
               <p className="text-sm font-black text-acc-text-muted animate-pulse uppercase tracking-widest">Đang tải dữ liệu…</p>
            </div>
         </div>
      );
   }

   if (!detail) {
      return (
         <div className="flex-1 flex flex-col items-center justify-center bg-white p-10 min-h-screen">
            <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6">
               <span className="material-symbols-outlined text-5xl">error</span>
            </div>
            <h2 className="text-2xl font-black text-acc-text-main mb-2">Không tìm thấy giao dịch</h2>
            <p className="text-acc-text-muted mb-8">Dữ liệu có thể đã bị xóa hoặc bạn không có quyền truy cập.</p>
            <button
               onClick={() => navigate('/accounting')}
               className="px-8 py-3 bg-acc-primary text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
            >
               Quay lại Dashboard
            </button>
         </div>
      );
   }

   const getDynamicTitle = () => {
      if (!detail.message) return "";
      if (detail.count !== undefined) {
         return detail.message.replace(/{count}|(?<=Có )\d+/, detail.count);
      }
      return detail.message;
   };

   // Helper định dạng thời gian tuyệt đối
   const formatFullTime = (ts) => {
      if (!ts) return 'N/A';
      const d = new Date(ts);
      if (isNaN(d.getTime())) return 'N/A';
      
      const timePart = d.toLocaleTimeString('vi-VN', { 
         hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
      });
      const datePart = d.toLocaleDateString('vi-VN', {
         day: '2-digit', month: '2-digit', year: 'numeric'
      });
      
      return `${timePart} - ${datePart}`;
   };

   return (
      <div {...swipeHandlers} className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
         {/* FULL DETAIL MODAL */}
         {isModalOpen && extendedData && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6 lg:p-6">
               <div
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                  onClick={() => setIsModalOpen(false)}
               ></div>

               <div className="relative w-full h-full sm:h-auto sm:max-w-4xl bg-white sm:rounded-[3rem] shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-zoom-in max-h-full border border-white/20 overscroll-contain">
                  {/* Modal Header */}
                  <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-acc-primary text-white flex items-center justify-center">
                           <span className="material-symbols-outlined text-xl" aria-hidden="true">receipt_long</span>
                        </div>
                        <h3 className="text-base font-black text-acc-text-main uppercase tracking-tight">Chi tiết đầy đủ</h3>
                     </div>
                     <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" aria-label="Đóng chi tiết">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
                     </button>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {Object.entries(extendedData.data || {}).map(([key, val], idx) => {
                           const displayLabel = TRANSACTION_LABEL_MAP[key] || key.toUpperCase();
                           return (
                              <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-1">
                                 <span className="text-[0.5625rem] font-black text-acc-text-light uppercase tracking-widest opacity-60">{displayLabel}</span>
                                 <span className="text-sm font-black text-acc-text-main break-words">
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                 </span>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-5 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-row sm:justify-end justify-between items-center gap-3 shrink-0">
                     <button onClick={handleDownloadPDF} disabled={isGeneratingPDF} className="flex-1 sm:flex-none sm:px-6 py-2.5 bg-white border border-slate-200 rounded-2xl text-acc-text-main font-black text-[0.625rem] uppercase tracking-widest hover:bg-slate-50 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary">
                        {isGeneratingPDF ? "Đang tạo…" : "Tải PDF"}
                     </button>
                     <button onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none sm:px-8 py-2.5 bg-acc-primary text-white rounded-2xl font-black text-[0.625rem] uppercase tracking-widest shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-2">
                        Đóng
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* TOP HEADER BAR - Sticky on mobile scroll */}
         <div className="sticky top-0 h-14 flex items-center justify-between px-4 sm:px-6 bg-white border-b border-slate-100 shrink-0 z-[60] shadow-sm">
            <div className="flex items-center gap-3">
               <button 
                  onClick={() => navigate('/accounting')} 
                  className="w-10 h-10 rounded-xl hover:bg-slate-50 flex items-center justify-center text-acc-text-muted transition-[background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary"
                  aria-label="Quay lại danh sách giao dịch"
               >
                  <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
               </button>
               <div className="flex flex-col">
                  <span className="text-[0.5625rem] font-black text-acc-primary uppercase tracking-widest leading-none mb-1">Accounting Suite</span>
                  <span className="text-[0.6875rem] font-bold text-acc-text-main leading-none truncate max-w-[150px]">Thông tin chi tiết</span>
               </div>
            </div>
            <button onClick={handlePrint} aria-label="In chứng từ này" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-acc-text-main font-black text-[0.625rem] active:scale-95 transition-[transform,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary">
               <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">print</span>
               <span className="hidden xs:inline">In chứng từ</span>
            </button>
         </div>

         {/* MAIN LAYOUT - Attached to header on desktop */}
         <div className="flex-1 flex flex-col overflow-y-auto p-0"> 
          {/* Transaction Card */}
            <div className="bg-white rounded-none sm:rounded-b-[2rem] border-b border-slate-200/60 shadow-xl flex flex-col p-4 sm:p-5 lg:p-6 relative overflow-visible flex-none min-h-0">
               <div className="absolute top-0 left-0 w-1 lg:w-1.5 h-full bg-acc-primary"></div>

                {/* Section 1: Header Info */}
                <div className="flex flex-col lg:flex-row justify-between items-start mb-4 gap-3 px-2 sm:px-4">
                   <div className="space-y-3 md:space-y-4 w-full">
                      <div className="flex flex-wrap items-center gap-2">
                         <span className="px-2 py-0.5 bg-slate-100 text-[0.5625rem] font-black text-acc-text-light rounded-lg uppercase tracking-widest border border-slate-200/50">ID: {detail.id}</span>
                         
                         {/* Thời gian thực thi (Tuyệt đối) */}
                         <span className="px-2 py-0.5 bg-acc-primary/5 text-acc-primary text-[0.5625rem] font-black rounded-lg uppercase tracking-widest border border-acc-primary/10 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[0.625rem]">schedule</span>
                            {formatFullTime(detail.timestamp || detail.paymentDate || detail.createdAt || detail.createAt || detail.time)}
                         </span>
 
                         {/* Thời gian tương đối (Real-time) */}
                         <span className="text-[0.5625rem] font-black text-acc-text-light uppercase flex items-center gap-1 opacity-50 ml-1">
                            <span className="material-symbols-outlined text-xs">history</span>
                            <RelativeTimeDisplay timestamp={detail.timestamp || detail.paymentDate || detail.createdAt || detail.createAt || detail.time} />
                         </span>

                         {/* Trạng thái xác thực */}
                         <span className={`px-2 py-0.5 rounded-lg text-[0.625rem] font-black flex items-center gap-1 border uppercase whitespace-nowrap ${
                           detail.type === 'warning' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                         }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${detail.type === 'warning' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                            {detail.type === 'warning' ? 'CẦN KIỂM TRA' : 'ĐÃ XÁC THỰC'}
                         </span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-black text-acc-text-main tracking-tight leading-tight uppercase">
                         {getDynamicTitle()}
                      </h1>
                   </div>
                </div>

               {/* Section 2: Main Dynamic Content */}
               <div className="flex-1 min-h-0 space-y-8 sm:space-y-12 lg:space-y-8 mb-4 px-2 sm:px-4 border-t border-slate-100 pt-4">
                  {extendedData ? (
                     <>
                        {/* MULTI ENTITY SECTION */}
                        {extendedData.type === 'multi_entity' && (
                           <div className="space-y-6">
                              <h4 className="text-xs font-black text-acc-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                 <span className="material-symbols-outlined text-lg">table_chart</span> Bảng kê giao dịch thành phần
                              </h4>
                              
                              {/* Desktop Table View (Only visible on Desktop) */}
                              <div className="hidden xl:block rounded-3xl border border-slate-100 overflow-hidden shadow-sm bg-white">
                                 <table className="w-full text-left min-w-[50rem] border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                                       <tr>
                                          <th className="px-6 py-4 text-[0.5625rem] font-black text-acc-text-muted uppercase tracking-widest">Đối tượng</th>
                                          <th className="px-6 py-4 text-[0.5625rem] font-black text-acc-text-muted uppercase tracking-widest text-right">Giá trị</th>
                                          <th className="px-6 py-4 text-[0.5625rem] font-black text-acc-text-muted uppercase tracking-widest text-right">Tình trạng</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                       {extendedData.data?.map((item, idx) => (
                                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                             <td className="px-6 py-4">
                                                <span className="text-sm font-black text-acc-text-main block">{item.name}</span>
                                                <span className="text-[10px] text-acc-text-light font-bold">Mã số: {item.id}</span>
                                             </td>
                                             <td className="px-6 py-4 text-right tabular-nums">
                                                <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(item.amount, false)}</span>{' '}
                                                <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                                             </td>
                                             <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[8px] font-black border uppercase ${item.status === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                   Trễ {item.days} Ngày
                                                </span>
                                             </td>
                                          </tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>

                              {/* Mobile & iPad Card View (xl:hidden - 2 columns on iPad, 1 column on Mobile, flows naturally) */}
                              <div className="xl:hidden bg-slate-50/50 rounded-3xl p-4 border border-slate-200/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {extendedData.data?.map((item, idx) => {
                                    // Generate initials for avatar from name
                                    const nameWords = (item.name || '').trim().split(' ');
                                    const avatarInitials = nameWords.length > 1 
                                       ? (nameWords[0][0] + nameWords[nameWords.length - 1][0]).toUpperCase()
                                       : (item.name || 'KH').substring(0, 2).toUpperCase();
                                    return (
                                       <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-200/60 hover:border-acc-primary hover:shadow-lg transition-all duration-300 flex flex-col gap-3 shadow-sm">
                                          <div className="flex items-center justify-between gap-3">
                                             <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#00288E] flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                                   {avatarInitials}
                                                </div>
                                                <div className="min-w-0">
                                                   <h5 className="text-xs sm:text-sm font-black text-slate-900 leading-snug break-words whitespace-normal">{item.name}</h5>
                                                   <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">Mã số: {item.id}</span>
                                                </div>
                                             </div>
                                             <span className={`inline-flex items-center px-2 py-0.5 rounded-lg font-black text-[0.5rem] uppercase tracking-wider border shrink-0 ${
                                                item.status === 'high' 
                                                   ? 'bg-rose-50 text-rose-600 border-rose-200/50' 
                                                   : 'bg-amber-50 text-amber-700 border-amber-200/50'
                                             }`}>
                                                Trễ {item.days} Ngày
                                             </span>
                                          </div>
                                          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                             <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Giá trị giao dịch</span>
                                             <span className="text-sm font-black text-[#00288E] tabular-nums">
                                                <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(item.amount, false)}</span>{' '}
                                                <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                                             </span>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        )}

                        {/* REPORT / SYSTEM INFO SECTION */}
                        {(extendedData.type === 'report' || extendedData.type === 'system_info') && (
                           <div className="space-y-6">
                              {/* Summary Cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {extendedData.data?.summary?.map((item, idx) => (
                                    <div key={idx} className="p-4 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                                       <span className="text-[0.5rem] font-black text-acc-text-muted uppercase tracking-[0.2em] opacity-60">{item.label}</span>
                                       <div className="flex items-end justify-between">
                                          <span className="tabular-nums leading-none tracking-tight">
                                             <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(item.value, false)}</span>{' '}
                                             <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                                          </span>
                                          <span className={`w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm ${item.status === 'approved' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                                       </div>
                                    </div>
                                 ))}
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                 {/* Visual Analytics */}
                                 <div className="acc-card-white p-6 rounded-[2rem] flex flex-col gap-5 shadow-sm min-h-[18.75rem] border border-slate-100">
                                    <h4 className="text-[0.5625rem] font-black text-acc-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                       <span className="material-symbols-outlined text-base">insights</span> Phân bổ tài chính
                                    </h4>
                                    <div className="space-y-6 flex-1 flex flex-col justify-center">
                                       {extendedData.data?.breakdown?.slice(0, 4).map((item, idx) => (
                                          <div key={idx} className="space-y-2">
                                             <div className="flex justify-between text-[0.6875rem] font-black uppercase">
                                                <span className="text-acc-text-light">{item.label}</span>
                                                <span>
                                                   <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(item.value, false)}</span>{' '}
                                                   <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                                                </span>
                                             </div>
                                             <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                                                <div className="h-full bg-acc-primary rounded-full transition-[width] duration-1000" style={{ width: `${85 - (idx * 12)}%` }}></div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>

                                 {/* Approval Timeline */}
                                 <div className="acc-card-white p-6 rounded-[2rem] flex flex-col gap-5 shadow-sm min-h-[18.75rem] border border-slate-100">
                                    <h4 className="text-[0.5625rem] font-black text-acc-primary uppercase tracking-[0.3em] flex items-center gap-2">
                                       <span className="material-symbols-outlined text-base">history_edu</span> Tiến trình phê duyệt
                                    </h4>
                                    <div className="relative pl-8 space-y-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 flex-1 flex flex-col justify-center">
                                       {extendedData.data?.timeline?.slice(0, 3).map((step, idx) => (
                                          <div key={idx} className="relative group">
                                             <div className={`absolute -left-[2.15rem] w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-[background-color,border-color,box-shadow] duration-500 ${
                                                step.done ? 'bg-emerald-500 border-white shadow-[0_4px_10px_rgba(16,185,129,0.2)]' : 'bg-slate-50 border-slate-200'
                                             }`}>
                                                <span className={`material-symbols-outlined text-[0.875rem] font-black ${step.done ? 'text-white' : 'text-slate-400'}`} aria-hidden="true">{step.done ? 'done' : 'more_horiz'}</span>
                                             </div>
                                             <div className="flex flex-col gap-1">
                                                <span className={`text-[0.8125rem] font-black uppercase tracking-tight ${step.done ? 'text-acc-text-main' : 'text-acc-text-light'}`}>{step.step}</span>
                                                <div className="flex items-center gap-3 text-[0.625rem] font-bold opacity-60">
                                                   <span className="text-acc-primary">@{step.time}</span>
                                                   <span className="text-acc-text-muted">BY: {step.by}</span>
                                                </div>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* VOUCHER / SINGLE PAYMENT SECTION */}
                        {(extendedData.type === 'single_payment' || extendedData.type === 'single_entity' || extendedData.type === 'voucher') && (
                           <div className="pt-2 pb-6 sm:pb-10 flex flex-col items-center w-full">
                              <div className="w-full max-w-2xl bg-slate-50/50 rounded-[2rem] p-5 sm:p-10 border border-slate-100 relative overflow-hidden flex flex-col items-center gap-6">
                                 <div className="flex flex-col items-center gap-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-acc-primary">
                                       <span className="material-symbols-outlined text-3xl font-light">payments</span>
                                    </div>
                                    <div className="text-center space-y-1">
                                       <span className="text-[0.5625rem] font-black text-acc-text-light uppercase tracking-[0.4em]">Tổng tiền quyết toán</span>
                                       <h2 className="text-3xl sm:text-4xl font-black text-acc-text-main tracking-tighter tabular-nums leading-none">
                                          <span className={CURRENCY_CLASS_PRIMARY}>{formatVND(extendedData.data?.amount || extendedData.data?.value, false)}</span>{' '}
                                          <span className={CURRENCY_CLASS_SECONDARY}>VND</span>
                                       </h2>
                                    </div>
                                 </div>
 
                                 <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                       <span className="text-[0.5625rem] font-black text-acc-text-light uppercase tracking-widest block mb-2">Đơn vị thanh toán</span>
                                       <span className="text-[0.8125rem] font-black text-acc-text-main uppercase">{extendedData.data?.orderId || extendedData.data?.customer}</span>
                                    </div>
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                       <span className="text-[0.5625rem] font-black text-acc-text-light uppercase tracking-widest block mb-2">Phương thức GD</span>
                                       <span className="text-[0.8125rem] font-black text-acc-text-main uppercase">{extendedData.data?.method || "Ghi sổ điện tử"}</span>
                                    </div>
                                 </div>
 
                                 <button onClick={() => setIsModalOpen(true)} className="w-full max-w-lg py-5 bg-acc-primary text-white rounded-2xl font-black text-[0.625rem] uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-[transform,background-color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acc-primary focus-visible:ring-offset-2">
                                    <span className="material-symbols-outlined text-xl" aria-hidden="true">file_present</span> TRUY XUẤT CHỨNG TỪ GỐC
                                 </button>
                              </div>
                           </div>
                        )}
                     </>
                  ) : (
                     <div className="py-20 flex flex-col items-center opacity-20">
                        <span className="material-symbols-outlined text-6xl">cloud_off</span>
                        <p className="text-[0.625rem] font-black uppercase tracking-widest mt-4">Nội dung chưa sẵn sàng</p>
                     </div>
                  )}
               </div>

                {/* Section 3: Professional Notes */}
                <div className="xl:mt-auto mt-6 md:mt-8 border-t border-slate-100 pt-4 md:pt-5 px-2 sm:px-4 pb-3 md:pb-4">
                   <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 flex flex-col gap-2.5">
                      <p className="text-[0.625rem] font-black text-acc-primary uppercase tracking-[0.2em] flex items-center gap-1.5">
                         <span className="material-symbols-outlined text-base">verified</span> Chứng thư số ERP
                      </p>
                      <p className="text-[0.6875rem] sm:text-[0.75rem] text-acc-text-muted leading-relaxed font-medium">
                         {extendedData?.note || "Chứng từ được khởi tạo và ký số bởi hệ thống quản trị Hizo Group ERP. Dữ liệu có giá trị pháp lý trong luồng nghiệp vụ nội bộ."}
                      </p>
                   </div>
                </div>
            </div>
         </div>

         {/* Hidden Printable Area */}
         {createPortal(
            <PrintableInvoiceTemplate
               detail={(detail.time && detail.time !== 'N/A')
                  ? detail
                  : {
                     ...detail,
                     time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  }
               }
               extendedData={extendedData}
            />,
            document.body
         )}
      </div>
   );
};

export default TransactionDetail;
