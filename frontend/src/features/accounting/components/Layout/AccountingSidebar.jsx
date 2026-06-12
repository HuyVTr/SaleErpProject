import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  DashboardIcon, InvoiceIcon, RevenueIcon, DebtIcon, 
  ChartIcon, SettingsIcon, LogoutIcon 
} from '../Icons/AccountingIcons';

const AccountingSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Xóa thông tin phiên đăng nhập
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    // 2. Điều hướng về trang Login (Tuyến đường / trong App.jsx)
    navigate('/');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/accounting/dashboard', icon: DashboardIcon },
    { name: 'Hóa đơn Sales', path: '/accounting/sales-invoices', icon: InvoiceIcon },
    { name: 'Thanh toán khách', path: '/accounting/payments', icon: RevenueIcon },
    { name: 'Quản lý Công nợ', path: '/accounting/debts', icon: DebtIcon },
    { name: 'Báo cáo Tài chính', path: '/accounting/reports', icon: ChartIcon },
  ];

  // Logic: Lấy thông tin người dùng từ Session/LocalStorage
  const user = JSON.parse(localStorage.getItem('user')) || {
    firstName: 'Huy',
    lastName: 'Võ',
    email: 'votruonghuy25@gmail.com',
    roleName: 'Kế toán trưởng'
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
        fixed xl:sticky top-0 left-0 h-screen w-72 acc-sidebar-bg flex flex-col shadow-2xl z-[110] xl:z-20 overflow-hidden transition-transform duration-500 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
      `}>
        {/* Brand area */}
        <div className="relative overflow-hidden shrink-0" style={{ padding: 'var(--space-xxl) var(--space-lg)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                <ChartIcon className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-white font-black text-xl tracking-tighter leading-none mb-1">HIZOGROUP</h2>
                <p className="text-blue-200/60 text-label-xs">Accounting Module</p>
              </div>
            </div>
            <div className="flex items-center">
              {/* Close button removed as requested. Sidebar can be closed by clicking backdrop */}
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-none" style={{ padding: '0 var(--space-lg)' }}>
          <p className="text-label-xs text-blue-300/40" style={{ padding: '0 var(--space-base)', marginBottom: 'var(--space-base)' }}>Danh mục quản lý</p>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              end={item.path === '/accounting/dashboard'}
              className={({ isActive }) => `
                group flex items-center gap-4 rounded-2xl transition-all duration-300 relative overflow-hidden
                ${isActive 
                  ? 'bg-white text-acc-primary shadow-xl shadow-blue-900/40' 
                  : 'text-blue-100/70 hover:bg-white/10 hover:text-white'}
              `}
              style={{ padding: 'var(--space-base) var(--space-lg)' }}
            >
              <item.icon className={`text-xl transition-transform duration-500 group-hover:scale-110`} />
              <span className="text-body-base font-bold">{item.name}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </NavLink>
          ))}

          {/* Nút quay lại hệ thống chính */}
          <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '0.0625rem solid rgba(255,255,255,0.1)' }}>
            <NavLink
              to="/home"
              className="group flex items-center gap-4 rounded-2xl transition-all duration-300 relative overflow-hidden text-blue-100/70 hover:bg-amber-400 hover:text-black"
              style={{ padding: 'var(--space-base) var(--space-lg)' }}
            >
              <span className="material-symbols-outlined text-xl transition-transform duration-500 group-hover:-translate-x-1">arrow_back_ios</span>
              <span className="text-body-base font-bold">Hệ thống Sales</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </NavLink>
          </div>
        </nav>

        {/* User & Action area */}
        <div className="shrink-0" style={{ padding: 'var(--space-lg)' }}>
          <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 relative overflow-hidden group" style={{ padding: 'var(--space-lg)' }}>
            <div className="flex items-center gap-4" style={{ marginBottom: 'var(--space-lg)' }}>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg border border-white/20">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-body-sm tracking-tight truncate">{fullName}</p>
                <p className="text-blue-200/50 text-label-xs truncate">{user.roleName || 'Nhân viên'}</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full bg-white/10 hover:bg-white text-blue-100 hover:text-acc-primary py-3 rounded-2xl flex items-center justify-center gap-3 transition-all duration-500 group/btn border border-white/5 active:scale-95"
            >
              <LogoutIcon className="text-lg rotate-180 group-hover/btn:translate-x-1 transition-transform" />
              <span className="text-label-xs font-black">Đăng xuất</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AccountingSidebar;
