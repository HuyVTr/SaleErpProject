import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const icons = ['grid_on', 'shower', 'layers', 'package_2', 'emoji_objects', 'qr_code_2', 'construction', 'smart_toy', 'computer', 'fax'];

const statusOptions = [
  { id: 'Đang hoạt động', title: 'Đang hoạt động', desc: 'Có thể gán sản phẩm', color: 'emerald', icon: 'check_circle' },
  { id: 'Tạm ngưng', title: 'Tạm ngưng', desc: 'Tạm ẩn danh mục', color: 'orange', icon: 'pause_circle' },
];

const DropdownParentCategory = ({ selectedParentId, setSelectedParentId, parentCategories }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const selectedCategory = parentCategories.find(c => String(c.id) === String(selectedParentId));
  const selectedName = selectedCategory ? (selectedCategory.categoryName || selectedCategory.name) : 'Chọn danh mục cha *';

  const filtered = parentCategories.filter(c => {
    const name = c.categoryName || c.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border-2 border-slate-100 hover:border-blue-600 transition-colors rounded-2xl p-4 flex items-center justify-between gap-3 text-slate-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-98 cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
          </div>
          <div className="text-left min-w-0">
            <p className="font-black text-xs uppercase tracking-tight truncate">{selectedName}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Danh mục cha</p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          keyboard_arrow_down
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-200 rounded-3xl shadow-2xl z-50 p-4 flex flex-col gap-3 max-h-[300px] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm nhanh danh mục…"
              className="w-full bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl pl-9 pr-4 py-2.5 outline-none focus:bg-white focus:border-blue-600 transition-colors text-slate-700 placeholder:text-slate-300"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">search</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {filtered.length > 0 ? (
              filtered.map((cat) => {
                const isSelected = String(cat.id) === String(selectedParentId);
                const name = cat.categoryName || cat.name || '';
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedParentId(cat.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-left transition-colors flex items-center justify-between focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-98 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow font-black'
                        : 'bg-slate-50/50 hover:bg-blue-50 text-slate-500 hover:text-blue-600'
                    }`}
                  >
                    <span className="truncate pr-2">{name}</span>
                    {isSelected && <span className="material-symbols-outlined text-sm shrink-0">check</span>}
                  </button>
                );
              })
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs font-bold uppercase">
                Không tìm thấy danh mục cha phù hợp
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AddCategory = () => {
  const navigate = useNavigate();

  const [isSubCategory, setIsSubCategory] = useState(false); // Switch: false = Danh mục cha, true = Danh mục con
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [parentCategoryID, setParentCategoryID] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('package_2');
  const [status, setStatus] = useState('Đang hoạt động');
  const [parentCategories, setParentCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Trạng thái modal popup thông báo
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'warning' | 'error' | 'confirm'
    onConfirm: null
  });

  const showModal = (title, message, type = 'success', onConfirm = null) => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // Theo dõi thay đổi (không tính catCode vì là mã tự sinh và chỉ đọc)
  const [isDirty, setIsDirty] = useState(false);
  const initialSnapshot = useRef(JSON.stringify({
    isSubCategory: false, catName: '', parentCategoryID: '', description: '', selectedIcon: 'package_2', status: 'Đang hoạt động'
  }));

  useEffect(() => {
    const current = JSON.stringify({ isSubCategory, catName, parentCategoryID, description, selectedIcon, status });
    setIsDirty(current !== initialSnapshot.current);
  }, [isSubCategory, catName, parentCategoryID, description, selectedIcon, status]);

  // Load parent categories & tính toán mã danh mục tự động tiếp theo
  useEffect(() => {
    adminService.getCategories().then(res => {
      const arr = Array.isArray(res) ? res : [];
      setParentCategories(arr.filter(c => !c.parentCategoryID));

      // Tính toán mã danh mục tự động tiếp theo (DM-XXX) dựa trên mã lớn nhất
      let maxNum = 0;
      arr.forEach(c => {
        const rawId = c.id || c.categoryID;
        const num = Number(rawId);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        } else {
          const codeStr = String(c.code || rawId || '');
          const match = codeStr.match(/\d+/);
          if (match) {
            const parsed = parseInt(match[0], 10);
            if (parsed > maxNum) {
              maxNum = parsed;
            }
          }
        }
      });
      const nextNum = maxNum + 1;
      setCatCode(`DM-${String(nextNum).padStart(3, '0')}`);
    }).catch(err => console.error('Load categories failed', err));
  }, []);

  const handleCancelClick = () => {
    if (!isDirty) {
      navigate('/admin/categories');
      return;
    }
    showModal(
      'Hủy bỏ thiết lập?',
      'Mọi thông tin bạn vừa nhập sẽ không được lưu lại. Bạn có chắc chắn muốn quay lại danh sách?',
      'warning',
      () => navigate('/admin/categories')
    );
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!catName.trim()) {
      return showModal('Thiếu thông tin', 'Vui lòng nhập tên danh mục bắt buộc.', 'error');
    }
    if (isSubCategory && !parentCategoryID) {
      return showModal('Thiếu thông tin', 'Vui lòng chọn danh mục cha cho danh mục con.', 'error');
    }

    showModal(
      'Xác nhận thêm danh mục',
      `Bạn chuẩn bị thêm danh mục mới "${catName.trim()}" vào hệ thống. Xác nhận lưu thông tin?`,
      'confirm',
      () => {
        setLoading(true);
        const payload = {
          name: catName.trim(),
          categoryName: catName.trim(),
          code: catCode.trim() || undefined,
          description: description.trim(),
          desc: description.trim(),
          icon: selectedIcon,
          parentCategoryID: isSubCategory ? parentCategoryID : null,
          status: status,
          createdAt: new Date().toISOString()
        };
        adminService.createCategory(payload).then(() => {
          navigate('/admin/categories');
        }).catch(err => {
          console.error('Create category failed', err);
          showModal('Thêm danh mục thất bại', 'Có lỗi xảy ra trong quá trình kết nối máy chủ. Vui lòng thử lại.', 'error');
        }).finally(() => {
          setLoading(false);
        });
      }
    );
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
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
        handleCancelClick();
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
          Thêm danh mục mới
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Thiết lập nhóm phân loại hàng hóa mới
          </p>
          <div className="flex w-full sm:w-auto sm:justify-end gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleCancelClick}
              className="px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 shrink-0"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current rounded-full animate-spin" aria-live="polite" aria-busy="true"></div>
              ) : (
                <span className="material-symbols-outlined text-sm sm:text-base group-hover:rotate-12 transition-transform" aria-hidden="true">save</span>
              )}
              <span>Lưu danh mục</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none pr-1 md:pr-2 pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8 mx-2 md:mx-0">

          {/* CỘT TRÁI: Nhập thông tin */}
          <div className="xl:flex-[2] flex flex-col gap-8">

            {/* Box Chọn Cấp độ danh mục */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-indigo-600">layers</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Cấp độ danh mục</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Xác định loại danh mục cha hoặc con</p>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner" role="group">
                <button
                  type="button"
                  role="radio"
                  aria-checked={!isSubCategory}
                  tabIndex={0}
                  onClick={() => {
                    setIsSubCategory(false);
                    setParentCategoryID('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsSubCategory(false);
                      setParentCategoryID('');
                    }
                  }}
                  className={`flex-1 py-3.5 text-center rounded-xl font-black uppercase tracking-wider text-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${
                    !isSubCategory 
                      ? 'bg-[#00288E] text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Danh mục gốc (Cha)
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSubCategory}
                  tabIndex={0}
                  onClick={() => setIsSubCategory(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsSubCategory(true);
                    }
                  }}
                  className={`flex-1 py-3.5 text-center rounded-xl font-black uppercase tracking-wider text-xs transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${
                    isSubCategory 
                      ? 'bg-[#00288E] text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Danh mục phụ (Con)
                </button>
              </div>
            </div>

            {/* Box Thông tin cơ bản */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600">category</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin cơ bản</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tên danh mục & Mã phân loại</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tên danh mục *</label>
                  <input
                    id="name"
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="VD: Thiết bị gia dụng"
                    required
                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-colors text-slate-700 font-inter"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="code" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mã danh mục (Tự động)</label>
                  <input
                    id="code"
                    type="text"
                    value={catCode}
                    readOnly
                    className="w-full bg-slate-100 border-2 border-transparent rounded-2xl p-4 text-sm font-bold outline-none text-slate-400 font-inter cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Box Biểu tượng */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-orange-600">image</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Biểu tượng đại diện</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Giúp nhân viên kho nhận diện nhanh nhóm hàng</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {icons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none ${
                      selectedIcon === icon
                        ? 'bg-[#00288E] text-white shadow-lg shadow-blue-900/20 scale-105'
                        : 'bg-slate-50 border-2 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Box Mô tả */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-teal-600">description</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mô tả danh mục</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Thông tin chi tiết về danh mục hàng hóa này</p>
                </div>
              </div>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                placeholder="Nhập ghi chú chi tiết về danh mục…"
                className="w-full bg-slate-50 border-2 border-transparent rounded-[2rem] p-5 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus:bg-white transition-colors text-slate-700 font-inter resize-none"
              />
            </div>

          </div>

          {/* CỘT PHẢI: Danh mục cha & Trạng thái */}
          <div className="xl:flex-[1] flex flex-col gap-8">

            {/* Box Danh mục cha (Chỉ hiển thị khi là danh mục con) */}
            {isSubCategory && (
              <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500 animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-purple-600">lan</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Phân cấp</h3>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">Danh mục cấp trên *</label>
                  <DropdownParentCategory
                    selectedParentId={parentCategoryID}
                    setSelectedParentId={setParentCategoryID}
                    parentCategories={parentCategories}
                  />
                </div>
              </div>
            )}

            {/* Box Trạng thái */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-shadow duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600">toggle_on</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Trạng thái</h3>
                </div>
              </div>

              <div className="flex flex-col gap-3" role="group">
                {statusOptions.map((item) => {
                  const active = status === item.id;
                  return (
                    <div
                      key={item.id}
                      role="radio"
                      aria-checked={active}
                      aria-label={`${item.title}: ${item.desc}`}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setStatus(item.id);
                        }
                      }}
                      onClick={() => setStatus(item.id)}
                      className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${active ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'}`}>
                          {active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-in zoom-in duration-200"></div>}
                        </div>
                        <div>
                          <p className={`font-black text-xs uppercase tracking-tight transition-colors ${active ? 'text-blue-600' : 'text-slate-900'}`}>{item.title}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <span className={`material-symbols-outlined text-[20px] transition-colors ${item.color === 'emerald' ? 'text-emerald-500' : 'text-orange-500'}`}>{item.icon}</span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </form>
      </div>

      {/* Modal Popup */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {modalConfig.type === 'success' && (
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
              </div>
            )}
            {modalConfig.type === 'error' && (
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">error</span>
              </div>
            )}
            {modalConfig.type === 'warning' && (
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">warning</span>
              </div>
            )}
            {modalConfig.type === 'confirm' && (
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">help</span>
              </div>
            )}

            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              {modalConfig.title}
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6 font-inter">
              {modalConfig.message}
            </p>

            <div className="flex gap-3 w-full">
              {modalConfig.type === 'confirm' || modalConfig.type === 'warning' ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      closeModal();
                    }}
                    className={`flex-1 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95 ${
                      modalConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Đồng ý
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 outline-none active:scale-95"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AddCategory;
