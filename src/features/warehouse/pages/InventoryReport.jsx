import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import warehouseService, { formatCurrency } from '../services/warehouseService';

const InventoryReport = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [showToast, setShowToast] = useState(false);

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
      if (!p.name.toLowerCase().includes(s) && !p.sku.toLowerCase().includes(s)) return false;
    }
    if (stockFilter === 'low') return p.stockQuantity > 0 && p.stockQuantity <= p.minStock;
    if (stockFilter === 'out') return p.stockQuantity === 0;
    if (stockFilter === 'ok') return p.stockQuantity > p.minStock;
    return true;
  });

  const totalValue = filteredProducts.reduce((sum, p) => sum + p.stockQuantity * p.unitPrice, 0);
  const totalItems = filteredProducts.reduce((sum, p) => sum + p.stockQuantity, 0);

  const getStockBadge = (product) => {
    if (product.stockQuantity === 0) return <span className="wh-badge out-of-stock"><span className="wh-badge-dot" />Hết hàng</span>;
    if (product.stockQuantity <= product.minStock) return <span className="wh-badge low-stock"><span className="wh-badge-dot" />Sắp hết</span>;
    return <span className="wh-badge in-stock"><span className="wh-badge-dot" />Đủ hàng</span>;
  };

  const handleExportExcel = () => {
    const data = filteredProducts.map(p => ({
      'Mã SP': p.sku,
      'Tên sản phẩm': p.name,
      'Danh mục': p.category,
      'ĐVT': p.unit,
      'Tồn kho': p.stockQuantity,
      'Tối thiểu': p.minStock,
      'Đơn giá': p.unitPrice,
      'Giá trị tồn': p.stockQuantity * p.unitPrice,
      'Trạng thái': p.stockQuantity === 0 ? 'Hết hàng' : p.stockQuantity <= p.minStock ? 'Sắp hết' : 'Đủ hàng',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo tồn kho');

    // Auto column width
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(r => String(r[key]).length)) + 2
    }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Bao_cao_ton_kho_${new Date().toISOString().substring(0, 10)}.xlsx`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-xs font-extrabold text-gray-400 uppercase tracking-[0.2em]">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex-1 flex flex-col gap-5 min-h-0">
      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 wh-animate-scale-in">
          <span className="material-symbols-outlined text-lg">download_done</span>
          <span className="text-sm font-bold">Đã xuất file Excel thành công!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Báo cáo tồn kho</h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">Tổng hợp số lượng và giá trị hàng tồn kho</p>
        </div>
        <button onClick={handleExportExcel} className="wh-btn-primary">
          <span className="material-symbols-outlined text-lg">download</span>
          Xuất Excel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="wh-stat-card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tổng sản phẩm</p>
          <p className="text-xl font-extrabold text-gray-900">{filteredProducts.length}</p>
        </div>
        <div className="wh-stat-card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Tổng SL tồn</p>
          <p className="text-xl font-extrabold text-gray-900">{totalItems.toLocaleString('vi-VN')}</p>
        </div>
        <div className="wh-stat-card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Giá trị tồn kho</p>
          <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(totalValue)}</p>
        </div>
        <div className="wh-stat-card">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cảnh báo</p>
          <p className="text-xl font-extrabold text-amber-500">
            {products.filter(p => p.stockQuantity <= p.minStock).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="wh-filter-tabs flex-1 sm:flex-initial">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'ok', label: 'Đủ hàng' },
            { key: 'low', label: 'Sắp hết' },
            { key: 'out', label: 'Hết hàng' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStockFilter(f.key)}
              className={`wh-filter-tab ${stockFilter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="wh-select sm:w-52"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <div className="relative sm:w-72">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 material-symbols-outlined text-lg">search</span>
          <input
            type="text"
            placeholder="Tìm mã SP, tên sản phẩm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="wh-input pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="wh-card flex-1 flex flex-col overflow-hidden min-h-0">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-6xl text-gray-200 mb-3">search_off</span>
            <p className="text-sm font-bold text-gray-400">Không tìm thấy sản phẩm nào</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
            <table className="wh-table">
              <thead>
                <tr>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Mã SP</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Tên sản phẩm</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Danh mục</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">ĐVT</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Tồn kho</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Tối thiểu</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Đơn giá</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10 text-right">Giá trị tồn</th>
                  <th className="sticky top-0 bg-[#F8FAFC] z-10">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={product.stockQuantity <= product.minStock ? 'bg-amber-50/50' : ''}>
                    <td>
                      <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider">
                        {product.sku}
                      </span>
                    </td>
                    <td className="font-semibold">{product.name}</td>
                    <td className="text-gray-500">{product.category}</td>
                    <td className="text-gray-400">{product.unit}</td>
                    <td className={`text-right font-bold ${product.stockQuantity <= product.minStock ? 'text-red-500' : 'text-gray-900'}`}>
                      {product.stockQuantity.toLocaleString('vi-VN')}
                    </td>
                    <td className="text-right text-gray-400">{product.minStock}</td>
                    <td className="text-right text-gray-500 whitespace-nowrap">{formatCurrency(product.unitPrice)}</td>
                    <td className="text-right font-bold whitespace-nowrap">{formatCurrency(product.stockQuantity * product.unitPrice)}</td>
                    <td>{getStockBadge(product)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="sticky bottom-0 bg-[#F8FAFC] z-10 border-t-2 border-gray-200">
                <tr>
                  <td colSpan={4} className="font-extrabold text-gray-900 uppercase text-xs tracking-wider">Tổng cộng</td>
                  <td className="text-right font-extrabold text-gray-900">{totalItems.toLocaleString('vi-VN')}</td>
                  <td></td>
                  <td></td>
                  <td className="text-right font-extrabold text-emerald-600 text-base whitespace-nowrap">{formatCurrency(totalValue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryReport;
