import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import salesService from '../../services/salesService';

const AddProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEditMode = !!id;

  // Paths
  const basePath = location.pathname.startsWith('/admin') ? '/admin' : '/sales';

  // State
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [fetching, setFetching] = useState(isEditMode);

  // Form Fields
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [importPrice, setImportPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [adjustmentStock, setAdjustmentStock] = useState('0');
  const [lowStockAlert, setLowStockAlert] = useState('10');
  const [categoryID, setCategoryID] = useState('');
  const [unit, setUnit] = useState('m2');
  const [status, setStatus] = useState(true); // true = ACTIVE, false = INACTIVE
  
  // Image Upload State
  const [imageURL, setImageURL] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToastMsg = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Load Categories & Product (if Edit mode)
  useEffect(() => {
    const initData = async () => {
      try {
        const cats = await salesService.getCategories();
        setCategories(cats);

        if (isEditMode) {
          const products = await salesService.getProducts();
          const p = products.find(prod => Number(prod.productID) === Number(id));
          if (p) {
            setProductName(p.name || p.productName || '');
            setSku(p.id || `PRD-${p.productID.toString().padStart(3, '0')}`);
            setSalePrice(String(p.price || p.salePrice || ''));
            setImportPrice(String(p.cost || ''));
            setStock(String(p.stock !== undefined ? p.stock : '0'));
            setLowStockAlert(String(p.lowStockAlert || '10'));
            setUnit(p.unit || 'm2');
            setStatus(p.status === 'ACTIVE' || p.status === 'Còn hàng');
            setImageURL(p.imageURL || p.image || '');
            setDescription(p.description || '');
            
            // find category ID matching
            const cat = cats.find(c => c.categoryName === p.category);
            if (cat) {
              setCategoryID(String(cat.categoryID));
            } else if (p.categoryID) {
              setCategoryID(String(p.categoryID));
            }
          } else {
            showToastMsg('Không tìm thấy sản phẩm!', 'error');
            setTimeout(() => navigate(`${basePath}/products`), 1500);
          }
        }
      } catch (err) {
        console.error("Lỗi khởi tạo dữ liệu:", err);
        showToastMsg('Lỗi khi lấy thông tin hệ thống!', 'error');
      } finally {
        setFetching(false);
      }
    };
    initData();
  }, [id, isEditMode, navigate, basePath]);

  // Image Upload Handlers
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      showToastMsg('Kích thước ảnh tối đa là 5MB!', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setImageURL(event.target.result);
      showToastMsg('Tải hình ảnh lên thành công!');
    };
    reader.onerror = () => {
      showToastMsg('Có lỗi xảy ra khi đọc file!', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setImageURL('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToastMsg('Đã xóa hình ảnh!');
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!productName.trim()) {
      showToastMsg('Vui lòng nhập tên sản phẩm!', 'error');
      return;
    }
    if (!categoryID) {
      showToastMsg('Vui lòng chọn danh mục!', 'error');
      return;
    }
    if (!salePrice || isNaN(Number(salePrice)) || Number(salePrice) <= 0) {
      showToastMsg('Giá bán lẻ phải là số lớn hơn 0!', 'error');
      return;
    }
    if (importPrice !== '' && (isNaN(Number(importPrice)) || Number(importPrice) < 0)) {
      showToastMsg('Giá nhập kho không được nhỏ hơn 0!', 'error');
      return;
    }
    if (stock !== '' && (isNaN(Number(stock)) || Number(stock) < 0)) {
      showToastMsg('Số lượng tồn kho ban đầu không được nhỏ hơn 0!', 'error');
      return;
    }
    if (lowStockAlert !== '' && (isNaN(Number(lowStockAlert)) || Number(lowStockAlert) < 0)) {
      showToastMsg('Ngưỡng cảnh báo tồn kho không được nhỏ hơn 0!', 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Kiểm tra trùng tên sản phẩm (không phân biệt chữ hoa thường)
      const existingProducts = await salesService.getProducts();
      const duplicate = existingProducts.find(p => {
        // Bỏ qua chính nó khi sửa sản phẩm
        if (isEditMode && Number(p.productID) === Number(id)) return false;
        
        const currentNameClean = productName.trim().toLowerCase();
        const existingNameClean = (p.name || p.productName || '').trim().toLowerCase();
        return currentNameClean === existingNameClean;
      });

      if (duplicate) {
        showToastMsg('Tên sản phẩm này đã tồn tại trong hệ thống!', 'error');
        setLoading(false);
        return;
      }

      // 2. Tạo dữ liệu lưu trữ chuẩn
      let finalStock = Number(stock) || 0;
      if (isEditMode) {
        finalStock = (Number(stock) || 0) + (Number(adjustmentStock) || 0);
        if (finalStock < 0) {
          showToastMsg('Số lượng tồn kho sau điều chỉnh không được nhỏ hơn 0!', 'error');
          setLoading(false);
          return;
        }
      }

      const payload = {
        productName: productName.trim(),
        salePrice: Number(salePrice),
        cost: importPrice ? Number(importPrice) : null,
        stock: finalStock,
        lowStockAlert: lowStockAlert ? Number(lowStockAlert) : 10,
        unit,
        status: status ? 'ACTIVE' : 'INACTIVE',
        categoryID: Number(categoryID),
        imageURL: imageURL || '',
        description: description.trim()
      };

      if (isEditMode) {
        await salesService.updateProduct(Number(id), payload);
        showToastMsg('Cập nhật sản phẩm thành công!');
      } else {
        await salesService.createProduct(payload);
        showToastMsg('Tạo sản phẩm mới thành công!');
      }

      setTimeout(() => {
        setLoading(false);
        navigate(`${basePath}/products`);
      }, 1500);
    } catch (err) {
      console.error("Lỗi khi lưu sản phẩm:", err);
      showToastMsg('Có lỗi xảy ra khi lưu sản phẩm!', 'error');
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-8 pb-8">
      
      {/* 1. Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-2 md:px-0">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
            {isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Hệ thống đang{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in">
              {isEditMode ? 'chỉnh sửa dữ liệu' : 'sẵn sàng thiết lập'}
            </span>{" "}
            thông tin hàng hóa & quy chuẩn kho vận
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => navigate(`${basePath}/products`)}
            className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 transition-all active:scale-95"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current rounded-full animate-spin"></div>
            ) : (
              <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">save</span>
            )}
            {isEditMode ? 'Cập nhật sản phẩm' : 'Lưu sản phẩm mới'}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8 mx-2 md:mx-0">
          
          {/* CỘT TRÁI (Thông tin chính) */}
          <div className="xl:flex-[2] flex flex-col gap-8">
          
            {/* Box 1: Định danh sản phẩm */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">edit_note</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin cơ bản</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên gọi & Phân loại SKU</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tên sản phẩm *</label>
                  <input 
                    type="text" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="VD: Gạch men cao cấp 60x60" 
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mã SKU / Định danh (Tự động)</label>
                  <input 
                    type="text" 
                    value={sku || 'Hệ thống tự động sinh ID'}
                    disabled
                    placeholder="Hệ thống tự động sinh ID" 
                    className="w-full bg-slate-100 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none text-slate-400 cursor-not-allowed" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mô tả chi tiết</label>
                <textarea 
                  rows="4" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Nhập thông số kỹ thuật, tính năng nổi bật..." 
                  className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-5 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700 resize-none"
                ></textarea>
              </div>
            </div>

            {/* Box 2: Giá & Kho vận */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600">payments</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Giá & Kho vận</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thiết lập tài chính & số lượng</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Giá bán lẻ (VNĐ) *</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      value={salePrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== '' && Number(val) < 0) return;
                        setSalePrice(val);
                      }}
                      placeholder="0" 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 pr-12 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">VND</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Giá nhập kho (VNĐ)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="0"
                      value={importPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val !== '' && Number(val) < 0) return;
                        setImportPrice(val);
                      }}
                      placeholder="0" 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 pr-12 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">VND</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {isEditMode ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Số lượng tồn kho hiện tại (Khóa)</label>
                      <input 
                        type="number" 
                        disabled
                        value={stock}
                        className="w-full bg-slate-100 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none text-slate-400 cursor-not-allowed" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-[#00288E] uppercase tracking-[0.2em] ml-1">Nhập / Xuất kho điều chỉnh (+/-)</label>
                      <input 
                        type="number" 
                        value={adjustmentStock}
                        onChange={(e) => setAdjustmentStock(e.target.value)}
                        placeholder="0"
                        className="w-full bg-blue-50/30 border-2 border-blue-100 rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-400 focus:bg-white transition-all text-slate-700" 
                      />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1 leading-normal">
                        Điền số dương để cộng thêm, điền số âm để trừ bớt (VD: +25 hoặc -10)
                      </p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ngưỡng cảnh báo tồn kho</label>
                      <input 
                        type="number" 
                        min="0"
                        value={lowStockAlert}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) return;
                          setLowStockAlert(val);
                        }}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700" 
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Số lượng tồn kho ban đầu</label>
                      <input 
                        type="number" 
                        min="0"
                        value={stock}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) return;
                          setStock(val);
                        }}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ngưỡng cảnh báo tồn kho</label>
                      <input 
                        type="number" 
                        min="0"
                        value={lowStockAlert}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== '' && Number(val) < 0) return;
                          setLowStockAlert(val);
                        }}
                        className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700" 
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (Phân loại & Ảnh) */}
          <div className="xl:flex-[1] flex flex-col gap-8">
            
            {/* Box 3: Hình ảnh sản phẩm */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600">image</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Hình ảnh</h3>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />

              {imageURL ? (
                <div className="relative border-4 border-slate-100 bg-slate-50 rounded-xl overflow-hidden group mb-6 aspect-video">
                  <img src={imageURL} alt="Product Preview" className="w-full h-full object-cover" />
                  
                  {/* Hover Overlay */}
                  <div 
                    onClick={handleUploadClick}
                    tabIndex={0}
                    role="button"
                    aria-label="Thay đổi ảnh sản phẩm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleUploadClick();
                      }
                    }}
                    className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00288E] focus:ring-offset-2"
                  >
                    <span className="text-xs font-black uppercase text-white tracking-widest bg-slate-900/60 px-4 py-2 rounded-xl backdrop-blur-sm">
                      Thay đổi ảnh
                    </span>
                  </div>

                  {/* Remove Button */}
                  <button 
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-rose-600 text-white hover:bg-rose-700 flex items-center justify-center transition-colors shadow-lg z-10 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              ) : (
                <div 
                  onClick={handleUploadClick}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  tabIndex={0}
                  role="button"
                  aria-label="Tải lên ảnh chính"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleUploadClick();
                    }
                  }}
                  className={`border-4 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all group mb-6 focus:outline-none focus:ring-2 focus:ring-[#00288E] focus:ring-offset-2 ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-300'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-3xl text-slate-300">cloud_upload</span>
                  </div>
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tải lên ảnh chính</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-2">Kéo thả hoặc click để chọn file</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div 
                    key={i} 
                    onClick={handleUploadClick}
                    tabIndex={0}
                    role="button"
                    aria-label={`Thêm ảnh phụ ${i}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleUploadClick();
                      }
                    }}
                    className="aspect-square rounded-xl bg-slate-50 border-2 border-transparent hover:border-blue-100 cursor-pointer flex items-center justify-center text-slate-300 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 4: Phân loại hệ thống */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-all duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-600">category</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Phân loại</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Danh mục sản phẩm *</label>
                  <select 
                    value={categoryID}
                    onChange={(e) => setCategoryID(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="">Chọn danh mục...</option>
                    {categories.map((c) => (
                      <option key={c.categoryID} value={c.categoryID}>{c.categoryName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Đơn vị tính</label>
                  <select 
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-xl p-4 text-sm font-bold outline-none focus:border-blue-100 focus:bg-white transition-all text-slate-700 appearance-none cursor-pointer"
                  >
                    <option value="m2">m2</option>
                    <option value="bộ">bộ</option>
                    <option value="cái">cái</option>
                    <option value="hộp">hộp</option>
                    <option value="kg">kg</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-50">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Trạng thái kinh doanh</p>
                    <button 
                      type="button"
                      role="switch"
                      aria-checked={status}
                      aria-label="Trạng thái kinh doanh"
                      onClick={() => setStatus(!status)}
                      className={`w-12 h-6 rounded-full transition-all relative focus:outline-none focus:ring-2 focus:ring-[#00288E] focus:ring-offset-2 ${status ? 'bg-[#00288E] shadow-lg shadow-blue-200' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${status ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                    {status ? 'Sản phẩm đang được bày bán trên toàn hệ thống' : 'Sản phẩm tạm ngừng kinh doanh'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-right-10 duration-300">
          <div className="bg-slate-900 text-white px-8 py-5 rounded-xl shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
              <span className="material-symbols-outlined text-lg">{toast.type === 'error' ? 'close' : 'check'}</span>
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{toast.message}</p>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddProduct;