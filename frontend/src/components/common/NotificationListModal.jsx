import React, { useState, useEffect } from 'react';
import notificationService from '../../features/auth/services/notificationService';

const NotificationListModal = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    const data = await notificationService.getNotifications();
    setNotifications(data);
    setLoading(false);
  };

  const handleMarkAsRead = async (id) => {
    await notificationService.markAsRead(id);
    await fetchNotifications();
  };

  const getIcon = (type) => {
    const icons = {
      order: { icon: 'receipt_long', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      warehouse: { icon: 'inventory_2', color: 'text-amber-600', bg: 'bg-amber-50' },
      payment: { icon: 'payments', color: 'text-red-600', bg: 'bg-red-50' },
      system: { icon: 'info', color: 'text-blue-600', bg: 'bg-blue-50' },
    };
    return icons[type] || icons.system;
  };

  const groupNotificationsByDate = (notifs) => {
    const today = new Date().toDateString();
    const grouped = { 'Hôm nay': [], 'Trước đó': [] };

    notifs.forEach(notif => {
      const notifDate = new Date(notif.createdAt).toDateString();
      if (notifDate === today) {
        grouped['Hôm nay'].push(notif);
      } else {
        grouped['Trước đó'].push(notif);
      }
    });

    return Object.entries(grouped).filter(([, notifs]) => notifs.length > 0);
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    return notifDate.toLocaleDateString('vi-VN');
  };

  const filteredNotifications = selectedType === 'all'
    ? notifications
    : notifications.filter(n => n.type === selectedType);

  const groupedNotifications = groupNotificationsByDate(filteredNotifications);

  const typeOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'order', label: 'Đơn hàng' },
    { value: 'warehouse', label: 'Kho' },
    { value: 'payment', label: 'Công nợ' },
    { value: 'system', label: 'Hệ thống' },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[10vh] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden max-h-[80vh] scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Tất cả thông báo</h2>
          <button
            onClick={onClose}
            className="text-[10px] font-black text-slate-400 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg uppercase transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 px-8 py-4 border-b border-slate-100 overflow-x-auto scrollbar-none bg-slate-50/50">
          {typeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedType(opt.value)}
              className={`px-4 py-2 text-xs font-bold transition-all rounded-full whitespace-nowrap cursor-pointer active:scale-95 ${
                selectedType === opt.value
                  ? 'text-white bg-[#00288E] shadow-sm shadow-[#00288E]/20'
                  : 'text-slate-600 hover:text-slate-800 bg-white border border-slate-200/60 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-xs font-bold uppercase tracking-wider animate-pulse">Đang tải...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-16 space-y-3 text-slate-400">
              <span className="material-symbols-outlined text-5xl block text-slate-300">notifications_off</span>
              <p className="text-sm font-bold uppercase tracking-wider">Không có thông báo nào</p>
              <p className="text-xs text-slate-400">Thử lọc theo loại khác hoặc quay lại sau.</p>
            </div>
          ) : (
            groupedNotifications.map(([dateGroup, notifs]) => (
              <div key={dateGroup} className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-widest text-[#00288E] font-black ml-1">
                  {dateGroup}
                </h3>
                <div className="space-y-3">
                  {notifs.map(notif => {
                    const { icon, color, bg } = getIcon(notif.type);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                        className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer relative overflow-hidden active:scale-[0.99] ${
                          notif.isRead
                            ? 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                            : 'bg-blue-50/20 border-blue-100/60 hover:border-blue-200 hover:bg-blue-50/40 shadow-sm shadow-blue-900/5'
                        }`}
                      >
                        {!notif.isRead && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00288E]" />
                        )}
                        <div className="flex gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${bg} border border-white/50 shadow-sm`}>
                            {notif.isRead ? (
                              <span className="material-symbols-outlined text-slate-400 text-base">done</span>
                            ) : (
                              <span className={`material-symbols-outlined text-lg ${color}`}>{icon}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm text-slate-800 ${notif.isRead ? 'font-medium' : 'font-bold'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                              {notif.message}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 mt-2.5">
                              {getRelativeTime(notif.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationListModal;
