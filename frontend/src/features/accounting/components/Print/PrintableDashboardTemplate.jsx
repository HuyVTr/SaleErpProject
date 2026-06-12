import React from 'react';

/**
 * Mẫu in Dashboard kế toán chuyên nghiệp PRO-MAX V4.6
 * Đã phục hồi kích thước hiển thị tối ưu cho khổ A4 và tích hợp Footer đa trang cố định.
 */
const PrintableDashboardTemplate = ({ stats, chartData, timeframeLabels, timeframe, dynamicLabel }) => {
  if (!stats) return null;

  const formatDisplayValue = (val) => {
    if (val === undefined || val === null) return '0';
    if (typeof val === 'string') {
      return val.replace(/[đ₫VND]/g, '').trim();
    }
    return val.toLocaleString('vi-VN');
  };

  const formatDisplayDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : 'N/A';
  const notifications = stats.notifications || [];

  return (
    <div id="printable-dashboard" style={{ 
      width: '100%', 
      background: 'white', 
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#1e293b',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <style>
        {`
          /* ẨN KHỎI MÀN HÌNH CHÍNH */
          #printable-dashboard { display: none; }

          @media print {
            /* @page margin boxes: đây là cách duy nhất để số trang hiển thị
               chính xác trên từng trang - browser tự quản lý counter(page) */
            @page {
              size: auto;
              margin: 5mm 5mm 18mm 5mm;
              @bottom-left {
                content: "Hệ thống HIZOGROUP ERP - Tài liệu lưu hành nội bộ";
                font-size: 8pt;
                color: #94a3b8;
                font-weight: 700;
                font-family: 'Inter', 'Segoe UI', sans-serif;
                border-top: 2px solid #00288E;
                padding-top: 4pt;
                vertical-align: top;
              }
              @bottom-right {
                content: "Trang " counter(page);
                font-size: 8pt;
                color: #94a3b8;
                font-weight: 700;
                font-family: 'Inter', 'Segoe UI', sans-serif;
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
            body > *:not(#printable-dashboard) { display: none !important; }
            
            #printable-dashboard { 
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
            h3, .section-title {
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
                {/* 1. HEADER CÔNG TY */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #00288E', paddingBottom: '10px', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '3.5rem', height: '3.5rem', backgroundColor: '#00288E', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '900', fontSize: '2rem' }}>H</div>
                  <div>
                    <h1 style={{ margin: 0, color: '#00288E', fontSize: '1.7rem', fontWeight: '900', letterSpacing: '-0.02em' }}>HIZO GROUP</h1>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hệ thống Quản trị Doanh nghiệp</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase' }}>Trung tâm Tài chính</h2>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: '700' }}>
                    Ngày xuất: {new Date().toLocaleDateString('vi-VN')} | {new Date().toLocaleTimeString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* TIÊU ĐỀ BIỂU ĐỒ */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: '800', 
                  color: '#64748b', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  marginBottom: '0.5rem'
                }}>
                  Phân tích dữ liệu: <span style={{ color: '#00288E' }}>{dynamicLabel}</span>
                </h3>
              </div>

              {/* TÓM TẮT CHỈ SỐ (STATS) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.2rem', marginBottom: '2.5rem' }}>
                {[
                  { label: 'TỔNG DOANH THU', value: stats.totalRevenue, color: '#00288E', unit: ' VND' },
                  { label: 'TỔNG CÔNG NỢ', value: stats.totalDebt, color: '#00288E', unit: ' VND' },
                  { label: 'HÓA ĐƠN CHỜ', value: stats.pendingInvoices, color: '#00288E', unit: '' },
                  { label: 'THỰC THU', value: stats.totalCollected, color: '#00288E', unit: ' VND' }
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: '1.2rem', border: '1.5px solid #e2e8f0', borderRadius: '1rem', backgroundColor: '#fcfcfc' }}>
                    <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.7rem', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.05em' }}>{item.label}</p>
                    <p style={{ 
                      margin: 0, 
                      fontSize: '1.5rem', 
                      fontWeight: '900', 
                      color: item.color,
                      whiteSpace: 'nowrap'
                    }}>
                      {formatDisplayValue(item.value)}<span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{item.unit}</span>
                    </p>
                  </div>
                ))}
              </div>



              {/* BẢNG GIAO DỊCH GẦN ĐÂY */}
              <div className="print-section">
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', marginBottom: '1.2rem', borderLeft: '5px solid #00288E', paddingLeft: '0.8rem', textTransform: 'uppercase' }}>
                  Chi tiết giao dịch & Thông báo mới nhất
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '3px solid #0f172a', backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'left', fontWeight: '900' }}>NỘI DUNG NGHIỆP VỤ</th>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'center', fontWeight: '900', width: '100px' }}>LOẠI</th>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '900', width: '120px' }}>THỜI GIAN</th>
                      <th style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '900', width: '150px' }}>TRẠNG THÁI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.length > 0 ? notifications.map((n, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '1rem 0.8rem', fontWeight: '700', color: '#1e293b' }}>{n.message}</td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'center' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '0.4rem', 
                            fontSize: '0.7rem', 
                            fontWeight: '900',
                            backgroundColor: n.uiType === 'warning' ? '#fff7ed' : '#f0f9ff',
                            color: n.uiType === 'warning' ? '#ea580c' : '#0369a1',
                            border: `1px solid ${n.uiType === 'warning' ? '#fed7aa' : '#bae6fd'}`,
                            textTransform: 'uppercase'
                          }}>
                            {n.type}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'right', color: '#64748b', fontWeight: '600' }}>
                          {formatDisplayDate(n.timestamp)}
                        </td>
                        <td style={{ padding: '1rem 0.8rem', textAlign: 'right', fontWeight: '900', color: '#0f172a' }}>{n.status}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '1rem' }}>
                          Hệ thống chưa ghi nhận giao dịch mới trong khoảng thời gian này.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            </td>
          </tr>
          <tr style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
            <td>
              {/* CHỮ KÝ */}
              <div className="print-section" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4rem', gap: '8rem', textAlign: 'center' }}>
                <div style={{ minWidth: '12rem' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '0.95rem', color: '#1e293b' }}>Người lập biểu</p>
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>(Ký và ghi rõ họ tên)</p>
                </div>
                <div style={{ minWidth: '12rem' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '0.95rem', color: '#1e293b' }}>Kế toán trưởng</p>
                  <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700' }}>(Ký và đóng dấu)</p>
                  <div style={{ height: '5rem' }}></div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default PrintableDashboardTemplate;
