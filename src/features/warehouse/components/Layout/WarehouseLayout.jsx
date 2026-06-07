import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import WarehouseSidebar from './WarehouseSidebar';
import Header from '../../../../components/Layout/Header';
import '../../styles/warehouse.css';

const WarehouseLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="warehouse-module-wrapper flex h-screen overflow-hidden bg-[#F8FAFC] relative">
      <button
        onClick={toggleSidebar}
        className="xl:hidden fixed bottom-6 right-6 w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center z-[120] active:scale-90 transition-transform"
      >
        <span className="material-symbols-outlined text-3xl">
          {isSidebarOpen ? 'close' : 'menu'}
        </span>
      </button>

      <WarehouseSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Wrapper */}
        <div className="flex items-center bg-white border-b border-gray-200 shrink-0 pr-4">
           <button
             onClick={toggleSidebar}
             className="xl:hidden pl-4 pr-2 py-4 text-gray-400 hover:text-slate-900 transition-colors"
           >
             <span className="material-symbols-outlined text-3xl">menu</span>
           </button>
           <div className="flex-1 px-4 py-2 border-l border-gray-100/50 my-1 ml-1 xl:ml-0">
             <Header />
           </div>
        </div>

        <main className="flex-1 overflow-y-auto xl:overflow-hidden relative bg-[#F8FAFC] scrollbar-thin scrollbar-thumb-slate-200">
          <div className="min-h-full xl:absolute xl:inset-0 flex flex-col xl:overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 lg:max-w-[120rem] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default WarehouseLayout;
