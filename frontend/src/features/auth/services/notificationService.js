import axios from 'axios';
import dbData from '../../../../db.json';
import authService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const filterNotificationsByRole = (notifications, userRole) => {
  if (!Array.isArray(notifications)) return [];
  return notifications.filter(notif => {
    // Nếu roleIds là null, tất cả mọi người đều thấy (thông báo hệ thống)
    if (!notif.roleIds || notif.roleIds.length === 0) return true;
    // Nếu roleIds có giá trị, chỉ show cho những role trong danh sách
    return notif.roleIds.includes(userRole);
  });
};

export const notificationService = {
  getNotifications: async () => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        // Lấy user hiện tại để biết role
        const user = await authService.getMe();
        const userRole = user?.roleID || 5; // Mặc định là Super Admin nếu không tìm thấy

        // Cố gắng lấy từ localStorage trước (đã lọc)
        const stored = localStorage.getItem('app_notifications');
        if (stored) {
          const notifs = JSON.parse(stored);
          return filterNotificationsByRole(notifs, userRole);
        }

        // Nếu không có, lấy từ db.json và filter
        const allNotifs = dbData.notifications || [];
        return filterNotificationsByRole(allNotifs, userRole);
      } catch (e) {
        console.error('Error reading notifications from localStorage:', e);
        return [];
      }
    } else {
      try {
        // Backend sẽ tự động filter dựa trên JWT user role
        const response = await apiClient.get('/notifications');
        return response.data;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }
    }
  },

  getUnreadCount: async () => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const user = await authService.getMe();
        const userRole = user?.roleID || 5;
 
        const stored = localStorage.getItem('app_notifications');
        const allNotifications = stored ? JSON.parse(stored) : dbData.notifications || [];
        const filtered = filterNotificationsByRole(allNotifications, userRole);
        return filtered.filter(n => !n.isRead).length;
      } catch (e) {
        return 0;
      }
    } else {
      try {
        const response = await apiClient.get('/notifications/unread-count');
        return response.data.count || 0;
      } catch (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }
    }
  },

  markAsRead: async (id) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const stored = localStorage.getItem('app_notifications');
        const notifications = stored ? JSON.parse(stored) : dbData.notifications || [];
        const updated = notifications.map(n =>
          n.id === id ? { ...n, isRead: true } : n
        );
        localStorage.setItem('app_notifications', JSON.stringify(updated));
        return { success: true };
      } catch (e) {
        return { success: false };
      }
    } else {
      try {
        const response = await apiClient.patch(`/notifications/${id}/read`);
        return response.data;
      } catch (error) {
        console.error('Error marking notification as read:', error);
        return { success: false };
      }
    }
  },

  markAllAsRead: async () => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200));
      try {
        const stored = localStorage.getItem('app_notifications');
        const notifications = stored ? JSON.parse(stored) : dbData.notifications || [];
        const updated = notifications.map(n => ({ ...n, isRead: true }));
        localStorage.setItem('app_notifications', JSON.stringify(updated));
        return { success: true };
      } catch (e) {
        return { success: false };
      }
    } else {
      try {
        const response = await apiClient.patch('/notifications/read-all');
        return response.data;
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return { success: false };
      }
    }
  }
};

export default notificationService;
