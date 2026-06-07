import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
};

const PriceListManagement = () => {
  const navigate = useNavigate();
  const [priceLists, setPriceLists] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');

  const filteredLists = useMemo(() => {
    return priceLists.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'Tất cả' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [priceLists, search, statusFilter]);

  const handleDelete = (id) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa bảng giá này không?');
    if (!confirmed) return;
    adminService.deletePriceList(id).then(() => {
      const next = priceLists.filter((item) => String(item.id) !== String(id));
      setPriceLists(next);
    }).catch(err => {
      console.error('Delete price list failed', err);
      alert('Xóa bảng giá thất bại');
    });
  };

  const activeCount = priceLists.filter((item) => item.status === 'Kích hoạt').length;
  const pausedCount = priceLists.filter((item) => item.status === 'Tạm dừng').length;

  useEffect(() => {
    let mounted = true;
    adminService.getPriceLists().then(res => {
      if (!mounted) return;
      const arr = Array.isArray(res) ? res : [];
      setPriceLists(arr.map(p => ({ id: p.id || p.listID || p.priceListID || p.code, name: p.name || p.title, effectiveDate: p.effectiveDate || p.startDate, status: p.status || 'Tạm dừng', type: p.type || p.listType || '', itemsCount: p.itemsCount || p.count || 0, description: p.description || p.desc || '' })));
    }).catch(err => {
      console.error('Load price lists failed', err);
      setPriceLists([]);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý bảng giá</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Xem, chỉnh sửa và quản lý các bảng giá hiện hành của hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/price-lists/add')}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00288E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00288E]/90"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Tạo bảng giá mới
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tổng số bảng giá</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{priceLists.length}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Đang kích hoạt</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{activeCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tạm dừng</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{pausedCount}</p>
        </div>
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tỷ lệ sử dụng</p>
          <p className="mt-4 text-3xl font-black text-slate-900">{priceLists.length ? Math.round((activeCount / priceLists.length) * 100) : 0}%</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <label className="sr-only" htmlFor="priceListSearch">Tìm kiếm bảng giá</label>
          <input
            id="priceListSearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm theo tên hoặc mã bảng giá..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
          />
        </div>

        <div className="flex gap-3 flex-col sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="priceListStatus">Lọc trạng thái</label>
          <select
            id="priceListStatus"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
          >
            <option value="Tất cả">Tất cả</option>
            <option value="Kích hoạt">Kích hoạt</option>
            <option value="Tạm dừng">Tạm dừng</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="hidden lg:block">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-6 py-4">Mã</th>
                <th className="px-6 py-4">Tên bảng giá</th>
                <th className="px-6 py-4">Loại</th>
                <th className="px-6 py-4">Hiệu lực từ</th>
                <th className="px-6 py-4">Số sản phẩm</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLists.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-sm text-slate-500">
                    Không tìm thấy bảng giá phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLists.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{item.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">{item.name}</td>
                    <td className="px-6 py-4">{item.type}</td>
                    <td className="px-6 py-4">{formatDate(item.effectiveDate)}</td>
                    <td className="px-6 py-4">{item.itemsCount}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${item.status === 'Kích hoạt' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/price-lists/${item.id}`)}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/price-lists/edit/${item.id}`)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:hidden divide-y divide-gray-200">
          {filteredLists.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Không tìm thấy bảng giá phù hợp.</div>
          ) : (
            filteredLists.map((item) => (
              <div key={item.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.id}</p>
                    <h2 className="mt-2 text-lg font-bold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{item.type}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${item.status === 'Kích hoạt' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
                    {item.status}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Hiệu lực từ</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatDate(item.effectiveDate)}</p>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Sản phẩm</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{item.itemsCount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/price-lists/${item.id}`)}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Xem
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/price-lists/edit/${item.id}`)}
                    className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="inline-flex items-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PriceListManagement;
