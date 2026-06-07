import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import authService from '../../features/auth/services/authService';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await authService.getMe();
      setUser(userData);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const result = await authService.logout();
    if (result.success) {
      navigate('/');
    }
  };

  // Giá trị mặc định nếu chưa load được user hoặc chưa đăng nhập
  const displayName = user ? `${user.lastName} ${user.firstName}` : 'Admin User';
  const displayRole = user ? user.roleName : 'Quản trị viên';
  const avatarInitial = user ? user.firstName.charAt(0) : 'A';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 w-full relative">
      {/* Bên trái Header: Tìm kiếm */}
      <div className="flex items-center gap-4">
        {!location.pathname.startsWith('/accounting') && (
          <div className="relative hidden sm:block">
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="pl-10 pr-4 py-2 w-64 bg-[#f2f4f6] border border-transparent rounded-lg text-sm text-[#191c1e] focus:border-[#00288E] focus:bg-white outline-none transition-all"
            />
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-xl">
              search
            </span>
          </div>
        )}
      </div>

      {/* Bên phải Header: Thông báo & Profile */}
      <div className="flex items-center gap-5">
        {/* Nút thông báo */}
        <button className="relative text-gray-500 hover:text-[#00288E] transition-colors flex items-center justify-center p-1 rounded-full hover:bg-gray-100">
          <span className="material-symbols-outlined text-2xl">
            notifications
          </span>
          <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        {/* Profile User (Có Dropdown Hover mượt mà) */}
        <div className="relative group flex items-center gap-3 cursor-pointer pl-4 border-l border-gray-200 py-2">
          {/* Vùng hiển thị thông tin */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00288E] text-white flex items-center justify-center font-bold text-sm transition-transform group-hover:scale-110">
              {avatarInitial}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-[#191c1e] leading-none group-hover:text-[#00288E] transition-colors">
                {displayName}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-none">
                {displayRole}
              </p>
            </div>
            {/* Mũi tên chỉ xuống báo hiệu có dropdown */}
            <span className="material-symbols-outlined text-gray-400 text-sm transition-transform group-hover:rotate-180 duration-200">
              expand_more
            </span>
          </div>

          {/* Nền tàng hình nối liền khoảng trống (Invisible Bridge) */}
          <div className="absolute top-full right-0 w-full h-3 bg-transparent"></div>

          {/* Dropdown Menu (Hiển thị khi Hover) */}
          <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-gray-100 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
            {/* Thêm một "đuôi nhọn" nhỏ cho dropdown xinh hơn */}
            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-gray-100 rotate-45"></div>
            
            <div className="p-2 relative bg-white rounded-xl">
              <button className="w-full text-left px-4 py-2.5 text-sm text-[#444653] hover:bg-[#f2f4f6] hover:text-[#00288E] rounded-lg flex items-center gap-3 transition-colors">
                <span className="material-symbols-outlined text-lg">person</span>
                Hồ sơ cá nhân
              </button>
              
              <button className="w-full text-left px-4 py-2.5 text-sm text-[#444653] hover:bg-[#f2f4f6] hover:text-[#00288E] rounded-lg flex items-center gap-3 transition-colors mt-1">
                <span className="material-symbols-outlined text-lg">settings</span>
                Cài đặt tài khoản
              </button>
              
              <div className="my-1.5 border-t border-gray-100"></div>
              
              <button 
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;