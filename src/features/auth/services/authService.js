import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const USE_MOCK = true; // Force mock for now as requested by user or implied by current state

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3000,
  headers: { 'Content-Type': 'application/json' },
});

// Mock users list with @gmail.com to satisfy browser email validation
const mockUsers = [
  { "userID": 1, "lastName": "Nguyễn Văn", "firstName": "An", "email": "sale@gmail.com", "roleID": 2, "roleName": "Nhân viên bán hàng" },
  { "userID": 3, "lastName": "Võ", "firstName": "Huy", "email": "accounting@gmail.com", "roleID": 1, "roleName": "Kế toán" },
  { "userID": 4, "lastName": "Lê Văn", "firstName": "Kho", "email": "warehouse@gmail.com", "roleID": 4, "roleName": "Nhân viên kho" },
  { "userID": 5, "lastName": "Phạm", "firstName": "Admin", "email": "admin@gmail.com", "roleID": 3, "roleName": "Quản trị viên" }
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
        const response = await apiClient.post('/api/auth/login', { email, password });
        const data = response.data;
        
        if (data.success) {
          // Lưu token và user vào localStorage cho cả 2 kiểu đặt tên cũ và mới trong dự án
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
        const response = await apiClient.get('/api/auth/me');
        return response.data;
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
  }
};

export default authService;
