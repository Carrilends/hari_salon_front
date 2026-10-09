import { RouteRecordRaw } from 'vue-router';

/**
 * Cabecera de móvil (< 1024 px) que pinta `AuthLayout.vue` (decisión A2):
 * - 'foto': banda de foto de 150 px con la marca y la X «Volver al portal»
 *   (entrar y verificar correo);
 * - 'barra': barra de 56 px con «← Entrar» y la marca (crear cuenta, recuperar
 *   y restablecer).
 * Va en `meta`, como `sinFabResena`: el armazón no compara rutas.
 */
export type CabeceraAcceso = 'foto' | 'barra';

export const authRoutes: RouteRecordRaw = {
  path: '/auth',
  name: 'auth',
  redirect: { name: 'login' },
  component: () => import('src/auth/layouts/AuthLayout.vue'),
  children: [
    {
      path: 'login',
      name: 'login',
      component: () => import('src/auth/pages/LoginPage.vue'),
      meta: { acceso: { cabecera: 'foto' } },
    },
    {
      path: 'register',
      name: 'register',
      component: () => import('src/auth/pages/RegisterPage.vue'),
      meta: { acceso: { cabecera: 'barra' } },
    },
    {
      path: 'olvide-contrasena',
      name: 'forgot-password',
      component: () => import('src/auth/pages/ForgotPasswordPage.vue'),
      meta: { acceso: { cabecera: 'barra' } },
    },
    {
      path: 'restablecer',
      name: 'reset-password',
      component: () => import('src/auth/pages/ResetPasswordPage.vue'),
      meta: { acceso: { cabecera: 'barra' } },
    },
    {
      path: 'verificar-correo',
      name: 'verify-email',
      component: () => import('src/auth/pages/VerifyEmailPage.vue'),
      meta: { acceso: { cabecera: 'foto' } },
    },
  ],
};
