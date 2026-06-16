import api from '../../../services/api';
import tokenStorage from '../../../utils/tokenStorage';

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data;
      
      if (data.success) {
        tokenStorage.setToken(data.token);
        if (data.refreshToken) {
          tokenStorage.setRefreshToken(data.refreshToken);
        }
        tokenStorage.setUser(data.user);
      }
      
      return data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Đăng nhập thất bại' };
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Backend logout error:', err);
    }
    tokenStorage.clear();
    return { success: true };
  },

  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      // BE trả về { success: true, user: safeUser }, cần lấy thuộc tính user
      return response.data?.user || response.data;
    } catch {
      return null;
    }
  },

  isAuthenticated: () => {
    return !!tokenStorage.getToken();
  },

  updateProfile: async (payload) => {
    try {
      const response = await api.put('/auth/me', payload);
      if (response.data.success) {
        tokenStorage.setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi cập nhật hồ sơ' };
    }
  },

  changePassword: async (payload) => {
    try {
      const response = await api.put('/auth/change-password', payload);
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Lỗi đổi mật khẩu' };
    }
  }
};

export default authService;
