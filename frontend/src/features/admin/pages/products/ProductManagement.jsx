import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

// categories will be loaded from adminService

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

// product normalization helper
const normalizeProduct = (p) => ({
  id: p.productID || p.id || p.code || p.sku || String(p.productID || p.id || p.code || p.sku),
  name: p.productName || p.name || p.title || 'Sản phẩm',
  category: p.categoryName || p.category || p.group || 'Khác',
  price: p.salePrice || p.price || p.unitPrice || 0,
  stock: p.stock ?? p.quantity ?? p.inventory ?? 0,
  status: p.status || (Number(p.stock) === 0 ? 'Hết hàng' : 'Còn hàng')
});

const ProductManagement = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [categoriesList, setCategoriesList] = useState(['Tất cả']);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.id.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'Tất cả' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, safeCurrentPage]);

  const handleDelete = (id) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa sản phẩm này không?');
    if (!confirmed) return;
    // call service
    adminService.deleteProduct(id).then(() => {
      const nextProducts = products.filter((product) => String(product.id) !== String(id));
      setProducts(nextProducts);
      if (currentPage > Math.ceil(nextProducts.length / ITEMS_PER_PAGE)) {
        setCurrentPage(Math.max(1, currentPage - 1));
      }
    }).catch((err) => {
      console.error('Delete product failed', err);
      alert('Xóa sản phẩm thất bại');
    });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await adminService.getProducts();
        if (!mounted) return;
        const mapped = Array.isArray(res) ? res.map(normalizeProduct) : [];
        setProducts(mapped);
      } catch (e) {
        console.error('Failed to load products', e);
        setProducts([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    adminService.getCategories().then(res => {
      if (!mounted) return;
      const arr = Array.isArray(res) ? res : [];
      const names = arr.map(c => c.categoryName || c.name || c.title).filter(Boolean);
      setCategoriesList(['Tất cả', ...names]);
    }).catch(err => {
      console.error('Load categories failed', err);
      setCategoriesList(['Tất cả']);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý Sản phẩm</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl">
            Quản lý danh sách sản phẩm, kiểm soát tồn kho và trạng thái để điều phối nhanh trên nền tảng di động.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/products/add')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00288E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00288E]/90"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Thêm sản phẩm mới
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tổng sản phẩm</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{products.length}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sản phẩm sắp hết</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{products.filter((item) => item.status === 'Sắp hết').length}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Hết hàng</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{products.filter((item) => item.status === 'Hết hàng').length}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Danh mục</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{categoriesList.length - 1}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <label className="sr-only" htmlFor="search">Tìm kiếm sản phẩm</label>
          <input
            id="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
          />
        </div>

        <div className="flex gap-3 flex-col sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="category">Lọc danh mục</label>
          <select
            id="category"
            value={category}
            onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
          >
            {categoriesList.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden lg:block">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Mã</th>
                <th className="px-6 py-4">Sản phẩm</th>
                <th className="px-6 py-4">Danh mục</th>
                <th className="px-6 py-4">Giá</th>
                <th className="px-6 py-4">Tồn kho</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-sm text-slate-500">
                    Không tìm thấy sản phẩm phù hợp.
                  </td>
                </tr>
              ) : paginatedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">{product.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-700">{product.name}</td>
                  <td className="px-6 py-4">{product.category}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{formatPrice(product.price)}</td>
                  <td className="px-6 py-4">{product.stock}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getStatusStyle(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(product.id)}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-gray-200">
          {paginatedProducts.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Không tìm thấy sản phẩm phù hợp.</div>
          ) : paginatedProducts.map((product) => (
            <div key={product.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{product.id}</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{product.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">{product.category}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getStatusStyle(product.status)}`}>
                  {product.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                <span>Giá: <span className="font-semibold text-slate-900">{formatPrice(product.price)}</span></span>
                <span>Tồn: <span className="font-semibold text-slate-900">{product.stock}</span></span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 items-center justify-between rounded-b-3xl bg-white px-4 py-4 shadow-sm border-t border-gray-200 sm:flex-row">
        <p className="text-sm text-slate-500">
          Hiển thị {paginatedProducts.length} trên {filteredProducts.length} sản phẩm
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-sm font-semibold text-slate-700">{safeCurrentPage} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
            className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductManagement;
