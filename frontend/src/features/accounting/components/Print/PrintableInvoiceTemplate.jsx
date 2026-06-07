import React from 'react';
import { createPortal } from 'react-dom';
import dbData from '../../../../../db.json';

/**
 * ⚠️ Mẫu in TỔNG HỢP KẾ TOÁN PRO-MAX V4.5 (Multi-page Fix)
 * Hỗ trợ đa trang với Footer cố định lặp lại.
 */
const PrintableInvoiceTemplate = ({ detail, extendedData }) => {
  if (!detail) return null;

  // 1. Xác định Print Mode
  let printMode = 'INVOICE'; 
  if (extendedData) {
    if (extendedData.type === 'multi_entity') printMode = 'LIST';
    else if (['voucher', 'single_payment', 'single_entity'].includes(extendedData.type)) printMode = 'VOUCHER';
    else if (['report', 'system_info'].includes(extendedData.type)) printMode = 'REPORT';
  }

  const renderHeaderTitle = () => {
    switch (printMode) {
      case 'LIST': return 'BẢNG KÊ GIAO DỊCH CHI TIẾT';
      case 'VOUCHER': return 'PHIẾU THANH TOÁN / QUYẾT TOÁN';
      case 'REPORT': return 'BÁO CÁO TÓM TẮT HỆ THỐNG';
      default: return 'HÓA ĐƠN BÁN HÀNG';
    }
  };

  const renderContent = () => {
    switch (printMode) {
      case 'LIST':
        return (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #0f172a', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '0.6rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>Đối tượng giao dịch</th>
                <th style={{ padding: '0.6rem', textAlign: 'center', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>Giá trị</th>
                <th style={{ padding: '0.6rem', textAlign: 'right', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase' }}>Tình trạng</th>
              </tr>
            </thead>
            <tbody>
              {extendedData.data?.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.6rem', fontSize: '0.75rem', fontWeight: '700' }}>
                    {item.name} <br/>
                    <small style={{ color: '#94a3b8' }}>Mã: {item.id}</small>
                  </td>
                  <td style={{ padding: '0.6rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '900', whiteSpace: 'nowrap' }}>{item.amount?.toLocaleString()} VND</td>
                  <td style={{ padding: '0.6rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '700', color: '#e11d48' }}>Trễ {item.days} Ngày</td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'VOUCHER':
        return (
          <div style={{ padding: '2rem', border: '2px solid #f1f5f9', borderRadius: '1.5rem', textAlign: 'center', backgroundColor: '#fcfcfc' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2em' }}>TỔNG TIỀN QUYẾT TOÁN</p>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#00288E', margin: '1rem 0', whiteSpace: 'nowrap' }}>{extendedData.data?.amount || extendedData.data?.value} VND</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '2rem', textAlign: 'left' }}>
              <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Đơn vị thụ hưởng</span>
                <p style={{ margin: '0.3rem 0 0 0', fontWeight: '900', fontSize: '0.8rem' }}>{extendedData.data?.orderId || extendedData.data?.customer || 'N/A'}</p>
              </div>
              <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Phương thức giao dịch</span>
                <p style={{ margin: '0.3rem 0 0 0', fontWeight: '900', fontSize: '0.8rem' }}>{extendedData.data?.method || 'Ghi sổ điện tử'}</p>
              </div>
            </div>
          </div>
        );

      case 'REPORT':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {extendedData.data?.summary?.map((item, idx) => (
                  <div key={idx} style={{ padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '1rem' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>{item.label}</span>
                    <p style={{ margin: '0.5rem 0 0 0', fontWeight: '900', fontSize: '1rem', color: '#00288E', whiteSpace: 'nowrap' }}>{item.value} VND</p>
                  </div>
                ))}
             </div>
             <div style={{ padding: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '1rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', color: '#00288E' }}>PHÂN BỔ TÀI CHÍNH</h4>
                {extendedData.data?.breakdown?.map((item, idx) => (
                  <div key={idx} style={{ marginBottom: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: '700', marginBottom: '0.3rem' }}>
                      <span>{item.label}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{item.value} VND</span>
                    </div>
                    <div style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px' }}>
                      <div style={{ height: '100%', width: '70%', backgroundColor: '#00288E', borderRadius: '3px' }}></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        );

      default: // INVOICE
        const items = detail.items || [];
        const subtotal = items.reduce((sum, item) => sum + ((item.price || item.unitPrice || 0) * (item.quantity || 0)), 0);
        const taxAmount = subtotal * 0.1;
        const total = subtotal + taxAmount;
        const paid = detail.paidAmount || 0;
        const remaining = total - paid;
        
        return (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1.2rem', backgroundColor: '#f8fafc', borderRadius: '1.2rem', border: '1px solid #edf2f7' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Đơn vị cung cấp</span>
                  <p style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '0.85rem', fontWeight: '900', color: '#0f172a' }}>CÔNG TY CP TẬP ĐOÀN HOLAGROUP</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>Địa chỉ: Quận 1, TP. Hồ Chí Minh</p>
               </div>
               <div style={{ padding: '1.2rem', backgroundColor: '#ffffff', borderRadius: '1.2rem', border: '1px solid #edf2f7' }}>
                  <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Khách hàng thanh toán</span>
                  <p style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '0.85rem', fontWeight: '900', color: '#1a202c' }}>{detail.customerName || 'Khách hàng lẻ'}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>SĐT: {detail.phoneNumber || 'n/a'}</p>
               </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.8rem', fontWeight: '900', color: '#00288E', textTransform: 'uppercase' }}>DANH MỤC SẢN PHẨM</h4>
              <div style={{ 
                border: '1px solid #edf2f7', 
                borderRadius: '1rem', 
                overflow: 'hidden', 
                marginBottom: '1rem'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #edf2f7' }}>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b', fontWeight: '900', border: '1px solid #edf2f7' }}>DANH MỤC</th>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'left', fontSize: '0.7rem', color: '#64748b', fontWeight: '900', border: '1px solid #edf2f7' }}>SẢN PHẨM</th>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'center', width: '100px', fontSize: '0.7rem', color: '#64748b', fontWeight: '900', border: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>SỐ LƯỢNG</th>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'right', minWidth: '150px', width: 'auto', fontSize: '0.7rem', color: '#64748b', fontWeight: '900', border: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>THÀNH TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '1rem 0.8rem', fontSize: '0.75rem', fontWeight: '700', border: '1px solid #edf2f7' }}>
                          {item.category || item.categoryName || 'Sản phẩm'}
                        </td>
                        <td style={{ padding: '1rem 0.8rem', fontSize: '0.75rem', fontWeight: '800', border: '1px solid #edf2f7' }}>
                          {item.name || item.productName || 'Sản phẩm không xác định'}
                        </td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '800', border: '1px solid #edf2f7' }}>
                          {item.quantity}
                        </td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '900', color: '#00288E', border: '1px solid #edf2f7', whiteSpace: 'nowrap' }}>
                          {((item.price || item.unitPrice || 0) * (item.quantity || 0))?.toLocaleString()} VND
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              <div style={{ padding: '1.5rem', border: '1px solid #edf2f7', borderRadius: '1.5rem' }}>
                <span style={{ fontSize: '0.6rem', fontWeight: '900', color: '#94a3b8' }}>TIẾN ĐỘ THANH TOÁN</span>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap' }}>Đã thanh toán: {paid.toLocaleString()} VND</p>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', fontWeight: '700', color: '#e53e3e', whiteSpace: 'nowrap' }}>Còn lại: {remaining.toLocaleString()} VND</p>
              </div>
              <div style={{ padding: '1.5rem', border: '1px solid #edf2f7', borderRadius: '1.5rem', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b' }}>Tạm tính:</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700' }}>{subtotal.toLocaleString()} VND</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700', color: '#64748b' }}>VAT (10%):</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: '700' }}>{taxAmount.toLocaleString()} VND</span>
                </div>
                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.7rem', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>TỔNG CỘNG</p>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '1.4rem', fontWeight: '900', color: '#00288E', whiteSpace: 'nowrap' }}>{total.toLocaleString()} VND</p>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  const printableContent = (
    <div 
      id="printable-area" 
      style={{ 
        position: 'fixed',
        top: '-9999px',
        left: '-9999px',
        backgroundColor: '#FFFFFF',
        color: '#1a202c',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box',
        width: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    >
      <style>
        {`
          /* ẨN KHỎI MÀN HÌNH CHÍNH */
          #printable-area { display: none; }

          @media print {
            /* @page margin boxes: đây là cách duy nhất để số trang hiển thị
               chính xác trên từng trang - browser tự quản lý counter(page) */
            @page {
              size: auto;
              margin: 5mm 5mm 18mm 5mm;
              @bottom-left {
                content: "Hệ thống HOLAGROUP ERP - Tài liệu lưu hành nội bộ";
                font-size: 8pt;
                color: #94a3b8;
                font-weight: 700;
                font-family: 'Inter', sans-serif;
                border-top: 2px solid #00288E;
                padding-top: 4pt;
                vertical-align: top;
              }
              @bottom-right {
                content: "Trang " counter(page);
                font-size: 8pt;
                color: #94a3b8;
                font-weight: 700;
                font-family: 'Inter', sans-serif;
                border-top: 2px solid #00288E;
                padding-top: 4pt;
                vertical-align: top;
              }
            }
            body { 
              margin: 0; 
              background: white !important; 
            }
            #root, .acc-modal-overlay { display: none !important; }
            body > *:not(#printable-area) { display: none !important; }
            
            #printable-area { 
              position: relative !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important; 
              display: block !important;
              padding: 0 !important;
              margin: 0 !important;
              z-index: 999999 !important;
            }
            .print-thead-spacer {
              height: 10mm;
            }
            .print-content-table {
              width: 100%;
              border-collapse: collapse;
            }
            .print-main-content {
              padding: 5mm 10mm 5mm 10mm;
            }
            /* TRÁNH NGẮT TRANG GIỮA TIÊU ĐỀ VÀ NỘI DUNG */
            h2, h3, .section-title {
              break-after: avoid !important;
              page-break-after: avoid !important;
            }
            .print-section {
              margin-bottom: 20px;
            }
            tr {
              break-inside: avoid !important;
            }
          }
        `}
      </style>

      <table className="print-content-table">
        <thead>
          <tr>
            <td><div className="print-thead-spacer"></div></td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="print-main-content" style={{ verticalAlign: 'top' }}>
              {/* OFFSET FIRST PAGE TOP MARGIN */}
              <div style={{ marginTop: '-10mm' }}>
                {/* HEADER CÔNG TY */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #00288E', paddingBottom: '0.8rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                   <div style={{ width: '2.8rem', height: '2.8rem', backgroundColor: '#00288E', borderRadius: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '1.5rem' }}>H</div>
                   <div>
                      <h1 style={{ margin: 0, color: '#00288E', fontSize: '1.3rem', fontWeight: '900' }}>HOLAGROUP</h1>
                      <p style={{ margin: 0, fontSize: '0.6rem', color: '#718096', fontWeight: '800', textTransform: 'uppercase' }}>Hệ thống Quản trị Tài chính</p>
                   </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', textTransform: 'uppercase', color: '#2d3748' }}>{renderHeaderTitle()}</h2>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', fontWeight: '700' }}>Mã: {detail.id || detail.orderID}</p>
                </div>
              </div>

              {/* THÔNG TIN GIAO DỊCH */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.5rem' }}>
                 <div>
                    <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#a0aec0', textTransform: 'uppercase' }}>THÔNG TIN CƠ BẢN</p>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', fontWeight: '700' }}>Ngày: {detail.date || new Date().toLocaleDateString('vi-VN')}</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', fontWeight: '700' }}>Giờ: {detail.time || 'N/A'}</p>
                 </div>
                 <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '0.6rem', fontWeight: '900', color: '#a0aec0', textTransform: 'uppercase' }}>XÁC THỰC</p>
                    <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.8rem', fontWeight: '900', color: '#38a169' }}>TRỰC TUYẾN</p>
                 </div>
              </div>

              {/* NỘI DUNG CHÍNH */}
              {renderContent()}
              </div>
            </td>
          </tr>
          <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <td>
              {/* CHỮ KÝ */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', textAlign: 'center' }}>
                <div style={{ width: '45%' }}>
                   <p style={{ margin: 0, fontWeight: '900', fontSize: '0.85rem' }}>ĐẠI DIỆN GIAO DỊCH</p>
                   <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.6rem', color: '#94a3b8' }}>(Ký và ghi rõ họ tên)</p>
                   <div style={{ height: '4rem' }}></div>
                </div>
                <div style={{ width: '45%' }}>
                   <p style={{ margin: 0, fontWeight: '900', fontSize: '0.85rem' }}>KẾ TOÁN TRƯỞNG</p>
                   <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.6rem', color: '#94a3b8' }}>(Ký và ghi rõ họ tên)</p>
                   <div style={{ height: '3rem' }}></div>
                   <p style={{ margin: 0, fontWeight: '900', fontSize: '1rem', color: '#00288E' }}>Hệ thống ERP Hola</p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return createPortal(printableContent, document.body);
};

export default PrintableInvoiceTemplate;
