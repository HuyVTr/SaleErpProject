import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    if (config.url && config.url.startsWith('/api')) {
      config.url = config.url.replace(/^\/api/, '');
    }
    const token = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Mock users list with @gmail.com to satisfy browser email validation
const mockUsers = [
  { "userID": 1, "lastName": "Nguyễn Văn", "firstName": "An", "email": "sale@gmail.com", "roleID": 2, "roleName": "Nhân viên bán hàng" },
  { "userID": 3, "lastName": "Võ", "firstName": "Huy", "email": "accounting@gmail.com", "roleID": 1, "roleName": "Kế toán" },
  { "userID": 4, "lastName": "Lê Văn", "firstName": "Kho", "email": "warehouse@gmail.com", "roleID": 4, "roleName": "Nhân viên kho" },
  { "userID": 5, "lastName": "Phạm", "firstName": "Admin", "email": "admin@gmail.com", "roleID": 5, "roleName": "Super Admin" },
  { "userID": 9, "lastName": "Nguyễn", "firstName": "Admin Thường", "email": "admin1@gmail.com", "roleID": 3, "roleName": "Quản trị viên" }
];

export const authService = {
  login: async (email, password) => {
    if (USE_MOCK) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find user by email
      const user = mockUsers.find(u => u.email === email);
      
      if (user && password === '123456') {
        // Set tokens for both patterns found in the project
        localStorage.setItem('access_token', 'mock_jwt_token_123');
        localStorage.setItem('auth_token', 'mock_jwt_token_123');
        localStorage.setItem('token', 'mock_jwt_token_123');
        
        // Set user data for both patterns found in the project
        localStorage.setItem('current_user', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
        
        return { success: true, user, token: 'mock_jwt_token_123' };
      }
      return { success: false, message: 'Tài khoản hoặc mật khẩu không đúng' };
    } else {
      try {
        const response = await apiClient.post('/auth/login', { email, password });
        const data = response.data;
        
        if (data.success) {
          // Lưu token và user vào localStorage cho cả 2 kiểu đặt tên cũ và mới trong dự án
          localStorage.setItem('access_token', data.token);
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('token', data.token);
          localStorage.setItem('current_user', JSON.stringify(data.user));
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        return data;
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'Đăng nhập thất bại' };
      }
    }
  },

  logout: async () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('user');
    return { success: true };
  },

  getMe: async () => {
    if (USE_MOCK) {
      const user = localStorage.getItem('current_user') || localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } else {
      try {
        const response = await apiClient.get('/auth/me');
        // BE trả về { success: true, user: safeUser }, cần lấy thuộc tính user
        return response.data?.user || response.data;
      } catch (error) {
        return null;
      }
    }
  },

  isAuthenticated: () => {
    return !!(localStorage.getItem('auth_token') || localStorage.getItem('token'));
  },

  getMockUsers: () => {
    return mockUsers;
  },

  updateProfile: async (payload) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      try {
        const user = localStorage.getItem('current_user') || localStorage.getItem('user');
        const userData = user ? JSON.parse(user) : null;
        if (!userData) return { success: false, message: 'Không tìm thấy người dùng' };

        const updated = { ...userData, ...payload };
        localStorage.setItem('current_user', JSON.stringify(updated));
        localStorage.setItem('user', JSON.stringify(updated));
        return { success: true, user: updated };
      } catch (e) {
        return { success: false, message: 'Lỗi cập nhật hồ sơ' };
      }
    } else {
      try {
        const response = await apiClient.put('/api/auth/me', payload);
        if (response.data.success) {
          localStorage.setItem('current_user', JSON.stringify(response.data.user));
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật hồ sơ' };
      }
    }
  },

  changePassword: async (payload) => {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500));
      // Mock validation: current password should be '123456'
      if (payload.currentPassword !== '123456') {
        return { success: false, message: 'Mật khẩu hiện tại không chính xác' };
      }
      if (payload.newPassword !== payload.confirmPassword) {
        return { success: false, message: 'Mật khẩu xác nhận không khớp' };
      }
      if (payload.newPassword.length < 6) {
        return { success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự' };
      }
      return { success: true, message: 'Mật khẩu được cập nhật thành công' };
    } else {
      try {
        const response = await apiClient.put('/api/auth/change-password', payload);
        return response.data;
      } catch (error) {
        return { success: false, message: error.response?.data?.message || 'Lỗi đổi mật khẩu' };
      }
    }
  }
};

export default authService;
