import { RouteRecordRaw } from 'vue-router';

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
    },
    {
      path: 'register',
      name: 'register',
      component: () => import('src/auth/pages/RegisterPage.vue'),
    },
    {
      path: 'olvide-contrasena',
      name: 'forgot-password',
      component: () => import('src/auth/pages/ForgotPasswordPage.vue'),
    },
    {
      path: 'restablecer',
      name: 'reset-password',
      component: () => import('src/auth/pages/ResetPasswordPage.vue'),
    },
    {
      path: 'verificar-correo',
      name: 'verify-email',
      component: () => import('src/auth/pages/VerifyEmailPage.vue'),
    },
  ],
};
