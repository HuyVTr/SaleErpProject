import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const CategoryManagement = () => {
  const navigate = useNavigate();

  // --- 1. Dữ liệu & Trạng thái ---
  const [categories, setCategories] = useState([]);

  // Quản lý Modal Xóa
  const [showModal, setShowModal] = useState(false);
  const [targetCategory, setTargetCategory] = useState(null);

  // Quản lý Modal Sửa
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  // Quản lý Thông báo (Toast)
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // --- 2. Xử lý Logic ---

  // Hiện thông báo và tự ẩn sau 3 giây
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  // --- LOGIC XÓA ---
  const openConfirmModal = (cat) => {
    setTargetCategory(cat);
    setShowModal(true);
  };

  const confirmDelete = () => {
    setShowModal(false); // Đóng modal trước
    // Nếu muốn giữ ràng buộc demo: ID 3 không cho xóa
    if (targetCategory?.id === 3) {
      showToast('Không thể xóa! Danh mục này vẫn còn sản phẩm.', 'error');
      setTargetCategory(null);
      return;
    }

    adminService.deleteCategory(targetCategory?.id).then(() => {
      setCategories(prev => prev.filter(c => String(c.id) !== String(targetCategory.id)));
      showToast(`Đã xóa danh mục "${targetCategory.name}" thành công.`);
      setTargetCategory(null);
    }).catch(err => {
      console.error('Delete category failed', err);
      showToast('Xóa danh mục thất bại', 'error');
      setTargetCategory(null);
    });
  };

  // --- LOGIC SỬA ---
  const openEditModal = (cat) => {
    setEditFormData({ ...cat }); // Copy dữ liệu danh mục được click
    setShowEditModal(true);
  };

  const saveEditCategory = () => {
    // Thay thế danh mục cũ bằng dữ liệu mới
    adminService.updateCategory(editFormData.id, editFormData).then(() => {
      const updatedCategories = categories.map(c => c.id === editFormData.id ? editFormData : c);
      setCategories(updatedCategories);
      setShowEditModal(false);
      showToast(`Đã cập nhật danh mục "${editFormData.name}" thành công!`);
    }).catch(err => {
      console.error('Update category failed', err);
      showToast('Cập nhật danh mục thất bại', 'error');
    });
  };

  useEffect(() => {
    let mounted = true;
    adminService.getCategories().then(res => {
      if (!mounted) return;
      const arr = Array.isArray(res) ? res : [];
      setCategories(arr.map(c => ({ id: c.categoryID || c.id, name: c.categoryName || c.name || c.title, desc: c.desc || c.description || '', icon: c.icon || '📁' })));
    }).catch(err => {
      console.error('Load categories failed', err);
      setCategories([]);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6">
      
      {/* --- HEADER --- */}
      <div className="flex justify-between items-start shrink-0 px-2 md:px-0">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý danh mục</h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-1 max-w-lg leading-relaxed">
            Quản lý kho doanh nghiệp. Điều chỉnh và phân loại các nhóm sản phẩm trong hệ thống.
          </p>
        </div>
        <button 
          onClick={() => navigate('/admin/categories/add')}
          className="bg-[#00288E] hover:bg-[#00288E]/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-xl">add_circle</span> Thêm danh mục
        </button>
      </div>

      {/* Content - Cuộn nội bộ */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-1 md:pr-2 pb-4">
        <div className="flex flex-col gap-4 mx-2 md:mx-0">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl p-5 flex items-center justify-between border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-xl bg-[#eff3ff] text-[#00288E] flex items-center justify-center text-2xl">
                {cat.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">{cat.name}</h3>
                <p className="text-sm text-slate-500">{cat.desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* NÚT SỬA */}
              <button 
                onClick={() => openEditModal(cat)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-[#00288E] transition-colors"
              >
                ✎
              </button>
              {/* NÚT XÓA */}
              <button 
                onClick={() => openConfirmModal(cat)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL XÁC NHẬN XÓA --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
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
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
              >
                Đúng, xóa nó!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CHỈNH SỬA DANH MỤC --- */}
      {showEditModal && editFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-[#1e3a8a] mb-6 font-manrope">Chỉnh sửa danh mục</h2>
            
            <div className="flex flex-col gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Tên danh mục</label>
                <input 
                  type="text" 
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:border-[#00288E] focus:bg-white transition-all font-semibold text-slate-700" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Mô tả danh mục</label>
                <textarea 
                  rows="3"
                  value={editFormData.desc}
                  onChange={(e) => setEditFormData({...editFormData, desc: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:border-[#00288E] focus:bg-white transition-all font-medium text-slate-700 resize-none" 
                ></textarea>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={saveEditCategory}
                className="flex-1 px-4 py-3 bg-[#00288E] text-white rounded-xl text-sm font-bold hover:bg-[#1e40af] shadow-md transition-all"
              >
                Lưu thay đổi
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

        </div>
      </div>
  );
};

export default CategoryManagement;