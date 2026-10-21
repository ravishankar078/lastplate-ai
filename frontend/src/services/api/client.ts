import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Base URL: Fallback to local FastAPI endpoint or environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer token if present in localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lastplate_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Format errors and handle 401s
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // In production, token expired -> redirect to login or trigger refresh
      console.warn('[API Client] Unauthorized request (401). Token may be expired.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
