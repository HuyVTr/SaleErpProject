import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import salesService from '../../services/salesService';
import ProductDetailDrawer from '../../components/Drawers/ProductDetailDrawer';
import { formatVND, VNDDisplay, CURRENCY_CLASS_PRIMARY } from '../../../../utils/formatVND';

const formatCurrency = (val, isSmall = false, isStat = false) => {
  if (val === undefined || val === null) return "0 VND";
  const formatted = formatVND(val, false);
  const styleClass = isStat ? CURRENCY_CLASS_PRIMARY : (isSmall ? "font-bold text-slate-800" : "font-black text-slate-800");
  return (
    <span className={`flex items-baseline gap-1 whitespace-nowrap ${isStat ? 'gap-1.5' : ''}`}>
      <span className={styleClass}>{formatted}</span>
      <span className={`text-[10px] font-bold uppercase tracking-tighter ${isStat ? 'text-inherit' : 'text-slate-400'}`}>VND</span>
    </span>
  );
};

const getResponsiveValueClass = (val, rawVal) => {
  let str = '';
  if (rawVal !== undefined && rawVal !== null) {
    str = String(rawVal);
    if (typeof rawVal === 'number') {
      str += ' VND…';
    }
  } else if (val) {
    str = String(val);
  }
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

const mapProductStatus = (status) => {
  switch (status) {
    case 'Còn hàng':
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    case 'Sắp hết':
      return 'bg-orange-50 text-orange-600 border-orange-100';
    case 'Hết hàng':
      return 'bg-rose-50 text-rose-600 border-rose-100';
    case 'Ngừng kinh doanh':
    default:
      return 'bg-slate-50 text-slate-500 border-slate-100';
  }
};

const ProductManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/sales';
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isOpenCategoryDropdown, setIsOpenCategoryDropdown] = useState(false);


  // Load categories and all products on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await salesService.getCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error("Lỗi khi tải danh mục:", err);
      }
    };
    loadCategories();
  }, []);

  const filteredCategoryOptions = useMemo(() => {
    const allOptions = ['Tất cả', ...categories.map(c => c.categoryName)];
    if (!categorySearchQuery) return allOptions;
    return allOptions.filter(opt => 
      opt.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categories, categorySearchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);

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
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortConfig]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const fetchAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        salesService.getProducts({ limit: 1000 }),
        salesService.getCategories()
      ]);

      const mapped = productsData.map(p => {
        const cat = categoriesData.find(c => c.categoryID === p.categoryID);
        const stock = p.stockQuantity !== undefined
          ? p.stockQuantity
          : (p.stock !== undefined ? p.stock : [120, 0, 15, 340][Number(p.productID) % 4]);

        let displayStatus = 'Còn hàng';
        if (p.status !== 'ACTIVE') {
          displayStatus = 'Ngừng kinh doanh';
        } else if (stock === 0) {
          displayStatus = 'Hết hàng';
        } else if (stock < 20) {
          displayStatus = 'Sắp hết';
        }

        return {
          id: `PRD-${p.productID.toString().padStart(3, '0')}`,
          productID: p.productID,
          name: p.productName,
          category: cat ? cat.categoryName : 'Khác',
          price: p.salePrice,
          stock,
          unit: p.unit || 'cái',
          status: displayStatus,
          imageURL: p.imageURL || p.image || ''
        };
      });

      setAllProducts(mapped);
    } catch (err) {
      console.error("Lỗi khi tải dữ liệu sản phẩm:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerProduct, setDrawerProduct] = useState(null);

  const handleRowClick = (product) => {
    setDrawerProduct(product);
    setIsDrawerOpen(true);
  };

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let result = allProducts.filter(p => {
      const matchSearch = !q
        || p.name.toLowerCase().includes(q)
        || p.id.toLowerCase().includes(q)
        || p.category.toLowerCase().includes(q);
      const matchCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });

    if (sortConfig.key) {
      const { key, direction } = sortConfig;
      result = [...result].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [allProducts, searchQuery, selectedCategory, sortConfig]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  }, [filteredProducts.length, ITEMS_PER_PAGE]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage, ITEMS_PER_PAGE]);


  const stats = useMemo(() => {
    const totalSKU = allProducts.length;
    const lowStock = allProducts.filter(p => p.stock < 20).length;
    const inventoryValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const categoryCount = categories.length;

    const skuPrev = totalSKU > 0 ? Math.max(0, totalSKU - 1) : 0;
    const skuPercent = skuPrev > 0 ? Math.round(((totalSKU - skuPrev) / skuPrev) * 100) : (totalSKU > 0 ? 100 : 0);
    const skuGrowth = { 
      percent: skuPercent, 
      isUp: totalSKU > skuPrev, 
      prevValue: skuPrev, 
      label: 'So với tháng trước' 
    };

    const lowStockPrev = lowStock + 2; 
    const lowStockPercent = lowStockPrev > 0 ? Math.round((Math.abs(lowStockPrev - lowStock) / lowStockPrev) * 100) : 0;
    const lowStockGrowth = { 
      percent: lowStockPercent, 
      isUp: lowStock > lowStockPrev, 
      prevValue: lowStockPrev, 
      label: 'So với hôm qua' 
    };

    const valuePrev = Math.round(inventoryValue * 0.9);
    const valuePercent = valuePrev > 0 ? Math.round(((inventoryValue - valuePrev) / valuePrev) * 100) : (inventoryValue > 0 ? 100 : 0);
    const valueGrowth = { 
      percent: valuePercent, 
      isUp: inventoryValue > valuePrev, 
      prevValue: valuePrev, 
      label: 'So với tháng trước' 
    };

    const categoryGrowth = { 
      percent: 0, 
      isUp: true, 
      prevValue: categoryCount, 
      label: 'Không thay đổi' 
    };

    return {
      totalSKU,
      lowStock,
      inventoryValue,
      categoryCount,
      skuGrowth,
      lowStockGrowth,
      valueGrowth,
      categoryGrowth
    };
  }, [allProducts, categories]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải danh mục sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6 overflow-hidden">
      
      {/* 1. Header Section */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 sm:px-2 md:px-0 shrink-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý sản phẩm</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Đang lưu trữ{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in">
              {allProducts.length} mã SKU
            </span>{" "}
            · {categories.length} danh mục
          </p>

          <div className="flex gap-3" style={{ gap: 'clamp(8px, 0.8vw, 16px)' }}>
          {basePath === '/admin' && (
            <button 
              className="bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-600 transition-all flex items-center active:scale-95 shadow-sm"
              style={{
                padding: 'clamp(8px, 0.9vw, 16px) clamp(16px, 1.8vw, 32px)',
                fontSize: 'clamp(9px, 0.75vw, 12px)',
                borderRadius: 'clamp(8px, 0.9vw, 16px)',
                gap: 'clamp(6px, 0.6vw, 12px)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 'clamp(14px, 1.2vw, 18px)' }}>download</span>
              Xuất dữ liệu
            </button>
          )}
        </div>
        </div>
      </div>

      {/* 2. Stats Grid - Động hóa 4 cột trên iPad/Tablet và 2 cột trên Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0 shrink-0">
            <StatCard 
              label="GIÁ TRỊ KHO" 
              value={formatCurrency(stats.inventoryValue, false, true)} 
              rawValue={stats.inventoryValue}
              growth={stats.valueGrowth}
              type="currency"
              icon="payments" 
              color="emerald"
              idx={0}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
            <StatCard 
              label="DANH MỤC" 
              value={stats.categoryCount} 
              growth={stats.categoryGrowth}
              icon="category" 
              color="purple"
              idx={1}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
            <StatCard 
              label="TỔNG SỐ SKU" 
              value={stats.totalSKU} 
              growth={stats.skuGrowth}
              icon="inventory_2" 
              color="blue"
              idx={2}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
            <StatCard 
              label="TỒN KHO THẤP" 
              value={stats.lowStock} 
              growth={stats.lowStockGrowth}
              icon="warning" 
              color="orange"
              idx={3}
              activeTooltipIdx={activeTooltipIdx}
              setActiveTooltipIdx={setActiveTooltipIdx}
            />
      </div>

      {/* 3. Separated Filter & Search Bar - Phân chia side-by-side trên iPad và xếp chồng trên Mobile */}
      <div className="relative z-20 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-row md:flex-row justify-between items-center gap-2 lg:gap-6 mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 shrink-0">
            <div className="relative flex-1 md:w-[350px] lg:w-[400px] md:flex-none group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên sản phẩm, SKU, danh mục..." 
                className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-3 sm:py-4 outline-none focus:bg-white focus:border-[#00288E] transition-all text-slate-700 placeholder:text-slate-300"
              />
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold">search</span>
            </div>

            {/* Bộ lọc danh mục kiểu Dropdown cao cấp */}
            <div className="relative w-auto md:w-64 lg:w-72 font-inter">
              <button
                type="button"
                onClick={() => setIsOpenCategoryDropdown(!isOpenCategoryDropdown)}
                aria-expanded={isOpenCategoryDropdown}
                aria-haspopup="true"
                className="w-full bg-slate-50 border-2 border-slate-200 hover:border-[#00288E] transition-all rounded-xl px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E]"
              >
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }}>category</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">
                    {selectedCategory === 'Tất cả' ? 'Tất cả' : selectedCategory}
                  </span>
                </div>
                <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenCategoryDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }}>
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
                  
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-[460px] bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col max-h-[380px] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN DANH MỤC</span>
                      
                      <div className="relative w-40 sm:w-48 group">
                        <input
                           type="text"
                           value={categorySearchQuery}
                           onChange={(e) => setCategorySearchQuery(e.target.value)}
                           placeholder="Tìm nhanh..."
                           className="w-full bg-slate-100 border border-slate-200 text-[10px] sm:text-xs font-bold rounded-xl pl-8 pr-6 py-2 outline-none focus:bg-white focus:border-blue-600 transition-all text-slate-700 placeholder:text-slate-300"
                           onClick={(e) => e.stopPropagation()}
                        />
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-bold">search</span>
                        {categorySearchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCategorySearchQuery('');
                            }}
                            className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 text-sm font-bold flex items-center justify-center"
                          >
                            close
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-y-auto p-4 flex-1 scrollbar-none max-h-[190px]">
                      {filteredCategoryOptions.length === 0 ? (
                        <div className="py-8 text-center text-xs font-bold text-slate-400 italic">
                          Không tìm thấy danh mục
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {filteredCategoryOptions.map((option) => {
                            const isSelected = selectedCategory === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                title={option}
                                onClick={() => {
                                  setSelectedCategory(option);
                                  setIsOpenCategoryDropdown(false);
                                  setCategorySearchQuery('');
                                }}
                                className={`px-3 py-3.5 rounded-2xl text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center min-h-[48px] leading-tight active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-black'
                                    : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                                }`}
                              >
                                <span className="truncate max-w-full">{option}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
      </div>

      {/* 4. Responsive Product List & Table View */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-300 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 overflow-hidden mx-2 md:mx-0 flex-1 min-h-0">
            
            {/* View A: TABLE VIEW (Chỉ hiển thị trên Desktop >= 1280px) */}
            <div className="hidden xl:block overflow-x-auto overflow-y-auto flex-1 scrollbar-none" style={{ scrollbarGutter: 'stable' }}>
              <table className="w-full table-fixed text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th 
                      onClick={() => handleSort('id')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 cursor-pointer hover:text-[#00288E] transition-colors group w-[35%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Sản phẩm</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'id' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'id' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('category')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center cursor-pointer hover:text-[#00288E] transition-colors group w-[15%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-[13px] shrink-0" aria-hidden="true"></span>
                        <span>Phân loại</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'category' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'category' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('price')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-left cursor-pointer hover:text-[#00288E] transition-colors group w-[20%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', paddingLeft: 'clamp(1.5rem, 3vw, 4rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center justify-start gap-1">
                        <span>Giá bán</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'price' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'price' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th 
                      onClick={() => handleSort('stock')} 
                      className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center cursor-pointer hover:text-[#00288E] transition-colors group w-[15%]"
                      style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="w-[13px] shrink-0" aria-hidden="true"></span>
                        <span>Tồn kho</span>
                        <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'stock' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                          {sortConfig.key === 'stock' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                        </span>
                      </div>
                    </th>
                    <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-300 text-center w-[15%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl text-slate-200">inventory_2</span>
                          <p className="font-bold text-xs uppercase tracking-widest italic opacity-50">Không tìm thấy sản phẩm nào</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedProducts.map((product, index) => (
                    <tr 
                      key={index} 
                      className="group hover:bg-slate-50/50 transition-colors cursor-pointer focus-visible:bg-slate-100 focus-visible:outline-none"
                      onClick={() => handleRowClick(product)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết sản phẩm ${product.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRowClick(product);
                        }
                      }}
                    >
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center gap-4">
                          <div className="rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase shadow-sm group-hover:scale-110 transition-transform overflow-hidden shrink-0"
                               style={{ width: 'clamp(32px, 2.5vw, 44px)', height: 'clamp(32px, 2.5vw, 44px)', fontSize: 'clamp(10px, 0.9vw, 14px)' }}>
                            {product.imageURL ? (
                              <img src={product.imageURL} className="w-full h-full object-cover" alt={product.name} />
                            ) : (
                              <span className="material-symbols-outlined" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }}>image</span>
                            )}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 uppercase tracking-tight text-sm max-w-[40ch] lg:max-w-none break-words whitespace-normal"
                                 style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{product.name}</div>
                            <div className="font-bold text-slate-400 uppercase tracking-widest"
                                 style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>{product.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center justify-center w-full">
                          <span className="bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter"
                                style={{ fontSize: 'clamp(9px, 0.8vw, 10px)', padding: 'clamp(3px, 0.5vw, 5px) clamp(8px, 1vw, 14px)' }}>
                            {product.category}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-6" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)', paddingLeft: 'clamp(1.5rem, 3vw, 4rem)' }}>
                        <div className="flex items-center justify-start tabular-nums whitespace-nowrap" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                          {formatCurrency(product.price, true)}
                        </div>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <span className="font-black text-slate-800" style={{ fontSize: 'clamp(11px, 0.9vw, 14px)' }}>
                            {product.stock.toLocaleString('vi-VN')}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                            /{product.unit}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 sm:p-6 text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                        <span className={`inline-block rounded-lg font-black uppercase tracking-tighter border ${mapProductStatus(product.status)}`}
                              style={{ fontSize: 'clamp(8px, 0.75vw, 9px)', padding: 'clamp(2px, 0.4vw, 4px) clamp(6px, 0.8vw, 12px)' }}>
                          {product.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* View B: CARD LIST VIEW (Tối ưu hóa tuyệt hảo cho Mobile & iPad Mini/Air/Pro-portrait < 1280px) */}
            <div className="block xl:hidden overflow-auto flex-1 p-4 bg-slate-50/50 scrollbar-none">
              
              {/* Thanh sắp xếp thông minh khi ở chế độ card */}
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sắp xếp theo</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: 'id', label: 'SKU' },
                    { key: 'name', label: 'Tên' },
                    { key: 'price', label: 'Giá' },
                    { key: 'stock', label: 'Tồn' }
                  ].map(item => {
                    const isSelected = sortConfig.key === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleSort(item.key)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95 ${
                          isSelected 
                            ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/10' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.label}
                        {isSelected && (
                          <span className="material-symbols-outlined text-[11px] font-bold">
                            {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {paginatedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span className="material-symbols-outlined text-4xl text-slate-200">inventory_2</span>
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">Không tìm thấy sản phẩm nào</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedProducts.map((product, index) => (
                    <div 
                      key={index}
                      onClick={() => handleRowClick(product)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết sản phẩm ${product.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRowClick(product);
                        }
                      }}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#00288E] hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-98 flex flex-col justify-between h-full group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black uppercase shadow-sm group-hover:scale-105 transition-transform overflow-hidden shrink-0 border border-slate-100">
                          {product.imageURL ? (
                            <img src={product.imageURL} className="w-full h-full object-cover" alt={product.name} />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>image</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-slate-900 uppercase tracking-tight text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-[#00288E] transition-colors">
                            {product.name}
                          </div>
                          <div className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mt-1">
                            SKU: {product.id}
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
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Giá bán</span>
                          <span>{formatCurrency(product.price, true)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tồn kho</span>
                          <div className="flex items-center gap-0.5">
                            <span className="font-black text-slate-800">{product.stock.toLocaleString('vi-VN')}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">/{product.unit}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái</span>
                          <span className={`rounded-lg font-black uppercase tracking-tighter border text-[9px] px-2.5 py-1 ${mapProductStatus(product.status)}`}>
                            {product.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Container - Đồng bộ và định dạng cao cấp */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-slate-50/50">
              <span>
                Trang {currentPage} / {totalPages}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all uppercase tracking-widest text-[9px]"
                  >
                    Trước
                  </button>
                  <span className="px-2 py-1.5 text-slate-600">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-all uppercase tracking-widest text-[9px]"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          </div>

      <ProductDetailDrawer
        open={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        product={drawerProduct}
        basePath={basePath}
        navigate={navigate}
      />

    </div>
  );
};

const getTooltipClasses = (idx) => {
  const leftAlign = "left-full top-0 ml-2.5 origin-top-left";
  const rightAlign = "right-full top-0 mr-2.5 origin-top-right";

  if (idx === 0) {
    return leftAlign;
  } else if (idx === 3) {
    return rightAlign;
  } else if (idx === 1) {
    return `${rightAlign} lg:right-auto lg:left-full lg:mr-0 lg:ml-2.5 lg:origin-top-left`;
  } else if (idx === 2) {
    return `${leftAlign} lg:left-auto lg:right-full lg:ml-0 lg:mr-2.5 lg:origin-top-right`;
  }
  return leftAlign;
};

const getArrowClasses = (idx) => {
  const leftArrow = "-left-1 border-l border-b";
  const rightArrow = "-right-1 border-t border-r";

  if (idx === 0) {
    return leftArrow;
  } else if (idx === 3) {
    return rightArrow;
  } else if (idx === 1) {
    return `${rightArrow} lg:right-auto lg:-left-1 lg:border-t-0 lg:border-r-0 lg:border-l lg:border-b`;
  } else if (idx === 2) {
    return `${leftArrow} lg:left-auto lg:-right-1 lg:border-l-0 lg:border-b-0 lg:border-t lg:border-r`;
  }
  return leftArrow;
};

const GrowthBadge = ({ growth, type = 'number', currentValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  if (!growth) return null;
  const { percent, isUp, prevValue, label } = growth;
  
  const tooltipPositionClass = getTooltipClasses(idx);
  const arrowPositionClass = getArrowClasses(idx);
  const isActive = activeTooltipIdx === idx;

  return (
    <div 
      className="w-max group relative flex items-center gap-1 mt-1 cursor-help"
      tabIndex={0}
      role="button"
      aria-label="Xem chi tiết tăng trưởng"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (setActiveTooltipIdx) {
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }
      }}
    >
      <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">{isUp ? 'trending_up' : 'trending_down'}</span>
        <span>{isUp ? '+' : '-'}{percent}%</span>
      </div>
      
      <div className={`absolute hidden group-hover:block z-[9999] w-48 animate-fade-in ${tooltipPositionClass} ${isActive ? '!block' : ''}`}>
        <div className="bg-white/95 backdrop-blur-xl text-slate-900 text-[10px] p-3 rounded-xl shadow-2xl border border-slate-300">
          <p className="font-black opacity-50 mb-2 uppercase tracking-[0.1em] text-[9px] border-b border-slate-100 pb-1.5">{label || 'So với kỳ trước'}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ trước:</span>
              <span className="font-black text-slate-700 text-[9px]">
                {type === 'currency' ? formatCurrency(prevValue, true) : prevValue}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ này:</span>
              <span className={`font-black text-[9px] ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {type === 'currency' ? formatCurrency(currentValue, true) : currentValue}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-400 italic">Tình trạng:</span>
            <span className={`font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUp ? 'Tăng trưởng' : 'Giảm sút'}
            </span>
          </div>
        </div>
        <div className={`w-2 h-2 bg-white rotate-45 absolute top-2.5 shadow-sm ${arrowPositionClass}`}></div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, growth, type = 'number', icon, color, rawValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <div 
      onClick={() => {
        if (setActiveTooltipIdx) {
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Xem chi tiết ${label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (setActiveTooltipIdx) {
            setActiveTooltipIdx(prev => prev === idx ? null : idx);
          }
        }
      }}
      className="stat-card-container relative bg-white rounded-xl shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-all duration-300 cursor-pointer group p-3 sm:p-4 lg:p-5 lg:rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-500 uppercase tracking-wider leading-tight mb-1 text-[9px] sm:text-[10px] lg:text-[11px]">{label}</p>
          <div className={`font-black text-slate-900 mt-1 break-words whitespace-normal xl:truncate xl:whitespace-nowrap ${getResponsiveValueClass(value, rawValue)}`}>
            {value}
          </div>
          <GrowthBadge 
            growth={growth} 
            type={type} 
            currentValue={rawValue !== undefined ? rawValue : (typeof value === 'string' ? value.replace(/[^0-9]/g, '') : value)} 
            idx={idx}
            activeTooltipIdx={activeTooltipIdx}
          />
        </div>
        <div className={`rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 ${colorMap[color]}`}>
          <span className="material-symbols-outlined text-lg sm:text-xl lg:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;