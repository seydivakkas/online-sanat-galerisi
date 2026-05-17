import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Her istekte JWT token ekle
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 durumunda otomatik logout ve standart response data mapping
api.interceptors.response.use(
  (res) => {
    // Backend standard yapısı `{ success, data, message }` ise data.data'yı direkt çıkar
    if (res.data && typeof res.data.success === 'boolean') {
      const actualData = res.data.data !== undefined ? res.data.data : res.data;
      // İleride mesaj göstermek isteyen bileşenler için gizli bir mesaj field atalım (eğer actualData obje ise)
      if (typeof actualData === 'object' && actualData !== null && !Array.isArray(actualData)) {
        actualData._message = res.data.message;
      }
      res.data = actualData;
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    // Hata mesajı standardizasyonu
    if (err.response && err.response.data && err.response.data.message) {
      err.response.data.error = err.response.data.message;
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Users
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/password', data),
};

// Artworks
export const artworkAPI = {
  getAll: (params) => api.get('/artworks', { params }),
  getById: (id) => api.get(`/artworks/${id}`),
  getReviews: (id) => api.get(`/artworks/${id}/reviews`),
  getAvgRating: (id) => api.get(`/artworks/${id}/avg-rating`),
};

// Artists
export const artistAPI = {
  getAll: () => api.get('/artists'),
  getById: (id) => api.get(`/artists/${id}`),
  getCategories: () => api.get('/artists/categories/all'),
};

// Events
export const eventAPI = {
  getAll: (params) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
};

// Favorites
export const favoriteAPI = {
  getAll: () => api.get('/favorites'),
  add: (artwork_id) => api.post('/favorites', { artwork_id }),
  remove: (artwork_id) => api.delete(`/favorites/${artwork_id}`),
};

// Reservations
export const reservationAPI = {
  getAll: () => api.get('/reservations'),
  getById: (id) => api.get(`/reservations/${id}`),
  create: (data) => api.post('/reservations', data),
  update: (id, data) => api.put(`/reservations/${id}`, data),
  cancel: (id) => api.delete(`/reservations/${id}`),
};

// Orders
export const orderAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  confirm: (id) => api.post(`/orders/${id}/confirm`),
};

// Reviews
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getAll: (params) => api.get('/reviews', { params }),
  vote: (id, data) => api.post(`/reviews/${id}/vote`, data),
  addReply: (id, data) => api.post(`/reviews/${id}/replies`, data),
  getReplies: (id) => api.get(`/reviews/${id}/replies`),
};

// Coupons
export const couponAPI = {
  validate: (code) => api.get('/coupons/validate', { params: { code } }),
  getMyOffers: () => api.get('/coupons/my-offers'),
};

// Support
export const supportAPI = {
  createTicket: (data) => api.post('/support/tickets', data),
  getTickets: () => api.get('/support/tickets'),
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  sendMessage: (id, data) => api.post(`/support/tickets/${id}/messages`, data),
};

// Compare
export const compareAPI = {
  artworks: (artwork_ids) => api.post('/compare/artworks', { artwork_ids }),
  events: (event_ids) => api.post('/compare/events', { event_ids }),
  save: (data) => api.post('/compare/save', data),
  getSaved: () => api.get('/compare/saved'),
};

// Admin
export const adminAPI = {
  // Raporlar
  getSummary: () => api.get('/admin/reports/summary'),
  getArtworkReports: () => api.get('/admin/reports/artworks'),
  getEventReports: () => api.get('/admin/reports/events'),
  // Kullanıcılar
  getUsers: () => api.get('/admin/users'),
  updateUserStatus: (id, is_active) => api.patch(`/admin/users/${id}/status`, { is_active }),
  updateUserRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  // Eserler
  getArtworks: () => api.get('/admin/artworks'),
  updateArtwork: (id, data) => api.put(`/admin/artworks/${id}`, data),
  deleteArtwork: (id) => api.delete(`/admin/artworks/${id}`),
  // Etkinlikler
  getEvents: () => api.get('/admin/events'),
  createEvent: (data) => api.post('/admin/events', data),
  updateEvent: (id, data) => api.put(`/admin/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/admin/events/${id}`),
  // Siparişler
  getOrders: () => api.get('/admin/orders'),
  updateOrderStatus: (id, status) => api.patch(`/admin/orders/${id}/status`, { status }),
  // Yorumlar
  getReviews: () => api.get('/admin/reviews'),
  deleteReview: (id) => api.delete(`/admin/reviews/${id}`),
  updateReviewStatus: (id, is_verified) => api.patch(`/reviews/${id}/status`, { is_verified }),
  replyReview: (id, reply_text) => api.post(`/admin/reviews/${id}/reply`, { reply_text }),
  // Kuponlar
  getCoupons: () => api.get('/admin/coupons'),
  createCoupon: (data) => api.post('/admin/coupons', data),
  updateCoupon: (id, data) => api.put(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/admin/coupons/${id}`),
};

export default api;
