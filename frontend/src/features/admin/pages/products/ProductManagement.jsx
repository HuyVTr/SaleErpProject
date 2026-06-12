import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import dbData from '../../../../../db.json';
import ProductDetailDrawer from '../../../sales/components/Drawers/ProductDetailDrawer';

const getResponsiveValueStyle = (val) => {
  const str = String(val);
  const len = str.length;
  if (len <= 10) return { fontSize: 'clamp(14px, 1.25vw, 20px)' };
  if (len <= 15) return { fontSize: 'clamp(12px, 1.1vw, 16px)' };
  return { fontSize: 'clamp(11px, 0.95vw, 14px)' };
};

const getTooltipClasses = (idx) => {
  const leftAlign = "left-full top-0 ml-2.5 origin-top-left";
  const rightAlign = "right-full top-0 mr-2.5 origin-top-right";
  if (idx === 0) return leftAlign;
  if (idx === 3) return rightAlign;
  if (idx === 1) return `${rightAlign} lg:right-auto lg:left-full lg:mr-0 lg:ml-2.5 lg:origin-top-left`;
  if (idx === 2) return `${leftAlign} lg:left-auto lg:right-full lg:ml-0 lg:mr-2.5 lg:origin-top-right`;
  return leftAlign;
};

const getArrowClasses = (idx) => {
  const leftArrow = "-left-1 border-l border-b";
  const rightArrow = "-right-1 border-t border-r";
  if (idx === 0) return leftArrow;
  if (idx === 3) return rightArrow;
  if (idx === 1) return `${rightArrow} lg:right-auto lg:-left-1 lg:border-t-0 lg:border-r-0 lg:border-l lg:border-b`;
  if (idx === 2) return `${leftArrow} lg:left-auto lg:-right-1 lg:border-l-0 lg:border-b-0 lg:border-t lg:border-r`;
  return leftArrow;
};

const GrowthBadge = ({ growth, currentValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
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
      onClick={(e) => {
        e.stopPropagation();
        setActiveTooltipIdx(prev => prev === idx ? null : idx);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
    >
      <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">{isUp ? 'trending_up' : 'trending_down'}</span>
        <span>{isUp ? '+' : '-'}{percent}%</span>
      </div>

      {/* Tooltip */}
      <div className={`absolute hidden group-hover:block z-[9999] w-52 animate-fade-in ${tooltipPositionClass} ${isActive ? '!block' : ''}`}>
        <div className="bg-white/95 backdrop-blur-xl text-slate-900 text-[10px] p-3 rounded-xl shadow-2xl border border-slate-300">
          <p className="font-black opacity-50 mb-2 uppercase tracking-[0.1em] text-[9px] border-b border-slate-100 pb-1.5">{label}</p>
          <div className="space-y-1.5 font-inter">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ trước:</span>
              <span className="font-black text-slate-700">{prevValue}</span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ này:</span>
              <span className={`font-black ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>{currentValue}</span>
            </div>
          </div>
        </div>
        <div className={`w-2 h-2 bg-white rotate-45 absolute top-2.5 shadow-sm ${arrowPositionClass}`}></div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, rawValue, growth, icon, color, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        setActiveTooltipIdx(prev => prev === idx ? null : idx);
      }}
      tabIndex={0}
      role="button"
      aria-label={`Xem chi tiết ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
      className="stat-card-container relative bg-white rounded-xl shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-[border-color,box-shadow,transform,z-index] duration-300 cursor-pointer p-3 sm:p-4 lg:p-5 lg:rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-500 uppercase tracking-wider leading-tight mb-1" style={{ fontSize: 'clamp(9px, 0.8vw, 11px)' }}>{title}</p>
          <div className="mt-1 font-black text-slate-900 [font-variant-numeric:tabular-nums] break-words whitespace-normal xl:truncate xl:whitespace-nowrap" style={getResponsiveValueStyle(value)} title={value}>
            {value}
          </div>
          <GrowthBadge 
            growth={growth} 
            currentValue={rawValue !== undefined ? rawValue : value} 
            idx={idx} 
            activeTooltipIdx={activeTooltipIdx} 
            setActiveTooltipIdx={setActiveTooltipIdx}
          />
        </div>
        
        <div className={`rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 ${
          color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
          color === 'purple' ? 'bg-purple-50 text-purple-600' :
          color === 'blue' ? 'bg-blue-50 text-blue-600' :
          'bg-orange-50 text-orange-600'
        }`} aria-hidden="true">
          <span className="material-symbols-outlined text-lg sm:text-xl lg:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, color, onClick, title }) => (
  <button 
    onClick={onClick}
    className={`rounded-xl flex items-center justify-center transition-[background-color,transform] active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${color}`}
    style={{ width: 'clamp(28px, 2.5vw, 40px)', height: 'clamp(28px, 2.5vw, 40px)' }}
    title={title}
    aria-label={title}
  >
    <span className="material-symbols-outlined font-bold" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }} aria-hidden="true">{icon}</span>
  </button>
);

const getStatusStyle = (status) => {
  if (status === 'Còn hàng') return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (status === 'Sắp hết') return 'bg-orange-50 text-orange-700 border-orange-100';
  if (status === 'Hết hàng') return 'bg-rose-50 text-rose-700 border-rose-100';
  return 'bg-slate-50 text-slate-600 border-slate-100';
};

const formatPrice = (value) => {
  if (value === '-' || value === undefined || value === null) return '-';
  return value.toLocaleString('vi-VN') + ' ₫';
};

const normalizeProduct = (p, categories = []) => {
  const cat = categories.find(c => 
    String(c.categoryID || c.id) === String(p.categoryID) || 
    (c.categoryName || c.name || '').toLowerCase() === String(p.categoryName || p.category || '').toLowerCase()
  );
  
  const stock = p.stockQuantity !== undefined 
    ? p.stockQuantity 
    : (p.stock ?? p.quantity ?? p.inventory ?? 0);
  
  let displayStatus = 'Còn hàng';
  const rawStatus = String(p.status || '').toUpperCase();
  if (rawStatus === 'INACTIVE' || p.status === 'Ngừng kinh doanh') {
    displayStatus = 'Ngừng kinh doanh';
  } else if (rawStatus === 'OUT_OF_STOCK' || p.status === 'Hết hàng' || Number(stock) === 0) {
    displayStatus = 'Hết hàng';
  } else if (p.status === 'Sắp hết' || (Number(stock) > 0 && Number(stock) < 20)) {
    displayStatus = 'Sắp hết';
  } else if (rawStatus === 'ACTIVE' || p.status === 'Còn hàng') {
    displayStatus = 'Còn hàng';
  } else {
    displayStatus = p.status || 'Còn hàng';
  }

  const rawID = p.productID || p.id;
  const formattedID = isNaN(rawID) ? String(rawID) : `PRD-${String(rawID).padStart(3, '0')}`;

  return {
    id: formattedID,
    productID: rawID,
    name: p.productName || p.name || p.title || 'Sản phẩm',
    category: cat ? (cat.categoryName || cat.name) : 'Khác',
    price: p.salePrice || p.price || p.unitPrice || 0,
    unit: p.unit || 'Cái',
    imageURL: p.imageURL || p.image || '',
    stock,
    status: displayStatus
  };
};

const ProductManagement = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [categoriesList, setCategoriesList] = useState(['Tất cả']);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);
  const [isOpenFilterDropdown, setIsOpenFilterDropdown] = useState(false);
  const filterDropdownRef = React.useRef(null);

  // Modal popup state
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'warning' | 'error' | 'confirm' | 'blocked'
    onConfirm: null,
    detail: null // Optional additional detail text
  });

  const showModal = (title, message, type = 'success', onConfirm = null, detail = null) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm, detail });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const filteredCategoryOptions = useMemo(() => {
    if (!categorySearchQuery) return categoriesList;
    return categoriesList.filter(opt => 
      opt.toLowerCase().includes(categorySearchQuery.toLowerCase())
    );
  }, [categoriesList, categorySearchQuery]);

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewDetail = (product) => {
    setSelectedProduct(product);
    setDrawerOpen(true);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.stat-card-container')) {
        setActiveTooltipIdx(null);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsOpenFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        adminService.getProducts(),
        adminService.getCategories()
      ]);
      const categoriesData = Array.isArray(catRes) ? catRes : [];
      setProducts(Array.isArray(prodRes) ? prodRes.map(p => normalizeProduct(p, categoriesData)) : []);
      const names = categoriesData.map(c => c.categoryName || c.name || c.title).filter(Boolean);
      setCategoriesList(['Tất cả', ...names]);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });

  const extractIdNumber = (idVal) => {
    if (typeof idVal === 'number') return idVal;
    if (!idVal) return 0;
    const match = idVal.toString().match(/\d+/g);
    if (match) {
      return parseInt(match[match.length - 1], 10);
    }
    return 0;
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = (id) => {
    // Chuẩn hóa productID về dạng số
    const cleanId = Number(String(id).replace('PRD-', '').replace('PROD-', '').replace(/^0+/, ''));
    const productObj = products.find(p => String(p.id) === String(id));
    const productName = productObj ? productObj.name : id;

    // Lấy đơn hàng và orderItems từ db.json kết hợp localStorage (mock)
    const allOrders = dbData.orders || [];
    const allOrderItems = dbData.orderItems || [];

    // Trạng thái chặn xóa: đơn hàng chưa hoàn thành
    const blockedStatuses = ['PENDING', 'PROCESSING', 'SHIPPING', 'Chờ xử lý', 'Đang giao'];

    // Tìm các đơn hàng có trạng thái chặn mà chứa sản phẩm này
    const blockedOrderIds = allOrderItems
      .filter(item => Number(item.productID) === cleanId)
      .map(item => item.orderID);

    const blockedOrders = allOrders.filter(order =>
      blockedOrderIds.includes(order.orderID) &&
      blockedStatuses.some(s => String(order.orderStatus || '').toUpperCase().includes(s.toUpperCase()))
    );

    if (blockedOrders.length > 0) {
      const orderList = blockedOrders.map(o => `#${o.orderID} (${o.orderStatus})`).join(', ');
      return showModal(
        'Không thể xóa sản phẩm',
        `Sản phẩm "${productName}" đang xuất hiện trong ${blockedOrders.length} đơn hàng chưa hoàn thành. Vui lòng xử lý các đơn hàng liên quan trước khi xóa.`,
        'blocked',
        null,
        `Đơn hàng liên quan: ${orderList}`
      );
    }

    // Hiển thị modal xác nhận xóa
    showModal(
      'Xác nhận xóa sản phẩm',
      `Bạn chuẩn bị xóa vĩnh viễn sản phẩm "${productName}" khỏi hệ thống. Hành động này không thể hoàn tác.`,
      'confirm',
      () => {
        adminService.deleteProduct(id)
          .then(() => {
            setProducts(prev => prev.filter((product) => String(product.id) !== String(id)));
            showModal(
              'Đã xóa thành công',
              `Sản phẩm "${productName}" đã được xóa vĩnh viễn khỏi hệ thống.`,
              'success'
            );
          })
          .catch((err) => {
            console.error('Delete product failed', err);
            showModal('Xóa thất bại', 'Có lỗi xảy ra trong quá trình kết nối máy chủ. Vui lòng thử lại.', 'error');
          });
      }
    );
  };

  const handleEdit = (id) => {
    // Chuẩn hóa productID về dạng số
    const cleanId = Number(String(id).replace('PRD-', '').replace('PROD-', '').replace(/^0+/, ''));
    const productObj = products.find(p => String(p.id) === String(id));
    const productName = productObj ? productObj.name : id;

    // Lấy đơn hàng và orderItems từ db.json
    const allOrders = dbData.orders || [];
    const allOrderItems = dbData.orderItems || [];

    // Trạng thái cần cảnh báo: đơn hàng chưa hoàn thành
    const warnStatuses = ['PENDING', 'PROCESSING', 'SHIPPING', 'Chờ xử lý', 'Đang giao'];

    // Tìm các đơn hàng chưa hoàn thành có chứa sản phẩm này
    const relatedOrderIds = allOrderItems
      .filter(item => Number(item.productID) === cleanId)
      .map(item => item.orderID);

    const activeOrders = allOrders.filter(order =>
      relatedOrderIds.includes(order.orderID) &&
      warnStatuses.some(s => String(order.orderStatus || '').toUpperCase().includes(s.toUpperCase()))
    );

    if (activeOrders.length > 0) {
      const orderList = activeOrders.map(o => `#${o.orderID} (${o.orderStatus})`).join(', ');
      return showModal(
        'Cảnh báo chỉnh sửa',
        `Sản phẩm "${productName}" đang xuất hiện trong ${activeOrders.length} đơn hàng chưa hoàn thành. Thay đổi thông tin (giá, tên, danh mục) có thể ảnh hưởng đến các đơn hàng này.`,
        'edit-confirm',
        () => navigate(`/admin/products/edit/${id}`),
        `Đơn hàng liên quan: ${orderList}`
      );
    }

    // Không có ràng buộc — chuyển hướng người dùng luôn
    navigate(`/admin/products/edit/${id}`);
  };

  const filteredProducts = useMemo(() => {
    const result = products.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            item.id.toLowerCase().includes(search.toLowerCase()) ||
                            item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'Tất cả' || item.category === category;
      const matchesStatus = statusFilter === 'Tất cả' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        if (sortConfig.key === 'id') {
          const idA = extractIdNumber(a.id);
          const idB = extractIdNumber(b.id);
          return sortConfig.direction === 'asc' ? idA - idB : idB - idA;
        }
        if (sortConfig.key === 'name') {
          const comp = a.name.localeCompare(b.name, 'vi');
          return sortConfig.direction === 'asc' ? comp : -comp;
        }
        if (sortConfig.key === 'category') {
          const comp = a.category.localeCompare(b.category, 'vi');
          return sortConfig.direction === 'asc' ? comp : -comp;
        }
        if (sortConfig.key === 'price') {
          const priceA = Number(a.price) || 0;
          const priceB = Number(b.price) || 0;
          return sortConfig.direction === 'asc' ? priceA - priceB : priceB - priceA;
        }
        if (sortConfig.key === 'stock') {
          const stockA = Number(a.stock) || 0;
          const stockB = Number(b.stock) || 0;
          return sortConfig.direction === 'asc' ? stockA - stockB : stockB - stockA;
        }
        return 0;
      });
    }

    return result;
  }, [products, search, category, statusFilter, sortConfig]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, statusFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter((item) => item.status === 'Sắp hết' || (item.stock > 0 && item.stock <= 10)).length;
    const outOfStock = products.filter((item) => item.status === 'Hết hàng' || item.stock === 0).length;
    const totalCategories = Math.max(0, categoriesList.length - 1);

    return { total, lowStock, outOfStock, totalCategories };
  }, [products, categoriesList]);

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6">
      
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 px-2 md:px-0 shrink-0">
        {/* Hàng 1: tiêu đề chính riêng một dòng */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight whitespace-nowrap">Quản lý Sản phẩm</h1>

        {/* Hàng 2: tiêu đề phụ + action cùng một dòng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Kho hàng & sản phẩm ·{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap">
              {products.length} sản phẩm
            </span>
          </p>

          <div className="flex flex-row items-center gap-3 w-full sm:w-auto md:w-auto md:justify-end">
            <button
              type="button"
              onClick={() => navigate('/admin/products/add')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00288E] px-4 h-[46px] font-black text-white uppercase tracking-widest transition-[background-color,transform] hover:bg-[#00288E]/90 whitespace-nowrap shadow-sm active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-2 outline-none"
              style={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
            >
              <span className="material-symbols-outlined text-[16px] font-bold" aria-hidden="true">add</span>
              Thêm sản phẩm mới
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0 shrink-0">
        <StatCard 
          title="TỔNG SẢN PHẨM" 
          value={stats.total} 
          growth={{ percent: 8, isUp: true, prevValue: Math.max(0, stats.total - 1), label: 'Sản phẩm mới thêm gần đây' }}
          icon="inventory_2"
          color="blue" 
          idx={0}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="SẢN PHẨM SẮP HẾT" 
          value={stats.lowStock} 
          icon="warning"
          color="orange" 
          idx={1}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="HẾT HÀNG" 
          value={stats.outOfStock} 
          icon="error_outline"
          color="red" 
          idx={2}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="DANH MỤC" 
          value={stats.totalCategories} 
          icon="category"
          color="purple" 
          idx={3}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-20 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-row md:flex-row justify-between items-center gap-2 lg:gap-6 mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 shrink-0">
        <div className="relative flex-1 md:w-[350px] lg:w-[400px] md:flex-none group">
          <input 
            type="text" 
            placeholder="Tìm tên sản phẩm, SKU, danh mục…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-3 sm:py-4 outline-none focus:bg-white focus:border-[#00288E] transition-all text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold" aria-hidden="true">search</span>
        </div>
 
        {/* Bộ lọc kép kiểu Dropdown cao cấp */}
        <div className="relative font-inter" ref={filterDropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpenFilterDropdown(!isOpenFilterDropdown)}
            aria-expanded={isOpenFilterDropdown}
            aria-haspopup="true"
            className="bg-slate-50 border-2 border-slate-200 hover:border-blue-600 transition-[border-color,background-color,transform] rounded-xl px-3 sm:px-4 flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none relative"
            style={{ height: '54px' }}
          >
            <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">tune</span>
            <span className="hidden md:inline text-xs font-black uppercase tracking-wider truncate max-w-[150px] sm:max-w-none">
              {category === 'Tất cả' && statusFilter === 'Tất cả' 
                ? 'Bộ lọc & Trạng thái' 
                : `Lọc: ${category !== 'Tất cả' ? 'DM' : ''}${category !== 'Tất cả' && statusFilter !== 'Tất cả' ? '+' : ''}${statusFilter !== 'Tất cả' ? 'TT' : ''}`}
            </span>
            <div className="hidden md:flex items-center gap-1">
              {(category !== 'Tất cả' || statusFilter !== 'Tất cả') && (
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              )}
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenFilterDropdown ? 'rotate-180' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </div>
            {(category !== 'Tất cả' || statusFilter !== 'Tất cả') && (
              <span className="md:hidden absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white"></span>
            )}
          </button>

            {isOpenFilterDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => {
                    setIsOpenFilterDropdown(false);
                    setCategorySearchQuery('');
                  }}
                />
                
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-[540px] bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-blue-600 opacity-80">BỘ LỌC KẾT HỢP</span>
                    {(category !== 'Tất cả' || statusFilter !== 'Tất cả') && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategory('Tất cả');
                          setStatusFilter('Tất cả');
                        }}
                        className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-700 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
                      >
                        Xóa tất cả bộ lọc
                      </button>
                    )}
                  </div>

                  {/* Content Panel */}
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Category Section - Có scrollbar riêng biệt mượt mà */}
                    <div className="space-y-3 flex flex-col h-[230px]">
                      <div className="flex items-center justify-between shrink-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DANH MỤC</span>
                        <div className="relative w-28 group">
                          <input
                            type="search"
                            value={categorySearchQuery}
                            onChange={(e) => setCategorySearchQuery(e.target.value)}
                            placeholder="Tìm nhanh..."
                            className="w-full bg-slate-50 border border-slate-200 text-[9px] font-bold rounded-lg pl-6 pr-2 py-1 outline-none focus:bg-white focus:border-blue-600 transition-[background-color,border-color] text-slate-700 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Tìm nhanh danh mục"
                          />
                          <span className="material-symbols-outlined absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-bold">search</span>
                        </div>
                      </div>
                      
                      {/* Cuộn riêng biệt cho danh mục */}
                      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {filteredCategoryOptions.length > 0 ? (
                          filteredCategoryOptions.map((option) => {
                            const isSelected = category === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setCategory(option)}
                                className={`w-full px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left transition-[background-color,color,transform] flex items-center justify-between active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow font-black'
                                    : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                                  }`}
                              >
                                <span className="truncate pr-1">{option}</span>
                                {isSelected && <span className="material-symbols-outlined text-[12px] shrink-0" aria-hidden="true">check</span>}
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                            Không tìm thấy
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Section */}
                    <div className="space-y-3 flex flex-col h-[230px]">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">TRẠNG THÁI KINH DOANH</span>
                      <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
                        {['Tất cả', 'Còn hàng', 'Sắp hết', 'Hết hàng', 'Ngừng kinh doanh'].map((statusOption) => {
                          const isSelected = statusFilter === statusOption;
                          return (
                            <button
                              key={statusOption}
                              type="button"
                              onClick={() => setStatusFilter(statusOption)}
                              className={`w-full px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider text-left transition-[background-color,color,transform] flex items-center justify-between active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow font-black'
                                  : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                              }`}
                            >
                              <span>{statusOption}</span>
                              {isSelected && <span className="material-symbols-outlined text-[12px]">check</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 overflow-hidden mx-2 md:mx-0 flex-1 min-h-[400px]">
        {/* View A: TABLE VIEW (Chỉ hiển thị trên Desktop >= 1280px) */}
        <div className="hidden xl:block overflow-x-auto flex-1 scrollbar-none">
          <table className="w-full table-fixed text-left border-collapse min-w-[900px]" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th 
                  onClick={() => handleSort('id')} 
                  className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[10%] cursor-pointer hover:text-[#00288E] transition-colors group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none" 
                  style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                  tabIndex={0}
                  role="columnheader"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('id'); } }}
                >
                  <div className="flex items-center gap-1">
                    <span>Mã SP</span>
                    <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'id' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} aria-hidden="true">
                      {sortConfig.key === 'id' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('name')} 
                  className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[28%] cursor-pointer hover:text-[#00288E] transition-colors group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none" 
                  style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                  tabIndex={0}
                  role="columnheader"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('name'); } }}
                >
                  <div className="flex items-center gap-1">
                    <span>Tên sản phẩm</span>
                    <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'name' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} aria-hidden="true">
                      {sortConfig.key === 'name' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('category')} 
                  className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[15%] cursor-pointer hover:text-[#00288E] transition-colors group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none" 
                  style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                  tabIndex={0}
                  role="columnheader"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('category'); } }}
                >
                  <div className="relative flex items-center justify-center w-full">
                    <span>Danh mục</span>
                    <span className={`absolute right-0 material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'category' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} aria-hidden="true">
                      {sortConfig.key === 'category' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('stock')} 
                  className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[12%] cursor-pointer hover:text-[#00288E] transition-colors group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none" 
                  style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                  tabIndex={0}
                  role="columnheader"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('stock'); } }}
                >
                  <div className="relative flex items-center justify-center w-full">
                    <span>Tồn kho</span>
                    <span className={`absolute right-0 material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'stock' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} aria-hidden="true">
                      {sortConfig.key === 'stock' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('price')} 
                  className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[13%] cursor-pointer hover:text-[#00288E] transition-colors group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none" 
                  style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}
                  tabIndex={0}
                  role="columnheader"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('price'); } }}
                >
                  <div className="flex items-center gap-1 w-full">
                    <span>Đơn giá</span>
                    <span className={`material-symbols-outlined text-[13px] transition-opacity ${sortConfig.key === 'price' ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} aria-hidden="true">
                      {sortConfig.key === 'price' && sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Trạng thái
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[10%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Thao tác
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4" aria-live="polite" aria-busy="true">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((product) => (
                  <tr key={product.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="font-black text-slate-900" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(11px, 0.9vw, 13px)' }}>
                      {product.id}
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <p className="font-bold text-slate-800 truncate font-inter" title={product.name} style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{product.name}</p>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full">
                        <span className="bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter"
                              style={{ fontSize: 'clamp(9px, 0.8vw, 10px)', padding: 'clamp(2px, 0.4vw, 4px) clamp(6px, 0.8vw, 12px)' }}>
                          {product.category}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full font-bold text-slate-700" style={{ fontSize: 'clamp(11px, 0.9vw, 14px)' }}>
                        {product.stock}
                      </div>
                    </td>
                    <td className="font-black text-slate-900" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(11px, 0.9vw, 13px)' }}>
                      {formatPrice(product.price)}
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full">
                        <span className={`inline-flex items-center justify-center rounded-xl border font-black uppercase tracking-wider ${getStatusStyle(product.status)}`}
                              style={{ fontSize: 'clamp(8px, 0.75vw, 9px)', padding: 'clamp(2px, 0.4vw, 4px) clamp(6px, 0.8vw, 12px)' }}>
                          {product.status}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full gap-1 sm:gap-2">
                        <ActionButton
                          icon="visibility"
                          color="text-slate-600 hover:bg-slate-100"
                          onClick={() => handleViewDetail(product)}
                          title="Xem chi tiết"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-20 text-center text-slate-400">
                    <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy sản phẩm nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View B: CARD LIST VIEW (Tối ưu hóa cho Mobile & iPad < 1280px) */}
        <div className="block xl:hidden overflow-auto flex-1 p-4 bg-slate-50/50 scrollbar-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4" aria-live="polite" aria-busy="true">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
            </div>
          ) : paginatedProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-md transition-[border-color,box-shadow] flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full tracking-wider">
                        {product.id}
                      </span>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm mt-1 truncate" title={product.name}>{product.name}</h4>
                      <p className="text-xs font-black text-slate-900 mt-2 font-mono">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => handleViewDetail(product)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                      title="Xem chi tiết"
                      aria-label="Xem chi tiết"
                    >
                      <span className="material-symbols-outlined text-lg font-bold" aria-hidden="true">visibility</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center mt-auto pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 mr-auto">
                      Tồn kho: <span className="font-black text-slate-700">{product.stock}</span>
                    </span>
                    
                    <span className="bg-slate-100 text-slate-500 font-black rounded-lg border border-slate-200 uppercase tracking-tighter text-[9px] px-2 py-0.5">
                      {product.category}
                    </span>

                    <span className={`inline-flex items-center justify-center rounded-xl border font-black uppercase tracking-wider text-[9px] px-2 py-0.5 ${getStatusStyle(product.status)}`}>
                      {product.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400">
              <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy sản phẩm nào</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-white shrink-0">
            <span>Hiển thị {Math.min(filteredProducts.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredProducts.length, currentPage * ITEMS_PER_PAGE)} trên {filteredProducts.length} sản phẩm</span>
            <div className="flex gap-1">
              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                aria-label="Trang trước"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_left</span>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex justify-center items-center rounded-lg border text-xs font-black focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    currentPage === i + 1 
                      ? 'bg-[#00288E] text-white border-[#00288E]' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                  aria-label={`Trang ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                aria-label="Trang sau"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Notification Popup */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Icon */}
            {modalConfig.type === 'success' && (
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-100">
                <span className="material-symbols-outlined text-4xl font-black">check_circle</span>
              </div>
            )}
            {modalConfig.type === 'error' && (
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-lg shadow-rose-100">
                <span className="material-symbols-outlined text-4xl font-black">error</span>
              </div>
            )}
            {modalConfig.type === 'warning' && (
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-100">
                <span className="material-symbols-outlined text-4xl font-black">warning</span>
              </div>
            )}
            {modalConfig.type === 'confirm' && (
              <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-lg shadow-rose-100">
                <span className="material-symbols-outlined text-4xl font-black">delete_forever</span>
              </div>
            )}
            {modalConfig.type === 'blocked' && (
              <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-orange-100">
                <span className="material-symbols-outlined text-4xl font-black">block</span>
              </div>
            )}
            {modalConfig.type === 'edit-confirm' && (
              <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-100">
                <span className="material-symbols-outlined text-4xl font-black">edit_note</span>
              </div>
            )}

            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              {modalConfig.title}
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-3 font-inter">
              {modalConfig.message}
            </p>
            {modalConfig.detail && (
              <div className="w-full bg-slate-50 rounded-xl px-4 py-2.5 mb-4 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Chi tiết</p>
                <p className="text-[11px] font-semibold text-slate-600 font-inter">{modalConfig.detail}</p>
              </div>
            )}

            <div className="flex gap-3 w-full mt-2">
              {modalConfig.type === 'confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      closeModal();
                    }}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-rose-500 outline-none"
                  >
                    Xóa vĩnh viễn
                  </button>
                </>
              ) : modalConfig.type === 'edit-confirm' ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      closeModal();
                    }}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-amber-500 outline-none"
                  >
                    Vẫn tiếp tục
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                >
                  Đã hiểu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ProductDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        product={selectedProduct}
        onEdit={(p) => {
          setDrawerOpen(false);
          handleEdit(p.id);
        }}
        onDelete={(p) => {
          setDrawerOpen(false);
          handleDelete(p.id);
        }}
      />
    </div>
  );
};

export default ProductManagement;
