import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const StaffManagement = () => {
  const navigate = useNavigate();

  const [staffList, setStaffList] = useState([]);

  const [openRoleMenu, setOpenRoleMenu] = useState(null);
  const roles = ['Admin', 'Sales', 'Warehouse', 'Accounting'];

  const handleRoleChange = (id, newRole) => {
    // update via service
    adminService.updateStaff(id, { role: newRole }).then(() => {
      setStaffList(prev => prev.map(staff => String(staff.id) === String(id) ? { ...staff, role: newRole } : staff));
      setOpenRoleMenu(null);
    }).catch(err => {
      console.error('Update staff role failed', err);
      setOpenRoleMenu(null);
    });
  };

  useEffect(() => {
    let mounted = true;
    adminService.getStaffs().then(res => {
      if (!mounted) return;
      const arr = Array.isArray(res) ? res : [];
      const mapped = arr.map(u => ({
        id: u.userID || u.id,
        name: u.fullName || `${u.lastName || ''} ${u.firstName || ''}`.trim() || u.name || 'Người dùng',
        email: u.email || u.userEmail || '',
        avatar: u.avatar || u.image || null,
        initials: (u.firstName && u.lastName) ? `${(u.firstName[0]||'').toUpperCase()}${(u.lastName[0]||'').toUpperCase()}` : (u.initials || ''),
        bgColor: 'bg-indigo-100 text-indigo-700',
        dept: u.dept || u.department || u.group || 'Chưa phân',
        role: u.role || u.roleName || 'User',
        status: u.status || 'Hoạt động',
        lastLogin: u.lastLogin || 'N/A'
      }));
      setStaffList(mapped);
    }).catch(err => {
      console.error('Load staffs failed', err);
      setStaffList([]);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6">
      
      {/* 1. Tiêu đề & Nút Thêm mới (Gọi navigate qua App) */}
      <div className="flex justify-between items-start shrink-0 px-2 md:px-0">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">Quản lý Nhân sự & Phân quyền</h1>
          <p className="text-sm sm:text-base text-slate-600 font-medium mt-1 max-w-lg leading-relaxed">
            Hệ thống quản trị tập trung cho Hola Group. Điều chỉnh vai trò, quyền hạn và giám sát hoạt động của đội ngũ nhân viên.
          </p>
        </div>
        
        <button 
          onClick={() => navigate('/admin/staffs/add')}
          className="bg-[#00288E] hover:bg-[#00288E]/90 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-xl">person_add</span> Thêm nhân viên mới
        </button>
      </div>

      {/* Content - Cuộn nội bộ */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 pr-1 md:pr-2 pb-4">
        <div className="flex flex-col gap-6">

          {/* 2. Thanh tìm kiếm và bộ lọc */}
          <div className="flex gap-4 shrink-0 px-2 md:px-0">
            <div className="relative flex-1 max-w-md">
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên hoặc email..." 
                className="w-full bg-white border border-gray-200 shadow-sm rounded-lg py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#00288E]/20" 
              />
              <span className="absolute left-3 top-2.5 opacity-40">🔍</span>
            </div>
            <select className="bg-white border border-gray-200 shadow-sm text-gray-600 text-sm rounded-lg px-4 py-2.5 outline-none font-medium appearance-none pr-10">
              <option>Tất cả phòng ban</option>
              <option>Kinh doanh</option>
              <option>Kế toán</option>
            </select>
            <button className="bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">filter_list</span> Lọc thêm
            </button>
          </div>

          {/* 3. Bảng Nhân sự */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden mx-2 md:mx-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap relative">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-gray-500 uppercase font-bold tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">NHÂN VIÊN</th>
                    <th className="px-6 py-4">PHÒNG BAN</th>
                    <th className="px-6 py-4">VAI TRÒ</th>
                    <th className="px-6 py-4">TRẠNG THÁI</th>
                    <th className="px-6 py-4">ĐĂNG NHẬP CUỐI</th>
                    <th className="px-6 py-4 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {staff.avatar ? (
                            <img src={staff.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                          ) : (
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${staff.bgColor}`}>
                              {staff.initials}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-[#0f172a]">{staff.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{staff.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-700">{staff.dept}</td>
                      
                      <td className="px-6 py-4 relative">
                        <div 
                          onClick={() => setOpenRoleMenu(openRoleMenu === staff.id ? null : staff.id)}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold cursor-pointer hover:bg-blue-100 transition border border-blue-100"
                        >
                          {staff.role} <span className="material-symbols-outlined text-[14px]">edit</span>
                        </div>

                        {openRoleMenu === staff.id && (
                          <div className="absolute top-12 left-6 bg-white border border-gray-100 shadow-xl rounded-xl w-48 py-2 z-50">
                            <p className="text-[10px] font-bold text-gray-400 uppercase px-4 mb-1">CHỌN VAI TRÒ</p>
                            {roles.map(r => (
                              <div 
                                key={r} 
                                onClick={() => handleRoleChange(staff.id, r)}
                                className={`px-4 py-2 text-sm font-medium cursor-pointer flex justify-between items-center hover:bg-slate-50 ${staff.role === r ? 'bg-blue-50 text-[#00288E]' : 'text-gray-700'}`}
                              >
                                {r} {staff.role === r && <span className="material-symbols-outlined text-[16px] text-[#00288E]">check</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${staff.status === 'Hoạt động' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                          <span className="font-medium text-gray-700 text-xs">{staff.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-medium">{staff.lastLogin}</td>
                      <td className="px-6 py-4 text-center">
                        <button className="text-gray-400 hover:text-[#00288E] text-lg px-2 rounded hover:bg-gray-100 transition-colors">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Phân trang */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs font-medium text-gray-500 bg-white shrink-0">
              <span>Hiển thị 1-10 trên 45 nhân viên</span>
              <div className="flex gap-1">
                <button className="w-8 h-8 flex justify-center items-center rounded-lg border border-gray-200 hover:bg-gray-50"><span className="material-symbols-outlined text-[16px]">chevron_left</span></button>
                <button className="w-8 h-8 flex justify-center items-center rounded-lg bg-[#00288E] text-white">1</button>
                <button className="w-8 h-8 flex justify-center items-center rounded-lg border border-gray-200 hover:bg-gray-50">2</button>
                <button className="w-8 h-8 flex justify-center items-center rounded-lg border border-gray-200 hover:bg-gray-50">3</button>
                <button className="w-8 h-8 flex justify-center items-center rounded-lg border border-gray-200 hover:bg-gray-50"><span className="material-symbols-outlined text-[16px]">chevron_right</span></button>
              </div>
            </div>
          </div>

      {/* Thẻ Thống Kê Dưới Cùng */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2 md:px-0 shrink-0">
            <div className="bg-[#00288E] text-white rounded-xl p-6 shadow-md relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">TỔNG NHÂN SỰ</p>
                <h2 className="text-5xl font-bold mb-3">{staffList.length}</h2>
                <p className="text-xs font-medium opacity-90 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> +4 nhân viên trong tháng này
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10 flex group-hover:scale-110 transition-transform duration-500">
                <span className="text-8xl">👤</span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 text-2xl">
                <span className="material-symbols-outlined">security</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">YÊU CẦU QUYỀN</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">08</span>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Cần duyệt ngay</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center gap-5 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-[#00288E] text-2xl">
                <span className="material-symbols-outlined">history</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">NHẬT KÝ HỆ THỐNG</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900">1.2k</span>
                  <span className="text-xs font-medium text-slate-500">Hoạt động trong 24h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;