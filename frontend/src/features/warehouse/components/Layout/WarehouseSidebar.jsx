import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const WarehouseSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    navigate('/');
  };

  const menuItems = [
    { name: 'Tổng quan Kho', path: '/warehouse/dashboard', icon: 'dashboard', exact: true },
    { name: 'Lệnh giao hàng', path: '/warehouse/delivery', icon: 'local_shipping' },
    { name: 'Nhập kho', path: '/warehouse/stock-import', icon: 'inventory_2' },
    { name: 'Báo cáo tồn kho', path: '/warehouse/inventory', icon: 'assessment' },
  ];

  const user = JSON.parse(localStorage.getItem('user')) || {
    firstName: 'User',
    lastName: 'Demo',
    email: 'user@example.com',
    roleName: 'Quản lý kho'
  };

  const getRoleName = (roleID) => {
    switch (Number(roleID)) {
      case 1: return 'Kế toán';
      case 2: return 'Nhân viên Sales';
      case 3: return 'Quản trị viên';
      case 4: return 'Nhân viên kho';
      case 5: return 'Super Admin';
      default: return 'Nhân viên';
    }
  };

  const fullName = `${user.lastName} ${user.firstName}`;
  const initials = `${user.lastName?.charAt(0) || ''}${user.firstName?.charAt(0) || ''}`.toUpperCase();

  return (
    <>
      {/* Backdrop for mobile & tablet */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] xl:hidden animate-fade-in"
          onClick={onClose}
        ></div>
      )}

      <aside className={`
        fixed xl:sticky top-0 left-0 h-screen w-72 bg-[#00288E] flex flex-col shadow-2xl z-[110] xl:z-20 overflow-hidden transition-transform duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
      `}>
        {/* Brand area */}
        <div className="relative overflow-hidden shrink-0" style={{ padding: '3rem 1.5rem' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <span className="material-symbols-outlined text-white text-2xl">inventory_2</span>
              </div>
              <div>
                <h2 className="text-white font-black text-xl tracking-tighter leading-none mb-1">HIZOGROUP</h2>
                <p className="text-blue-200/60" style={{ fontSize: '0.8125rem', lineHeight: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05rem' }}>Phân hệ Kho</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-none" style={{ padding: '0 1.5rem' }}>
          <p className="text-blue-300/40" style={{ padding: '0 1rem', marginBottom: '1rem', fontSize: '0.8125rem', lineHeight: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05rem' }}>Danh mục quản lý</p>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              end={item.exact}
              className={({ isActive }) => `
                group flex items-center gap-4 rounded-2xl transition-all duration-300 relative overflow-hidden
                ${isActive 
                  ? 'bg-white text-[#00288E] shadow-xl shadow-blue-900/40' 
                  : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}
              `}
              style={{ padding: '1rem 1.5rem' }}
            >
              <span className={`material-symbols-outlined text-xl transition-transform duration-500 group-hover:scale-110`}>{item.icon}</span>
              <span className="font-bold" style={{ fontSize: '1.0625rem', lineHeight: '1.6rem' }}>{item.name}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </NavLink>
          ))}


        </nav>

        {/* User & Action area */}
        <div className="shrink-0" style={{ padding: '1.5rem' }}>
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 relative overflow-hidden group" style={{ padding: '1.5rem' }}>
            <div className="flex items-center gap-4" style={{ marginBottom: '1.5rem' }}>
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg border border-white/20">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black tracking-tight truncate" style={{ fontSize: '0.9375rem', lineHeight: '1.4rem' }}>{fullName}</p>
                <p className="text-blue-200/50 truncate" style={{ fontSize: '0.8125rem', lineHeight: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05rem' }}>{user.roleName || getRoleName(user.roleID)}</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full bg-white/10 hover:bg-white text-blue-100 hover:text-[#00288E] py-3 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 group/btn border border-white/5 active:scale-95"
            >
              <span className="material-symbols-outlined text-lg rotate-180 group-hover/btn:translate-x-1 transition-transform">logout</span>
              <span style={{ fontSize: '0.8125rem', lineHeight: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05rem' }}>Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default WarehouseSidebar;
