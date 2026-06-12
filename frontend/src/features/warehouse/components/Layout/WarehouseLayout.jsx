import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import WarehouseSidebar from './WarehouseSidebar';
import Header from '../../../../components/Layout/Header';
import '../../styles/warehouse.css';

const WarehouseLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Ngưỡng vuốt ngang tối thiểu để kích hoạt đóng/mở sidebar (px)
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;

    // Chỉ kích hoạt khi cử chỉ chủ yếu theo chiều ngang (tránh xung đột scroll dọc)
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      // Vuốt phải → Mở Sidebar
      if (distanceX > minSwipeDistance && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
      // Vuốt trái → Đóng Sidebar
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
      className="warehouse-module-wrapper flex h-screen overflow-hidden bg-[#F8FAFC] relative select-none md:select-auto"
    >
      <WarehouseSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} toggleBreakpoint="xl" />

        <main className="flex-1 overflow-hidden relative bg-[#F8FAFC]">
          <div className="absolute inset-0 flex flex-col overflow-y-auto scrollbar-none px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 lg:max-w-[120rem] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default WarehouseLayout;

