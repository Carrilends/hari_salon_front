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
  ],
};
