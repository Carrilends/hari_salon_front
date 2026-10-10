import type { AuthResponse } from 'src/api/apiTypes';
import { useAuthStore } from 'src/stores/auth-store';

/**
 * Vuelca en el almacén la sesión que devuelven las rutas de Mi cuenta
 * (`PATCH /auth/me/profile|email|password`, `GET /auth/check-status`): todas
 * traen un access token nuevo y el perfil al día, `hasPassword` incluido
 * (plan 6, hoja de ruta §4.7). Una sola función para que ninguna sección se
 * olvide de un campo.
 */
export function aplicarSesion(sesion: AuthResponse): void {
  useAuthStore().setSession(
    sesion.token,
    {
      fullName: sesion.fullName,
      email: sesion.email,
      roles: sesion.roles,
      emailVerified: sesion.emailVerified,
      hasPassword: sesion.hasPassword,
    },
    sesion.expiresIn * 1000 + Date.now()
  );
}
