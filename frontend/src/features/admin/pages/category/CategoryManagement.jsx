import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import CategoryDetailDrawer from '../../components/Drawers/CategoryDetailDrawer';

const getDaysInMonth = (year, month) => new Date(year, month, 0).getDate();
const getFirstDayOfMonth = (year, month) => {
  let day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
};

const ActionButton = ({ icon, color, onClick, title }) => (
  <button 
    onClick={onClick}
    className={`rounded-xl flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 ${color}`}
    style={{ width: 'clamp(28px, 2.5vw, 40px)', height: 'clamp(28px, 2.5vw, 40px)' }}
    title={title}
  >
    <span className="material-symbols-outlined font-bold" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }}>{icon}</span>
  </button>
);

const getISOWeekString = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getISOWeek = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
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

const monthNames = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [isOpenParentDropdown, setIsOpenParentDropdown] = useState(false);
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  
  const now = new Date();
  const [timeframe, setTimeframe] = useState('monthly');
  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  // Picker visibility states
  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('days');
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const timeDropdownRef = React.useRef(null);
  const yearPickerRef = React.useRef(null);
  const weekPickerRef = React.useRef(null);
  const yearsCountPickerRef = React.useRef(null);
  const datePickerRef = React.useRef(null);

  // Click outside to close pickers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target)) setShowYearPicker(false);
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target)) setShowWeekPicker(false);
      if (yearsCountPickerRef.current && !yearsCountPickerRef.current.contains(event.target)) setShowYearsCountPicker(false);
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setDatePickerView('days');
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setIsOpenTimeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTimeframeText = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      return `ngày {selectedDay}/{m}/{y}`;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      return `tuần ${w}, ${y}`;
    }
    if (timeframe === 'monthly') return `12 tháng năm ${filterYear}`;
    if (timeframe === 'yearly') return `${filterYearsCount} năm qua`;
    return 'Toàn thời gian';
  };

  // Quản lý Modal Xóa
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState(null);

  // Quản lý Modal Sửa
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [showEditExitConfirm, setShowEditExitConfirm] = useState(false);

  // Quản lý Drawer chi tiết
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewDetail = (cat) => {
    setSelectedCategory(cat);
    setDrawerOpen(true);
  };

  // Quản lý Thông báo (Toast)
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      adminService.getCategories(),
      adminService.getProducts()
    ]).then(([catRes, prodRes]) => {
      const cats = Array.isArray(catRes) ? catRes : [];
      const prods = Array.isArray(prodRes) ? prodRes : [];
      
      setCategories(cats.map(c => {
        const rawId = c.categoryID || c.id;
        const name = c.categoryName || c.name || c.title || '';
        const count = prods.filter(p => {
          let catName = '';
          if (typeof p.categoryName === 'string') {
            catName = p.categoryName;
          } else if (p.category) {
            if (typeof p.category === 'string') {
              catName = p.category;
            } else if (typeof p.category === 'object') {
              catName = p.category.categoryName || p.category.name || '';
            }
          } else if (typeof p.categoryName === 'number') {
            catName = String(p.categoryName);
          }
          return String(p.categoryID) === String(rawId) || String(catName).toLowerCase() === String(name).toLowerCase();
        }).length;

        const parentCat = cats.find(parent => String(parent.categoryID || parent.id) === String(c.parentCategoryID));

        return {
          id: rawId,
          code: isNaN(rawId) ? String(rawId) : `DM-${String(rawId).padStart(3, '0')}`,
          name: name,
          desc: c.desc || c.description || 'Không có mô tả',
          icon: c.icon === 'texture' || c.icon === 'tiles' ? 'grid_on' : (c.icon || 'package_2'),
          productCount: count,
          parentCategoryID: c.parentCategoryID || null,
          parentCategoryName: parentCat ? (parentCat.categoryName || parentCat.name || parentCat.title) : 'Danh mục gốc',
          status: c.status || 'Đang hoạt động',
          createdAt: c.createdAt || '2026-01-01T08:00:00Z'
        };
      }));
    }).catch(err => {
      console.error('Load data failed', err);
      setCategories([]);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- LOGIC XÓA ---
  const openConfirmModal = (cat) => {
    setTargetCategory(cat);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    try {
      const products = await adminService.getProducts();
      const hasProducts = products.some(p => {
        let catName = '';
        if (typeof p.categoryName === 'string') {
          catName = p.categoryName;
        } else if (p.category) {
          if (typeof p.category === 'string') {
            catName = p.category;
          } else if (typeof p.category === 'object') {
            catName = p.category.categoryName || p.category.name || '';
          }
        }
        return String(catName).toLowerCase() === String(targetCategory?.name || '').toLowerCase();
      });

      if (hasProducts) {
        showToast('Không thể xóa! Danh mục này vẫn còn sản phẩm.', 'error');
        setTargetCategory(null);
        return;
      }

      await adminService.deleteCategory(targetCategory?.id);
      setCategories(prev => prev.filter(c => String(c.id) !== String(targetCategory.id)));
      showToast(`Đã xóa danh mục "${targetCategory.name}" thành công.`);
    } catch (err) {
      console.error('Delete category failed', err);
      showToast('Xóa danh mục thất bại', 'error');
    } finally {
      setTargetCategory(null);
    }
  };

  // --- LOGIC SỬA ---
  const openEditModal = (cat) => {
    setEditFormData({ ...cat });
    setEditSnapshot({ ...cat });
    setShowEditModal(true);
  };

  const isEditDirty = () => {
    if (!editFormData || !editSnapshot) return false;
    return JSON.stringify(editFormData) !== JSON.stringify(editSnapshot);
  };

  const handleCloseEditModal = () => {
    if (isEditDirty()) {
      setShowEditExitConfirm(true);
      return;
    }
    setShowEditModal(false);
    setEditFormData(null);
    setEditSnapshot(null);
  };

  const confirmCloseEditModal = () => {
    setShowEditExitConfirm(false);
    setShowEditModal(false);
    setEditFormData(null);
    setEditSnapshot(null);
  };

  const saveEditCategory = () => {
    const parentCat = categories.find(parent => String(parent.id) === String(editFormData.parentCategoryID));
    const updatedCategory = {
      ...editFormData,
      parentCategoryName: parentCat ? (parentCat.name || parentCat.categoryName) : 'Danh mục gốc'
    };

    const payload = {
      categoryName: editFormData.name,
      name: editFormData.name,
      description: editFormData.desc,
      desc: editFormData.desc,
      icon: editFormData.icon,
      parentCategoryID: editFormData.parentCategoryID || null,
      status: editFormData.status
    };

    adminService.updateCategory(editFormData.id, payload).then(() => {
      setCategories(prev => prev.map(c => c.id === editFormData.id ? updatedCategory : c));
      setShowEditModal(false);
      setEditFormData(null);
      setEditSnapshot(null);
      showToast(`Đã cập nhật danh mục "${editFormData.name}" thành công!`);
    }).catch(err => {
      console.error('Update category failed', err);
      showToast('Cập nhật danh mục thất bại', 'error');
    });
  };

  const matchesTimeframe = (dateStr) => {
    const pd = dateStr ? new Date(dateStr) : null;
    if (!pd || isNaN(pd.getTime())) return false;

    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      return pd.getFullYear() === y && (pd.getMonth() + 1) === m && pd.getDate() === selectedDay;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      return pd.getFullYear() === y && getISOWeek(pd) === w;
    }
    if (timeframe === 'monthly') {
      return pd.getFullYear() === filterYear;
    }
    // yearly
    const endY = new Date().getFullYear();
    const startY = endY - filterYearsCount + 1;
    return pd.getFullYear() >= startY && pd.getFullYear() <= endY;
  };

  const parentCategories = useMemo(() => {
    return categories.filter(c => c.parentCategoryID === null || c.parentCategoryID === undefined);
  }, [categories]);

  const filteredParentOptions = useMemo(() => {
    const allOptions = [{ id: '', name: 'Tất cả danh mục cha' }, ...parentCategories];
    if (!parentSearchQuery) return allOptions;
    return allOptions.filter(opt => 
      opt.name.toLowerCase().includes(parentSearchQuery.toLowerCase())
    );
  }, [parentCategories, parentSearchQuery]);

  const filteredCategories = useMemo(() => {
    return categories.filter((item) => {
      // Chỉ hiển thị các danh mục con trong bảng (có parentCategoryID)
      if (item.parentCategoryID === null || item.parentCategoryID === undefined) {
        return false;
      }
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
             item.desc.toLowerCase().includes(search.toLowerCase());
      const matchesTime = matchesTimeframe(item.createdAt);
      const matchesParent = selectedParentId ? String(item.parentCategoryID) === String(selectedParentId) : true;
      return matchesSearch && matchesTime && matchesParent;
    });
  }, [categories, search, timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay, selectedParentId]);

  const totalPages = Math.ceil(filteredCategories.length / ITEMS_PER_PAGE);
  const paginatedCategories = useMemo(() => {
    return filteredCategories.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredCategories, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, timeframe, filterWeek, filterYear, filterYearsCount, filterDate, selectedDay, selectedParentId]);

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6">
      
      {/* Header */}
      <div className="flex flex-col gap-2 sm:gap-3 px-2 md:px-0 shrink-0">
        {/* Hàng 1: tiêu đề chính riêng một dòng */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight whitespace-nowrap">Quản lý Danh mục</h1>

        {/* Hàng 2: tiêu đề phụ + action cùng một dòng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Phân loại sản phẩm ·{" "}
            <span className="inline-flex items-center align-middle mx-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap">
              {categories.length} nhóm
            </span>
          </p>

          <div className="flex flex-row items-center gap-3 w-full sm:w-auto md:w-auto md:justify-end">
            {/* Bộ lọc Thời gian Dropdown */}
            <div className="relative font-inter w-1/2 sm:w-auto" ref={timeDropdownRef}>
              <button
                onClick={() => setIsOpenTimeDropdown(!isOpenTimeDropdown)}
                aria-expanded={isOpenTimeDropdown}
                aria-haspopup="true"
                className="w-full sm:w-auto h-[46px] bg-white border border-slate-300 hover:border-[#00288E] transition-colors rounded-xl px-4 flex items-center justify-between gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 cursor-pointer text-slate-700 focus:bg-white"
                style={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
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
                      <span className="material-symbols-outlined text-[#00288E] text-[18px] font-bold">tune</span>
                      <span className="text-[13px] font-black uppercase tracking-widest text-[#00288E]">CHỌN THỜI GIAN</span>
                    </div>
                    <button
                      onClick={() => setIsOpenTimeDropdown(false)}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-200/50 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none text-slate-400 hover:text-slate-600"
                      aria-label="Đóng"
                    >
                      <span className="material-symbols-outlined text-[16px] font-bold">close</span>
                    </button>
                  </div>

                  <div className="p-5 space-y-5">
                    <div className="flex bg-slate-100 border border-slate-200 shadow-inner p-1 rounded-xl">
                      {['daily', 'weekly', 'monthly', 'yearly'].map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`flex-1 py-2 transition-colors text-center rounded-lg whitespace-nowrap text-[11px] font-black uppercase tracking-wider focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${timeframe === tf ? 'bg-white text-[#00288E] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
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
                                      className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                      style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                      aria-label="Ngày trước">
                                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setDateTempYear(y); setShowDatePicker(!showDatePicker); setDatePickerView('days'); }}
                                      className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${showDatePicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                                <span>Ngày {selectedDay}/{m}/{y}</span>
                                <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showDatePicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                              </button>
                              {showDatePicker && (
                                <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-4 min-w-[340px] animate-fade-in">
                                  {datePickerView === 'days' ? (
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn ngày</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDatePickerView('months'); }}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
                                          Tháng {m}, {y} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
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
                                                    className={`h-8 w-8 text-[11px] font-black rounded-lg transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${isSelected ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-600 hover:bg-slate-50'}`}>
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
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100 text-[11px] font-black text-blue-600 uppercase focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
                                          {dateTempYear} <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
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
                                                  className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${(idx + 1) === m && dateTempYear === y ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                                  className="w-7 h-7 rounded flex items-center justify-center hover:bg-slate-50 text-slate-400 hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
                                            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                                          </button>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span>
                                        </div>
                                        <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg">
                                          <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev - 12); }}
                                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
                                            <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                                          </button>
                                          <span className="text-[10px] font-black text-slate-500 px-1.5">{dateYearRangeStart} - {dateYearRangeStart + 11}</span>
                                          <button onClick={(e) => { e.stopPropagation(); setDateYearRangeStart(prev => prev + 12); }}
                                                  className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none">
                                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                          </button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-3 gap-1">
                                        {Array.from({ length: 12 }).map((_, i) => {
                                          const yearOpt = dateYearRangeStart + i;
                                          return (
                                            <button key={yearOpt}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setDateTempYear(yearOpt);
                                                      setDatePickerView('months');
                                                    }}
                                                    className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${yearOpt === dateTempYear ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
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
                                      className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                      style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                      aria-label="Ngày tiếp theo">
                                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                              </button>
                            </div>
                          );
                        })()}

                        {timeframe === 'weekly' && (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={weekPickerRef}>
                            <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w - 1; let newY = y; if (newW < 1) { newY--; newW = 52; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Tuần trước">
                              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowWeekPicker(!showWeekPicker); }}
                                    className={`transition-colors flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${showWeekPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>{filterWeek.replace('-W', ', Tuần ')}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showWeekPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                            </button>
                            {showWeekPicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[340px] animate-fade-in">
                                <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Tuần</span><span className="text-[10px] font-bold text-blue-600">{filterWeek.split('-W')[0]}</span></div>
                                <div className="max-h-[260px] overflow-y-auto pr-1 scrollbar-none ">
                                  <div className="flex flex-col gap-1">{[...Array(52)].map((_, i) => { const weekNum = i + 1; const currentY = filterWeek.split('-W')[0]; const weekStr = `${currentY}-W${String(weekNum).padStart(2, '0')}`; return (<button key={i} onClick={() => { setFilterWeek(weekStr); setShowWeekPicker(false); }} className={`flex items-center justify-between px-3.5 py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${filterWeek === weekStr ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><div className="flex flex-col items-start"><span className="text-[12px] font-black uppercase tracking-tight">Tuần {weekNum}</span><span className={`text-[10px] font-bold ${filterWeek === weekStr ? 'text-blue-100' : 'text-slate-400'}`}>{getWeekRange(currentY, weekNum)}</span></div>{filterWeek === weekStr && <span className="material-symbols-outlined text-[14px]">check_circle</span>}</button>); })}</div>
                                </div>
                              </div>
                            )}
                            <button onClick={() => { const [y, w] = filterWeek.split('-W').map(Number); let newW = w + 1; let newY = y; if (newW > 52) { newY++; newW = 1; } setFilterWeek(`${newY}-W${String(newW).padStart(2, '0')}`); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Tuần tiếp theo">
                              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                          </div>
                        )}

                        {timeframe === 'monthly' && (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearPickerRef}>
                            <button onClick={() => setFilterYear(prev => prev - 1)}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Năm trước">
                              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowYearPicker(!showYearPicker); }}
                                    className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${showYearPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>Năm {filterYear}</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                            </button>
                            {showYearPicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[260px] animate-fade-in">
                                <div className="flex items-center justify-between mb-2 border-b border-slate-50 pb-1.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn Năm</span><div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg"><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev - 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"><span className="material-symbols-outlined text-[12px]">chevron_left</span></button><span className="text-[9px] font-black text-slate-500 px-1">{yearRangeStart} - {yearRangeStart + 9}</span><button onClick={(e) => { e.stopPropagation(); setYearRangeStart(prev => prev + 10); }} className="w-5 h-5 rounded flex items-center justify-center hover:bg-white text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"><span className="material-symbols-outlined text-[12px]">chevron_right</span></button></div></div>
                                <div className="grid grid-cols-2 gap-1">{[...Array(10)].map((_, i) => { const y = yearRangeStart + i; return (<button key={y} onClick={() => { setFilterYear(y); setShowYearPicker(false); }} className={`text-[11px] font-black py-3 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${filterYear === y ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-500'}`}>{y}</button>); })}</div>
                              </div>
                            )}
                            <button onClick={() => { if (filterYear < now.getFullYear()) setFilterYear(prev => prev + 1); }}
                                    disabled={filterYear >= now.getFullYear()}
                                    className="hover:bg-white bg-transparent disabled:opacity-30 shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Năm tiếp theo">
                              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                            </button>
                          </div>
                        )}

                        {timeframe === 'yearly' && (
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 w-full justify-between" ref={yearsCountPickerRef}>
                            <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.max(0, opts.indexOf(filterYearsCount) - 1)]); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Giảm số năm">
                              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setShowYearsCountPicker(!showYearsCountPicker); }}
                                    className={`transition-colors flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-black text-slate-950 uppercase tracking-wider text-[12px] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${showYearsCountPicker ? 'bg-white shadow' : 'hover:bg-white'}`}>
                              <span>{filterYearsCount} Năm qua</span>
                              <span className={`material-symbols-outlined text-slate-400 text-[14px] transition-transform ${showYearsCountPicker ? 'rotate-180 text-blue-600' : ''}`}>expand_more</span>
                            </button>
                            {showYearsCountPicker && (
                              <div className="absolute top-full mt-2 right-0 left-0 z-[100] bg-white shadow-2xl rounded-2xl border border-slate-100 p-3 min-w-[200px] animate-fade-in">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1.5">Số lượng năm</div>
                                <div className="flex flex-col gap-0.5">{[3, 5, 10, 20].map((v) => (<button key={v} onClick={() => { setFilterYearsCount(v); setShowYearsCountPicker(false); }} className={`px-3.5 py-3 rounded-lg text-left transition-colors flex justify-between items-center focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${filterYearsCount === v ? 'bg-blue-600 text-white shadow' : 'hover:bg-slate-50 text-slate-600'}`}><span className="text-[11px] font-black uppercase tracking-tight">{v} Năm</span>{filterYearsCount === v && <span className="material-symbols-outlined text-[14px]">check</span>}</button>))}</div>
                              </div>
                            )}
                            <button onClick={() => { const opts = [3, 5, 10, 20]; setFilterYearsCount(opts[Math.min(opts.length - 1, opts.indexOf(filterYearsCount) + 1)]); }}
                                    className="hover:bg-white bg-transparent shadow-sm hover:shadow border border-transparent hover:border-slate-100 flex items-center justify-center text-slate-500 hover:text-[#00288E] transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none"
                                    style={{ width: '36px', height: '36px', borderRadius: '9px' }}
                                    aria-label="Tăng số năm">
                              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="button"
              onClick={() => navigate('/admin/categories/add')}
              className="w-1/2 sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00288E] px-4 h-[46px] font-black text-white uppercase tracking-widest transition-colors hover:bg-[#00288E]/90 whitespace-nowrap shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 cursor-pointer"
              style={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
            >
              <span className="material-symbols-outlined text-[16px] font-bold">add</span>
              Thêm danh mục mới
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-20 bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm flex flex-row md:flex-row justify-between items-center gap-2 lg:gap-6 mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 shrink-0">
        <div className="relative flex-1 md:w-[350px] lg:w-[400px] md:flex-none group">
          <input 
            type="text" 
            placeholder="Tìm theo tên danh mục, mô tả…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 text-sm font-bold rounded-xl pl-12 pr-4 py-3 sm:py-4 outline-none focus:bg-white focus:border-[#00288E] transition-all text-slate-700 placeholder:text-slate-300"
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors font-bold">search</span>
        </div>
        
        {/* Bộ lọc danh mục cha kiểu Dropdown cao cấp */}
        <div className="relative w-auto md:w-64 lg:w-72 font-inter">
          <button
            type="button"
            onClick={() => setIsOpenParentDropdown(!isOpenParentDropdown)}
            aria-expanded={isOpenParentDropdown}
            aria-haspopup="true"
            className="w-full bg-slate-50 border-2 border-slate-200 hover:border-[#00288E] transition-all rounded-xl px-3 sm:px-4 py-3 flex items-center justify-between gap-2 shadow-sm active:scale-95 cursor-pointer text-slate-700 focus:bg-white focus:border-[#00288E]"
            style={{ height: '54px' }}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="material-symbols-outlined text-slate-400 font-bold" style={{ fontSize: '18px' }}>folder</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider">
                {selectedParentId ? (parentCategories.find(c => String(c.id) === String(selectedParentId))?.name || 'Tất cả danh mục cha') : 'Tất cả danh mục cha'}
              </span>
            </div>
            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpenParentDropdown ? 'rotate-180 text-blue-600' : ''}`} style={{ fontSize: '18px' }} aria-hidden="true">
              keyboard_arrow_down
            </span>
          </button>

          {isOpenParentDropdown && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={() => {
                  setIsOpenParentDropdown(false);
                  setParentSearchQuery('');
                }}
              />
              
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-[460px] bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden flex flex-col max-h-[380px] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#00288E] opacity-80">CHỌN DANH MỤC CHA</span>
                  
                  <div className="relative w-40 sm:w-48 group">
                    <input
                       type="text"
                       value={parentSearchQuery}
                       onChange={(e) => setParentSearchQuery(e.target.value)}
                       placeholder="Tìm nhanh..."
                       className="w-full bg-slate-100 border border-slate-200 text-[10px] sm:text-xs font-bold rounded-xl pl-8 pr-6 py-2 outline-none focus:bg-white focus:border-blue-600 transition-all text-slate-700 placeholder:text-slate-300"
                       onClick={(e) => e.stopPropagation()}
                    />
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-bold" aria-hidden="true">search</span>
                    {parentSearchQuery && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setParentSearchQuery('');
                        }}
                        className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 text-sm font-bold flex items-center justify-center"
                      >
                        close
                      </button>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto p-4 flex-1 scrollbar-none max-h-[190px]">
                  {filteredParentOptions.length === 0 ? (
                    <div className="py-8 text-center text-xs font-bold text-slate-400 italic">
                      Không tìm thấy danh mục
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {filteredParentOptions.map((option) => {
                        const isSelected = String(selectedParentId) === String(option.id);
                        return (
                          <button
                            key={option.id || 'all'}
                            type="button"
                            title={option.name}
                            onClick={() => {
                              setSelectedParentId(option.id);
                              setIsOpenParentDropdown(false);
                              setParentSearchQuery('');
                            }}
                            className={`px-3 py-3.5 rounded-2xl text-[9px] sm:text-xs font-bold uppercase tracking-wider text-center transition-all flex items-center justify-center min-h-[48px] leading-tight active:scale-95 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-black'
                                : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                            }`}
                          >
                            <span>{option.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:border-blue-500 hover:shadow-xl transition-all duration-300 overflow-hidden mx-2 md:mx-0 flex-1 min-h-[400px]">
        {/* View A: TABLE VIEW (Chỉ hiển thị trên Desktop >= 1280px) */}
        <div className="hidden xl:block overflow-x-auto flex-1 scrollbar-none">
          <table className="w-full table-fixed text-left border-collapse min-w-[900px]" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[6%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Icon</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[10%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Mã DM</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[20%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Tên danh mục</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[18%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Danh mục cha
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Số sản phẩm
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Trạng thái
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[12%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Ngày tạo</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[10%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Thao tác
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4" aria-live="polite" aria-busy="true">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải danh mục…</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedCategories.length > 0 ? (
                paginatedCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-4" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 group-hover:bg-blue-50 group-hover:text-[#00288E] flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                      </div>
                    </td>
                    <td className="py-4 font-bold text-slate-900" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(11px, 0.9vw, 13px)' }}>{cat.code}</td>
                    <td className="py-4" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 group-hover:text-[#00288E] transition-colors truncate" style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{cat.name}</p>
                        <p className="text-[10px] font-medium text-slate-400 truncate mt-0.5">{cat.desc}</p>
                      </div>
                    </td>
                    <td className="py-4" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center w-full">
                        {cat.parentCategoryName === 'Danh mục gốc' ? (
                          <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">Gốc</span>
                        ) : (
                          <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 font-black px-2.5 py-0.5 rounded-lg text-[10px] uppercase tracking-wider">{cat.parentCategoryName}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full">
                        <span className="bg-blue-50 text-[#00288E] border border-blue-100 px-2.5 py-0.5 rounded-lg text-[10px] font-black">{cat.productCount} SP</span>
                      </div>
                    </td>
                    <td className="py-4" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center w-full">
                        <span className={`inline-flex items-center justify-center rounded-xl border font-black uppercase tracking-wider text-[9px] px-2.5 py-1 ${
                          cat.status === 'Đang hoạt động' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-orange-50 text-orange-700 border-orange-100'
                        }`}>
                          {cat.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-slate-400 font-bold" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(10px, 0.8vw, 12px)' }}>{new Date(cat.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="py-4" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <ActionButton icon="visibility" color="bg-blue-50 text-blue-600 hover:bg-blue-100" title="Chi tiết" onClick={() => handleViewDetail(cat)} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-20 text-center text-slate-400">
                    <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy danh mục nào</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View B: CARD VIEW (Hiển thị trên Mobile/Tablet < 1280px) */}
        <div className="block xl:hidden overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4" aria-live="polite" aria-busy="true">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải danh mục…</p>
            </div>
          ) : paginatedCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paginatedCategories.map((cat) => (
                <div key={cat.id} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-3 hover:border-blue-500 hover:bg-white hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-slate-500 flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
                        <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate">{cat.name}</p>
                        <p className="text-[9px] font-black text-[#00288E] tracking-wider uppercase mt-0.5">{cat.code}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <ActionButton icon="visibility" color="bg-blue-50 text-blue-600 hover:bg-blue-100" title="Chi tiết" onClick={() => handleViewDetail(cat)} />
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-slate-500 line-clamp-2 leading-relaxed">
                    {cat.desc}
                  </p>

                  <div className="flex flex-wrap gap-2 items-center mt-auto pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 mr-auto">
                      Ngày tạo: {new Date(cat.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                    
                    {cat.parentCategoryName !== 'Danh mục gốc' && (
                      <span className="bg-indigo-50 text-indigo-600 font-bold rounded-lg border border-indigo-100 uppercase tracking-tighter text-[9px] px-2 py-0.5">
                        {cat.parentCategoryName}
                      </span>
                    )}

                    <span className="bg-blue-50 text-[#00288E] font-black rounded-lg border border-blue-100 uppercase tracking-tighter text-[9px] px-2 py-0.5">
                      {cat.productCount} SP
                    </span>

                    <span className={`inline-flex items-center justify-center rounded-xl border font-black uppercase tracking-wider text-[9px] px-2 py-0.5 ${
                      cat.status === 'Đang hoạt động' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-orange-50 text-orange-700 border-orange-100'
                    }`}>
                      {cat.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400">
              <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy danh mục nào</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredCategories.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-white shrink-0">
            <span>Hiển thị {Math.min(filteredCategories.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredCategories.length, currentPage * ITEMS_PER_PAGE)} trên {filteredCategories.length} danh mục</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>
              {[...Array(Math.max(1, totalPages))].map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex justify-center items-center rounded-lg border text-xs font-black focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none transition-colors ${
                    currentPage === i + 1 
                      ? 'bg-[#00288E] text-white border-[#00288E]' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL XÁC NHẬN XÓA --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200 border border-slate-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                ⚠️
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Xác nhận xóa?</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Bạn có chắc chắn muốn xóa danh mục <span className="font-bold text-slate-700">"{targetCategory?.name}"</span>? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none shadow-lg shadow-red-200 transition-colors"
              >
                Đúng, xóa nó!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CHỈNH SỬA DANH MỤC --- */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 border border-slate-200">
            <h2 className="text-xl font-black text-[#00288E] mb-6 uppercase tracking-tight">Chỉnh sửa danh mục</h2>
            
            <div className="flex flex-col gap-5 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Tên danh mục</label>
                <input 
                  type="text" 
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-colors font-semibold text-slate-700" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Danh mục cha</label>
                <select
                  value={editFormData.parentCategoryID || ''}
                  onChange={(e) => setEditFormData({...editFormData, parentCategoryID: e.target.value || null})}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-colors font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="">Danh mục gốc (Không có cha)</option>
                  {categories
                    .filter(c => !c.parentCategoryID && String(c.id) !== String(editFormData.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Trạng thái hoạt động</label>
                <div className="flex gap-3">
                  {[
                    { id: 'Đang hoạt động', label: 'Đang hoạt động', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                    { id: 'Tạm ngưng', label: 'Tạm ngưng', color: 'text-orange-600 bg-orange-50 border-orange-200' }
                  ].map(opt => {
                    const active = editFormData.status === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditFormData({...editFormData, status: opt.id})}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${
                          active 
                            ? `${opt.color} border-current shadow-sm` 
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Mô tả danh mục</label>
                <textarea 
                  rows="3"
                  value={editFormData.desc}
                  onChange={(e) => setEditFormData({...editFormData, desc: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-colors font-medium text-slate-700 resize-none" 
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Biểu tượng đại diện</label>
                <div className="flex flex-wrap gap-2">
                  {['grid_on', 'shower', 'layers', 'package_2', 'emoji_objects', 'qr_code_2', 'construction', 'smart_toy', 'computer', 'fax'].map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setEditFormData({...editFormData, icon: ico})}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${
                        editFormData.icon === ico
                          ? 'bg-[#00288E] text-white shadow-md'
                          : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{ico}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handleCloseEditModal}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={saveEditCategory}
                className="flex-1 px-4 py-3 bg-[#00288E] text-white rounded-xl text-sm font-bold hover:bg-[#1e40af] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none shadow-md transition-colors"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL XÁC NHẬN THOÁT KHI CHỈNH SỬA DỞ --- */}
      {showEditExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-100">
              <span className="material-symbols-outlined text-4xl font-black">warning</span>
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              Thoát mà không lưu?
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-3 font-inter">
              Các thay đổi bạn vừa chỉnh sửa sẽ không được lưu lại nếu thoát ra ngoài lúc này.
            </p>
            <div className="flex gap-3 w-full mt-2">
              <button
                type="button"
                onClick={() => setShowEditExitConfirm(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95"
              >
                Ở lại
              </button>
              <button
                type="button"
                onClick={confirmCloseEditModal}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- THÔNG BÁO TOAST --- */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          <span className="text-xl">{toast.type === 'error' ? '❌' : '✅'}</span>
          <p className="text-sm font-bold tracking-wide">{toast.message}</p>
        </div>
      )}
      <CategoryDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        category={selectedCategory}
        onEdit={(cat) => {
          setDrawerOpen(false);
          openEditModal(cat);
        }}
        onDelete={(cat) => {
          setDrawerOpen(false);
          openConfirmModal(cat);
        }}
      />
    </div>
  );
};

export default CategoryManagement;