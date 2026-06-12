import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AccountingSidebar from './AccountingSidebar';
import Header from '../../../../components/Layout/Header';
import { ToastProvider } from '../Common/AccountingToast';
import '../../styles/accounting.css';

const AccountingLayout = () => {
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
    <ToastProvider>
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="accounting-module-wrapper flex h-screen overflow-hidden bg-acc-surface relative select-none md:select-auto"
      >
        <AccountingSidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header onToggleSidebar={toggleSidebar} toggleBreakpoint="xl" />

          <main className="flex-1 overflow-hidden relative bg-acc-surface"> 
            <div className="absolute inset-0 flex flex-col px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5 lg:max-w-[120rem] mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};

export default AccountingLayout;
