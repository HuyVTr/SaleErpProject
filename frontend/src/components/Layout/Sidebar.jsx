import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#00288E] text-white flex flex-col h-screen shrink-0 transition-all duration-300">
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center border-b border-white/10 font-manrope font-bold text-2xl tracking-wider">
        HOLA GROUP
      </div>
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        
        {/* Module Quản trị hệ thống và Danh mục */}
        <Link 
          to="/admin/dashboard" 
          className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
            location.pathname.startsWith('/admin') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          ⚙️ Quản trị & Danh mục
        </Link>

        {/* Module Kinh doanh */}
        <Link 
          to="/sales/dashboard" 
          className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
            location.pathname.startsWith('/sales') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          📈 Kinh doanh (Sales)
        </Link>

        <Link 
          to="/warehouse/dashboard" 
          className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
            location.pathname.startsWith('/warehouse') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          📦 Warehouse
        </Link>

        <Link 
          to="/accounting/dashboard" 
          className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
            location.pathname.startsWith('/accounting') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          💰 Accounting
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;