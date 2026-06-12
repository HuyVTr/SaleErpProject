import React, { useState, useEffect } from 'react';
import authService from '../../features/auth/services/authService';
import ToggleSwitch from './ToggleSwitch';
import CustomDatePicker from './CustomDatePicker';
import { getInitials, getAvatarGradient } from '../../utils/avatarHelper';

const AccountModal = ({ isOpen, onClose, openTab = 'profile' }) => {
  const [activeTab, setActiveTab] = useState(openTab);
  const [user, setUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notificationSettings, setNotificationSettings] = useState({
    orders: true,
    warehouse: true,
    payments: true,
    system: true,
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTab(openTab);
  }, [openTab]);

  useEffect(() => {
    if (isOpen) {
      fetchUser();
      loadNotificationSettings();
    }
  }, [isOpen]);

  const fetchUser = async () => {
    const userData = await authService.getMe();
    if (userData) {
      setUser(userData);
      setFormData(userData);
    }
  };

  const loadNotificationSettings = () => {
    try {
      const stored = localStorage.getItem('notification_settings');
      if (stored) {
        setNotificationSettings(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading notification settings:', e);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleSetting = (key) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const validatePhone = (phone) => {
    return /^[0-9]{10,11}$/.test(phone.replace(/\D/g, ''));
  };

  const handleSaveProfile = async () => {
    if (!formData.lastName || !formData.firstName) {
      setMessage({ type: 'error', text: 'Vui lòng nhập họ và tên' });
      return;
    }
    if (formData.phoneNumber && !validatePhone(formData.phoneNumber)) {
      setMessage({ type: 'error', text: 'Số điện thoại không hợp lệ' });
      return;
    }

    setLoading(true);
    const payload = {
      lastName: formData.lastName,
      firstName: formData.firstName,
      phoneNumber: formData.phoneNumber,
      dateOfBirth: formData.dateOfBirth,
      address: formData.address,
    };
    const result = await authService.updateProfile(payload);
    setLoading(false);

    if (result.success) {
      setUser(result.user);
      setIsEditMode(false);
      setMessage({ type: 'success', text: 'Cập nhật hồ sơ thành công' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setMessage({ type: 'error', text: 'Vui lòng điền đầy đủ thông tin' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    setLoading(true);
    const result = await authService.changePassword(passwordData);
    setLoading(false);

    if (result.success) {
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Đổi mật khẩu thành công' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleSaveNotificationSettings = () => {
    localStorage.setItem('notification_settings', JSON.stringify(notificationSettings));
    setMessage({ type: 'success', text: 'Cài đặt thông báo đã được lưu' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[5vh] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-2xl md:rounded-3xl shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden max-h-[85vh] md:max-h-[90vh] scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar / Tabs Navigation */}
        <div className="w-full md:w-48 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-100 p-3 md:p-4 flex flex-row md:flex-col justify-between md:justify-start shrink-0 overflow-x-auto md:overflow-x-visible gap-2 md:gap-4 scrollbar-none">
          <h2 className="text-base md:text-lg font-bold text-slate-800 hidden md:block">Tài khoản</h2>
          <nav className="flex flex-row md:flex-col gap-1.5 md:gap-2">
            {[
              { id: 'profile', label: 'Hồ sơ', icon: 'person' },
              { id: 'security', label: 'Bảo mật', icon: 'lock' },
              { id: 'notifications', label: 'Thông báo', icon: 'notifications' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage({ type: '', text: '' });
                }}
                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#00288E] text-white'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-base md:text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          <button
            onClick={onClose}
            className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap cursor-pointer"
          >
            <span className="material-symbols-outlined text-base md:text-lg">close</span>
            <span className="hidden md:inline">Đóng</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Message Alert */}
          {message.text && (
            <div
              className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && user && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${getAvatarGradient(user.firstName, user.lastName)} text-white flex items-center justify-center font-bold text-base md:text-xl shrink-0 shadow-sm`}>
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-800">
                      {user.lastName} {user.firstName}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      {user.roleName} · {user.dept}
                    </p>
                  </div>
                </div>
                {!isEditMode && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-[#00288E] hover:bg-blue-50 rounded-lg transition-colors border border-blue-100 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base md:text-lg">edit</span>
                    Chỉnh sửa hồ sơ
                  </button>
                )}
              </div>

              {/* Info Fields */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4">
                    Thông tin cá nhân
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Họ', name: 'lastName', type: 'text' },
                      { label: 'Tên', name: 'firstName', type: 'text' },
                      { label: 'Email', name: 'email', type: 'email', readonly: true },
                      { label: 'Số điện thoại', name: 'phoneNumber', type: 'tel' },
                      { label: 'Ngày sinh', name: 'dateOfBirth', type: 'date' },
                      { label: 'Địa chỉ', name: 'address', type: 'text' },
                    ].map(field => (
                      <div key={field.name}>
                        {field.name === 'dateOfBirth' ? (
                          <div className="space-y-1.5">
                            <label className="block text-xs text-slate-500 font-medium">
                              {field.label}
                            </label>
                            {isEditMode ? (
                              <CustomDatePicker
                                value={formatDate(formData.dateOfBirth)}
                                onChange={(val) => setFormData(prev => ({ ...prev, dateOfBirth: val }))}
                              />
                            ) : (
                              <input
                                type="text"
                                readOnly
                                disabled
                                value={formData.dateOfBirth ? formatDate(formData.dateOfBirth).split('-').reverse().join('/') : ''}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed"
                              />
                            )}
                          </div>
                        ) : (
                          <>
                            <label className="block text-xs text-slate-500 font-medium mb-1.5">
                              {field.label}
                            </label>
                            <input
                              type={field.type}
                              name={field.name}
                              value={field.type === 'date' ? formatDate(formData[field.name]) : (formData[field.name] || '')}
                              onChange={handleInputChange}
                              disabled={!isEditMode || field.readonly}
                              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white disabled:bg-slate-50 disabled:text-slate-600 transition-colors"
                            />
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4">
                    Thông tin công việc
                  </h4>
                  <div className="space-y-4">
                    {[
                      { label: 'Chức vụ', value: user.roleName },
                      { label: 'Phòng ban', value: user.dept },
                      { label: 'ID nhân viên', value: `NV-${String(user.userID).padStart(3, '0')}` },
                    ].map((field, i) => (
                      <div key={i}>
                        <label className="block text-xs text-slate-500 font-medium mb-1.5">
                          {field.label}
                        </label>
                        <div className="px-3 py-2 text-sm text-slate-800 bg-slate-50 rounded-lg">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Edit Buttons */}
              {isEditMode && (
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[#00288E] text-white text-sm font-medium rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setFormData(user);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800">Đổi mật khẩu</h3>
              <div className="space-y-4">
                {[
                  { label: 'Mật khẩu hiện tại', name: 'currentPassword', key: 'current' },
                  { label: 'Mật khẩu mới', name: 'newPassword', key: 'new' },
                  { label: 'Xác nhận mật khẩu', name: 'confirmPassword', key: 'confirm' },
                ].map(field => (
                  <div key={field.name}>
                    <label className="block text-xs text-slate-500 font-medium mb-1.5">
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword[field.key] ? 'text' : 'password'}
                        name={field.name}
                        value={passwordData[field.name]}
                        onChange={handlePasswordChange}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-10 text-sm border border-slate-200 rounded-lg bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(prev => ({ ...prev, [field.key]: !prev[field.key] }))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showPassword[field.key] ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full px-4 py-2 bg-[#00288E] text-white text-sm font-medium rounded-lg hover:bg-blue-900 transition-colors disabled:opacity-50"
              >
                {loading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
              </button>
            </div>
          )}

          {/* Notifications Settings Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-800">Cài đặt thông báo</h3>
              <div className="space-y-4">
                {[
                  { key: 'orders', label: 'Thông báo về đơn hàng', icon: 'receipt_long' },
                  { key: 'warehouse', label: 'Thông báo về kho hàng', icon: 'inventory_2' },
                  { key: 'payments', label: 'Thông báo về công nợ', icon: 'payments' },
                  { key: 'system', label: 'Thông báo hệ thống', icon: 'info' },
                ].map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-600">
                        {item.icon}
                      </span>
                      <span className="text-sm text-slate-700">{item.label}</span>
                    </div>
                    <ToggleSwitch
                      isOn={notificationSettings[item.key]}
                      onChange={() => handleToggleSetting(item.key)}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveNotificationSettings}
                className="w-full px-4 py-2 bg-[#00288E] text-white text-sm font-medium rounded-lg hover:bg-blue-900 transition-colors"
              >
                Lưu cài đặt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountModal;
