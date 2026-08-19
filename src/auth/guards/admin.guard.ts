import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';

/**
 * Guarda de interfaz (no de seguridad): quien la evada solo verá una página
 * vacía, porque los endpoints ya exigen rol `admin` en el backend. Sustituye a
 * la antigua `is-authenticated.guard.ts`, que leía `localStorage.getItem('userId')`
 * —una clave que nadie escribía— y a la que ninguna ruta apuntaba.
 */
const adminGuard = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const auth = useAuthStore();
  if (!auth.isLoggedIn) {
    return next({ name: 'login', query: { redirect: to.path } });
  }
  if (!auth.isAdmin) return next({ path: '/' });
  return next();
};

export default adminGuard;
