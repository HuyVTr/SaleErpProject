import React from 'react';

const AdminDashboard = () => {
  const stats = [
    { title: 'Tổng doanh thu', value: '1.240.500.000 ₫', change: '+12.5%', isUp: true, icon: 'payments' },
    { title: 'Khách hàng mới', value: '342', change: '+5.2%', isUp: true, icon: 'groups' },
    { title: 'Đơn hàng đang giao', value: '45', change: '-2.1%', isUp: false, icon: 'local_shipping' },
    { title: 'Sản phẩm sắp hết', value: '12', change: 'Cần nhập', isUp: false, icon: 'inventory_2' },
  ];

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6">
      {/* Header - Cố định */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Bảng điều khiển Quản trị</h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">Tổng quan tình hình kinh doanh của toàn hệ thống.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium">
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Tháng này
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#00288E] text-white rounded-lg hover:bg-[#00288E]/90 transition-colors shadow-sm text-sm font-medium">
            <span className="material-symbols-outlined text-lg">download</span>
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Content - Cuộn nội bộ */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-1 md:pr-2 pb-4">
        <div className="flex flex-col gap-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 shrink-0">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#00288E]/10 flex items-center justify-center text-[#00288E]">
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  <span className={`material-symbols-outlined text-sm ${stat.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {stat.isUp ? 'trending_up' : 'trending_down'}
                  </span>
                  <span className={`text-xs font-medium ${stat.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">so với tháng trước</span>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Biểu đồ doanh thu (Mô phỏng)</h2>
              <div className="flex-1 bg-slate-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-slate-400 min-h-[250px]">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-50">bar_chart</span>
                  <p className="text-sm font-medium">Khu vực biểu đồ Recharts (Đang xây dựng)</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 mb-4 shrink-0">Sản phẩm bán chạy</h2>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-2">
                <ul className="space-y-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <span className="material-symbols-outlined text-xl">image</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">Sản phẩm Demo {i}</p>
                        <p className="text-xs text-slate-500">Đã bán: 12{i} sản phẩm</p>
                      </div>
                      <div className="text-sm font-bold text-[#00288E]">#{i}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
