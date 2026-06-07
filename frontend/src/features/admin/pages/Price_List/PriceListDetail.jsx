import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminService from '../../services/adminService';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('vi-VN');
};

const formatMoney = (value) => {
  if (value === undefined || value === null) return '-';
  return Number(value).toLocaleString('vi-VN') + ' ₫';
};

const PriceListDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [priceList, setPriceList] = useState(null);

  useEffect(() => {
    let mounted = true;
    adminService.getPriceLists().then(list => {
      if (!mounted) return;
      const arr = Array.isArray(list) ? list : [];
      const found = arr.find(p => String(p.id) === String(id));
      setPriceList(found);
    }).catch(err => {
      console.error('Load pricelists failed', err);
      setPriceList(undefined);
    });
    return () => { mounted = false; };
  }, [id]);

  if (priceList === null) {
    return (<div className="p-6">Đang tải...</div>);
  }

  if (!priceList) {
    return (
      <div className="font-inter flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">Không tìm thấy bảng giá</p>
          <p className="mt-3 text-sm text-slate-600">Bảng giá {id} không tồn tại hoặc đã bị xóa.</p>
          <button
            type="button"
            onClick={() => navigate('/admin/price-lists')}
            className="mt-6 rounded-2xl bg-[#00288E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#00288E]/90"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const items = priceList.items || [];

  return (
    <div className="font-inter flex flex-col w-full min-h-screen bg-slate-50 gap-4 pb-10 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">Chi tiết bảng giá</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Xem thông tin chi tiết và danh sách sản phẩm trong bảng giá.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/price-lists')}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Quay lại
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/price-lists/edit/${priceList.id}`)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#00288E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00288E]/90"
          >
            <span className="material-symbols-outlined">edit</span>
            Chỉnh sửa
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mã bảng giá</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{priceList.id}</p>
            </div>
            <span className={`rounded-full border px-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] ${priceList.status === 'Kích hoạt' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-amber-100 bg-amber-50 text-amber-700'}`}>
              {priceList.status}
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tên bảng giá</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{priceList.name}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Loại</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{priceList.type}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ngày hiệu lực</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(priceList.effectiveDate)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Số sản phẩm</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{priceList.itemsCount}</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Mô tả</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{priceList.description || 'Không có mô tả.'}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tóm tắt</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{items.length} sản phẩm</p>
            </div>
            <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              {priceList.status}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tổng sản phẩm</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{priceList.itemsCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ngày cập nhật</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(priceList.effectiveDate)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Danh sách sản phẩm</h2>
            <p className="mt-2 text-sm text-slate-600">Xem nhanh giá bán và mã sản phẩm trong bảng giá này.</p>
          </div>
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
            {items.length} mục
          </span>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
            Hiện chưa có sản phẩm chi tiết cho bảng giá này.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-6 py-4">Mã SP</th>
                  <th className="px-6 py-4">Tên sản phẩm</th>
                  <th className="px-6 py-4">Giá gốc</th>
                  <th className="px-6 py-4">Giá trong bảng giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <tr key={`${item.sku}-${index}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{item.sku}</td>
                    <td className="px-6 py-4">{item.name}</td>
                    <td className="px-6 py-4">{formatMoney(item.basePrice)}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{formatMoney(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceListDetail;
