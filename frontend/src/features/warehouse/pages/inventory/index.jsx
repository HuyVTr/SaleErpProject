import React, { useState, useEffect, useMemo } from 'react';
import XLSX from 'xlsx-js-style';
import warehouseService, { formatCurrency } from '../../services/warehouseService';
import { WarehouseStatCard } from '../../components/WarehouseStatCard';

const InventoryReport = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showToast, setShowToast] = useState(false);
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Dropdown states cho bộ lọc mới
  const [isOpenCategoryDropdown, setIsOpenCategoryDropdown] = useState(false);
  const [isOpenStockFilterDropdown, setIsOpenStockFilterDropdown] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.stat-card-container')) {
        setActiveTooltipIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prods, cats] = await Promise.all([
          warehouseService.getInventory(),
          warehouseService.getCategories(),
        ]);
        setProducts(prods);
        setCategories(cats);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    if (selectedCategory && p.category !== selectedCategory) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (!(p.name || '').toLowerCase().includes(s) && !(p.sku || '').toLowerCase().includes(s)) return false;
    }
    if (stockFilter === 'low') return p.stockQuantity > 0 && p.stockQuantity <= p.minStock;
    if (stockFilter === 'out') return p.stockQuantity === 0;
    if (stockFilter === 'ok') return p.stockQuantity > p.minStock;
    return true;
  });

  const totalValue = filteredProducts.reduce((sum, p) => sum + p.stockQuantity * p.unitPrice, 0);
  const totalItems = filteredProducts.reduce((sum, p) => sum + p.stockQuantity, 0);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, stockFilter, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedProducts = useMemo(() => {
    if (!sortConfig.key) return filteredProducts;
    const getValue = (product) => {
      switch (sortConfig.key) {
        case 'sku': return product.sku;
        case 'name': return product.name;
        case 'category': return product.category;
        case 'unit': return product.unit;
        case 'stockQuantity': return product.stockQuantity;
        case 'minStock': return product.minStock;
        case 'unitPrice': return product.unitPrice;
        case 'stockValue': return product.stockQuantity * product.unitPrice;
        default: return null;
      }
    };
    return [...filteredProducts].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredProducts, sortConfig]);

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return 'unfold_more';
    return sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    return sortedProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sortedProducts, currentPage]);

  const getStockBadge = (product) => {
    const badgeStyle = {
      fontSize: 'clamp(8px, 0.75vw, 10px)',
      padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)'
    };
    if (product.stockQuantity === 0) {
      return (
        <span style={badgeStyle} className="bg-red-50 text-red-600 font-black rounded-lg border border-red-100 uppercase tracking-tighter whitespace-nowrap inline-flex items-center wh-badge out-of-stock">
          <span className="wh-badge-dot" aria-hidden="true" />Hết hàng
        </span>
      );
    }
    if (product.stockQuantity <= product.minStock) {
      return (
        <span style={badgeStyle} className="bg-orange-50 text-orange-600 font-black rounded-lg border border-orange-100 uppercase tracking-tighter whitespace-nowrap inline-flex items-center wh-badge low-stock">
          <span className="wh-badge-dot" aria-hidden="true" />Sắp hết
        </span>
      );
    }
    return (
      <span style={badgeStyle} className="bg-emerald-50 text-emerald-600 font-black rounded-lg border border-emerald-100 uppercase tracking-tighter whitespace-nowrap inline-flex items-center wh-badge in-stock">
        <span className="wh-badge-dot" aria-hidden="true" />Đủ hàng
      </span>
    );
  };

  const handleExportExcel = () => {
    const now = new Date();
    const formattedDate = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // 1. Tạo workbook mới
    const wb = XLSX.utils.book_new();

    // 2. Định nghĩa style chung
    const styleHeader = {
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '00288E' } }, // Màu xanh thương hiệu Hizo Group
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } },
      }
    };

    const styleBorderThin = {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    };

    const styleDataCell = {
      font: { name: 'Arial', sz: 10 },
      alignment: { vertical: 'center' },
      border: styleBorderThin
    };

    const styleDataCellNumber = {
      font: { name: 'Arial', sz: 10 },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: styleBorderThin
    };

    const styleDataCellCenter = {
      font: { name: 'Arial', sz: 10 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: styleBorderThin
    };

    const styleTitleMain = {
      font: { name: 'Arial', sz: 14, bold: true, color: { rgb: '00288E' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const styleTitleSub = {
      font: { name: 'Arial', sz: 10, italic: true, color: { rgb: '475569' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };

    const styleTotalRow = {
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '00288E' } },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      border: styleBorderThin
    };

    const styleTotalRowNumber = {
      font: { name: 'Arial', sz: 10, bold: true, color: { rgb: '00288E' } },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border: styleBorderThin
    };

    // 3. Khởi tạo cấu trúc các ô trong sheet
    const ws_data = {};

    // Ghi các dòng tiêu đề
    ws_data['A1'] = { v: 'HIZO GROUP - HỆ THỐNG QUẢN LÝ BÁN HÀNG & KHO', t: 's', s: styleTitleMain };
    ws_data['A2'] = { v: 'BÁO CÁO CHI TIẾT THÔNG TIN TỒN KHO', t: 's', s: { ...styleTitleMain, font: { ...styleTitleMain.font, sz: 12 } } };
    ws_data['A3'] = { v: `Thời gian xuất: ${formattedDate} ${formattedTime}`, t: 's', s: styleTitleSub };

    // Hàng 4: Headers
    const headers = ['STT', 'Mã SP', 'Tên sản phẩm', 'Danh mục', 'ĐVT', 'Tồn kho', 'Tối thiểu', 'Đơn giá (VND)', 'Giá trị tồn (VND)', 'Trạng thái'];
    headers.forEach((h, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: 4, c: colIdx });
      ws_data[cellRef] = { v: h, t: 's', s: styleHeader };
    });

    // Điền dữ liệu sản phẩm bắt đầu từ hàng 5 (index 5)
    let totalStockVal = 0;
    let totalStockQty = 0;
    let currentRow = 5;

    filteredProducts.forEach((p, idx) => {
      const stockVal = p.stockQuantity * p.unitPrice;
      totalStockVal += stockVal;
      totalStockQty += p.stockQuantity;
      const statusStr = p.stockQuantity === 0 ? 'Hết hàng' : p.stockQuantity <= p.minStock ? 'Sắp hết' : 'Đủ hàng';

      const rowData = [
        { v: idx + 1, t: 'n', s: styleDataCellCenter },
        { v: p.sku, t: 's', s: styleDataCellCenter },
        { v: p.name, t: 's', s: styleDataCell },
        { v: p.category, t: 's', s: styleDataCell },
        { v: p.unit, t: 's', s: styleDataCellCenter },
        { v: p.stockQuantity, t: 'n', s: styleDataCellNumber, z: '#,##0' },
        { v: p.minStock, t: 'n', s: styleDataCellNumber, z: '#,##0' },
        { v: p.unitPrice, t: 'n', s: styleDataCellNumber, z: '#,##0' },
        { v: stockVal, t: 'n', s: styleDataCellNumber, z: '#,##0' },
        { v: statusStr, t: 's', s: styleDataCellCenter }
      ];

      rowData.forEach((cellData, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: currentRow, c: colIdx });
        ws_data[cellRef] = cellData;
      });

      currentRow++;
    });

    // Thêm dòng tổng cộng
    const totalRowIdx = currentRow;
    // Gộp ô "Tổng cộng" từ cột A đến E
    for (let c = 0; c <= 4; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: totalRowIdx, c });
      ws_data[cellRef] = { v: c === 0 ? 'Tổng cộng' : '', t: 's', s: styleTotalRow };
    }
    // Cột Tồn kho (cột 5)
    ws_data[XLSX.utils.encode_cell({ r: totalRowIdx, c: 5 })] = { v: totalStockQty, t: 'n', s: styleTotalRowNumber, z: '#,##0' };
    // Cột Tối thiểu (cột 6) rỗng có style
    ws_data[XLSX.utils.encode_cell({ r: totalRowIdx, c: 6 })] = { v: '', t: 's', s: styleTotalRow };
    // Cột Đơn giá (cột 7) rỗng có style
    ws_data[XLSX.utils.encode_cell({ r: totalRowIdx, c: 7 })] = { v: '', t: 's', s: styleTotalRow };
    // Cột Giá trị tồn (cột 8)
    ws_data[XLSX.utils.encode_cell({ r: totalRowIdx, c: 8 })] = { v: totalStockVal, t: 'n', s: styleTotalRowNumber, z: '#,##0' };
    // Cột Trạng thái (cột 9) rỗng có style
    ws_data[XLSX.utils.encode_cell({ r: totalRowIdx, c: 9 })] = { v: '', t: 's', s: styleTotalRow };

    // Cấu hình phạm vi vùng dữ liệu (ref)
    ws_data['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: totalRowIdx, c: 9 }
    });

    // Gộp ô
    ws_data['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Hizo Group Title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Subtitle
      { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }, // Export Time
      { s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 4 } }, // Merge "Tổng cộng"
    ];

    // Cấu hình độ rộng các cột
    ws_data['!cols'] = [
      { wch: 6 },  // STT
      { wch: 15 }, // Mã SP
      { wch: 35 }, // Tên sản phẩm
      { wch: 20 }, // Danh mục
      { wch: 8 },  // ĐVT
      { wch: 12 }, // Tồn kho
      { wch: 12 }, // Tối thiểu
      { wch: 18 }, // Đơn giá
      { wch: 22 }, // Giá trị tồn
      { wch: 15 }  // Trạng thái
    ];

    XLSX.utils.book_append_sheet(wb, ws_data, 'Báo cáo tồn kho');

    const fileDate = now.toISOString().substring(0, 10);
    const fileTime = now.toTimeString().substring(0, 8).replace(/:/g, '-');
    XLSX.writeFile(wb, `Bao_cao_ton_kho_${fileDate}_${fileTime}.xlsx`);

    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]" aria-live="polite" aria-label="Đang tải báo cáo tồn kho">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <p className="mt-4 text-xs font-extrabold text-gray-400 uppercase tracking-[0.2em]">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 min-h-0 max-sm:overflow-y-auto max-sm:h-full max-sm:pb-8 scrollbar-none">
      {/* Toast */}
      {showToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 wh-animate-scale-in"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">download_done</span>
          <span className="text-sm font-bold">Đã xuất file Excel thành công!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 shrink-0">
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Báo cáo tồn kho</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Hệ thống đang quản lý{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in">
              {filteredProducts.length} sản phẩm
            </span>
          </p>
          <div className="w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              className="wh-btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
              aria-label="Xuất báo cáo tồn kho ra file Excel"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">download</span>
              Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <WarehouseStatCard
          idx={0}
          title="TỔNG SẢN PHẨM"
          value={filteredProducts.length}
          icon="inventory_2"
          color="emerald"
          growth={{ percent: 4, isUp: true, prevValue: Math.max(0, filteredProducts.length - 1), label: 'So với tháng trước' }}
          type="number"
          rawValue={filteredProducts.length}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <WarehouseStatCard
          idx={1}
          title="TỔNG SL TỒN"
          value={totalItems.toLocaleString('vi-VN')}
          icon="shopping_bag"
          color="purple"
          growth={{ percent: 8, isUp: true, prevValue: Math.round(totalItems * 0.92), label: 'So với tháng trước' }}
          type="number"
          rawValue={totalItems}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <WarehouseStatCard
          idx={2}
          title="GIÁ TRỊ TỒN KHO"
          value={formatCurrency(totalValue)}
          icon="payments"
          color="blue"
          growth={{ percent: 12, isUp: true, prevValue: Math.round(totalValue * 0.88), label: 'So với tháng trước' }}
          type="currency"
          rawValue={totalValue}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <WarehouseStatCard
          idx={3}
          title="CẢNH BÁO"
          value={products.filter(p => p.stockQuantity <= p.minStock).length}
          icon="warning"
          color="orange"
          growth={{ percent: 15, isUp: false, prevValue: Math.max(0, products.filter(p => p.stockQuantity <= p.minStock).length + 1), label: 'So với hôm qua' }}
          type="number"
          rawValue={products.filter(p => p.stockQuantity <= p.minStock).length}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-3 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 shrink-0">
        <div className="relative flex-1 w-full lg:w-[350px] xl:w-[400px] lg:flex-none group">
          <label htmlFor="inventory-search" className="sr-only">Tìm kiếm sản phẩm</label>
          <input
            id="inventory-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm mã SP, tên sản phẩm…"
            autoComplete="off"
            className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-3.5 outline-none focus:bg-white focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-500 transition-[border-color,background-color] text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold" aria-hidden="true">search</span>
        </div>

        <div className="flex flex-row items-center gap-3 w-full lg:w-auto justify-end">
          {/* Dropdown Trạng thái */}
          <div className="relative w-1/2 lg:w-48 xl:w-52 font-inter">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isOpenStockFilterDropdown}
              aria-label={`Lọc theo trạng thái: ${stockFilter === 'all' ? 'Tất cả' : stockFilter === 'ok' ? 'Đủ hàng' : stockFilter === 'low' ? 'Sắp hết' : 'Hết hàng'}`}
              onClick={() => {
                setIsOpenStockFilterDropdown(!isOpenStockFilterDropdown);
                setIsOpenCategoryDropdown(false);
              }}
              className="w-full bg-slate-50 border-2 border-slate-200 hover:border-[#00288E] transition-[border-color,background-color,box-shadow] rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">check_circle</span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate">
                  {stockFilter === 'all' ? 'Tất cả' : stockFilter === 'ok' ? 'Đủ hàng' : stockFilter === 'low' ? 'Sắp hết' : 'Hết hàng'}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenStockFilterDropdown ? 'rotate-180 text-blue-600' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenStockFilterDropdown && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsOpenStockFilterDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN TRẠNG THÁI</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {[
                      { key: 'all', label: 'Tất cả trạng thái' },
                      { key: 'ok', label: 'Đủ hàng' },
                      { key: 'low', label: 'Sắp hết' },
                      { key: 'out', label: 'Hết hàng' },
                    ].map((f) => {
                      const isSelected = stockFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => {
                            setStockFilter(f.key);
                            setIsOpenStockFilterDropdown(false);
                          }}
                          className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-all flex items-center justify-between active:scale-95 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-black'
                              : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                          }`}
                        >
                          <span>{f.label}</span>
                          {isSelected && <span className="material-symbols-outlined text-base">check_circle</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dropdown Danh mục */}
          <div className="relative w-1/2 lg:w-56 xl:w-64 font-inter">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isOpenCategoryDropdown}
              aria-label={`Lọc theo danh mục: ${selectedCategory === '' ? 'Tất cả danh mục' : selectedCategory}`}
              onClick={() => {
                setIsOpenCategoryDropdown(!isOpenCategoryDropdown);
                setIsOpenStockFilterDropdown(false);
              }}
              className="w-full bg-slate-50 border-2 border-slate-200 hover:border-[#00288E] transition-[border-color,background-color,box-shadow] rounded-xl px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">category</span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate">
                  {selectedCategory === '' ? 'Tất cả danh mục' : selectedCategory}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenCategoryDropdown ? 'rotate-180 text-blue-600' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenCategoryDropdown && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => {
                    setIsOpenCategoryDropdown(false);
                    setCategorySearchQuery('');
                  }}
                />
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-[400px] bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col max-h-[380px] animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN DANH MỤC</span>
                    <div className="relative w-40 sm:w-48 group">
                      <input
                        type="text"
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        placeholder="Tìm nhanh..."
                        className="w-full bg-slate-100 border border-slate-200 text-[10px] sm:text-xs font-bold rounded-xl pl-8 pr-6 py-2 outline-none focus:bg-white focus:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 transition-[border-color,background-color] text-slate-700 placeholder:text-slate-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-bold">search</span>
                      {categorySearchQuery && (
                        <button
                          type="button"
                          aria-label="Xóa tìm kiếm"
                          onClick={(e) => { e.stopPropagation(); setCategorySearchQuery(''); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
                        >
                          <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">close</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-y-auto p-4 flex-1 scrollbar-none max-h-[190px]">
                    {(() => {
                      const cq = categorySearchQuery.trim().toLowerCase();
                      const options = ['Tất cả', ...categories.map(c => c.categoryName || c.name || '').filter(Boolean)].filter(name => name.toLowerCase().includes(cq));
                      if (options.length === 0) {
                        return (
                          <div className="py-8 text-center text-xs font-bold text-slate-400 italic">
                            Không tìm thấy danh mục
                          </div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {options.map((option) => {
                            const isSelected = (option === 'Tất cả' && selectedCategory === '') || selectedCategory === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                title={option}
                                onClick={() => {
                                  setSelectedCategory(option === 'Tất cả' ? '' : option);
                                  setIsOpenCategoryDropdown(false);
                                  setCategorySearchQuery('');
                                }}
                                className={`px-3 py-3.5 rounded-2xl text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center min-h-[48px] leading-tight active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-black'
                                    : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                                }`}
                              >
                                <span className="truncate">{option === 'Tất cả' ? 'Tất cả danh mục' : option}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="wh-card wh-card-table flex-1 flex flex-col overflow-hidden min-h-0 max-sm:h-[610px] max-sm:flex-none">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-200 mb-3">search_off</span>
            <p className="text-sm font-bold text-gray-400">Không tìm thấy sản phẩm nào</p>
          </div>
        ) : (
          <>
            {/* View A: TABLE VIEW (Chỉ hiển thị trên Desktop >= 1280px) */}
            <div className="hidden xl:block overflow-x-auto overflow-y-auto flex-1 scrollbar-none" style={{ scrollbarGutter: 'stable' }}>
              <table className="wh-responsive-table w-full table-fixed text-left border-collapse min-w-[1000px]">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('sku')}
                        className="font-black uppercase tracking-widest text-left cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                        aria-label="Sắp xếp theo mã sản phẩm"
                      >
                        Mã SP
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('sku')}</span>
                      </button>
                    </th>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 w-[20%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="font-black uppercase tracking-widest text-left cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                        aria-label="Sắp xếp theo tên sản phẩm"
                      >
                        Tên sản phẩm
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('name')}</span>
                      </button>
                    </th>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 w-[12%] text-center" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('category')}
                        className="font-black uppercase tracking-widest text-center cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center justify-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 outline-none w-full"
                        aria-label="Sắp xếp theo danh mục"
                      >
                        <span className="w-[14px] shrink-0" aria-hidden="true"></span>
                        <span>Danh mục</span>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('category')}</span>
                      </button>
                    </th>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[7%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('unit')}
                        className="font-black uppercase tracking-widest text-center cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center justify-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none w-full"
                        aria-label="Sắp xếp theo đơn vị tính"
                      >
                        ĐVT
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('unit')}</span>
                      </button>
                    </th>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-right w-[9%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('stockQuantity')}
                        className="font-black uppercase tracking-widest text-right cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center justify-end gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none w-full"
                        aria-label="Sắp xếp theo số lượng tồn kho"
                      >
                        Tồn kho
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('stockQuantity')}</span>
                      </button>
                    </th>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-right w-[9%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('minStock')}
                        className="font-black uppercase tracking-widest text-right cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center justify-end gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none w-full"
                        aria-label="Sắp xếp theo số lượng tồn tối thiểu"
                      >
                        Tối thiểu
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('minStock')}</span>
                      </button>
                    </th>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-right w-[11%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('unitPrice')}
                        className="font-black uppercase tracking-widest text-right cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center justify-end gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none w-full"
                        aria-label="Sắp xếp theo đơn giá"
                      >
                        Đơn giá
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('unitPrice')}</span>
                      </button>
                    </th>
                    <th className="font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-right w-[11%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('stockValue')}
                        className="font-black uppercase tracking-widest text-right cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center justify-end gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none w-full"
                        aria-label="Sắp xếp theo tổng giá trị tồn kho"
                      >
                        Giá trị tồn
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('stockValue')}</span>
                      </button>
                    </th>
                    <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[9%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider">
                          {product.sku}
                        </span>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <p className="font-black text-slate-900 uppercase tracking-tight" style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{product.name}</p>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center justify-center">
                          <span className="bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter"
                                style={{ fontSize: 'clamp(9px, 0.8vw, 10px)', padding: 'clamp(3px, 0.5vw, 5px) clamp(8px, 1vw, 14px)' }}>
                            {product.category}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-bold text-slate-400" style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>{product.unit}</span>
                      </td>
                      <td className="p-4 sm:p-6 text-right" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className={`font-black tabular-nums ${product.stockQuantity <= product.minStock ? 'text-red-500' : 'text-slate-900'}`} style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                          {product.stockQuantity.toLocaleString('vi-VN')}
                        </span>
                      </td>
                      <td className="p-4 sm:p-6 text-right" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-bold text-slate-400 tabular-nums" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>{product.minStock}</span>
                      </td>
                      <td className="p-4 sm:p-6 text-right" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-bold text-slate-500 tabular-nums whitespace-nowrap" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>{formatCurrency(product.unitPrice)}</span>
                      </td>
                      <td className="p-4 sm:p-6 text-right" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className="font-black text-slate-900 tabular-nums whitespace-nowrap" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>{formatCurrency(product.stockQuantity * product.unitPrice)}</span>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        {getStockBadge(product)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* View B: CARD LIST VIEW (Tối ưu hóa cho Mobile & iPad < 1280px) */}
            <div className="block xl:hidden overflow-auto max-sm:h-[550px] max-sm:overflow-y-auto flex-1 p-4 bg-slate-50/50 scrollbar-none">
              {/* Thanh sắp xếp thông minh khi ở chế độ card */}
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sắp xếp theo</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: 'sku', label: 'Mã SP' },
                    { key: 'name', label: 'Tên SP' },
                    { key: 'category', label: 'Danh mục' },
                    { key: 'stockQuantity', label: 'Tồn kho' },
                    { key: 'unitPrice', label: 'Đơn giá' },
                    { key: 'stockValue', label: 'Giá trị' }
                  ].map(item => {
                    const isSelected = sortConfig.key === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleSort(item.key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${
                          isSelected 
                            ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/10' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.label}
                        {isSelected && (
                          <span className="material-symbols-outlined text-[11px] font-bold" aria-hidden="true">
                            {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedProducts.map((product) => (
                  <div 
                    key={product.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#00288E] hover:shadow-xl transition-all duration-300 flex flex-col justify-between h-full group"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase shadow-sm shrink-0 border border-slate-100">
                        <span className="material-symbols-outlined text-lg">inventory</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-[#00288E] transition-colors">
                          {product.name}
                        </div>
                        <div className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mt-1">
                          SKU: {product.sku}
                        </div>
                        <div className="mt-2">
                          <span className="inline-block bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter text-[10px] px-2.5 py-1">
                            {product.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-auto flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tồn kho</span>
                        <div className="flex items-center gap-0.5">
                          <span className={`font-black ${product.stockQuantity <= product.minStock ? 'text-red-500' : 'text-slate-800'}`}>
                            {product.stockQuantity.toLocaleString('vi-VN')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">/{product.unit}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tối thiểu</span>
                        <span className="font-bold text-slate-500 tabular-nums">{product.minStock}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Đơn giá</span>
                        <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(product.unitPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Giá trị tồn</span>
                        <span className="font-black text-[#00288E] tabular-nums">{formatCurrency(product.stockQuantity * product.unitPrice)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái</span>
                        {getStockBadge(product)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-slate-50/50">
              <span>
                Hiển thị {filteredProducts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} / {filteredProducts.length} sản phẩm
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    aria-label="Trang trước"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-[background-color,border-color] uppercase tracking-widest text-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                        currentPage === p
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                          : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    aria-label="Trang tiếp theo"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-[background-color,border-color] uppercase tracking-widest text-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryReport;
