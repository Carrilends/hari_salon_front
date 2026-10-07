import { authRoutes } from 'src/auth/routes';
import { RouteRecordRaw } from 'vue-router';
import adminGuard from 'src/auth/guards/admin.guard';
import sessionGuard from 'src/auth/guards/session.guard';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      /*
       * `sinFabResena`: aquí no sale la burbuja verde de reseña del armazón (un
       * solo flotante por pantalla, el del asistente). Va en `meta` y no en una
       * lista de rutas: Netlify sirve `/services/` con barra final y el router
       * casa las dos formas con este mismo registro.
       */
      {
        path: '',
        component: () => import('pages/IndexPage.vue'),
        meta: { sinFabResena: true },
      },
      {
        path: '/services',
        component: () => import('pages/ServicePage.vue'),
        meta: { sinFabResena: true },
      },
      {
        path: '/testimonios',
        component: () => import('pages/TestimonialsPage.vue'),
      },
      {
        path: '/preguntas-frecuentes',
        component: () => import('pages/FaqPage.vue'),
      },
      {
        path: '/politica-tratamiento-datos',
        name: 'privacy-policy',
        component: () => import('pages/PrivacyPolicyPage.vue'),
      },
      {
        path: '/mis-empleados',
        component: () => import('pages/WorkersPage.vue'),
      },
      {
        path: '/mi-cuenta',
        component: () => import('pages/MyAccountPage.vue'),
      },
      {
        path: '/mis-reservas',
        name: 'my-reservations',
        component: () => import('pages/MyReservationsPage.vue'),
        beforeEnter: sessionGuard,
      },
      {
        path: '/reservas',
        name: 'admin-reservations',
        component: () => import('pages/AdminReservationsPage.vue'),
        beforeEnter: adminGuard,
      },
      { path: '/plans', component: () => import('pages/IndexPage.vue') },
      { path: '/promotions', component: () => import('pages/IndexPage.vue') },
    ],
  },
  authRoutes,

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
