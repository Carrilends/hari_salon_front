import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Rutas que NUNCA deben disparar una renovación: hacerlo provocaría un bucle
// (el propio /auth/refresh puede responder 401 cuando la sesión ya expiró).
const NO_REFRESH = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/google',
];

/** Decisión pura: ¿este error debe intentar una renovación de sesión? */
export function shouldRefresh(
  status: number | undefined,
  url: string | undefined,
  retried: boolean,
): boolean {
  if (status !== 401 || retried) return false;
  return !NO_REFRESH.some((path) => (url ?? '').includes(path));
}

let refreshPromise: Promise<void> | null = null;

/**
 * Renovación con petición única: todas las llamadas concurrentes se cuelgan de
 * la misma promesa, de modo que cinco peticiones que fallan a la vez con 401
 * provocan un solo POST /auth/refresh.
 */
export async function refreshOnce(): Promise<void> {
  refreshPromise ??= (async () => {
    const { authApi } = await import('./auth-api');
    const { useAuthStore } = await import('src/stores/auth-store');
    const auth = useAuthStore();
    try {
      const session = await authApi.refresh();
      auth.setSession(
        session.token,
        session,
        session.expiresIn * 1000 + Date.now(),
      );
    } catch (error) {
      auth.logout();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export function attachRefreshInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (!config || !shouldRefresh(error.response?.status, config.url, !!config._retried)) {
      throw error;
    }
    config._retried = true;
    await refreshOnce(); // si falla, propaga y la sesión queda cerrada
    return instance(config); // reintento único con el access token nuevo
  });
}
