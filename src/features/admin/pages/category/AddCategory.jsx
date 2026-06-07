import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import adminService from '../../services/adminService';

const AddCategory = () => {
  const navigate = useNavigate();

  // State để lưu trữ dữ liệu nhập vào (Phục vụ cho Live Preview)
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📦');

  // Danh sách các icon để chọn
  const icons = ['📦', '△', '🧊', '🚚', '🏪', 'qr', '🏗️', '🤖', '💻', '📠'];

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-start shrink-0 px-2 md:px-0">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Thêm danh mục mới</h1>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/admin/categories')}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              if (!catName.trim()) return alert('Vui lòng nhập tên danh mục');
              const payload = { name: catName.trim(), code: catCode || undefined, description: '', icon: selectedIcon };
              adminService.createCategory(payload).then(() => {
                navigate('/admin/categories');
              }).catch(err => {
                console.error('Create category failed', err);
                alert('Lưu danh mục thất bại');
              });
            }}
            className="bg-[#00288E] hover:bg-[#00288E]/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">save</span> Lưu danh mục
          </button>
        </div>
      </div>

      {/* Content - Cuộn nội bộ */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-1 md:pr-2 pb-4">
        <div className="flex flex-col xl:flex-row gap-6 mx-2 md:mx-0">
          
          {/* CỘT TRÁI: Form nhập liệu (Chiếm 2 phần) */}
          <div className="xl:flex-[2] bg-white rounded-3xl p-8 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Tên danh mục <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Nhập tên danh mục..." 
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full bg-slate-100/70 border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:border-[#00288E] focus:bg-white transition-all font-medium text-slate-700" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
                Mã danh mục
              </label>
              <input 
                type="text" 
                placeholder="DM-001" 
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                className="w-full bg-slate-100/70 border border-slate-200 p-3.5 rounded-xl text-sm outline-none focus:border-[#00288E] focus:bg-white transition-all font-medium text-slate-700" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">
              Mô tả
            </label>
            <textarea 
              rows="4" 
              placeholder="Nhập mô tả chi tiết về danh mục này..." 
              className="w-full bg-slate-100/70 border border-slate-200 p-4 rounded-xl text-sm outline-none focus:border-[#00288E] focus:bg-white transition-all resize-none font-medium text-slate-700"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-3 uppercase tracking-wide">
              Biểu tượng đại diện
            </label>
            <div className="flex flex-wrap gap-3">
              {icons.map((icon, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                    selectedIcon === icon
                      ? 'bg-[#00288E] text-white shadow-lg shadow-blue-900/20 scale-105' // Trạng thái đang chọn
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300' // Trạng thái bình thường
                  }`}
                >
                  {/* Nếu là chữ "qr", render dạng text nhỏ, ngược lại render emoji */}
                  {icon === 'qr' ? <span className="text-xs font-bold uppercase">QR</span> : icon}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* CỘT PHẢI: Live Preview & Hướng dẫn (Chiếm 1 phần) */}
        <div className="xl:flex-[1] flex flex-col gap-6">
          
          {/* Box 1: Xem trước thẻ (Live Preview) */}
          <div className="bg-[#1e3a8a] rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
            {/* Vòng tròn trang trí mờ */}
            <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
            
            <div className="mb-8">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-white opacity-80">👁️</span>
              </div>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-2">Xem trước thẻ danh mục</p>
              <h2 className="text-2xl font-bold font-manrope leading-tight min-h-[64px]">
                {/* HIỂN THỊ ĐỘNG TÊN DANH MỤC */}
                {catName || 'Tên Danh Mục Sẽ Hiển Thị Ở Đây'}
              </h2>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4 backdrop-blur-sm border border-white/5">
              <div className="w-12 h-12 bg-[#00288E] rounded-xl flex items-center justify-center text-xl shadow-inner">
                {/* HIỂN THỊ ĐỘNG ICON */}
                {selectedIcon === 'qr' ? <span className="text-xs font-bold">QR</span> : selectedIcon}
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">
                  Mã: {catCode || 'DM-000'}
                </p>
                <p className="text-sm font-medium text-white">Số lượng mặt hàng: 0</p>
              </div>
            </div>
          </div>

          {/* Box 2: Hướng dẫn thiết lập */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_20px_rgba(0,0,0,0.03)] border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-[#00288E] text-lg">ⓘ</span> Hướng dẫn thiết lập
            </h3>
            
            <ul className="flex flex-col gap-4">
              <li className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#00288E] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">Tên danh mục nên ngắn gọn, súc tích để dễ dàng hiển thị trên các báo cáo và nhãn sản phẩm.</p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#00288E] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">Mã danh mục là duy nhất. Nếu để trống, hệ thống sẽ tự động tạo mã theo cấu trúc chuẩn ERP.</p>
              </li>
              <li className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-[#00288E] text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">Việc chọn biểu tượng phù hợp giúp nhân viên kho nhận diện nhanh danh mục sản phẩm trên máy tính bảng.</p>
              </li>
            </ul>
          </div>

        </div>
        </div>
      </div>
    </div>
  );
};

export default AddCategory;