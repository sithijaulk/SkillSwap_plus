import axios from 'axios';

// base API url configured via environment variables
// REACT_APP_API_URL can be set directly, otherwise we build from port
const normalizeOrigin = (origin) => String(origin || '').replace(/\/$/, '');

const getApiOrigin = () => {
  if (process.env.REACT_APP_API_URL) {
    return normalizeOrigin(process.env.REACT_APP_API_URL);
  }

  const port = process.env.REACT_APP_PORT || 5001;
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:${port}`;
  }

  return `http://localhost:${port}`;
};

const API_ORIGIN =
  getApiOrigin();

export const buildAssetUrl = (assetPath = '') => {
  if (!assetPath) return '';

  if (assetPath.startsWith('data:') || assetPath.startsWith('blob:')) {
    return assetPath;
  }

  // Fix old records saved with localhost/127.0.0.1 absolute URLs.
  if (/^https?:\/\//i.test(assetPath)) {
    try {
      const parsed = new URL(assetPath);
      const isLoopbackHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
      if (!isLoopbackHost) {
        return assetPath;
      }

      return `${API_ORIGIN}${parsed.pathname}${parsed.search || ''}${parsed.hash || ''}`;
    } catch (error) {
      return assetPath;
    }
  }

  const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

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

export { api };
export default api;
