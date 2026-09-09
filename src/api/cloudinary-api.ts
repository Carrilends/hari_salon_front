import axios from 'axios';
import { attachRefreshInterceptor } from './refresh-interceptor';

export const cloudinaryApi = axios.create({
  // El cloud name llega firmado desde el backend, no de una env var del front.
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});
attachRefreshInterceptor(cloudinaryApi);

export const cloudinaryUploadUrl = (cloudName: string) =>
  `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
