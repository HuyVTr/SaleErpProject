
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const priceListTypes = ['Bảng giá bán lẻ', 'Bảng giá bán buôn', 'Bảng giá nội bộ', 'Bảng giá đại lý'];
const priceListStatus = ['Kích hoạt', 'Tạm dừng'];

const AddPriceList = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState(priceListTypes[0]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [status, setStatus] = useState(priceListStatus[0]);
  const [itemsCount, setItemsCount] = useState(0);
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2600);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      showToast('Vui lòng nhập tên bảng giá', 'error');
      return;
    }
    if (!effectiveDate) {
      showToast('Vui lòng chọn ngày hiệu lực', 'error');
      return;
    }

    const payload = { name: name.trim(), type, effectiveDate, status, itemsCount: Number(itemsCount) || 0, description: description.trim() };
    adminService.createPriceList(payload).then(() => {
      showToast('Đã tạo bảng giá thành công');
      window.setTimeout(() => navigate('/admin/price-lists'), 1200);
    }).catch(err => {
      console.error('Create price list failed', err);
      showToast('Tạo bảng giá thất bại', 'error');
    });
  };

  return (
    <div className="font-inter flex flex-col w-full min-h-screen bg-slate-50 gap-4 pb-10 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">Thêm bảng giá</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Nhập thông tin bảng giá mới và lưu để quản lý danh sách giá bán.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/price-lists')}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold text-slate-700">Tên bảng giá</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Bảng giá tháng 5"
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="type" className="text-sm font-semibold text-slate-700">Loại bảng giá</label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            >
              {priceListTypes.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="effectiveDate" className="text-sm font-semibold text-slate-700">Ngày hiệu lực</label>
            <input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-semibold text-slate-700">Trạng thái</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            >
              {priceListStatus.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="itemsCount" className="text-sm font-semibold text-slate-700">Số sản phẩm</label>
            <input
              id="itemsCount"
              type="number"
              min="0"
              value={itemsCount}
              onChange={(e) => setItemsCount(Number(e.target.value))}
              className="w-full rounded-2xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-semibold text-slate-700">Mô tả</label>
          <textarea
            id="description"
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn về bảng giá này"
            className="w-full rounded-3xl border border-gray-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00288E] focus:ring-2 focus:ring-[#00288E]/15"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/admin/price-lists')}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-[#00288E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00288E]/90"
          >
            Lưu bảng giá
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

export default AddPriceList;
