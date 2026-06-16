import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminService from '../../services/adminService';

const defaultCategories = ['Điện tử', 'Văn phòng phẩm', 'Thời trang', 'Dịch vụ'];
const units = ['cái', 'bộ', 'chiếc', 'gói'];

const DropdownCategory = ({ category, setCategory, categories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = React.useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const filtered = categories.filter(c => 
    c.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border-2 border-slate-100 hover:border-blue-600 transition-[border-color,background-color,transform] rounded-2xl p-4 flex items-center justify-between gap-3 text-slate-700 outline-none active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        aria-label="Chọn danh mục"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0" aria-hidden="true">
            <span className="material-symbols-outlined text-[18px]">sell</span>
          </div>
          <div className="text-left min-w-0">
            <p className="font-black text-xs uppercase tracking-tight truncate">{category}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Danh mục đã chọn</p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
          keyboard_arrow_down
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-50 p-4 flex flex-col gap-3 max-h-[300px] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative shrink-0">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nhanh danh mục..."
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:bg-white focus:border-blue-600 transition-[border-color,background-color] text-slate-700 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-label="Tìm nhanh danh mục"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold" aria-hidden="true">search</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent" role="listbox">
            {filtered.length > 0 ? (
              filtered.map((opt) => {
                const isSelected = opt === category;
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setCategory(opt);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-[background-color,color,transform] flex items-center justify-between active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600 outline-none ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow font-black'
                        : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                    }`}
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {isSelected && <span className="material-symbols-outlined text-sm shrink-0" aria-hidden="true">check</span>}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
                Không tìm thấy
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loadedProduct, setLoadedProduct] = useState(null);
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(defaultCategories[0]);
  const [categories, setCategories] = useState(defaultCategories);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [unit, setUnit] = useState(units[0]);
  const [status, setStatus] = useState('Còn hàng');
  const [description, setDescription] = useState('');

  // Trạng thái modal popup thông báo
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'warning' | 'error' | 'confirm'
    onConfirm: null
  });

  const showModal = (title, message, type = 'success', onConfirm = null) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const [isDirty, setIsDirty] = useState(false);
  const initialSnapshot = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    if (initialSnapshot.current === null) return;
    const current = JSON.stringify({ productName, sku, category, price, stock, unit, status, description });
    setIsDirty(current !== initialSnapshot.current);
  }, [productName, sku, category, price, stock, unit, status, description]);

  const handleCancelClick = () => {
    if (!isDirty) {
      navigate('/admin/products');
      return;
    }
    showModal(
      'Hủy bỏ thay đổi?',
      'Mọi thông tin bạn vừa sửa đổi sẽ không được lưu lại. Bạn có chắc chắn muốn quay lại danh sách?',
      'warning',
      () => navigate('/admin/products')
    );
  };

  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    if (!productName.trim()) {
      return showModal('Thiếu thông tin', 'Vui lòng nhập tên sản phẩm bắt buộc.', 'error');
    }
    if (!price || Number(price) <= 0) {
      return showModal('Giá sản phẩm không hợp lệ', 'Giá sản phẩm phải lớn hơn 0.', 'error');
    }
    if (!loadedProduct) return;

    showModal(
      'Xác nhận cập nhật',
      `Bạn chuẩn bị lưu thay đổi cho sản phẩm "${productName.trim()}". Xác nhận cập nhật thông tin?`,
      'confirm',
      () => {
        adminService.updateProduct(loadedProduct.productID || loadedProduct.id || id, {
          productName: productName.trim(), 
          sku: sku.trim() || undefined, 
          category, 
          salePrice: Number(price), 
          quantity: stock === '' ? 0 : Number(stock), 
          unit, 
          status, 
          description: description.trim()
        }).then(() => {
          navigate('/admin/products');
        }).catch(err => {
          console.error('Update product failed', err);
          showModal('Cập nhật thất bại', 'Có lỗi xảy ra trong quá trình kết nối máy chủ. Vui lòng thử lại.', 'error');
        });
      }
    );
  };

  useEffect(() => {
    let mounted = true;
    adminService.getProducts().then(list => {
      if (!mounted) return;
      const arr = Array.isArray(list) ? list : [];
      const cleanTargetId = String(id).replace('PRD-', '').replace('PROD-', '').replace(/^0+/, '');
      const found = arr.find(p => {
        const pid = String(p.productID || p.id).replace('PRD-', '').replace('PROD-', '').replace(/^0+/, '');
        return pid === cleanTargetId;
      });
      if (!found) {
        setLoadedProduct(undefined);
        return;
      }
      setLoadedProduct(found);
      const loadedCategory = typeof found.category === 'object' && found.category !== null
        ? (found.category.categoryName || found.category.name || categories[0])
        : (found.categoryName || found.category || categories[0]);

      const loadedValues = {
        productName: found.productName || found.name || '',
        sku: found.sku || found.code || '',
        category: loadedCategory,
        price: String(found.salePrice || found.price || ''),
        stock: String(found.quantity ?? found.stock ?? 0),
        unit: found.unit || units[0],
        status: found.status || 'Còn hàng',
        description: found.description || ''
      };
      setProductName(loadedValues.productName);
      setSku(loadedValues.sku);
      setCategory(loadedValues.category);
      setPrice(loadedValues.price);
      setStock(loadedValues.stock);
      setUnit(loadedValues.unit);
      setStatus(loadedValues.status);
      setDescription(loadedValues.description);
      initialSnapshot.current = JSON.stringify(loadedValues);
    }).catch(err => {
      console.error('Load product failed', err);
      setLoadedProduct(undefined);
    });
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    adminService.getCategories().then(res => {
      if (!mounted) return;
      const arr = Array.isArray(res) ? res : [];
      const names = arr.map(c => c.categoryName || c.name || c.title).filter(Boolean);
      if (names.length) setCategories(names);
    }).catch(() => {
      // keep defaults
    });
    return () => { mounted = false; };
  }, []);

  if (loadedProduct === null) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4" aria-live="polite" aria-busy="true">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải thông tin sản phẩm…</p>
      </div>
    );
  }

  if (!loadedProduct) {
    return (
      <div className="font-inter flex min-h-screen flex-col bg-slate-50 p-6 justify-center items-center">
        <div className="rounded-[2.5rem] border border-slate-300 bg-white p-10 shadow-2xl max-w-md text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl font-black">error</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sản phẩm không tồn tại</h1>
          <p className="mt-3 text-xs font-semibold text-slate-500 leading-relaxed">Vui lòng kiểm tra lại đường dẫn hoặc chọn sản phẩm khác từ danh sách quản lý.</p>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="mt-6 w-full py-3 bg-[#00288E] hover:bg-[#00288E]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 shadow-lg shadow-blue-500/10 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
          >Quay lại danh sách</button>
        </div>
      </div>
    );
  }

  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    e.stopPropagation();
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    if (!touchStart) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    if (!touchStart || !touchEnd) return;

    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (distanceX > minSwipeDistance) {
        handleCancelClick();
      }
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-10"
    >
      
      {/* 1. Header Section */}
      <div className="relative flex flex-col gap-2 sm:gap-3 px-2 md:px-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
          Chỉnh sửa sản phẩm
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Cập nhật thông tin sản phẩm mã <span className="font-bold text-slate-700">{id}</span>
          </p>
          <div className="flex w-full sm:w-auto sm:justify-end gap-2 sm:gap-3">
          <button 
            type="button"
            onClick={handleCancelClick}
            className="px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 transition-[background-color,color,border-color,transform] active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none shrink-0"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-[background-color,color,border-color,transform] duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] active:scale-95 focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-2 outline-none shrink-0"
          >
            <span className="material-symbols-outlined text-sm sm:text-base group-hover:rotate-12 transition-transform" aria-hidden="true">save</span>
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>
    </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8 mx-2 md:mx-0">
          
          {/* CỘT TRÁI (Thông tin chính của sản phẩm) */}
          <div className="xl:flex-[2] flex flex-col gap-8">
            
            {/* Box Thông tin cơ bản */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-[border-color,box-shadow] duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-blue-600">inventory_2</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin cơ bản</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên sản phẩm & Mã định danh</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-8 mb-8">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tên sản phẩm *</label>
                  <input 
                    id="name"
                    type="text" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="VD: Business Laptop Dell XPS 13" 
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-[border-color,background-color] text-slate-700 font-inter" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="sku" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mã SKU sản phẩm</label>
                  <input 
                    id="sku"
                    type="text" 
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="VD: PRD-012" 
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-[border-color,background-color] text-slate-700 font-inter" 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="price" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Đơn giá bán (VND) *</label>
                  <input 
                    id="price"
                    type="number" 
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0" 
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-[border-color,background-color] text-slate-700 font-inter" 
                  />
                </div>
              </div>
            </div>

            {/* Box Tồn kho & Đơn vị */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-[border-color,box-shadow] duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-orange-600">inventory</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Số lượng & Đơn vị</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Kiểm soát kho hàng & Quy cách</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="stock" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Số lượng tồn kho</label>
                  <input 
                    id="stock"
                    type="number" 
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus:bg-white transition-[border-color,background-color] text-slate-700 font-inter" 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="unit" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Đơn vị tính</label>
                  <select 
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-[border-color,background-color] text-slate-700 font-inter cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600" 
                  >
                    {units.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Box Mô tả chi tiết */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-[border-color,box-shadow] duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-teal-600">description</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mô tả sản phẩm</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Chi tiết thông tin bổ sung</p>
                </div>
              </div>
              <div className="space-y-2">
                <textarea 
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="4"
                  placeholder="Nhập mô tả tóm tắt về tính năng sản phẩm, cấu hình hoặc ghi chú dịch vụ..."
                  className="w-full bg-slate-50 border-2 border-transparent rounded-[2rem] p-5 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus:bg-white transition-[border-color,background-color] text-slate-700 font-inter"
                />
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (Danh mục & Trạng thái kinh doanh) */}
          <div className="xl:flex-[1] flex flex-col gap-8">
            
            {/* Box Phân loại */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-[border-color,box-shadow] duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-purple-600">category</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Phân loại</h3>
                </div>
              </div>

              <div className="space-y-8">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">Danh mục sản phẩm</label>
                  
                  {/* Custom Dropdown Trigger */}
                  <DropdownCategory 
                    category={category} 
                    setCategory={setCategory} 
                    categories={categories} 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Trạng thái kinh doanh</label>
                  <div className="flex flex-col gap-3" role="radiogroup" aria-label="Trạng thái kinh doanh">
                    {[
                      { id: 'Còn hàng', title: 'Còn hàng', desc: 'Có sẵn để bán', color: 'emerald', icon: 'check_circle' },
                      { id: 'Sắp hết', title: 'Sắp hết', desc: 'Cảnh báo mức tối thiểu', color: 'orange', icon: 'warning' },
                      { id: 'Hết hàng', title: 'Hết hàng', desc: 'Tạm khóa thanh toán', color: 'red', icon: 'error_outline' }
                    ].map((item) => {
                      const active = status === item.id;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => setStatus(item.id)}
                          tabIndex={0}
                          role="radio"
                          aria-checked={active}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setStatus(item.id);
                            }
                          }}
                          className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-[border-color,background-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'}`} aria-hidden="true">
                              {active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-in zoom-in duration-200"></div>}
                            </div>
                            <div>
                              <p className={`font-black text-xs uppercase tracking-tight ${active ? 'text-blue-600' : 'text-slate-900'}`}>{item.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                          <span className={`material-symbols-outlined text-[20px] ${
                            item.color === 'emerald' ? 'text-emerald-500' :
                            item.color === 'orange' ? 'text-orange-500' :
                            'text-rose-500'
                          }`} aria-hidden="true">{item.icon}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Modal Notification Popup Component */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {modalConfig.type === 'success' && (
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
              </div>
            )}
            {modalConfig.type === 'error' && (
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">error</span>
              </div>
            )}
            {modalConfig.type === 'warning' && (
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">warning</span>
              </div>
            )}
            {modalConfig.type === 'confirm' && (
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">help</span>
              </div>
            )}

            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              {modalConfig.title}
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6 font-inter">
              {modalConfig.message}
            </p>

            <div className="flex gap-3 w-full">
              {modalConfig.type === 'confirm' || modalConfig.type === 'warning' ? (
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
                    className={`flex-1 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 outline-none ${
                      modalConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 focus-visible:ring-amber-500' : 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-600'
                    }`}
                  >
                    Đồng ý
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProduct;
