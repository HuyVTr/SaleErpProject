import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

/**
 * Xuất báo cáo PDF chuyên nghiệp (Không phải screenshot toàn màn hình)
 */
export const exportToPDF = async (options) => {
  const { 
    elementId, 
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
    pdf.setFillColor(0, 40, 142); // HOLA PRIMARY BLUE
    pdf.rect(0, 0, 210, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text('HOLA GROUP', 15, 20);
    
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
      pdf.text('Tai lieu luu hanh noi bo - Hola Group Sales System', 15, 285);
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('PDF Export Error:', error);
    return false;
  }
};

/**
 * Xuất Excel chuyên nghiệp với hỗ trợ nhiều bảng/sheet
 */
export const exportToExcel = (options) => {
  const { 
    sheets = [], // Array of { name, data, title }
    filename = 'report.xlsx' 
  } = options;
  
  try {
    const workbook = XLSX.utils.book_new();

    sheets.forEach((sheetConfig) => {
      const { name, data, title } = sheetConfig;
      
      const headerRow = [title.toUpperCase()];
      const dateRow = [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`];
      const emptyRow = [];
      
      // Tạo worksheet từ JSON, bắt đầu từ dòng 4 để dành chỗ cho Header
      const worksheet = XLSX.utils.json_to_sheet(data, { origin: 'A4' });
      
      // Thêm các dòng tiêu đề vào đầu
      XLSX.utils.sheet_add_aoa(worksheet, [headerRow, dateRow, emptyRow], { origin: 'A1' });

      // Định dạng độ rộng cột (Auto-width)
      if (data.length > 0) {
        const colWidths = Object.keys(data[0]).map(key => {
          const maxLength = Math.max(
            key.toString().length,
            ...data.map(item => (item[key] || '').toString().length)
          );
          return { wch: maxLength + 5 };
        });
        worksheet['!cols'] = colWidths;
      }
      
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    });
    
    XLSX.writeFile(workbook, filename);
    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    return false;
  }
};
