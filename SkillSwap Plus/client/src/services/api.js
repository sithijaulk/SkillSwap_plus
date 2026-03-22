import axios from 'axios';

// base API url configured via environment variables
// REACT_APP_API_URL can be set directly, otherwise we build from port
const API_ORIGIN =
  process.env.REACT_APP_API_URL ||
  `http://localhost:${process.env.REACT_APP_PORT || 5001}`;

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
});

// attach auth token automatically if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - central error handling
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      // clear auth and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
