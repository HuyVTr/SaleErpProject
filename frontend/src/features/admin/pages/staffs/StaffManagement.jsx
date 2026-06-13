import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';
import StaffDetailDrawer from '../../components/Drawers/StaffDetailDrawer';
import { getInitials, getAvatarGradient } from '../../../../utils/avatarHelper';

const getResponsiveValueStyle = (val) => {
  const str = String(val);
  const len = str.length;
  if (len <= 10) return { fontSize: 'clamp(14px, 1.25vw, 20px)' };
  if (len <= 15) return { fontSize: 'clamp(12px, 1.1vw, 16px)' };
  return { fontSize: 'clamp(11px, 0.95vw, 14px)' };
};

const getISOWeekString = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const getISOWeek = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const monthNames = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
];

const getWeekRange = (year, week) => {
  const d = new Date(year, 0, 1);
  const dayNum = d.getDay();
  const diff = d.getDate() - dayNum + (dayNum === 0 ? -6 : 1);
  const firstMonday = new Date(d.setDate(diff));
  const start = new Date(firstMonday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
};

const getTooltipClasses = (idx) => {
  const leftAlign = "left-full top-0 ml-2.5 origin-top-left";
  const rightAlign = "right-full top-0 mr-2.5 origin-top-right";
  if (idx === 0) return leftAlign;
  if (idx === 3) return rightAlign;
  if (idx === 1) return `${rightAlign} lg:right-auto lg:left-full lg:mr-0 lg:ml-2.5 lg:origin-top-left`;
  if (idx === 2) return `${leftAlign} lg:left-auto lg:right-full lg:ml-0 lg:mr-2.5 lg:origin-top-right`;
  return leftAlign;
};

const getArrowClasses = (idx) => {
  const leftArrow = "-left-1 border-l border-b";
  const rightArrow = "-right-1 border-t border-r";
  if (idx === 0) return leftArrow;
  if (idx === 3) return rightArrow;
  if (idx === 1) return `${rightArrow} lg:right-auto lg:-left-1 lg:border-t-0 lg:border-r-0 lg:border-l lg:border-b`;
  if (idx === 2) return `${leftArrow} lg:left-auto lg:-right-1 lg:border-l-0 lg:border-b-0 lg:border-t lg:border-r`;
  return leftArrow;
};

const GrowthBadge = ({ growth, type = 'number', currentValue, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  if (!growth) return null;
  const { percent, isUp, prevValue, label } = growth;

  const tooltipPositionClass = getTooltipClasses(idx);
  const arrowPositionClass = getArrowClasses(idx);
  const isActive = activeTooltipIdx === idx;

  return (
    <div
      className="w-max group relative flex items-center gap-1 mt-1 cursor-help"
      tabIndex={0}
      role="button"
      aria-label="Xem chi tiết tăng trưởng"
      onClick={(e) => {
        e.stopPropagation();
        setActiveTooltipIdx(prev => prev === idx ? null : idx);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
    >
      <div className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${isUp ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">{isUp ? 'trending_up' : 'trending_down'}</span>
        <span>{isUp ? '+' : '-'}{percent}%</span>
      </div>

      {/* Tooltip */}
      <div className={`absolute hidden group-hover:block z-[9999] w-52 animate-fade-in ${tooltipPositionClass} ${isActive ? '!block' : ''}`}>
        <div className="bg-white/95 backdrop-blur-xl text-slate-900 text-[10px] p-3 rounded-xl shadow-2xl border border-slate-300">
          <p className="font-black opacity-50 mb-2 uppercase tracking-[0.1em] text-[9px] border-b border-slate-100 pb-1.5">{label}</p>
          <div className="space-y-1.5 font-inter">
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ trước:</span>
              <span className="font-black text-slate-700">
                {prevValue}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-slate-500 font-medium">Kỳ này:</span>
              <span className={`font-black ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                {currentValue}
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-slate-400 italic">Tình trạng:</span>
            <span className={`font-bold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUp ? 'Tăng trưởng' : 'Giảm sút'}
            </span>
          </div>
        </div>
        <div className={`w-2 h-2 bg-white rotate-45 absolute top-2.5 shadow-sm ${arrowPositionClass}`}></div>
      </div>
    </div>
  );
};

// Component StatCard chuẩn UI của Admin Dashboard
const StatCard = ({ title, value, rawValue, growth, icon, color, idx, activeTooltipIdx, setActiveTooltipIdx }) => {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        setActiveTooltipIdx(prev => prev === idx ? null : idx);
      }}
      tabIndex={0}
      role="button"
      aria-label={`Xem chi tiết ${title}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setActiveTooltipIdx(prev => prev === idx ? null : idx);
        }
      }}
      className="stat-card-container relative bg-white rounded-xl shadow-[0_8px_20px_-3px_rgba(0,0,0,0.06)] border border-slate-300 hover:border-blue-500 hover:shadow-xl hover:-translate-y-1 hover:z-30 transition-[border-color,box-shadow,transform,z-index] duration-300 cursor-pointer p-3 sm:p-4 lg:p-5 lg:rounded-2xl focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      style={{ overflow: 'visible' }}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-500 uppercase tracking-wider leading-tight mb-1" style={{ fontSize: 'clamp(9px, 0.8vw, 11px)' }}>{title}</p>
          <div className="mt-1 font-black text-slate-900 [font-variant-numeric:tabular-nums] break-words whitespace-normal xl:truncate xl:whitespace-nowrap" style={getResponsiveValueStyle(value)} title={value}>
            {value}
          </div>
          <GrowthBadge 
            growth={growth} 
            type="number" 
            currentValue={rawValue !== undefined ? rawValue : value} 
            idx={idx} 
            activeTooltipIdx={activeTooltipIdx} 
            setActiveTooltipIdx={setActiveTooltipIdx}
          />
        </div>
        
        <div className={`rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 ${
          color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
          color === 'purple' ? 'bg-purple-50 text-purple-600' :
          color === 'blue' ? 'bg-blue-50 text-blue-600' :
          'bg-orange-50 text-orange-600'
        }`} aria-hidden="true">
          <span className="material-symbols-outlined text-lg sm:text-xl lg:text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );
};

// Nút thao tác nhỏ gọn
const ActionButton = ({ icon, color, onClick, title }) => (
  <button 
    onClick={onClick}
    className={`rounded-xl flex items-center justify-center transition-[background-color,transform] active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${color}`}
    style={{ width: 'clamp(28px, 2.5vw, 40px)', height: 'clamp(28px, 2.5vw, 40px)' }}
    title={title}
    aria-label={title}
  >
    <span className="material-symbols-outlined font-bold" style={{ fontSize: 'clamp(14px, 1.3vw, 20px)' }} aria-hidden="true">{icon}</span>
  </button>
);

const StaffManagement = () => {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
  const [activeTooltipIdx, setActiveTooltipIdx] = useState(null);
  
  // Trạng thái dropdown bộ lọc
  const [isOpenFilterDropdown, setIsOpenFilterDropdown] = useState(false);
  const filterDropdownRef = React.useRef(null);

  // Trạng thái dropdown thời gian giống hệt Admin Dashboard
  const now = new Date();
  const [timeframe, setTimeframe] = useState('monthly');
  const [filterWeek, setFilterWeek] = useState(getISOWeekString(now));
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterDate, setFilterDate] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  const [filterYearsCount, setFilterYearsCount] = useState(5);

  const [isOpenTimeDropdown, setIsOpenTimeDropdown] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showYearsCountPicker, setShowYearsCountPicker] = useState(false);
  const [yearRangeStart, setYearRangeStart] = useState(Math.floor(now.getFullYear() / 10) * 10 - 4);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerView, setDatePickerView] = useState('months');
  const [dateTempYear, setDateTempYear] = useState(now.getFullYear());
  const [dateYearRangeStart, setDateYearRangeStart] = useState(Math.floor(now.getFullYear() / 12) * 12);

  const timeDropdownRef = React.useRef(null);
  const yearPickerRef = React.useRef(null);
  const weekPickerRef = React.useRef(null);
  const yearsCountPickerRef = React.useRef(null);
  const datePickerRef = React.useRef(null);

  const getTimeframeText = () => {
    if (timeframe === 'daily') {
      const [y, m] = filterDate.split('-').map(Number);
      return `tháng ${m}/${y}`;
    }
    if (timeframe === 'weekly') {
      const [y, w] = filterWeek.split('-W').map(Number);
      return `tuần ${w}, ${y}`;
    }
    if (timeframe === 'monthly') return `12 tháng năm ${filterYear}`;
    if (timeframe === 'yearly') return `${filterYearsCount} năm qua`;
    return 'Toàn thời gian';
  };

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleViewDetail = (staff) => {
    setSelectedStaff(staff);
    setDrawerOpen(true);
  };
  const ITEMS_PER_PAGE = 8;

  const roles = ['Admin', 'Sales', 'Warehouse', 'Accounting'];

  const handleRoleChange = (id, newRole) => {
    adminService.updateStaff(id, { role: newRole }).then(() => {
      setStaffList(prev => prev.map(staff => String(staff.id) === String(id) ? { ...staff, role: newRole } : staff));
    }).catch(err => {
      console.error('Update staff role failed', err);
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.stat-card-container')) {
        setActiveTooltipIdx(null);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsOpenFilterDropdown(false);
      }
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target)) {
        setIsOpenTimeDropdown(false);
      }
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target)) {
        setShowYearPicker(false);
      }
      if (weekPickerRef.current && !weekPickerRef.current.contains(event.target)) {
        setShowWeekPicker(false);
      }
      if (yearsCountPickerRef.current && !yearsCountPickerRef.current.contains(event.target)) {
        setShowYearsCountPicker(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
        setDatePickerView('months');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setLoading(true);
    adminService.getStaffs().then(res => {
      const arr = Array.isArray(res) ? res : [];
      const mapped = arr.map(u => {
        const nameParts = (u.fullName || `${u.lastName || ''} ${u.firstName || ''}`.trim() || u.name || 'Nhân viên').split(' ');
        const firstName = u.firstName || nameParts[nameParts.length - 1] || '';
        const lastName = u.lastName || nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
        const initials = getInitials(firstName, lastName);
        const avatarGradient = getAvatarGradient(firstName, lastName);

        let rawRole = 'User';
        if (u.role) {
          if (typeof u.role === 'string') {
            rawRole = u.role;
          } else if (typeof u.role === 'object') {
            rawRole = u.role.roleName || u.role.name || 'User';
          }
        } else if (u.roleName) {
          rawRole = u.roleName;
        }

        if (rawRole === 'User' || !u.role) {
          const roleId = Number(u.roleID || (u.role && typeof u.role === 'object' && u.role.roleID));
          if (roleId === 1) rawRole = 'Accounting';
          else if (roleId === 2) rawRole = 'Sales';
          else if (roleId === 3) rawRole = 'Admin';
          else if (roleId === 4) rawRole = 'Warehouse';
          else if (roleId === 5) rawRole = 'Super Admin';
        }

        let rawDept = u.dept || u.department || u.group || 'Chưa phân';
        if (rawDept === 'Chưa phân' || !rawDept) {
          const r = String(rawRole).toLowerCase();
          if (r === 'admin' || r === 'super admin') rawDept = 'Ban Quản trị';
          else if (r === 'sales') rawDept = 'Kinh doanh';
          else if (r === 'warehouse') rawDept = 'Kho vận';
          else if (r === 'accounting') rawDept = 'Kế toán';
        }

        return {
          id: u.userID || u.id,
          code: isNaN(u.userID || u.id) ? String(u.userID || u.id) : `NV-${String(u.userID || u.id).padStart(3, '0')}`,
          name: u.fullName || `${u.lastName || ''} ${u.firstName || ''}`.trim() || u.name || 'Nhân viên',
          email: u.email || u.userEmail || 'N/A',
          phoneNumber: u.phoneNumber || u.phone || 'N/A',
          avatar: u.avatar || u.image || null,
          initials: initials,
          bgColor: `bg-gradient-to-br ${avatarGradient}`,
          dept: rawDept,
          role: rawRole,
          roleID: u.roleID || (rawRole === 'Accounting' ? 1 : rawRole === 'Sales' ? 2 : rawRole === 'Admin' ? 3 : rawRole === 'Warehouse' ? 4 : 5),
          status: u.status || 'Hoạt động',
          lastLogin: u.lastLogin || 'Vừa xong'
        };
      });
      setStaffList(mapped);
    }).catch(err => {
      console.error('Load staffs failed', err);
      setStaffList([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  // Xác định user hiện tại đang đăng nhập và quyền hạn
  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user') || localStorage.getItem('current_user');
    return raw ? JSON.parse(raw) : null;
  }, []);

  const isSuperAdmin = useMemo(() => {
    if (!currentUser) return false;
    const roleId = Number(currentUser.roleID);
    const roleName = String(currentUser.role || currentUser.roleName || '').toLowerCase();
    return roleId === 5 || roleName === 'super admin';
  }, [currentUser]);

  const canEdit = (staff) => {
    if (!currentUser) return false;
    // Không tự thao tác với bản thân trong danh sách quản lý
    if (String(currentUser.userID) === String(staff.id)) return false;

    const curRoleId = Number(currentUser.roleID);
    const targetRoleId = Number(staff.roleID);

    // Super Admin được thao tác với mọi người
    if (curRoleId === 5) return true;

    // Admin thường (roleID: 3) chỉ được thao tác với nhân viên (roleID: 1, 2, 4). Không thao tác được với Admin khác (3) và Super Admin (5)
    if (curRoleId === 3) {
      return targetRoleId !== 3 && targetRoleId !== 5;
    }

    return false;
  };

  // Lọc và Sắp xếp
  const filteredStaffs = useMemo(() => {
    let result = staffList.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.dept.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchRole = filterRole === 'all';
      if (!matchRole) {
        const roleStr = String(s.role || '');
        if (filterRole.toLowerCase() === 'admin') {
          matchRole = roleStr.toLowerCase() === 'admin' || roleStr.toLowerCase() === 'super admin';
        } else {
          matchRole = roleStr.toLowerCase() === filterRole.toLowerCase();
        }
      }
      return matchSearch && matchRole;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      });
    }
    return result;
  }, [staffList, searchTerm, filterRole, sortConfig]);

  // Phân trang logic
  const totalPages = Math.ceil(filteredStaffs.length / ITEMS_PER_PAGE);
  const paginatedStaffs = useMemo(() => {
    return filteredStaffs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  }, [filteredStaffs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole]);

  // Thống kê nhân sự
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter(s => s.status === 'Hoạt động').length;
    const adminCount = staffList.filter(s => {
      const r = String(s.role || '').toLowerCase();
      return r === 'admin' || r === 'super admin';
    }).length;
    const salesCount = staffList.filter(s => String(s.role || '').toLowerCase() === 'sales').length;

    return {
      total,
      active,
      adminCount,
      salesCount
    };
  }, [staffList]);

  // Trạng thái xóa nhân viên
  const handleDeleteStaff = async (staff) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${staff.name}" không?`)) {
      try {
        await adminService.deleteStaff(staff.id);
        setStaffList(prev => prev.filter(s => s.id !== staff.id));
        alert('Xóa nhân viên thành công!');
      } catch (err) {
        console.error('Delete staff failed', err);
        alert('Xóa nhân viên thất bại. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-6">
      
      {/* Tiêu đề & Nút Thêm mới + Dropdown Select Time đặt cạnh nhau */}
      <div className="flex flex-col gap-2 sm:gap-3 px-2 md:px-0 shrink-0">
        {/* Hàng 1: tiêu đề chính riêng một dòng */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight whitespace-nowrap">Quản lý Nhân sự & Phân quyền</h1>

        {/* Hàng 2: tiêu đề phụ + action cùng một dòng */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Tài khoản & phân quyền ·{" "}
            <span className="inline-flex items-center align-middle mx-0.5 px-2 py-0.5 rounded-lg bg-blue-50 text-[#00288E] font-bold whitespace-nowrap">
              {staffList.length} thành viên
            </span>
          </p>

          <div className="flex flex-row items-center gap-3 w-full sm:w-auto md:w-auto md:justify-end">
          <button 
            type="button"
            onClick={() => navigate('/admin/staffs/add')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#00288E] px-4 h-[46px] font-black text-white uppercase tracking-widest transition-[background-color,transform] hover:bg-[#00288E]/90 whitespace-nowrap shadow-sm active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-2 outline-none"
            style={{ fontSize: 'clamp(9px, 0.75vw, 11px)' }}
          >
            <span className="material-symbols-outlined text-[16px] font-bold">person_add</span>
            Thêm nhân viên mới
          </button>
        </div>
        </div>
      </div>

      {/* Grid Thống Kê theo style chuẩn của Admin Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 md:px-0 shrink-0">
        <StatCard 
          title="TỔNG NHÂN SỰ" 
          value={stats.total} 
          growth={{ percent: 12, isUp: true, prevValue: Math.max(0, stats.total - 2), label: 'Số lượng nhân sự mới trong năm' }}
          icon="group"
          color="blue" 
          idx={0}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="ĐANG HOẠT ĐỘNG" 
          value={stats.active} 
          growth={{ percent: 100, isUp: true, prevValue: stats.active, label: 'Tỉ lệ hoạt động trực tuyến' }}
          icon="check_circle"
          color="emerald" 
          idx={1}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="QUẢN TRỊ VIÊN" 
          value={stats.adminCount} 
          icon="security"
          color="orange" 
          idx={2}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
        <StatCard 
          title="BỘ PHẬN BÁN HÀNG" 
          value={stats.salesCount} 
          icon="campaign"
          color="purple" 
          idx={3}
          activeTooltipIdx={activeTooltipIdx}
          setActiveTooltipIdx={setActiveTooltipIdx}
        />
      </div>

      {/* Thanh bộ lọc và tìm kiếm */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-sm flex flex-row items-center gap-2 sm:gap-6 mx-2 md:mx-0 hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300">
        
        {/* Searchbar */}
        <div className="relative flex-1 md:w-96 md:flex-none group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#00288E] transition-colors" aria-hidden="true">search</span>
          <input 
            type="search" 
            placeholder="Tìm theo tên, email, phòng ban..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 p-4 pl-12 rounded-xl text-sm font-bold outline-none focus:border-[#00288E] focus-visible:ring-2 focus-visible:ring-[#00288E]/20 focus:bg-white transition-[border-color,background-color] text-slate-700"
            aria-label="Tìm kiếm nhân viên"
          />
        </div>
        
        {/* Desktop View: Vai trò segment buttons */}
        <div className="hidden md:flex ml-auto items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 shadow-inner overflow-x-auto" role="tablist" aria-label="Lọc theo vai trò">
          {['all', ...roles].map((role) => (
            <button 
              key={role}
              onClick={() => setFilterRole(role)}
              role="tab"
              aria-selected={filterRole.toLowerCase() === role.toLowerCase()}
              className={`text-center px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-[background-color,color,border-color] whitespace-nowrap border focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                filterRole.toLowerCase() === role.toLowerCase() 
                  ? 'bg-white text-blue-600 border-slate-200 shadow-sm' 
                  : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900'
              }`}
            >
              {role === 'all' ? 'Tất cả' : role}
            </button>
          ))}
        </div>

        {/* Mobile View: Collapsed Dropdown */}
        <div className="md:hidden ml-auto relative" ref={filterDropdownRef}>
          <button 
            type="button"
            onClick={() => setIsOpenFilterDropdown(!isOpenFilterDropdown)}
            className="bg-slate-50 border-2 border-slate-200 text-slate-600 hover:border-[#00288E] active:scale-95 transition-[border-color,transform] p-4 rounded-xl flex items-center justify-center shadow-sm focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
            aria-label="Bộ lọc vai trò"
            aria-expanded={isOpenFilterDropdown}
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">tune</span>
          </button>

          {isOpenFilterDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 py-2 animate-fade-in origin-top-right">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Vai trò</span>
              </div>
              {['all', ...roles].map((role) => {
                const isSelected = filterRole.toLowerCase() === role.toLowerCase();
                return (
                  <button 
                    key={role}
                    type="button"
                    onClick={() => {
                      setFilterRole(role);
                      setIsOpenFilterDropdown(false);
                    }}
                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                      isSelected ? 'text-blue-600 bg-blue-50/30' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{role === 'all' ? 'Tất cả' : role}</span>
                    {isSelected && <span className="material-symbols-outlined text-sm font-black text-blue-600" aria-hidden="true">check</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 flex flex-col hover:border-blue-500 hover:shadow-xl transition-[border-color,box-shadow] duration-300 overflow-hidden mx-2 md:mx-0 flex-1 min-h-[400px]">
        {/* View A: TABLE VIEW (Chỉ hiển thị trên Desktop >= 1280px) */}
        <div className="hidden xl:block overflow-x-auto flex-1 scrollbar-none">
          <table className="w-full table-fixed text-left border-collapse min-w-[900px] xl:min-w-0">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[22%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Nhân viên</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[22%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Liên hệ</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[16%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>Phòng ban</th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[15%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Vai trò
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[15%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Trạng thái
                  </div>
                </th>
                <th className="py-4 font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 w-[10%]" style={{ padding: '1rem clamp(0.5rem, 1vw, 1.5rem)', fontSize: 'clamp(8px, 0.8vw, 11px)' }}>
                  <div className="flex justify-center items-center w-full">
                    Thao tác
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4" aria-live="polite" aria-busy="true">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedStaffs.length > 0 ? (
                paginatedStaffs.map((staff) => (
                  <tr key={staff.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex items-center gap-4">
                        {staff.avatar ? (
                          <img src={staff.avatar} alt="avatar" className="w-10 h-10 rounded-2xl object-cover border border-slate-200 transition-transform duration-300 group-hover:scale-110 shadow-sm" />
                        ) : (
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-sm transition-transform duration-300 group-hover:scale-110 ${staff.bgColor}`}>
                            {staff.initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 leading-tight truncate" style={{ fontSize: 'clamp(11px, 1vw, 14px)' }}>{staff.name}</p>
                          <p className="font-bold text-slate-400 mt-0.5" style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>ID: {staff.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="font-semibold text-slate-600" style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <p className="text-slate-800 font-medium" style={{ fontSize: 'clamp(10px, 0.9vw, 13px)' }}>{staff.email}</p>
                      <p className="text-slate-400 text-xs mt-0.5" style={{ fontSize: 'clamp(8px, 0.75vw, 10px)' }}>{staff.phoneNumber}</p>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <span className="font-semibold text-slate-700" style={{ fontSize: 'clamp(11px, 0.9vw, 14px)' }}>{staff.dept}</span>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-black uppercase tracking-wider border shadow-sm ${
                          staff.role.toLowerCase() === 'super admin' ? 'bg-red-50 text-red-700 border-red-200' :
                          staff.role.toLowerCase() === 'admin' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          staff.role.toLowerCase() === 'sales' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          staff.role.toLowerCase() === 'warehouse' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-purple-50 text-purple-700 border-purple-200'
                        }`} style={{ fontSize: 'clamp(8px, 0.75vw, 9px)' }}>
                          <span className="material-symbols-outlined text-[12px] font-black" aria-hidden="true">
                            {staff.role.toLowerCase() === 'super admin' ? 'shield' : staff.role.toLowerCase() === 'admin' ? 'security' : 'person'}
                          </span>
                          {staff.role}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full">
                        <div className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl border`}>
                          <div className={`rounded-full shrink-0 ${staff.status === 'Hoạt động' ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: '6px', height: '6px' }} aria-hidden="true"></div>
                          <span className={`font-black uppercase tracking-wider whitespace-nowrap ${staff.status === 'Hoạt động' ? 'text-emerald-600' : 'text-slate-400'}`} style={{ fontSize: 'clamp(8px, 0.75vw, 9px)' }}>
                            {staff.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: 'clamp(0.5rem, 1vw, 1.5rem)' }}>
                      <div className="flex justify-center items-center w-full gap-1 sm:gap-2">
                        <ActionButton
                          icon="visibility"
                          color="text-slate-600 hover:bg-slate-100"
                          onClick={() => handleViewDetail(staff)}
                          title="Xem chi tiết"
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-slate-400">
                    <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy nhân viên nào phù hợp</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* View B: CARD LIST VIEW (Tối ưu hóa cho Mobile & iPad < 1280px) */}
        <div className="block xl:hidden overflow-auto flex-1 p-4 bg-slate-50/50 scrollbar-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4" aria-live="polite" aria-busy="true">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu…</p>
            </div>
          ) : paginatedStaffs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedStaffs.map((staff) => (
                <div key={staff.id} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-md transition-[border-color,box-shadow] duration-300 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {staff.avatar ? (
                        <img src={staff.avatar} alt="avatar" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm shrink-0" />
                      ) : (
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs shadow-sm shrink-0 ${staff.bgColor}`}>
                          {staff.initials}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          ID: {staff.code}
                        </span>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight text-sm truncate mt-0.5" title={staff.name}>{staff.name}</h4>
                        <p className="text-xs font-semibold text-slate-500 mt-1 truncate" title={staff.email}>{staff.email}</p>
                        <p className="text-[11px] font-semibold text-slate-400 mt-0.5" title={staff.phoneNumber}>{staff.phoneNumber}</p>
                      </div>
                    </div>
                    
                    <button 
                      type="button"
                      onClick={() => handleViewDetail(staff)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                      title="Xem chi tiết"
                      aria-label="Xem chi tiết"
                    >
                      <span className="material-symbols-outlined text-lg font-bold" aria-hidden="true">visibility</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center mt-auto pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 mr-auto">
                      Phòng: <span className="font-bold text-slate-700">{staff.dept}</span>
                    </span>
                    
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border text-[9px] shadow-sm ${
                      staff.role.toLowerCase() === 'super admin' ? 'bg-red-50 text-red-700 border-red-200' :
                      staff.role.toLowerCase() === 'admin' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      staff.role.toLowerCase() === 'sales' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      staff.role.toLowerCase() === 'warehouse' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {staff.role}
                    </span>

                    <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-xl border border-slate-100 bg-slate-50">
                      <div className={`rounded-full shrink-0 ${staff.status === 'Hoạt động' ? 'bg-emerald-500' : 'bg-slate-300'}`} style={{ width: '6px', height: '6px' }} aria-hidden="true"></div>
                      <span className={`font-black uppercase tracking-wider text-[9px] ${staff.status === 'Hoạt động' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {staff.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-slate-400">
              <p className="font-bold text-sm uppercase tracking-widest opacity-50">Không tìm thấy nhân viên nào</p>
            </div>
          )}
        </div>

        {/* Phân trang thực tế */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-white shrink-0">
            <span>Hiển thị {Math.min(filteredStaffs.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredStaffs.length, currentPage * ITEMS_PER_PAGE)} trên {filteredStaffs.length} nhân viên</span>
            <div className="flex gap-1">
              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                aria-label="Trang trước"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_left</span>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 flex justify-center items-center rounded-lg border text-xs font-black focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none ${
                    currentPage === i + 1 
                      ? 'bg-[#00288E] text-white border-[#00288E]' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                  aria-label={`Trang ${i + 1}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex justify-center items-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                aria-label="Trang sau"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
      <StaffDetailDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        staff={selectedStaff}
        onEdit={selectedStaff && canEdit(selectedStaff) ? (s) => {
          setDrawerOpen(false);
          navigate(`/admin/staffs/edit/${s.id}`);
        } : undefined}
        onDelete={selectedStaff && isSuperAdmin && String(currentUser?.userID) !== String(selectedStaff.id) ? (s) => {
          setDrawerOpen(false);
          handleDeleteStaff(s);
        } : undefined}
      />
    </div>
  );
};

export default StaffManagement;