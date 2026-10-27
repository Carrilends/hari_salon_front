import axios from 'axios';
import { useAuthStore } from 'src/stores/auth-store';
import { attachRefreshInterceptor } from './refresh-interceptor';

/**
 * La base de la API. En el navegador es `VITE_API_URL` (relativa, `/api`, que
 * resuelve el proxy). En el servidor, durante `quasar ssg generate`, una URL
 * relativa no apunta a ningún sitio: hace falta una absoluta en `SSG_API_URL`
 * (p. ej. `http://localhost:3101/api`, la pila E2E). Sin ella la generación se
 * niega: unas páginas públicas sin catálogo, reseñas ni preguntas no se
 * publican (RF62, NF04).
 */
function baseDeLaApi(): string | undefined {
  if (import.meta.env.SSR) {
    const url = process.env.SSG_API_URL;
    if (!url) {
      throw new Error('SSG_API_URL es obligatoria para generar las páginas');
    }
    return url;
  }
  return import.meta.env.VITE_API_URL;
}

const BASE_API = baseDeLaApi();

// withCredentials: envía y acepta la cookie de sesión. Con el proxy son
// peticiones del mismo origen, pero dejarlo explícito evita que la sesión se
// rompa en silencio el día que alguien apunte a otro origen (Fase 3b).
export const servicesApi = axios.create({
  baseURL: BASE_API,
  withCredentials: true,
});

export const adminServiceApi = axios.create({
  baseURL: BASE_API,
  withCredentials: true,
});

adminServiceApi.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${auth.token}`;
  }
  return config;
});

attachRefreshInterceptor(servicesApi);
attachRefreshInterceptor(adminServiceApi);
