/**
 * Sesiones de prueba de Mi cuenta: un Pinia nuevo y activo con el almacén de
 * sesión real (sin el plugin de persistencia, que en Jest no hace falta).
 */
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';

export type SesionDePrueba = {
  fullName?: string;
  email?: string;
  roles?: string[];
  emailVerified?: boolean;
  hasPassword?: boolean;
};

/** Una clienta con sesión abierta (60 s de vida), contraseña y correo confirmado. */
export function abrirSesionDePrueba(cambios: SesionDePrueba = {}): Pinia {
  const pinia = createPinia();
  setActivePinia(pinia);
  useAuthStore().setSession(
    'token-de-acceso',
    {
      fullName: 'Laura Gómez',
      email: 'laura@correo.com',
      roles: ['user'],
      emailVerified: true,
      hasPassword: true,
      ...cambios,
    },
    Date.now() + 60_000
  );
  return pinia;
}

/** Un Pinia nuevo y activo, sin sesión. */
export function sinSesionDePrueba(): Pinia {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}
