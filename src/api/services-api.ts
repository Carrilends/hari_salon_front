import axios from 'axios';
import { useAuthStore } from 'src/stores/auth-store';

export const servicesApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // localhost:3000/api/service
});

export const adminServiceApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

adminServiceApi.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${auth.token}`;
  }
  return config;
});
