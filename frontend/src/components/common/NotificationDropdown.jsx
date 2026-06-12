import React, { useState, useEffect } from 'react';
import notificationService from '../../features/auth/services/notificationService';

const NotificationDropdown = ({ isOpen, onClose, onViewAll }) => {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
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

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
    await fetchNotifications();
  };

  const getIcon = (type) => {
    const icons = {
      order: { icon: 'receipt_long', color: 'text-emerald-600', bg: 'bg-emerald-50' },
      warehouse: { icon: 'inventory_2', color: 'text-amber-600', bg: 'bg-amber-50' },
      payment: { icon: 'payments', color: 'text-rose-600', bg: 'bg-rose-50' },
      system: { icon: 'info', color: 'text-[#00288E]', bg: 'bg-blue-50' },
    };
    return icons[type] || icons.system;
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    return notifDate.toLocaleDateString('vi-VN');
  };

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] w-[320px] sm:w-[400px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-slate-100 transition-all duration-300 z-50 max-h-[75vh] flex flex-col overflow-hidden scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-sm">Thông báo</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-[#00288E] hover:text-blue-700 font-semibold transition-colors cursor-pointer"
          >
            Đọc tất cả
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-100 bg-white">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold transition-all rounded-full cursor-pointer ${
            activeTab === 'all'
              ? 'text-[#00288E] bg-blue-50/70 border border-[#00288E]/10'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
          }`}
        >
          Tất cả
        </button>
        <button
          onClick={() => setActiveTab('unread')}
          className={`px-3.5 py-1.5 text-xs font-semibold transition-all rounded-full relative cursor-pointer ${
            activeTab === 'unread'
              ? 'text-[#00288E] bg-blue-50/70 border border-[#00288E]/10'
              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
          }`}
        >
          Chưa đọc
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[45vh] custom-scrollbar">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-xs font-bold uppercase tracking-wider animate-pulse">Đang tải...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 space-y-2 text-slate-400">
            <span className="material-symbols-outlined text-4xl block text-slate-300">notifications_off</span>
            <p className="text-xs font-bold uppercase tracking-wider">Không có thông báo nào</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const { icon, color, bg } = getIcon(notif.type);
            return (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                className={`p-3 rounded-xl cursor-pointer border transition-all duration-200 relative overflow-hidden active:scale-[0.98] ${
                  notif.isRead 
                    ? 'bg-white hover:bg-slate-50/80 border-slate-100/70 hover:border-slate-200' 
                    : 'bg-blue-50/30 hover:bg-blue-50 border-blue-100/40 hover:border-blue-200/60'
                }`}
              >
                {!notif.isRead && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#00288E] rounded-full shadow-[0_0_8px_rgba(0,40,142,0.6)] animate-pulse" />
                )}
                <div className="flex gap-3 pr-2">
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${bg} border border-white/50 shadow-sm`}>
                    {notif.isRead ? (
                      <span className="material-symbols-outlined text-sm text-slate-400">done</span>
                    ) : (
                      <span className={`material-symbols-outlined text-base ${color}`}>{icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs text-slate-800 line-clamp-1 ${notif.isRead ? 'font-medium' : 'font-bold'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                      {getRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 p-2.5 bg-slate-50/50">
        <button
          onClick={onViewAll}
          className="w-full py-2.5 text-xs font-bold text-center text-white bg-[#00288E] hover:bg-blue-900 rounded-xl transition-all shadow-md shadow-blue-900/10 cursor-pointer active:scale-95"
        >
          Xem tất cả thông báo
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
