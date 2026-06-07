import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminService from '../../services/adminService';

const priceListTypes = ['Bảng giá bán lẻ', 'Bảng giá bán buôn', 'Bảng giá nội bộ', 'Bảng giá đại lý'];
const priceListStatus = ['Kích hoạt', 'Tạm dừng'];

const EditPriceList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loadedPriceList, setLoadedPriceList] = useState(null);
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
    if (!loadedPriceList) return;
    if (!name.trim()) {
      showToast('Vui lòng nhập tên bảng giá', 'error');
      return;
    }
    if (!effectiveDate) {
      showToast('Vui lòng chọn ngày hiệu lực', 'error');
      return;
    }

    adminService.updatePriceList(loadedPriceList.id, {
      name: name.trim(), type, effectiveDate, status, itemsCount: Number(itemsCount) || 0, description: description.trim()
    }).then(() => {
      showToast('Đã cập nhật bảng giá');
      window.setTimeout(() => navigate('/admin/price-lists'), 1200);
    }).catch(err => {
      console.error('Update price list failed', err);
      showToast('Cập nhật thất bại', 'error');
    });
  };

  useEffect(() => {
    let mounted = true;
    adminService.getPriceLists().then(list => {
      if (!mounted) return;
      const arr = Array.isArray(list) ? list : [];
      const found = arr.find(item => String(item.id) === String(id) || String(item.listID) === String(id));
      if (!found) {
        setLoadedPriceList(undefined);
        return;
      }
      setLoadedPriceList(found);
      setName(found.name || '');
      setType(found.type || priceListTypes[0]);
      setEffectiveDate(found.effectiveDate || found.startDate || '');
      setStatus(found.status || priceListStatus[0]);
      setItemsCount(found.itemsCount || 0);
      setDescription(found.description || '');
    }).catch(err => {
      console.error('Load price lists failed', err);
      setLoadedPriceList(undefined);
    });
    return () => { mounted = false; };
  }, [id]);

  if (loadedPriceList === null) {
    return (
      <div className="p-6">Đang tải...</div>
    );
  }

  if (loadedPriceList === undefined) {
    return (
      <div className="font-inter flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="rounded-3xl border border-rose-200 bg-white p-10 text-center shadow-sm">
          <p className="text-2xl font-bold text-slate-900">Bảng giá không tồn tại</p>
          <p className="mt-3 text-sm text-slate-600">Không tìm thấy bảng giá với mã {id}. Vui lòng kiểm tra lại.</p>
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

  return (
    <div className="font-inter flex flex-col w-full min-h-screen bg-slate-50 gap-4 pb-10 animate-fade-in">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">Chỉnh sửa bảng giá</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">
            Cập nhật thông tin bảng giá {id} và lưu thay đổi.
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
              placeholder="Ví dụ: Bảng giá đại lý VIP"
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
            Lưu thay đổi
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

export default EditPriceList;
