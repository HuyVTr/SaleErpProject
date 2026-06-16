import axios from 'axios';
import tokenStorage from '../utils/tokenStorage';

// Cấu hình Axios base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: tự động thêm Bearer Token
api.interceptors.request.use(
  (config) => {
    if (config.url && config.url.startsWith('/api')) {
      config.url = config.url.replace(/^\/api/, '');
    }
    const token = tokenStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Quản lý việc refresh token và lưu trữ các request bị treo để thực hiện lại sau khi refresh thành công
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: xử lý lỗi toàn cục và tự động refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Tránh vòng lặp vô hạn và chỉ xử lý lỗi 401
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Bỏ qua nếu là request liên quan đến login hoặc chính endpoint refresh
      if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
        tokenStorage.clear();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        isRefreshing = false;
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Gọi API refresh token
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          { refreshToken }
        );

        const { token: newAccessToken, refreshToken: newRefreshToken } = response.data?.data || response.data || {};
        
        if (newAccessToken) {
          tokenStorage.setToken(newAccessToken);
          if (newRefreshToken) {
            tokenStorage.setRefreshToken(newRefreshToken);
          }
          
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          processQueue(null, newAccessToken);
          return api(originalRequest);
        } else {
          throw new Error('Refresh token response missing access token');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// =============================================
// ✅ API SERVICES THEO TÀI LIỆU ĐẶC TẢ CHÍNH THỨC
// =============================================

/**
 * 🔐 AUTHENTICATION API
 */
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
};

/**
 * 👥 CUSTOMERS API
 */
export const customersApi = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getHistory: (id) => api.get(`/customers/${id}/history`),
};

/**
 * 📦 PRODUCTS & CATEGORIES API
 */
export const productsApi = {
  getAllCategories: () => api.get('/categories'),
  getAllProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  getPriceLists: () => api.get('/price-lists'),
  getPriceListItems: (id) => api.get(`/price-lists/${id}/items`),
};

/**
 * 📑 QUOTATIONS API
 */
export const quotationsApi = {
  getAll: (params) => api.get('/quotations', { params }),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  updateStatus: (id, status) => api.put(`/quotations/${id}/status`, { status }),
  convertToOrder: (id) => api.post(`/quotations/${id}/convert`),
};

/**
 * 🧾 ORDERS API
 */
export const ordersApi = {
  getAll: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  updatePayment: (id, data) => api.put(`/orders/${id}/payment`, data),
};

/**
 * 📊 REPORTS API
 */
export const reportsApi = {
  getRevenue: (params) => api.get('/reports/revenue', { params }),
  getDebtReport: () => api.get('/reports/debt'),
  getTopProducts: () => api.get('/reports/top-products'),
};

/**
 * 👑 ADMIN USERS API
 */
export const adminApi = {
  getAllUsers: () => api.get('/users'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  getAllRoles: () => api.get('/roles'),
};