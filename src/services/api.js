import axios from 'axios';

// Cấu hình Axios base
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: tự động thêm Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: xử lý lỗi toàn cục
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
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