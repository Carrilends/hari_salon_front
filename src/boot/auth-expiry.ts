import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/auth-store';
import { refreshOnce } from 'src/api/refresh-interceptor';

/**
 * Fase 3b: el boot deja de cerrar la sesión al expirar el token. Ahora hay
 * refresh, así que lo correcto es intentar renovar y solo cerrar si falla.
 */
export default boot(async () => {
  // En SSR/SSG no hay `window`; este boot solo tiene sentido en el cliente.
  if (typeof window === 'undefined') return;

  const auth = useAuthStore();

  // El access token ya no se persiste (S7): al cargar no existe. Si hay un perfil
  // persistido de una sesión anterior, se intenta restaurarla con una renovación
  // silenciosa desde la cookie de refresh; si no hay perfil, es un visitante
  // anónimo y no se molesta al servidor.
  if (!auth.token && auth.email) {
    try {
      await refreshOnce();
    } catch {
      /* la cookie ya no vale: se sigue como anónimo (refreshOnce ya limpió) */
    }
  }

  // Renovación preventiva: un minuto antes de que expire el access token.
  const id = setInterval(() => {
    if (auth.token && auth.expiresAt - Date.now() < 60_000) {
      void refreshOnce().catch(() => auth.logout());
    }
  }, 30_000);

  window.addEventListener('beforeunload', () => clearInterval(id));
});
