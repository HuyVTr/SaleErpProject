import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import SalesSidebar from './SalesSidebar';
import Header from '../../../../components/Layout/Header';

const SalesLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Ngưỡng vuốt ngang tối thiểu để kích hoạt đóng/mở sidebar (px)
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    const clientX = e.targetTouches[0].clientX;
    const clientY = e.targetTouches[0].clientY;

    setTouchStart({ x: clientX, y: clientY });
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;

    // Đảm bảo cử chỉ vuốt là theo chiều ngang (tránh xung đột với cuộn dọc trang)
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Vuốt từ trái sang phải -> Mở Sidebar
      if (distanceX > minSwipeDistance && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
      // Vuốt từ phải sang trái -> Đóng Sidebar
      else if (distanceX < -minSwipeDistance && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="sales-layout-root flex h-screen overflow-hidden bg-slate-50 relative select-none md:select-auto"
    >
      <style>{`
        @media (max-height: 600px) and (max-width: 1024px) {
          .sales-layout-root {
            height: auto !important;
            min-height: 100vh !important;
            overflow-y: auto !important;
          }
          .sales-layout-content-wrapper {
            height: auto !important;
            min-height: 100vh !important;
            overflow-y: visible !important;
          }
          .sales-main-container {
            height: auto !important;
            min-height: calc(100vh - 64px) !important;
            overflow-y: visible !important;
          }
          .sales-outlet-container {
            position: relative !important;
            inset: auto !important;
            height: auto !important;
            min-height: 0 !important;
            overflow-y: visible !important;
          }
        }
      `}</style>

      <SalesSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="sales-layout-content-wrapper flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex items-center bg-white border-b border-gray-200 shrink-0 pr-4">
           <button 
             onClick={toggleSidebar}
             className="xl:hidden pl-4 pr-2 py-4 text-slate-500 hover:text-[#00288E] transition-colors"
           >
             <span className="material-symbols-outlined text-3xl">menu</span>
           </button>
           <div className="flex-1 px-4 py-2 border-l border-gray-100/50 my-1 ml-1 xl:ml-0">
             <Header />
           </div>
        </div>

        <main className="sales-main-container flex-1 overflow-visible relative bg-slate-50"> 
          <div className="sales-outlet-container absolute inset-0 flex flex-col overflow-visible px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 lg:max-w-[120rem] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default SalesLayout;
