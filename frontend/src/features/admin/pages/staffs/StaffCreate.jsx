import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import adminService from '../../services/adminService';

const StaffCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('Nhân viên');
  const [dept, setDept] = useState('Kinh doanh');
  const [showPassword, setShowPassword] = useState(false);
  const [requirePassChange, setRequirePassChange] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('hizogroup123');
  const [errors, setErrors] = useState({});

  // Trạng thái modal popup thông báo
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success', // 'success' | 'warning' | 'error' | 'confirm'
    onConfirm: null
  });

  const showModal = (title, message, type = 'success', onConfirm = null) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const [isDirty, setIsDirty] = useState(false);
  const initialSnapshot = useRef(JSON.stringify({
    role: 'Nhân viên', dept: 'Kinh doanh', requirePassChange: true, fullName: '', email: '', phone: '', password: 'hizogroup123'
  }));

  useEffect(() => {
    const current = JSON.stringify({ role, dept, requirePassChange, fullName, email, phone, password });
    setIsDirty(current !== initialSnapshot.current);
  }, [role, dept, requirePassChange, fullName, email, phone, password]);

  const handleCancelClick = () => {
    if (!isDirty) {
      navigate('/admin/staffs');
      return;
    }
    showModal(
      'Hủy bỏ thiết lập?',
      'Mọi thông tin bạn vừa nhập sẽ không được lưu lại. Bạn có chắc chắn muốn quay lại danh sách?',
      'warning',
      () => navigate('/admin/staffs')
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Họ và tên bắt buộc';
    }
    if (!email.trim()) {
      newErrors.email = 'Email bắt buộc';
    }
    if (phone && !/^(0)[0-9]{9,10}$/.test(phone.trim().replace(/\s+/g, ''))) {
      newErrors.phone = 'Số điện thoại phải bắt đầu bằng 0 và gồm 10-11 chữ số';
    }

    const roleLower = role.toLowerCase();
    const deptLower = dept.toLowerCase();

    if (roleLower === 'admin' && deptLower !== 'ban quản trị') {
      newErrors.role = 'Admin phải thuộc Ban Quản trị';
    }
    if (roleLower === 'sales' && deptLower !== 'kinh doanh') {
      newErrors.role = 'Sales phải thuộc Kinh doanh';
    }
    if (roleLower === 'accounting' && deptLower !== 'kế toán') {
      newErrors.role = 'Accounting phải thuộc Kế toán';
    }
    if (roleLower === 'warehouse' && deptLower !== 'kho vận') {
      newErrors.role = 'Warehouse phải thuộc Kho vận';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Hiển thị modal xác nhận trước khi lưu
    showModal(
      'Xác nhận thêm nhân sự',
      `Bạn chuẩn bị cấp tài khoản cho nhân viên "${fullName.trim()}" với vai trò ${role} thuộc phòng ${dept}. Xác nhận lưu hồ sơ?`,
      'confirm',
      () => {
        setLoading(true);
        const payload = {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          dept,
          status: 'Hoạt động',
          requirePassChange,
          password: password
        };

        adminService.createStaff(payload)
          .then(() => {
            navigate('/admin/staffs');
          })
          .catch(err => {
            console.error(err);
            showModal('Tạo nhân viên thất bại', 'Có lỗi xảy ra trong quá trình kết nối máy chủ. Vui lòng thử lại.', 'error');
          })
          .finally(() => {
            setLoading(false);
          });
      }
    );
  };

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    e.stopPropagation();
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchMove = (e) => {
    e.stopPropagation();
    if (!touchStart) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    if (!touchStart || !touchEnd) return;

    const distanceX = touchEnd.x - touchStart.x;
    const distanceY = touchEnd.y - touchStart.y;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (distanceX > minSwipeDistance) {
        handleCancelClick();
      }
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="font-inter flex flex-col w-full h-full bg-slate-50 animate-fade-in gap-4 md:gap-6 pb-10"
    >
      
      {/* 1. Header Section */}
      <div className="relative flex flex-col gap-2 sm:gap-3 px-2 md:px-0">
        <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-black text-slate-900 uppercase tracking-tight leading-tight">
          Thêm nhân viên mới
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Thiết lập tài khoản nhân sự mới
          </p>
          <div className="flex w-full sm:w-auto sm:justify-end gap-2 sm:gap-3">
          <button 
            type="button"
            onClick={handleCancelClick}
            className="px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-slate-300 text-slate-400 bg-white hover:bg-slate-50 hover:text-slate-600 transition-[background-color,color,border-color,transform] active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
          >
            Hủy bỏ
          </button>
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="group flex items-center justify-center gap-2 bg-[#00288E] hover:bg-white text-white hover:text-[#00288E] px-5 py-3 sm:px-4 sm:py-2.5 lg:px-8 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-[background-color,color,border-color,transform] duration-300 shadow-lg shadow-blue-900/10 border-2 border-[#00288E] active:scale-95 disabled:opacity-50 shrink-0 focus-visible:ring-2 focus-visible:ring-[#00288E] focus-visible:ring-offset-2 outline-none"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current rounded-full animate-spin" aria-live="polite" aria-busy="true"><span className="sr-only">Đang lưu…</span></div>
            ) : (
              <span className="material-symbols-outlined text-sm sm:text-base group-hover:rotate-12 transition-transform" aria-hidden="true">save</span>
            )}
            <span>Lưu nhân viên</span>
          </button>
        </div>
      </div>
    </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-behavior-y-contain scrollbar-none pr-1 md:pr-2 pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col xl:flex-row gap-8 mx-2 md:mx-0">
          
          {/* CỘT TRÁI (Nội dung chính) */}
          <div className="xl:flex-[2] flex flex-col gap-8">
          
            {/* Box Thông tin định danh */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-colors duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-blue-600">person</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thông tin nhân sự</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Họ tên & Liên lạc cơ bản</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-8 mb-8">
                <div className="space-y-2">
                  <label htmlFor="staff_fullname" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Họ và Tên *</label>
                  <input
                    id="staff_fullname"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors(prev => ({ ...prev, fullName: '' }));
                    }}
                    placeholder="VD: Nguyễn Văn An"
                    required
                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-colors text-slate-700 font-inter focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      errors.fullName ? 'border-rose-500 focus:border-rose-500' : 'border-transparent focus:border-blue-500'
                    }`}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                      <span aria-hidden="true">⚠️</span> {errors.fullName}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label htmlFor="staff_phone" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Số điện thoại</label>
                  <input
                    id="staff_phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                    }}
                    placeholder="090 123 4567"
                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-colors text-slate-700 font-inter focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      errors.phone ? 'border-rose-500 focus:border-rose-500' : 'border-transparent focus:border-blue-500'
                    }`}
                  />
                  {errors.phone && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                      <span aria-hidden="true">⚠️</span> {errors.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="staff_email" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Địa chỉ Email *</label>
                  <input
                    id="staff_email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                    }}
                    placeholder="example@hizo.group"
                    required
                    className={`w-full bg-slate-50 border-2 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white transition-colors text-slate-700 font-inter focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      errors.email ? 'border-rose-500 focus:border-rose-500' : 'border-transparent focus:border-blue-500'
                    }`}
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                      <span aria-hidden="true">⚠️</span> {errors.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Box Thiết lập tài khoản */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-colors duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-orange-600">lock_open</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Thiết lập tài khoản</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bảo mật & Trạng thái khởi tạo</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="staff_password" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Mật khẩu tạm thời</label>
                  <div className="relative">
                    <input
                      id="staff_password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      spellCheck={false}
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl p-4 pr-12 text-sm font-bold outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-600 focus:bg-white transition-colors text-slate-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center w-8 h-8 rounded-full focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                    >
                      <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 italic">Mật khẩu mặc định khởi tạo ban đầu cho nhân viên.</p>
                </div>

                <div
                  role="checkbox"
                  aria-checked={requirePassChange}
                  aria-label="Yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setRequirePassChange(!requirePassChange);
                    }
                  }}
                  className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  onClick={() => setRequirePassChange(!requirePassChange)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-700">Yêu cầu đổi mật khẩu</span>
                    <span className="text-[10px] text-slate-400 font-medium">Bắt buộc nhân viên đổi mật khẩu ở lần đăng nhập đầu tiên</span>
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${requirePassChange ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${requirePassChange ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (Vai trò & Phòng ban) */}
          <div className="xl:flex-[1] flex flex-col gap-8">
            
            {/* Box Tổ chức */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-300 hover:shadow-xl transition-colors duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center" aria-hidden="true">
                  <span className="material-symbols-outlined text-purple-600">lan</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Tổ chức</h3>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 block ml-1">Phòng ban</label>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Phòng ban">
                    {[
                      { name: 'Ban Quản trị', icon: 'corporate_fare', desc: 'Ban điều hành' },
                      { name: 'Kinh doanh', icon: 'campaign', desc: 'Phòng sales' },
                      { name: 'Kế toán', icon: 'account_balance_wallet', desc: 'Phòng tài chính' },
                      { name: 'Kho vận', icon: 'inventory', desc: 'Phòng logistics' }
                    ].map((d) => {
                      const active = dept === d.name;
                      return (
                        <div
                          key={d.name}
                          role="radio"
                          aria-checked={active}
                          aria-label={`${d.name}: ${d.desc}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setDept(d.name);
                            }
                          }}
                          onClick={() => setDept(d.name)}
                          className={`flex items-center gap-3 p-3 border-2 rounded-2xl cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                            active
                              ? 'border-blue-600 bg-blue-50/20 shadow-md shadow-blue-500/5'
                              : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-blue-100 text-blue-600' : 'bg-slate-200/50 text-slate-400'}`} aria-hidden="true">
                            <span className="material-symbols-outlined text-[18px]">{d.icon}</span>
                          </div>
                          <div className="min-w-0">
                            <p className={`font-black text-[11px] uppercase tracking-tight ${active ? 'text-blue-600' : 'text-slate-700'}`}>{d.name}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{d.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block ml-1">Vai trò hệ thống</label>
                  <div className="flex flex-col gap-3" role="radiogroup" aria-label="Vai trò hệ thống">
                    {[
                      { id: 'Admin', title: 'Quản trị viên', desc: 'Điều hành & Thiết lập hệ thống', color: 'orange', icon: 'security' },
                      { id: 'Sales', title: 'Nhân viên Bán hàng', desc: 'Thao tác nghiệp vụ kinh doanh', color: 'indigo', icon: 'campaign' },
                      { id: 'Warehouse', title: 'Nhân viên Kho', desc: 'Thao tác nhập xuất, tồn kho', color: 'blue', icon: 'inventory' },
                      { id: 'Accounting', title: 'Kế toán viên', desc: 'Xử lý sổ sách, thu chi, công nợ', color: 'purple', icon: 'account_balance_wallet' }
                    ].map((item) => {
                      const active = role === item.id;
                      return (
                        <div
                          key={item.id}
                          role="radio"
                          aria-checked={active}
                          aria-label={`${item.title}: ${item.desc}`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setRole(item.id);
                            }
                          }}
                          onClick={() => setRole(item.id)}
                          className={`flex items-center justify-between p-4 border-2 rounded-2xl cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${active ? 'border-blue-600 bg-blue-50/30 shadow-md shadow-blue-500/5' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${active ? 'border-blue-600 bg-white' : 'border-slate-300 bg-white'}`} aria-hidden="true">
                              {active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-in zoom-in duration-200"></div>}
                            </div>
                            <div>
                              <p className={`font-black text-xs uppercase tracking-tight ${active ? 'text-blue-600' : 'text-slate-900'}`}>{item.title}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                          <span className={`material-symbols-outlined text-[20px] ${
                            item.color === 'red' ? 'text-rose-500' :
                            item.color === 'orange' ? 'text-orange-500' :
                            item.color === 'indigo' ? 'text-indigo-500' :
                            item.color === 'blue' ? 'text-blue-500' :
                            'text-purple-500'
                          }`} aria-hidden="true">{item.icon}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* 2. Modal Notification Popup Component */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {modalConfig.type === 'success' && (
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">check_circle</span>
              </div>
            )}
            {modalConfig.type === 'error' && (
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">error</span>
              </div>
            )}
            {modalConfig.type === 'warning' && (
              <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">warning</span>
              </div>
            )}
            {modalConfig.type === 'confirm' && (
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl font-black">help</span>
              </div>
            )}

            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight mb-2">
              {modalConfig.title}
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-6 font-inter">
              {modalConfig.message}
            </p>

            <div className="flex gap-3 w-full">
              {modalConfig.type === 'confirm' || modalConfig.type === 'warning' ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                      closeModal();
                    }}
                    className={`flex-1 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-2 outline-none ${
                      modalConfig.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Đồng ý
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-colors active:scale-95 focus-visible:ring-2 focus-visible:ring-slate-400 outline-none"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCreate;