import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import XLSX from 'xlsx-js-style';
import { ExcelStyles, colIndexToLabel, styleCell, applyBordersToRange, setColumnWidths } from './excelStyleUtils';

/**
 * Xuất báo cáo PDF chuyên nghiệp (Không phải screenshot toàn màn hình)
 */
export const exportToPDF = async (options) => {
  const {
    filename = 'report.pdf',
    title = 'BÁO CÁO TÀI CHÍNH', 
    subtitle = '',
    charts = [] // Array of {id, label}
  } = options;

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // 1. Header & Brand
    pdf.setFillColor(0, 40, 142); // HIZO PRIMARY BLUE
    pdf.rect(0, 0, 210, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('HIZO GROUP', 15, 20);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('He thong Quan ly Kinh doanh & Ke toan', 15, 28);
    pdf.text(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, 150, 20);

    // 2. Title Section
    pdf.setTextColor(15, 23, 42); // Slate 900
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title.toUpperCase(), 105, 55, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setTextColor(71, 85, 105); // Slate 600
    pdf.text(subtitle, 105, 62, { align: 'center' });

    let currentY = 75;

    // 3. Render Charts (Capture specific elements)
    for (const chart of charts) {
      const chartEl = document.getElementById(chart.id);
      if (chartEl) {
        const canvas = await html2canvas(chartEl, { scale: 2, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png');
        
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(chart.label, 15, currentY - 5);
        
        const imgWidth = 180;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Kiểm tra tràn trang
        if (currentY + imgHeight > 280) {
          pdf.addPage();
          currentY = 20;
        }

        pdf.addImage(imgData, 'PNG', 15, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 25;
      }
    }

    // 4. Draw Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(`Trang ${i} / ${pageCount}`, 105, 285, { align: 'center' });
      pdf.text('Tai lieu luu hanh noi bo - Hizo Group Sales System', 15, 285);
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    return false;
  }
};

/**
 * helper: Format VND values format string
 */
const CURRENCY_FORMAT = '#,##0" ₫"';
const PERCENT_FORMAT = '0.0%';

/**
 * helper: Format Date String to dd/mm/yyyy HH:mm:ss
 */
const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Tạo Sheet "Thông tin" chứa các metadata của báo cáo
 */
const createInfoSheet = (reportMetadata, userInfo, companyInfo) => {
  const ws = {};
  
  // Dòng 1-2: HIZO GROUPS Header
  ws['A1'] = { v: companyInfo.name.toUpperCase(), t: 's' };
  ws['A2'] = { v: 'Hệ Thống Quản Lý Bán Hàng & Kế Toán', t: 's' };
  
  styleCell(ws, 'A1', {
    font: { name: 'Arial', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: ExcelStyles.colors.primary } },
    alignment: ExcelStyles.alignment.center
  });
  styleCell(ws, 'A2', {
    font: { name: 'Arial', sz: 10, color: { rgb: 'E2E8F0' }, italic: true },
    fill: { fgColor: { rgb: ExcelStyles.colors.primary } },
    alignment: ExcelStyles.alignment.center
  });

  // Merge headers A1:B1 và A2:B2
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }
  ];

  let r = 4; // Bắt đầu từ dòng 4 (1-indexed)

  const addRow = (key, val, valType = 's', numberFormat = null) => {
    const cellA = `A${r}`;
    const cellB = `B${r}`;
    ws[cellA] = { v: key, t: 's' };
    ws[cellB] = { v: val, t: valType };
    if (numberFormat) {
      ws[cellB].z = numberFormat;
    }
    
    styleCell(ws, cellA, {
      font: ExcelStyles.fonts.bodyBold,
      fill: { fgColor: { rgb: ExcelStyles.colors.light } },
      alignment: ExcelStyles.alignment.left,
      border: ExcelStyles.borders.thin
    });
    styleCell(ws, cellB, {
      font: ExcelStyles.fonts.body,
      alignment: valType === 'n' ? ExcelStyles.alignment.right : ExcelStyles.alignment.left,
      border: ExcelStyles.borders.thin
    });
    r++;
  };

  // Section 1: Thông tin báo cáo
  ws[`A${r}`] = { v: 'THÔNG TIN BÁO CÁO', t: 's' };
  styleCell(ws, `A${r}`, { font: ExcelStyles.fonts.sectionHeader });
  ws['!merges'].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 1 } });
  r += 2;

  addRow('Kỳ báo cáo', reportMetadata.dateRange.label);
  addRow('Thời gian', `Từ ${formatDate(reportMetadata.dateRange.from)} Đến ${formatDate(reportMetadata.dateRange.to)}`);
  addRow('Thời gian xuất', formatDateTime(reportMetadata.generatedAt));
  addRow('Người xuất', `${userInfo.fullName} (${userInfo.email})`);
  addRow('Phòng ban', userInfo.department);
  addRow('Chức vụ / Vai trò', userInfo.role);
  
  r++;

  // Section 2: Thông tin công ty
  ws[`A${r}`] = { v: 'THÔNG TIN DOANH NGHIỆP', t: 's' };
  styleCell(ws, `A${r}`, { font: ExcelStyles.fonts.sectionHeader });
  ws['!merges'].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 1 } });
  r += 2;

  addRow('Công ty', companyInfo.name);
  addRow('Mã số thuế', companyInfo.taxId);
  addRow('Đại diện pháp luật', companyInfo.legalRepresentative);
  addRow('Địa chỉ', companyInfo.address);
  addRow('Điện thoại', companyInfo.phone);
  addRow('Email liên hệ', companyInfo.email);
  addRow('Website', companyInfo.website);

  r++;

  // Section 3: Tóm tắt số liệu
  ws[`A${r}`] = { v: 'TÓM TẮT SỐ LIỆU', t: 's' };
  styleCell(ws, `A${r}`, { font: ExcelStyles.fonts.sectionHeader });
  ws['!merges'].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 1 } });
  r += 2;

  addRow('Tổng doanh thu', reportMetadata.summary.totalRevenue, 'n', CURRENCY_FORMAT);
  addRow('Tổng công nợ', reportMetadata.summary.totalDebt, 'n', CURRENCY_FORMAT);
  addRow('Tổng thực thu', reportMetadata.summary.totalCollected, 'n', CURRENCY_FORMAT);
  addRow('Tổng số đơn hàng', reportMetadata.summary.totalOrders, 'n');
  addRow('Số danh mục báo cáo', reportMetadata.summary.categoryCount, 'n');
  addRow('Số nhân viên kinh doanh', reportMetadata.summary.salesCount, 'n');

  // Ghi chú phong cách
  r += 2;
  ws[`A${r}`] = { v: 'GHI CHÚ BẢO MẬT & ĐIỀU KHOẢN', t: 's' };
  styleCell(ws, `A${r}`, { font: ExcelStyles.fonts.bodyBold });
  r++;

  const notes = [
    '• Tài liệu lưu hành nội bộ - Hizo Group Sales System.',
    '• Dữ liệu được trích xuất trực tiếp từ hệ thống kế toán chính thức.',
    '• Nghiêm cấm sao chép, chỉnh sửa hoặc chia sẻ với bên thứ ba khi chưa được phê duyệt.'
  ];

  notes.forEach(note => {
    ws[`A${r}`] = { v: note, t: 's' };
    styleCell(ws, `A${r}`, { font: ExcelStyles.fonts.footer });
    ws['!merges'].push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 1 } });
    r++;
  });

  // Thiết lập Range cho sheet
  ws['!ref'] = `A1:B${r - 1}`;
  
  // Chiều rộng cột
  ws['!cols'] = [
    { wch: 28 }, // Cột A
    { wch: 45 }  // Cột B
  ];

  return ws;
};

/**
 * Xuất Excel chuyên nghiệp với styling, metadata, và footer
 */
export const exportToExcel = (options) => {
  const {
    sheets = [], // Array of { name, data, title, customHeaders }
    filename = 'report.xlsx',
    reportMetadata,
    userInfo,
    companyInfo
  } = options;

  try {
    if (!reportMetadata || !userInfo || !companyInfo) {
      throw new Error('Thiếu thông tin metadata hoặc thông tin người dùng/doanh nghiệp.');
    }

    const workbook = XLSX.utils.book_new();

    // 1. Tạo và append Sheet 1: Thông tin
    const infoSheet = createInfoSheet(reportMetadata, userInfo, companyInfo);
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'Thông tin');

    // 2. Tạo và append các Sheet Dữ Liệu
    sheets.forEach((sheetConfig) => {
      const { name, data, title } = sheetConfig;
      
      const ws = {};
      
      // A. Tạo Header Section (Dòng 1-2)
      ws['A1'] = { v: companyInfo.name.toUpperCase(), t: 's' };
      ws['A2'] = { v: `${title.toUpperCase()} - KỲ BÁO CÁO: ${reportMetadata.dateRange.label.toUpperCase()}`, t: 's' };
      
      styleCell(ws, 'A1', {
        font: { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: ExcelStyles.colors.primary } },
        alignment: ExcelStyles.alignment.left
      });
      styleCell(ws, 'A2', {
        font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'E2E8F0' } },
        fill: { fgColor: { rgb: ExcelStyles.colors.primary } },
        alignment: ExcelStyles.alignment.left
      });

      // B. Thêm metadata phụ ở Dòng 4
      const printDateLabel = `Ngày xuất: ${formatDateTime(reportMetadata.generatedAt)}`;
      const printUserLabel = `Người xuất: ${userInfo.fullName} (${userInfo.department})`;
      ws['A4'] = { v: `${printDateLabel}  |  ${printUserLabel}`, t: 's' };
      styleCell(ws, 'A4', {
        font: ExcelStyles.fonts.footer,
        alignment: ExcelStyles.alignment.left
      });

      // C. Xử lý table data bắt đầu từ Dòng 6
      let startRow = 6;
      if (data.length === 0) {
        ws['A6'] = { v: 'Không có dữ liệu trong kỳ báo cáo này.', t: 's' };
        styleCell(ws, 'A6', { font: ExcelStyles.fonts.body });
        ws['!ref'] = 'A1:E6';
        XLSX.utils.book_append_sheet(workbook, ws, name);
        return;
      }

      const headers = Object.keys(data[0]);
      const colCount = headers.length;

      // Merge header banner banner
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } }
      ];

      // Ghi tiêu đề cột (Row 6)
      headers.forEach((header, cIdx) => {
        const cellRef = `${colIndexToLabel(cIdx)}${startRow}`;
        ws[cellRef] = { v: header.toUpperCase(), t: 's' };
        styleCell(ws, cellRef, {
          font: ExcelStyles.fonts.header,
          fill: { fgColor: { rgb: ExcelStyles.colors.primary } },
          alignment: ExcelStyles.alignment.wrapCenter,
          border: ExcelStyles.borders.header
        });
      });

      let currentRow = startRow + 1;

      // Ghi dữ liệu dòng
      data.forEach((rowObj, rIdx) => {
        const isZebra = rIdx % 2 === 1;
        const rowBgColor = isZebra ? ExcelStyles.colors.zebra : 'FFFFFF';

        headers.forEach((header, cIdx) => {
          const cellRef = `${colIndexToLabel(cIdx)}${currentRow}`;
          let val = rowObj[header];
          let type = 's';
          let numFormat = null;
          let cellAlign = ExcelStyles.alignment.left;

          // Xác định định dạng cột dựa trên tên tiêu đề cột
          const headerLower = header.toLowerCase();
          const isNumber = typeof val === 'number';

          if (isNumber) {
            type = 'n';
            cellAlign = ExcelStyles.alignment.right;
            
            if (headerLower.includes('vnd') || headerLower.includes('doanh thu') || headerLower.includes('công nợ') || headerLower.includes('thu thực') || headerLower.includes('hoa hồng') || headerLower.includes('mục tiêu') || headerLower.includes('thực thu')) {
              numFormat = CURRENCY_FORMAT;
            }
          } else if (typeof val === 'string') {
            if (val.endsWith('%')) {
              // Convert string '92.5%' or '10%' to numeric for nice format
              const parsedPercent = parseFloat(val.replace('%', ''));
              if (!isNaN(parsedPercent)) {
                val = parsedPercent / 100;
                type = 'n';
                numFormat = PERCENT_FORMAT;
                cellAlign = ExcelStyles.alignment.center;
              }
            } else if (headerLower.includes('tỷ trọng') || headerLower.includes('%') || headerLower.includes('hoàn thành')) {
              const parsedPercent = parseFloat(val);
              if (!isNaN(parsedPercent)) {
                val = parsedPercent / 100;
                type = 'n';
                numFormat = PERCENT_FORMAT;
                cellAlign = ExcelStyles.alignment.center;
              }
            }
          }

          ws[cellRef] = { v: val, t: type };
          if (numFormat) {
            ws[cellRef].z = numFormat;
          }

          // Apply cell styling
          styleCell(ws, cellRef, {
            font: ExcelStyles.fonts.body,
            fill: { fgColor: { rgb: rowBgColor } },
            alignment: cellAlign,
            border: ExcelStyles.borders.thin
          });
        });

        currentRow++;
      });

      // D. Tính toán dòng tổng hợp (Total Row)
      const totalRowIndex = currentRow;
      const totalCellRefA = `A${totalRowIndex}`;
      ws[totalCellRefA] = { v: 'TỔNG CỘNG', t: 's' };
      styleCell(ws, totalCellRefA, {
        font: ExcelStyles.fonts.bodyBold,
        fill: { fgColor: { rgb: ExcelStyles.colors.light } },
        alignment: ExcelStyles.alignment.left,
        border: ExcelStyles.borders.total
      });

      // Điền các cột khác trong dòng tổng cộng
      headers.forEach((header, cIdx) => {
        if (cIdx === 0) return; // Skip label column
        
        const cellRef = `${colIndexToLabel(cIdx)}${totalRowIndex}`;
        const headerLower = header.toLowerCase();
        
        // Chỉ tính tổng đối với cột số lượng / tiền tệ
        const shouldSum = headerLower.includes('doanh thu') || 
                          headerLower.includes('công nợ') || 
                          headerLower.includes('thực thu') || 
                          headerLower.includes('hóa đơn') || 
                          headerLower.includes('đơn hàng') || 
                          headerLower.includes('hoa hồng') ||
                          headerLower.includes('mục tiêu');

        if (shouldSum) {
          const sum = data.reduce((acc, row) => {
            const rawVal = row[header];
            const val = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);
            return acc + (isNaN(val) ? 0 : val);
          }, 0);

          ws[cellRef] = { v: sum, t: 'n' };
          let numFormat = null;
          if (headerLower.includes('doanh thu') || headerLower.includes('công nợ') || headerLower.includes('thực thu') || headerLower.includes('hoa hồng') || headerLower.includes('mục tiêu')) {
            numFormat = CURRENCY_FORMAT;
          }
          if (numFormat) {
            ws[cellRef].z = numFormat;
          }
          
          styleCell(ws, cellRef, {
            font: ExcelStyles.fonts.bodyBold,
            fill: { fgColor: { rgb: ExcelStyles.colors.light } },
            alignment: ExcelStyles.alignment.right,
            border: ExcelStyles.borders.total
          });
        } else if (headerLower.includes('tỷ trọng') || headerLower.includes('hoàn thành')) {
          // Tính trung bình cộng hoặc để trống
          ws[cellRef] = { v: 1.0, t: 'n', z: PERCENT_FORMAT }; // Tỷ trọng tổng luôn là 100%
          styleCell(ws, cellRef, {
            font: ExcelStyles.fonts.bodyBold,
            fill: { fgColor: { rgb: ExcelStyles.colors.light } },
            alignment: ExcelStyles.alignment.center,
            border: ExcelStyles.borders.total
          });
        } else {
          // Để trống với đường viền thích hợp
          ws[cellRef] = { v: '', t: 's' };
          styleCell(ws, cellRef, {
            font: ExcelStyles.fonts.bodyBold,
            fill: { fgColor: { rgb: ExcelStyles.colors.light } },
            alignment: ExcelStyles.alignment.left,
            border: ExcelStyles.borders.total
          });
        }
      });

      currentRow++;

      // E. Thêm thông tin Footer báo cáo
      currentRow++;
      const footerCellRef = `A${currentRow}`;
      ws[footerCellRef] = { 
        v: `Tổng số dòng dữ liệu: ${data.length} | Báo cáo lưu hành nội bộ của Hizo Groups`, 
        t: 's' 
      };
      styleCell(ws, footerCellRef, {
        font: ExcelStyles.fonts.footer,
        alignment: ExcelStyles.alignment.left
      });
      ws['!merges'].push({ s: { r: currentRow - 1, c: 0 }, e: { r: currentRow - 1, c: colCount - 1 } });

      // Thiết lập Ref cho Sheet
      ws['!ref'] = `A1:${colIndexToLabel(colCount - 1)}${currentRow}`;

      // Frozen header row (Dòng 6)
      ws['!freeze'] = { xSplit: 0, ySplit: startRow };

      // Thiết lập Column Widths (Auto-width)
      setColumnWidths(ws, data, {
        A: 18,
        B: 22,
        C: 22,
        D: 15,
        E: 22,
        F: 22,
        G: 22
      });

      XLSX.utils.book_append_sheet(workbook, ws, name);
    });

    // Xuất dữ liệu ra buffer dạng nhị phân với cấu hình định dạng Excel
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
    
    // Chuyển đổi chuỗi nhị phân sang ArrayBuffer để tạo Blob
    const s2ab = (s) => {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < s.length; i++) {
        view[i] = s.charCodeAt(i) & 0xFF;
      }
      return buf;
    };
    
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    
    // Kích hoạt hộp thoại tải xuống của trình duyệt
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw new Error(`Lỗi xuất Excel: ${error.message}`);
  }
};
