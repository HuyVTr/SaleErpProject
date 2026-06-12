import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Backdrop cho mobile & ipad */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 bg-[#00288E] text-white flex flex-col h-screen shrink-0 transition-transform duration-300 z-50 lg:z-0 lg:static lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 font-manrope font-bold text-2xl tracking-wider">
          <span>HIZO GROUP</span>
          <button 
            onClick={onClose}
            className="lg:hidden text-white/70 hover:text-white flex items-center justify-center p-1 rounded-lg hover:bg-white/10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          
          {/* Module Quản trị hệ thống và Danh mục */}
          <Link 
            to="/admin/dashboard" 
            onClick={onClose}
            className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
              location.pathname.startsWith('/admin') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            ⚙️ Quản trị & Danh mục
          </Link>

          {/* Module Kinh doanh */}
          <Link 
            to="/sales/dashboard" 
            onClick={onClose}
            className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
              location.pathname.startsWith('/sales') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            📈 Kinh doanh (Sales)
          </Link>

          <Link 
            to="/warehouse/dashboard" 
            onClick={onClose}
            className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
              location.pathname.startsWith('/warehouse') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            📦 Warehouse
          </Link>

          <Link 
            to="/accounting/dashboard" 
            onClick={onClose}
            className={`block px-4 py-3 rounded-lg font-medium transition-colors ${
              location.pathname.startsWith('/accounting') ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            💰 Accounting
          </Link>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;