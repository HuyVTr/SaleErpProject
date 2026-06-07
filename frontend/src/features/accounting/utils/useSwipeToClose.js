import { useState } from 'react';

export const useSwipeToClose = (onClose) => {
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [touchEndY, setTouchEndY] = useState(0);

  const handleTouchStart = (e) => {
    // Ngăn chặn sự kiện nổi lên cha để tránh kích hoạt mở sidebar của layout
    e.stopPropagation();
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    if (!touchStartX || !touchEndX) return;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Vuốt từ trái sang phải (độ dài > 70px) và chiều ngang là chủ đạo
    if (diffX > 70 && Math.abs(diffX) > Math.abs(diffY)) {
      onClose();
    }

    setTouchStartX(0);
    setTouchStartY(0);
    setTouchEndX(0);
    setTouchEndY(0);
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
};
