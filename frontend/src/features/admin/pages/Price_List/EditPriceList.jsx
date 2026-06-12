import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import PriceListItemsEditor from '../../components/PriceList/PriceListItemsEditor';
import CustomerAssignmentEditor from '../../components/PriceList/CustomerAssignmentEditor';

const priceListTypes = ['Bảng giá bán lẻ', 'Bảng giá bán buôn', 'Bảng giá nội bộ', 'Bảng giá đại lý'];
const priceListStatusOptions = [
  { id: 'Kích hoạt', title: 'Kích hoạt', desc: 'Áp dụng ngay cho khách hàng', color: 'emerald', icon: 'check_circle' },
  { id: 'Tạm dừng', title: 'Tạm dừng', desc: 'Chưa áp dụng / tạm khóa', color: 'orange', icon: 'pause_circle' },
];

const EditPriceList = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadedPriceList, setLoadedPriceList] = useState(null);
  const [name, setName] = useState('');
  const [type, setType] = useState(priceListTypes[0]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [status, setStatus] = useState(priceListStatusOptions[0].id);
  const [items, setItems] = useState([]);
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [initialAssignedIds, setInitialAssignedIds] = useState([]);
  const [description, setDescription] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isDirty, setIsDirty] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const initialSnapshot = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    if (initialSnapshot.current === null) return;
    const current = JSON.stringify({ name, type, effectiveDate, status, items, assignedCustomers, description });
    setIsDirty(current !== initialSnapshot.current);
  }, [name, type, effectiveDate, status, items, assignedCustomers, description]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    window.setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2600);
  };

  const handleBack = () => {
    if (isDirty) {
      setShowExitConfirm(true);
    } else {
      navigate('/admin/price-lists');
    }
  };

  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    if (!loadedPriceList) return;
    if (!name.trim()) {
      showToast('Vui lòng nhập tên bảng giá', 'error');
      return;
    }
    if (!effectiveDate) {
      showToast('Vui lòng chọn ngày hiệu lực', 'error');
      return;
    }

    const currentIds = assignedCustomers.map(c => c.customerID);
    const removedIds = initialAssignedIds.filter(cid => !currentIds.includes(cid));
    const addedIds = currentIds.filter(cid => !initialAssignedIds.includes(cid));

    setLoading(true);
    Promise.all([
      adminService.updatePriceList(loadedPriceList.id, {
        name: name.trim(), type, effectiveDate, status, itemsCount: items.length, description: description.trim()
      }),
      adminService.savePriceListItems(loadedPriceList.id, items),
      ...addedIds.map(custId => adminService.setCustomerPriceList(custId, loadedPriceList.id)),
      ...removedIds.map(custId => adminService.setCustomerPriceList(custId, null))
    ]).then(() => {
      showToast('Đã cập nhật bảng giá');
      window.setTimeout(() => navigate('/admin/price-lists'), 1200);
    }).catch(err => {
      console.error('Update price list failed', err);
      showToast('Cập nhật thất bại', 'error');
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    let mounted = true;
    Promise.all([adminService.getPriceLists(), adminService.getProducts(), adminService.getCustomers()]).then(([list, products, customers]) => {
      if (!mounted) return;
      const arr = Array.isArray(list) ? list : [];
      const productList = Array.isArray(products) ? products : [];
      const customerList = Array.isArray(customers) ? customers : [];
      const cleanTargetId = String(id).replace('BG-', '').replace(/^0+/, '');
      const found = arr.find(item => {
        const itemId = String(item.id ?? item.listID).replace('BG-', '').replace(/^0+/, '');
        return itemId === cleanTargetId;
      });
      if (!found) {
        setLoadedPriceList(undefined);
        return;
      }
      setLoadedPriceList(found);
      setName(found.name || '');
      setType(found.type || priceListTypes[0]);
      setEffectiveDate(found.effectiveDate || found.startDate || '');
      setStatus(found.status || priceListStatusOptions[0].id);
      setDescription(found.description || '');

      const assigned = customerList.filter(c => String(c.priceListId) === String(found.id));
      setAssignedCustomers(assigned);
      setInitialAssignedIds(assigned.map(c => c.customerID));

      adminService.getPriceListItems(found.id).then(savedItems => {
        if (!mounted) return;
        const arr2 = Array.isArray(savedItems) ? savedItems : [];
        const loadedItems = arr2.map(it => {
          const product = productList.find(p => String(p.productID || p.id) === String(it.productID));
          return {
            productID: it.productID,
            productName: product?.productName || it.productName || `Sản phẩm #${it.productID}`,
            unit: product?.unit || it.unit || 'cái',
            basePrice: product?.salePrice ?? it.basePrice ?? it.price,
            price: it.price
          };
        });
        setItems(loadedItems);
        initialSnapshot.current = JSON.stringify({
          name: found.name || '',
          type: found.type || priceListTypes[0],
          effectiveDate: found.effectiveDate || found.startDate || '',
          status: found.status || priceListStatusOptions[0].id,
          items: loadedItems,
          assignedCustomers: assigned,
          description: found.description || ''
        });
      }).catch(err => {
        console.error('Load price list items failed', err);
        initialSnapshot.current = JSON.stringify({
          name: found.name || '',
          type: found.type || priceListTypes[0],
          effectiveDate: found.effectiveDate || found.startDate || '',
          status: found.status || priceListStatusOptions[0].id,
          items: [],
          assignedCustomers: assigned,
          description: found.description || ''
        });
      });
    }).catch(err => {
      console.error('Load price lists failed', err);
      setLoadedPriceList(undefined);
    });
    return () => { mounted = false; };
  }, [id]);

  if (loadedPriceList === null) {
    return (
      <div className="font-inter flex min-h-screen items-center justify-center bg-slate-50 p-6" aria-live="polite" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Đang tải dữ liệu…</p>
        </div>
      </div>
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
            className="mt-6 rounded-2xl bg-[#00288E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#00288E]/90 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
          >
            Quay lại danh sách
          </button>
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
        handleBack();
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
          Chỉnh sửa bảng giá
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Cập nhật bảng giá <span className="font-bold text-slate-700">{id}</span>
          </p>
          <div className="flex w-full sm:w-auto sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none transition-colors active:scale-95 shrink-0"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              aria-busy={loading}
              className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true"></div>
              ) : (
                <span className="material-symbols-outlined text-sm sm:text-base group-hover:rotate-12 transition-transform" aria-hidden="true">save</span>
              )}
              <span>{loading ? 'Đang lưu…' : 'Lưu thay đổi'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-8 mx-2 md:mx-0 items-stretch">

          {/* Box Thông tin cơ bản */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-blue-600">sell</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin cơ bản</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên & loại bảng giá</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 mb-8">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tên bảng giá *</label>
                  <input
                    id="name"
                    type="text"
                    name="price-list-name"
                    autocomplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Bảng giá đại lý VIP…"
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-[border-color,box-shadow,background-color] text-slate-700 font-inter"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="type" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Loại bảng giá</label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-[border-color,box-shadow,background-color] text-slate-700 font-inter cursor-pointer"
                  >
                    {priceListTypes.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="effectiveDate" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ngày hiệu lực *</label>
                  <input
                    id="effectiveDate"
                    type="date"
                    name="effective-date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-[border-color,box-shadow,background-color] text-slate-700 font-inter"
                  />
                </div>
              </div>
          </div>

          {/* Box Trạng thái */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-purple-600">toggle_on</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Trạng thái</h3>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="sr-only">Trạng thái bảng giá</legend>
              {priceListStatusOptions.map((item) => {
                const active = status === item.id;
                return (
                  <div 
                    key={item.id} 
                    className={`relative flex items-center border-2 rounded-2xl transition-colors focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 ${
                      active ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="radio"
                      id={`edit-status-${item.id}`}
                      name="status"
                      value={item.id}
                      checked={active}
                      onChange={() => setStatus(item.id)}
                      className="sr-only"
                    />
                    <label
                      htmlFor={`edit-status-${item.id}`}
                      className="w-full flex items-center justify-between p-4 cursor-pointer outline-none select-none"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${active ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'}`}>
                          {active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>}
                        </div>
                        <div>
                          <p className={`font-black text-xs uppercase tracking-tight ${active ? 'text-blue-600' : 'text-slate-900'}`}>{item.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined text-[20px] ${item.color === 'emerald' ? 'text-emerald-500' : 'text-orange-500'}`} aria-hidden="true">{item.icon}</span>
                    </label>
                  </div>
                );
              })}
            </fieldset>
          </div>

          {/* Box Sản phẩm áp dụng */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-orange-600">inventory_2</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sản phẩm áp dụng</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thiết lập giá theo từng sản phẩm</p>
              </div>
            </div>
            <PriceListItemsEditor items={items} onChange={setItems} />
          </div>

          {/* Box Khách hàng áp dụng */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-emerald-600">groups</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Khách hàng áp dụng</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gán bảng giá cho khách hàng</p>
              </div>
            </div>
            <CustomerAssignmentEditor customers={assignedCustomers} onChange={setAssignedCustomers} />
          </div>

          {/* Box Mô tả */}
          <div className="min-w-0 bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center" aria-hidden="true">
                <span className="material-symbols-outlined text-teal-600">description</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mô tả bảng giá</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ghi chú thêm (không bắt buộc)</p>
              </div>
            </div>
            <div className="space-y-2">
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                placeholder="Mô tả ngắn về bảng giá này…"
                className="w-full max-w-full resize-none bg-slate-50 border-2 border-transparent rounded-[2rem] p-5 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-[border-color,box-shadow,background-color] text-slate-700 font-inter"
              />
            </div>
          </div>

          {/* Ô trống */}
          <div className="hidden xl:block"></div>
        </form>
      </div>

      {toast.show && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`fixed inset-x-4 bottom-6 z-50 rounded-3xl border px-4 py-3 text-sm shadow-lg ${toast.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
        >
          {toast.message}
        </div>
      )}

      {showExitConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div
            role="alertdialog"
            aria-labelledby="exit-modal-title"
            aria-describedby="exit-modal-desc"
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-scale-in"
          >
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-100" aria-hidden="true">
              <span className="material-symbols-outlined text-4xl font-black">warning</span>
            </div>
            <h3 id="exit-modal-title" className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              Thoát mà không lưu?
            </h3>
            <p id="exit-modal-desc" className="text-xs text-slate-500 font-semibold leading-relaxed mb-3 font-inter">
              Các thay đổi bạn vừa chỉnh sửa sẽ không được lưu lại nếu thoát ra ngoài lúc này.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/price-lists')}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500/50 focus-visible:outline-none text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditPriceList;
