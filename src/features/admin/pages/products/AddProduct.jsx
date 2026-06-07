import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const defaultCategories = ['Điện tử', 'Văn phòng phẩm', 'Thời trang', 'Dịch vụ'];
const units = ['cái', 'bộ', 'chiếc', 'gói'];



const AddProduct = () => {
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState(defaultCategories[0]);
  const [categories, setCategories] = useState(defaultCategories);
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [unit, setUnit] = useState(units[0]);
  const [status, setStatus] = useState('Còn hàng');
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast({ show: false, message: '', type: '' }), 2800);
  };

  React.useEffect(() => {
    let mounted = true;
    adminService.getCategories().then(res => {
      if (!mounted) return;
      const arr = Array.isArray(res) ? res : [];
      const names = arr.map(c => c.categoryName || c.name || c.title).filter(Boolean);
      if (names.length) setCategories(names);
    }).catch(err => {
      // keep defaults
    });
    return () => { mounted = false; };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!productName.trim()) {
      showToast('Vui lòng nhập tên sản phẩm', 'error');
      return;
    }
    if (!price || Number(price) <= 0) {
      showToast('Giá sản phẩm phải lớn hơn 0', 'error');
      return;
    }

      const payload = {
        productName: productName.trim(),
        sku: sku.trim() || undefined,
        category,
        salePrice: Number(price),
        quantity: stock === '' ? 0 : Number(stock),
        unit,
        status,
        description: description.trim(),
      };
      adminService.createProduct(payload).then((res) => {
        showToast('Đã lưu sản phẩm thành công');
        window.setTimeout(() => navigate('/admin/products'), 1200);
      }).catch(err => {
        console.error('Create product failed', err);
        showToast('Lưu sản phẩm thất bại', 'error');
      });
  };

  return (
    <div className="font-inter flex flex-col w-full min-h-screen bg-slate-50 gap-4 pb-10 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">Thêm sản phẩm</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Nhập thông tin sản phẩm để quản lý trong hệ thống Admin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        >
          <span className="material-symbols-outlined">arrow_back</span> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold text-slate-700">Product Name</label>
            <input
              id="name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Business Laptop"
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="sku" className="text-sm font-semibold text-slate-700">Product SKU</label>
            <input
              id="sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. PRD-012"
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-semibold text-slate-700">Category</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            >
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="price" className="text-sm font-semibold text-slate-700">Sale Price</label>
            <input
              id="price"
              type="number"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="stock" className="text-sm font-semibold text-slate-700">Stock</label>
            <input
              id="stock"
              type="number"
              min="0"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="unit" className="text-sm font-semibold text-slate-700">Unit</label>
            <select
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            >
              {units.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="status" className="text-sm font-semibold text-slate-700">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            >
              <option value="Còn hàng">Còn hàng</option>
              <option value="Sắp hết">Sắp hết</option>
              <option value="Hết hàng">Hết hàng</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-semibold text-slate-700">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
            placeholder="Short product description"
            className="w-full rounded-3xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-[#00288E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00288E]/90"
          >
            Lưu sản phẩm
          </button>
        </div>
      </form>

      {toast.show && (
        <div className={`fixed inset-x-4 bottom-6 z-50 rounded-3xl border px-4 py-3 text-sm shadow-lg ${toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AddProduct;
