import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';

/**
 * Guarda de interfaz (no de seguridad): exige sesión iniciada, sin rol concreto.
 * Quien la evada solo verá una página que no carga nada, porque el endpoint
 * `GET /reservations/me` ya exige un JWT válido en el backend. Es el molde de
 * `admin.guard`, pero sin la comprobación de rol admin (Fase 6, T2).
 */
const sessionGuard = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const auth = useAuthStore();
  if (!auth.isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.path } });
  }
  return next();
};

export default sessionGuard;
