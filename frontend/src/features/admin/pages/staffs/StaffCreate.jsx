import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import adminService from '../../services/adminService';

const StaffCreate = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('Nhân viên');
  const [showPassword, setShowPassword] = useState(false);
  const [requirePassChange, setRequirePassChange] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-start shrink-0 px-2 md:px-0">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Thêm nhân viên mới</h1>
          <p className="text-[#64748b] text-sm max-w-lg mt-1">
            Điền đầy đủ thông tin để cấp quyền truy cập hệ thống Nexus cho nhân sự mới trong tổ chức.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/admin/staffs')}
            className="px-5 py-2.5 rounded-lg font-semibold text-sm border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => {
              if (!fullName.trim() || !email.trim()) return alert('Vui lòng nhập tên và email');
              const payload = { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), role };
              adminService.createStaff(payload).then(() => navigate('/admin/staffs')).catch(err => { console.error(err); alert('Tạo nhân viên thất bại'); });
            }}
            className="bg-[#00288E] hover:bg-[#00288E]/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xl">save</span> Lưu nhân viên
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-1 md:pr-2 pb-4">
        <div className="flex flex-col xl:flex-row gap-6 mx-2 md:mx-0">
          
          {/* Cột trái: Form thông tin */}
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50 flex flex-col items-center justify-center text-center h-full min-h-[280px]">
            <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 border border-dashed border-gray-300 cursor-pointer hover:bg-gray-200 transition">
              <span className="text-3xl text-gray-400">📷</span>
            </div>
            <h3 className="font-bold text-[#0f172a] mb-1">Ảnh đại diện</h3>
            <p className="text-xs text-gray-400">Định dạng JPG, PNG. Tối đa 2MB.</p>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 bg-[#1e3a8a] rounded-full"></div>
              <h3 className="font-bold text-[#0f172a] uppercase tracking-wide text-sm">THÔNG TIN CÔNG VIỆC</h3>
            </div>

            <div className="mb-5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">PHÒNG BAN</label>
              <select className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 text-gray-700 appearance-none">
                <option>Chọn phòng ban</option>
                <option>Kinh doanh</option>
                <option>Kế toán</option>
                <option>Kho vận</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">VAI TRÒ</label>
              <div className="flex gap-2">
                {['Nhân viên', 'Quản lý', 'Admin'].map((r) => (
                  <button 
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${role === r ? 'bg-white shadow border border-gray-200 text-[#1e3a8a]' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 opacity-5">
              <svg width="120" height="120" viewBox="0 0 24 24"><path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>

            <div className="flex items-center gap-2 mb-6 relative z-10">
              <div className="w-1 h-5 bg-[#1e3a8a] rounded-full"></div>
              <h3 className="font-bold text-[#0f172a] uppercase tracking-wide text-sm">THÔNG TIN CÁ NHÂN</h3>
            </div>

            <div className="mb-5 relative z-10">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">HỌ VÀ TÊN</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nhập đầy đủ họ tên" className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 text-gray-700" />
            </div>

            <div className="grid grid-cols-2 gap-5 relative z-10">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">EMAIL</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@hola.vn" className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 text-gray-700" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">SỐ ĐIỆN THOẠI</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xx xxx xxx" className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 text-gray-700" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-50">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-5 bg-[#1e3a8a] rounded-full"></div>
              <h3 className="font-bold text-[#0f172a] uppercase tracking-wide text-sm">THIẾT LẬP TÀI KHOẢN</h3>
            </div>

            <div className="mb-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">MẬT KHẨU TẠM THỜI</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  defaultValue="holagroup123" 
                  className="w-full bg-gray-50 border-none rounded-xl p-3.5 pr-12 text-sm outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 text-gray-700 font-mono" 
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  👁️
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic">Mật khẩu mặc định có tính bảo mật trung bình.</p>
            </div>

            <div className="mt-6 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-3 cursor-pointer" onClick={() => setRequirePassChange(!requirePassChange)}>
              <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${requirePassChange ? 'bg-[#1e3a8a] text-white' : 'bg-white border border-gray-300'}`}>
                {requirePassChange && <span className="text-xs">✓</span>}
              </div>
              <span className="text-sm font-semibold text-[#0f172a]">Yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên</span>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default StaffCreate;