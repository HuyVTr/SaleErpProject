import React from 'react';

const Breadcrumb = () => {
  return (
    <nav className="flex text-sm text-gray-500 mb-6">
      <ol className="flex items-center space-x-2">
        <li>
          <a href="#" className="hover:text-[#00288E] transition-colors">Trang chủ</a>
        </li>
        <li><span className="text-gray-400">/</span></li>
        <li>
          <a href="#" className="hover:text-[#00288E] transition-colors">Bảng điều khiển</a>
        </li>
        <li><span className="text-gray-400">/</span></li>
        <li className="text-[#191c1e] font-semibold">Tổng quan</li>
      </ol>
    </nav>
  );
};

export default Breadcrumb;