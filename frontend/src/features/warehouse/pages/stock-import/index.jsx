import React, { useState, useEffect, useMemo, useRef } from 'react';
import warehouseService, { formatDate } from '../../services/warehouseService';
import { formatVND, VNDDisplay, CURRENCY_CLASS_SECONDARY } from '../../../../utils/formatVND';

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

import ImportReceiptDetailDrawer from '../../components/ImportReceiptDetailDrawer';

const StockImport = () => {
  const [products, setProducts] = useState([]);
  const [importHistory, setImportHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const ITEMS_PER_PAGE = 7;
  const [errors, setErrors] = useState({});
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showConfirmRevert, setShowConfirmRevert] = useState(false);
  const [selectedReceiptToRevert, setSelectedReceiptToRevert] = useState(null);

  // States cho Search và Lọc thời gian giống warehouse/delivery
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);

  const now = new Date();
  const [timeframe, setTimeframe] = useState('monthly');
  const getISOWeekString = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Picker visibility states
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('days');
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const yearPickerRef = useRef(null);
  const weekPickerRef = useRef(null);
  const yearsCountPickerRef = useRef(null);
  const datePickerRef = useRef(null);
  const timeDropdownRef = useRef(null);

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const getTimeframeText = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      return `ngày ${selectedDay}/${m}/${y}`;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      return `tuần ${w}, ${y}`;
    }
    if (timeframe === 'monthly') return `12 tháng năm ${filterYear}`;
    if (timeframe === 'yearly') return `${filterYearsCount} năm qua`;
    return 'Toàn thời gian';
  };

  const getWeekRange = (year, week) => {
    const d = new Date(year, 0, 1);
    const dayNum = d.getDay();
    const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
    const firstMonday = new Date(d.setDate(diff));
    const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
  };

  const getTimeframeRange = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      const start = new Date(y, m - 1, selectedDay, 0, 0, 0);
      const end = new Date(y, m - 1, selectedDay, 23, 59, 59);
      return { start, end };
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      const d = new Date(y, 0, 1);
      const dayNum = d.getDay();
      const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
      const firstMonday = new Date(d.setDate(diff));
      const start = new Date(firstMonday.getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 3600000 + 59 * 60000 + 59000);
      return { start, end };
    }
    if (timeframe === 'monthly') {
      return { start: new Date(filterYear, 0, 1, 0, 0, 0), end: new Date(filterYear, 11, 31, 23, 59, 59) };
    }
    if (timeframe === 'yearly') {
      const yearsCount = filterYearsCount || 5;
      const currentYear = now.getFullYear();
      return { start: new Date(currentYear - yearsCount + 1, 0, 1, 0, 0, 0), end: new Date(currentYear, 11, 31, 23, 59, 59) };
    }
    return { start: new Date(1970, 0, 1), end: new Date(2099, 11, 31) };
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target)) setShowYearPicker(false);
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target)) setShowWeekPicker(false);
      if (yearsCountPickerRef.current && !yearsCountPickerRef.current.contains(event.target)) setShowYearsCountPicker(false);
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setDatePickerView('months');
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setIsOpenTimeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (showConfirmClose) { setShowConfirmClose(false); return; }
      if (showConfirmRevert) { setShowConfirmRevert(false); return; }
      if (isOpenTimeDropdown) { setIsOpenTimeDropdown(false); return; }
      if (showDatePicker) { setShowDatePicker(false); return; }
      if (showWeekPicker) { setShowWeekPicker(false); return; }
      if (showYearPicker) { setShowYearPicker(false); return; }
      if (showYearsCountPicker) { setShowYearsCountPicker(false); return; }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showConfirmClose, showConfirmRevert, isOpenTimeDropdown, showDatePicker, showWeekPicker, showYearPicker, showYearsCountPicker]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return 'unfold_more';
    return sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  // Lọc dữ liệu theo Search và Thời gian
  const filteredImportHistory = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const { start, end } = getTimeframeRange();
    return importHistory.filter((receipt) => {
      const matchesSearch = !search ||
        receipt.id.toLowerCase().includes(search) ||
        receipt.supplier.toLowerCase().includes(search) ||
        (receipt.notes && receipt.notes.toLowerCase().includes(search)) ||
        receipt.items.some(item => item.productName.toLowerCase().includes(search));

      const receiptTime = new Date(receipt.date).getTime();
      const matchesTime = receiptTime >= start.getTime() && receiptTime <= end.getTime();
      return matchesSearch && matchesTime;
    });
  }, [importHistory, searchTerm, timeframe, filterDate, filterWeek, filterYear, filterYearsCount, selectedDay]);

  const sortedImportHistory = useMemo(() => {
    if (!sortConfig.key) return filteredImportHistory;
    const getValue = (receipt) => {
      switch (sortConfig.key) {
        case 'id': return receipt.id;
        case 'date': return new Date(receipt.date).getTime();
        case 'supplier': return receipt.supplier;
        case 'totalValue': return receipt.totalValue;
        default: return null;
      }
    };
    return [...filteredImportHistory].sort((a, b) => {
      const aVal = getValue(a);
      const bVal = getValue(b);
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredImportHistory, sortConfig]);

  const totalPages = Math.ceil(sortedImportHistory.length / ITEMS_PER_PAGE);
  const paginatedImportHistory = useMemo(() => {
    return sortedImportHistory.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [sortedImportHistory, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [filteredImportHistory]);

  // Form state
  const [formData, setFormData] = useState({
    supplier: '',
    items: [{ _id: 1, productId: '', productName: '', quantity: 0, unitPrice: 0 }],
    notes: '',
  });
  const nextItemId = useRef(2);

  const getNextReceiptId = () => {
    let maxNum = 0;
    importHistory.forEach(item => {
      if (item.id && item.id.startsWith('NK-')) {
        const idStr = item.id.replace('NK-', '');
        if (idStr.length === 3) {
          const num = parseInt(idStr, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    return `NK-${String(maxNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prods, history] = await Promise.all([
          warehouseService.getInventory(),
          warehouseService.getImportHistory(),
        ]);
        setProducts(prods);
        setImportHistory(history);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAddItem = () => {
    const id = nextItemId.current++;
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { _id: id, productId: '', productName: '', quantity: 0, unitPrice: 0 }],
    }));
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
    if (errors[`item_${index}_productId`] || errors[`item_${index}_quantity`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`item_${index}_productId`];
        delete newErrors[`item_${index}_quantity`];
        return newErrors;
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'productId') {
        const product = products.find(p => String(p.id) === String(value));
        if (product) {
          newItems[index].productName = product.name;
          newItems[index].unitPrice = product.unitPrice;
        }
      }
      return { ...prev, items: newItems };
    });

    const errorKey = field === 'productId' ? `item_${index}_productId` : `item_${index}_quantity`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const isFormDirty = useMemo(() => {
    if (!showForm) return false;
    const hasSupplier = !!formData.supplier.trim();
    const hasNotes = !!formData.notes.trim();
    const hasItems = formData.items.some(item => item.productId || item.quantity > 0);
    return hasSupplier || hasNotes || hasItems;
  }, [formData, showForm]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa lưu trên phiếu nhập kho. Bạn có chắc muốn rời đi?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  const handleToggleForm = () => {
    if (showForm && isFormDirty) {
      setShowConfirmClose(true);
    } else {
      setShowForm(!showForm);
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.supplier.trim()) {
      newErrors.supplier = 'Vui lòng nhập tên nhà cung cấp';
    }
    formData.items.forEach((item, index) => {
      if (!item.productId) {
        newErrors[`item_${index}_productId`] = 'Chọn sản phẩm';
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'Số lượng > 0';
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    const errorKeys = Object.keys(errors);
    if (errorKeys.length > 0) {
      let elementId = '';
      if (errorKeys.includes('supplier')) {
        elementId = 'supplier-input';
      } else {
        const firstItemError = errorKeys.find(key => key.startsWith('item_'));
        if (firstItemError) {
          const [, idx, field] = firstItemError.split('_');
          elementId = field === 'productId' ? `product-select-${idx}` : `quantity-input-${idx}`;
        }
      }
      if (elementId) {
        const el = document.getElementById(elementId);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [errors]);

  const handleRevertReceipt = (id) => {
    setSelectedReceiptToRevert(id);
    setShowConfirmRevert(true);
  };

  const confirmRevertReceipt = async () => {
    if (!selectedReceiptToRevert) return;
    try {
      const res = await warehouseService.revertImportReceipt(selectedReceiptToRevert);
      if (res.success) {
        const [prods, history] = await Promise.all([
          warehouseService.getInventory(),
          warehouseService.getImportHistory(),
        ]);
        setProducts(prods);
        setImportHistory(history);
        toast(`Đã hủy phiếu nhập kho ${selectedReceiptToRevert} và hoàn trả số lượng tồn kho!`);
      } else {
        toast(res.error || 'Có lỗi xảy ra khi hủy phiếu.');
      }
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
      toast(msg);
    } finally {
      setShowConfirmRevert(false);
      setSelectedReceiptToRevert(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const rawUser = localStorage.getItem('current_user') || localStorage.getItem('user');
      const currentUser = rawUser ? JSON.parse(rawUser) : null;
      const createdBy = currentUser ? `${currentUser.lastName || ''} ${currentUser.firstName || ''}`.trim() : null;

      const receipt = {
        supplier: formData.supplier,
        items: formData.items.map(item => ({
          productId: Number(item.productId),
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        totalValue: calculateTotal(),
        notes: formData.notes,
        createdBy: createdBy || undefined
      };

      await warehouseService.createImportReceipt(receipt);

      const [prods, history] = await Promise.all([
        warehouseService.getInventory(),
        warehouseService.getImportHistory(),
      ]);
      setProducts(prods);
      setImportHistory(history);

      setFormData({ supplier: '', items: [{ _id: (nextItemId.current = 2, 1), productId: '', productName: '', quantity: 0, unitPrice: 0 }], notes: '' });
      setShowForm(false);
      toast('Tạo phiếu nhập kho thành công!');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
      toast(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]" role="status" aria-live="polite">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <p className="mt-4 text-xs font-extrabold text-gray-400 uppercase tracking-[0.2em]">Đang tải…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full min-h-0">
      {/* Toast */}
      {showToast && (
        <div 
          role="status" 
          aria-live="polite" 
          className="fixed top-4 right-4 z-[300] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 wh-animate-scale-in"
        >
          <span className="material-symbols-outlined text-lg" aria-hidden="true">check_circle</span>
          <span className="text-sm font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Hộp thoại xác nhận tùy chỉnh khi hủy form đang sửa */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm wh-animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-desc">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 wh-animate-scale-in">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <span className="material-symbols-outlined text-3xl" aria-hidden="true">warning</span>
              <h2 id="modal-title" className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">Xác nhận hủy phiếu</h2>
            </div>
            <p id="modal-desc" className="text-sm text-slate-600 font-medium mb-5 leading-relaxed">
              Phiếu nhập kho này đang có thông tin dở dang. Nếu đóng form, tất cả các dữ liệu đã nhập sẽ không được lưu. Bạn có chắc muốn tiếp tục?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmClose(false)}
                autoFocus
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
              >
                Tiếp tục nhập liệu
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setShowConfirmClose(false);
                  setShowForm(false);
                  setFormData({ supplier: '', items: [{ _id: (nextItemId.current = 2, 1), productId: '', productName: '', quantity: 0, unitPrice: 0 }], notes: '' });
                  setErrors({});
                }} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/10 focus-visible:ring-2 focus-visible:ring-red-300 outline-none"
              >
                Hủy bỏ thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận hủy phiếu nhập kho */}
      {showConfirmRevert && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm wh-animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="revert-modal-title" aria-describedby="revert-modal-desc">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 wh-animate-scale-in">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <span className="material-symbols-outlined text-3xl" aria-hidden="true">warning</span>
              <h2 id="revert-modal-title" className="text-lg font-extrabold text-slate-900 uppercase tracking-tight">Xác nhận hủy phiếu nhập</h2>
            </div>
            <p id="revert-modal-desc" className="text-sm text-slate-600 font-medium mb-5 leading-relaxed">
              Bạn có chắc chắn muốn hủy phiếu nhập kho <span className="font-extrabold text-slate-900">{selectedReceiptToRevert}</span>? Hành động này sẽ tự động trừ bớt số lượng tồn kho tương ứng của các sản phẩm trong phiếu này và không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowConfirmRevert(false); setSelectedReceiptToRevert(null); }}
                autoFocus
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
              >
                Đóng
              </button>
              <button 
                type="button" 
                onClick={confirmRevertReceipt} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-lg shadow-red-600/10 focus-visible:ring-2 focus-visible:ring-red-300 outline-none"
              >
                Hủy phiếu nhập
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 px-1 shrink-0">
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý nhập kho</h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            Đang quản lý{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap animate-fade-in tabular-nums">
              {filteredImportHistory.length} phiếu
            </span>
          </p>
          <div className="flex flex-row items-center gap-3 w-full sm:w-auto justify-end relative z-30">
          
          {/* Bộ chọn thời gian Select Time tương tự warehouse/delivery */}
          <div className="relative font-inter w-full sm:w-auto" ref={timeDropdownRef}>
            <button
              onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
              aria-expanded={isOpenTimeDropdown}
              aria-haspopup="true"
              className="w-full bg-white border border-slate-300 hover:border-[#00288E] transition-colors rounded-xl px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{
                fontSize: 'clamp(9px, 0.75vw, 11px)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }} aria-hidden="true">calendar_month</span>
                <span className="font-black text-slate-700 uppercase tracking-widest">
                  Thời gian: {getTimeframeText()}
                </span>
              </div>
              <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenTimeDropdown ? 'rotate-180 text-blue-600' : ''}`} style={{ fontSize: '14px' }} aria-hidden="true">
                keyboard_arrow_down
              </span>
            </button>

            {isOpenTimeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-[380px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col animate-fade-in origin-top-right">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00288E] text-[18px] font-bold" aria-hidden="true">tune</span>
                    <span className="text-[13px] font-black uppercase tracking-widest text-[#00288E]">CHỌN THỜI GIAN</span>
                  </div>
                  <button 
                    onClick={() => setIsOpenTimeDropdown(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Đóng"
                  >
                    <span className="material-symbols-outlined text-[16px] font-bold" aria-hidden="true">close</span>
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`flex-1 py-2 transition-colors text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${timeframe === tf ? 'bg-white text-[#00288E] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                      >
                        {tf === 'daily' ? 'Ngày' : tf === 'weekly' ? 'Tuần' : tf === 'monthly' ? 'Tháng' : 'Năm'}
                      </button>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-slate-50 flex flex-col gap-2 relative">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bộ chọn chi tiết</span>
                    <div className="flex justify-center w-full">
                      {timeframe === 'daily' && (() => {
                        const [y, m] = filterDate.split('-').map(Number);
                        return (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={datePickerRef}>
                            <button onClick={() => {
                                       const newDate = new Date(y, m - 1, selectedDay - 1);
                                       setSelectedDay(newDate.getDate());
                                       setFilterDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                                     }}
                                     className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                     style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                     aria-label="Ngày trước">
                               <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                                     aria-expanded={showDatePicker}
                                     aria-haspopup="true"
                                     className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                                 <span>Ngày {selectedDay}/{m}/{y}</span>
                                 <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showDatePicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                            </button>
                            {showDatePicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[280px] sm:min-w-[340px] animate-fade-in">
                                {datePickerView === 'days' ? (
                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn ngày</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                        Tháng {m}, {y} <span className="material-symbols-outlined text-[12px]" aria-hidden="true">arrow_forward</span>
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                      {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <div key={d} className="py-1">{d}</div>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                      {Array.from({ length: getFirstDayOfMonth(y, m) }).map((_, idx) => (
                                        <div key={`empty-${idx}`} className="h-8" />
                                      ))}
                                      {Array.from({ length: getDaysInMonth(y, m) }).map((_, idx) => {
                                        const dayNum = idx + 1;
                                        const isSelected = dayNum === selectedDay;
                                        return (
                                          <button key={dayNum}
                                                  onClick={() => { setSelectedDay(dayNum); setShowDatePicker(false); }}
                                                  className={`h-8 w-8 text-[11px] font-black rounded-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSelected ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
                                            {dayNum}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : datePickerView === 'months' ? (
                                  <div className="space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn tháng</span>
                                      <button onClick={(e) => { e.stopPropagation(); setDatePickerView('years'); setDateYearRangeStart(Math.floor(dateTempYear / 12) * 12); }}
                                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                                        {dateTempYear} <span className="material-symbols-outlined text-[12px]" aria-hidden="true">arrow_forward</span>
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {monthNames.map((mName, idx) => (
                                        <button key={mName}
                                                onClick={() => {
                                                  const newM = idx + 1;
                                                  const maxD = getDaysInMonth(dateTempYear, newM);
                                                  if (selectedDay > maxD) setSelectedDay(maxD);
                                                  setFilterDate(`${dateTempYear}-${String(newM).padStart(2, '0')}`);
                                                  setDatePickerView('days');
                                                }}
                                                className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${(idx + 1) === m && dateTempYear === y ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
                                          {mName}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3 animate-fade-in">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                      <div className="flex items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }}
                                                className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                aria-label="Quay lại chọn tháng">
                                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                      </div>
                                      <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }}
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                aria-label="Khoảng năm trước">
                                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_left</span>
                                        </button>
                                        <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }}
                                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                                aria-label="Khoảng năm sau">
                                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
                                        </button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                      {Array.from({length: 12}).map((_, i) => {
                                        const yearOpt = dateYearRangeStart + i;
                                        return (
                                          <button key={yearOpt}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDateTempYear(yearOpt);
                                                    setDatePickerView('months');
                                                  }}
                                                  className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${yearOpt === dateTempYear ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                                            {yearOpt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <button onClick={() => {
                                      const newDate = new Date(y, m - 1, selectedDay + 1);
                                      setSelectedDay(newDate.getDate());
                                      setFilterDate(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
                                    }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Ngày tiếp theo">
                               <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
                            </button>
                          </div>
                        );
                      })()}

                      {timeframe === 'weekly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={weekPickerRef}>
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w - 1; let newY = y; if (newW < 1) { newY--; newW = 52; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần trước">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                                  aria-expanded={showWeekPicker}
                                  aria-haspopup="true"
                                  className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                          </button>
                          {showWeekPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[280px] sm:min-w-[340px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-blue-600">{filterWeek.split('-W')[0]}</span></div>
                              <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                                <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filterWeek === weekStr ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check_circle</span>}</button>); })}</div>
                              </div>
                            </div>
                          )}
                          <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tuần tiếp theo">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'monthly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                          <button onClick={() => setFilterYear(prev => prev - 1)} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm trước">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }}
                                  aria-expanded={showYearPicker}
                                  aria-haspopup="true"
                                  className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>Năm {filterYear}</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                          </button>
                          {showYearPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                              <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Thập kỳ trước"><span className="material-symbols-outlined text-[12px]" aria-hidden="true">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label="Thập kỳ sau"><span className="material-symbols-outlined text-[12px]" aria-hidden="true">chevron_right</span></button></div></div>
                              <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${filterYear === y ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                            </div>
                          )}
                          <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }} 
                                  disabled={filterYear >= now.getFullYear()} 
                                  className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Năm tiếp theo">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
                          </button>
                        </div>
                      )}

                      {timeframe === 'yearly' && (
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Giảm số năm">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }}
                                  aria-expanded={showYearsCountPicker}
                                  aria-haspopup="true"
                                  className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                            <span>{filterYearsCount} Năm qua</span>
                            <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-blue-600' : ''}`} aria-hidden="true">expand_more</span>
                          </button>
                          {showYearsCountPicker && (
                            <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                              <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex justify-between items-center ${filterYearsCount === v ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]" aria-hidden="true">check</span>}</button>))}</div>
                            </div>
                          )}
                          <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }} 
                                  className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                  style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                  aria-label="Tăng số năm">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Add Receipt Button */}
          <button
            onClick={handleToggleForm}
            className="wh-btn-primary focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none shrink-0 !px-4 !py-3 text-[11px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap"
            aria-expanded={showForm}
            aria-controls="import-form-card"
            aria-label={showForm ? 'Đóng phiếu nhập kho' : 'Mở form tạo phiếu nhập kho'}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Đóng phiếu' : 'Tạo phiếu nhập kho'}
          </button>
        </div>
        </div>
      </div>

      {/* Import Form */}
      {showForm && (
        <div id="import-form-card" className="wh-card wh-card-table p-6 wh-animate-fade-up">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight mb-1">Phiếu nhập kho mới</h2>
              <p className="text-xs text-gray-400 font-bold">Điền thông tin nhà cung cấp và sản phẩm cần nhập</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Mã phiếu dự kiến</span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg tracking-wider inline-block mt-1">
                {getNextReceiptId()}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Supplier & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label htmlFor="supplier-input" className="wh-label">Nhà cung cấp *</label>
                <input
                  id="supplier-input"
                  name="supplier"
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, supplier: e.target.value }));
                    if (errors.supplier) setErrors(prev => { const n = { ...prev }; delete n.supplier; return n; });
                  }}
                  placeholder="Tên nhà cung cấp, ví dụ: Hizo Group…"
                  className={`wh-input focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${errors.supplier ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                  aria-describedby={errors.supplier ? 'supplier-error' : undefined}
                  aria-invalid={!!errors.supplier}
                  required
                  autoComplete="organization"
                />
                {errors.supplier && (
                  <span id="supplier-error" role="alert" className="text-[11px] text-red-500 font-bold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs" aria-hidden="true">error</span>
                    {errors.supplier}
                  </span>
                )}
              </div>
              <div>
                <label htmlFor="notes-input" className="wh-label">Ghi chú</label>
                <input
                  id="notes-input"
                  name="notes"
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Nhập ghi chú thêm nếu có…"
                  className="wh-input focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest block mb-0">Danh sách sản phẩm *</span>
                <button 
                  type="button" 
                  onClick={handleAddItem} 
                  className="wh-btn-secondary text-xs px-3 py-1.5 focus-visible:ring-2 focus-visible:ring-blue-300 outline-none"
                  aria-label="Thêm dòng sản phẩm"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span> Thêm dòng
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => {
                  const prodError = errors[`item_${index}_productId`];
                  const qtyError = errors[`item_${index}_quantity`];
                  return (
                    <div key={item._id} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex-[3]">
                        <select
                          id={`product-select-${index}`}
                          name={`product-${index}`}
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className={`wh-select text-sm focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${prodError ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                          aria-label={`Sản phẩm dòng ${index + 1}`}
                          aria-describedby={prodError ? `prod-error-${index}` : undefined}
                          aria-invalid={!!prodError}
                          required
                        >
                          <option value="">-- Chọn sản phẩm --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.sku} - {p.name} (Tồn: {p.stockQuantity})</option>
                          ))}
                        </select>
                        {prodError && (
                          <span id={`prod-error-${index}`} role="alert" className="text-[11px] text-red-500 font-bold mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]" aria-hidden="true">error</span>
                            {prodError}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          id={`quantity-input-${index}`}
                          name={`quantity-${index}`}
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          placeholder="Số lượng…"
                          min="1"
                          inputMode="numeric"
                          className={`wh-input text-sm focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${qtyError ? 'border-red-500 ring-2 ring-red-100' : ''}`}
                          aria-label={`Số lượng dòng ${index + 1}`}
                          aria-describedby={qtyError ? `qty-error-${index}` : undefined}
                          aria-invalid={!!qtyError}
                          aria-valuemin={1}
                          required
                        />
                        {qtyError && (
                          <span id={`qty-error-${index}`} role="alert" className="text-[11px] text-red-500 font-bold mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]" aria-hidden="true">error</span>
                            {qtyError}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={formatVND(item.unitPrice)}
                          className="wh-input text-sm bg-gray-100 font-medium tabular-nums focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
                          aria-label={`Đơn giá dòng ${index + 1}`}
                          aria-readonly="true"
                          readOnly
                        />
                      </div>
                      <div className="flex-1 flex items-center">
                        <span className="text-sm font-bold text-emerald-600 tabular-nums">
                          <VNDDisplay value={item.quantity * item.unitPrice} customColorClass="text-emerald-600" />
                        </span>
                      </div>
                      {formData.items.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(index)} 
                          className="text-red-400 hover:text-red-600 p-2 sm:p-1 self-center focus-visible:ring-2 focus-visible:ring-red-400 outline-none rounded-lg flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0"
                          aria-label={`Xóa sản phẩm ở dòng ${index + 1}`}
                        >
                          <span className="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total & Submit */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Tổng giá trị:</span>
                <span className="text-xl font-extrabold text-emerald-600 tabular-nums">
                  <VNDDisplay value={calculateTotal()} customColorClass="text-emerald-600" />
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleToggleForm}
                  className="wh-btn-secondary focus-visible:ring-2 focus-visible:ring-slate-300 outline-none"
                >
                  Hủy phiếu
                </button>
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className="wh-btn-primary focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                >
                  <span className={`material-symbols-outlined text-lg ${submitting ? 'animate-spin' : ''}`} aria-hidden="true">
                    {submitting ? 'sync' : 'save'}
                  </span>
                  {submitting ? 'Đang xử lý…' : 'Xác nhận nhập kho'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filters & Search Bar giống warehouse/delivery */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-300 shadow-sm flex flex-row gap-4 items-center justify-between hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
        <div className="relative flex-1 w-full group">
          <input
            type="text"
            aria-label="Tìm kiếm phiếu nhập kho"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo nhà cung cấp, mã phiếu, ghi chú, sản phẩm…"
            className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-4 outline-none focus:bg-white focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold" aria-hidden="true">search</span>
        </div>
      </div>

      {/* Import History */}
      <div className="wh-card wh-card-table flex flex-col flex-1 min-h-0">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 uppercase tracking-tight">Lịch sử nhập kho</h2>
            <p className="text-xs text-gray-400 font-bold mt-0.5">Các phiếu nhập kho đã thực hiện</p>
          </div>
          {searchTerm && (
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
              Kết quả lọc: <span className="text-[#00288E]">{filteredImportHistory.length}</span>
            </span>
          )}
        </div>

        {filteredImportHistory.length === 0 ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-16 text-center flex-1">
            <span className="material-symbols-outlined text-6xl text-gray-200 mb-3" aria-hidden="true">inventory_2</span>
            <p className="text-sm font-bold text-gray-400">Không tìm thấy phiếu nhập kho nào phù hợp</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* View A: TABLE VIEW (Chỉ hiển thị trên Desktop >= 1280px) */}
            <div className="hidden xl:block overflow-auto scrollbar-none" style={{ scrollbarGutter: 'stable' }}>
              <table className="wh-responsive-table w-full text-left border-collapse min-w-[900px] h-auto">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="font-black uppercase tracking-widest text-left" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '10%' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('id')}
                        className="font-black uppercase tracking-widest text-left cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                        aria-label="Sắp xếp theo mã phiếu"
                      >
                        Mã phiếu
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('id')}</span>
                      </button>
                    </th>
                    <th className="font-black uppercase tracking-widest text-left" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '12%' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('date')}
                        className="font-black uppercase tracking-widest text-left cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                        aria-label="Sắp xếp theo ngày nhập"
                      >
                        Ngày nhập
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('date')}</span>
                      </button>
                    </th>
                    <th className="font-black uppercase tracking-widest text-left" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '18%' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('supplier')}
                        className="font-black uppercase tracking-widest text-left cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                        aria-label="Sắp xếp theo nhà cung cấp"
                      >
                        Nhà cung cấp
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('supplier')}</span>
                      </button>
                    </th>
                    <th className="font-black uppercase tracking-widest text-left" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '20%' }}>Sản phẩm</th>
                    <th className="font-black uppercase tracking-widest text-center" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '10%' }}>Số lượng</th>
                    <th className="font-black uppercase tracking-widest text-left" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '12%' }}>
                      <button
                        type="button"
                        onClick={() => handleSort('totalValue')}
                        className="font-black uppercase tracking-widest text-left cursor-pointer select-none hover:text-slate-700 transition-colors inline-flex items-center gap-1 bg-transparent border-none p-0 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none"
                        aria-label="Sắp xếp theo tổng giá trị"
                      >
                        Tổng giá trị
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} aria-hidden="true">{renderSortIcon('totalValue')}</span>
                      </button>
                    </th>
                    <th className="font-black uppercase tracking-widest text-center" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '10%' }}>Người tạo</th>
                    <th className="font-black uppercase tracking-widest text-center" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)', width: '8%' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 divide-y divide-slate-100">
                  {paginatedImportHistory.map((receipt) => {
                    const totalQty = receipt.items.reduce((sum, item) => sum + item.quantity, 0);
                    return (
                      <tr 
                        key={receipt.id} 
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setIsDetailOpen(true);
                        }}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      >
                        <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full tracking-wider">
                            {receipt.id}
                          </span>
                        </td>
                        <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <span className="font-bold text-slate-600 uppercase tracking-tighter whitespace-nowrap" style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                            {formatDate(receipt.date)}
                          </span>
                        </td>
                        <td className="min-w-0" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <p className="font-black text-slate-900 uppercase tracking-tight truncate max-w-[180px]" title={receipt.supplier} style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>
                            {receipt.supplier}
                          </p>
                        </td>
                        <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          {receipt.items.length > 2 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReceipt(receipt);
                                setIsDetailOpen(true);
                              }}
                              className="text-[11px] font-black text-emerald-600 uppercase tracking-wider hover:underline inline-flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer outline-none"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                              Xem trong chi tiết sản phẩm ({receipt.items.length} SP)
                            </button>
                          ) : (
                            <div className="flex flex-col gap-0.5 max-w-[200px] min-w-0">
                              {receipt.items.map((item, i) => (
                                <span key={i} className="font-semibold text-slate-600 truncate" title={item.productName} style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                                  {item.productName}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          {receipt.items.length > 2 ? (
                            <span className="font-bold tabular-nums text-slate-700 bg-slate-100 rounded-md px-2 py-0.5" style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                              Tổng: {totalQty}
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5 items-center">
                              {receipt.items.map((item, i) => (
                                <span key={i} className="font-bold tabular-nums text-slate-700 bg-slate-100 rounded-md px-2 py-0.5" style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>
                                  {item.quantity}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <span className="font-bold text-slate-900 tabular-nums whitespace-nowrap" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>
                            <VNDDisplay value={receipt.totalValue} className={CURRENCY_CLASS_SECONDARY} />
                          </span>
                        </td>
                        <td className="text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                          <span className="font-bold text-slate-500" style={{ fontSize: 'clamp(10px, 0.85vw, 12px)' }}>{receipt.createdBy}</span>
                        </td>
                        <td className="text-center" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }} onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-1.5">
                            {receipt.status === 'cancelled' ? (
                              <span 
                                style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }}
                                className="wh-badge failed font-black rounded-lg border border-red-100 uppercase tracking-tighter whitespace-nowrap inline-flex items-center"
                              >
                                <span className="wh-badge-dot" />Đã hủy
                              </span>
                            ) : (
                              <>
                                <span 
                                  style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }}
                                  className="wh-badge delivered font-black rounded-lg border border-emerald-100 uppercase tracking-tighter whitespace-nowrap inline-flex items-center"
                                >
                                  <span className="wh-badge-dot" />Hoàn thành
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevertReceipt(receipt.id);
                                  }}
                                  className="text-[9px] font-black text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded-md transition-colors uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-red-400 outline-none cursor-pointer"
                                  aria-label={`Hủy phiếu nhập kho ${receipt.id}`}
                                >
                                  Hủy phiếu
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* View B: CARD LIST VIEW (Tối ưu hóa cho Mobile & iPad < 1280px) */}
            <div className="flex xl:hidden flex-col flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50/50 scrollbar-none">
              {/* Thanh sắp xếp thông minh khi ở chế độ card */}
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Sắp xếp theo</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { key: 'id', label: 'Mã phiếu' },
                    { key: 'date', label: 'Ngày nhập' },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'totalValue', label: 'Giá trị' }
                  ].map(item => {
                    const isSelected = sortConfig.key === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSort(item.key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 active:scale-95 focus-visible:ring-2 focus-visible:ring-[#00288E] outline-none ${
                          isSelected 
                            ? 'bg-[#00288E] text-white shadow-md shadow-blue-900/10' 
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {item.label}
                        {isSelected && (
                          <span className="material-symbols-outlined text-[11px] font-bold" aria-hidden="true">
                            {sortConfig.direction === 'asc' ? 'expand_less' : 'expand_more'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedImportHistory.map((receipt) => (
                  <div 
                    key={receipt.id}
                    onClick={() => {
                      setSelectedReceipt(receipt);
                      setIsDetailOpen(true);
                    }}
                    className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#00288E] hover:shadow-xl transition-[border-color,box-shadow] duration-300 flex flex-col justify-between h-full group cursor-pointer"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black uppercase shadow-sm shrink-0 border border-slate-100">
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">local_shipping</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-slate-900 uppercase tracking-tight text-xs sm:text-sm truncate group-hover:text-[#00288E] transition-colors" title={receipt.supplier}>
                          {receipt.supplier}
                        </div>
                        <div className="font-bold text-slate-400 uppercase tracking-widest text-[9px] mt-1">
                          Mã phiếu: {receipt.id}
                        </div>
                        <div className="font-bold text-slate-500 text-[10px] mt-1">
                          Ngày đặt: {formatDate(receipt.date)}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-auto flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Sản phẩm nhập</span>
                          {receipt.items.length <= 2 && <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">SL</span>}
                        </div>
                        {receipt.items.length > 2 ? (
                          <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-100 flex items-center justify-center text-center">
                            <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                              Xem trong chi tiết sản phẩm ({receipt.items.length} SP)
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 max-h-[120px] overflow-y-auto">
                            {receipt.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 min-w-0">
                                <span className="text-xs font-semibold text-slate-700 truncate min-w-0" title={item.productName}>
                                  {item.productName}
                                </span>
                                <span className="text-[10px] font-black tabular-nums text-slate-600 bg-slate-200/70 rounded px-1.5 py-0.5 shrink-0">
                                  {item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Tổng giá trị</span>
                        <span className="font-black text-[#00288E] tabular-nums"><VNDDisplay value={receipt.totalValue} className={CURRENCY_CLASS_SECONDARY} /></span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Người tạo</span>
                        <span className="font-bold text-slate-500">{receipt.createdBy}</span>
                      </div>
                       <div className="flex justify-between items-center border-t border-slate-100/60 pt-3">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái</span>
                        {receipt.status === 'cancelled' ? (
                          <span 
                            style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }}
                            className="wh-badge failed font-black rounded-lg border border-red-100 uppercase tracking-tighter whitespace-nowrap inline-flex items-center"
                          >
                            <span className="wh-badge-dot" />Đã hủy
                          </span>
                        ) : (
                          <span 
                            style={{ fontSize: 'clamp(8px, 0.75vw, 10px)', padding: 'clamp(3px, 0.4vw, 5px) clamp(8px, 0.8vw, 12px)' }}
                            className="wh-badge delivered font-black rounded-lg border border-emerald-100 uppercase tracking-tighter whitespace-nowrap inline-flex items-center"
                          >
                            <span className="wh-badge-dot" />Hoàn thành
                          </span>
                        )}
                      </div>
                      {receipt.status !== 'cancelled' && (
                        <div className="border-t border-slate-100/60 pt-3 flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRevertReceipt(receipt.id);
                            }}
                            className="w-full text-center py-2.5 rounded-xl text-[10px] font-black text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-100 transition-colors uppercase tracking-widest focus-visible:ring-2 focus-visible:ring-red-300 outline-none cursor-pointer"
                            aria-label={`Hủy phiếu nhập kho ${receipt.id}`}
                          >
                            Hủy phiếu nhập
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredImportHistory.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 bg-slate-50/50">
            <span className="tabular-nums">
              Hiển thị {filteredImportHistory.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
              {Math.min(currentPage * ITEMS_PER_PAGE, filteredImportHistory.length)} / {filteredImportHistory.length} phiếu nhập kho
            </span>
            {totalPages > 1 && (
              <nav aria-label="Phân trang" className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="Trang trước"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors uppercase tracking-widest text-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Trước
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    aria-label={`Trang ${p}`}
                    aria-current={currentPage === p ? 'page' : undefined}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      currentPage === p
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                        : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="tabular-nums">{p}</span>
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="Trang sau"
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors uppercase tracking-widest text-[9px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Sau
                </button>
              </nav>
            )}
          </div>
        )}
      </div>

      <ImportReceiptDetailDrawer
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedReceipt(null);
        }}
        receipt={selectedReceipt}
        onRevert={(id) => {
          setIsDetailOpen(false);
          handleRevertReceipt(id);
        }}
      />
    </div>
  );
};

export default StockImport;
