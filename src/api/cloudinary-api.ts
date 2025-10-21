import axios from 'axios';

export const cloudinaryApi = axios.create({
  // baseURL: `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/`,
  baseURL: import.meta.env.VITE_API_URL,
});

export const cloudinaryUploadUrl = (cloudName: string) =>
  `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
