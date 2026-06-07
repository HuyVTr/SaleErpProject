import React from 'react';
import { Outlet } from 'react-router-dom'; // 1. Bắt buộc import Outlet
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from './Breadcrumb';
import Footer from './Footer';

// Bạn có thể xóa chữ { children } ở đây đi vì không dùng nữa
const MainLayout = () => {
  return (
    <div className="flex h-screen w-full bg-[#f7f9fb] font-sans overflow-hidden">
      {/* Bên trái: Sidebar cố định */}
      <Sidebar />

      {/* Bên phải: Nội dung chính */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header />

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 md:p-8 flex flex-col">
          <Breadcrumb />
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-1">
            
            {/* 2. Thay chữ {children} bằng thẻ <Outlet /> */}
            <Outlet />
            
          </div>

          <Footer />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;