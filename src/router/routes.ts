import { authRoutes } from 'src/auth/routes';
import { RouteRecordRaw } from 'vue-router';
import adminGuard from 'src/auth/guards/admin.guard';
import sessionGuard from 'src/auth/guards/session.guard';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        component: () => import('pages/IndexPage.vue'),
      },
      {
        path: '/services',
        component: () => import('pages/ServicePage.vue'),
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
      /*
       * La 404 (R3): DENTRO del armazón, para que lleve la cabecera con
       * «Servicios», «Reservar» y «Más». vue-router 4 casa por especificidad,
       * no por orden: este comodín solo recoge lo que nadie más casa, y no
       * ensombrece `/auth/*` (otro registro, más específico). Es dinámica: el
       * SSG no la prerenderiza (`includeStaticRoutes` solo toma rutas sin
       * parámetros) y la pinta el cliente sobre el respaldo SPA.
       */
      {
        path: '/:catchAll(.*)*',
        name: 'not-found',
        component: () => import('pages/ErrorNotFound.vue'),
      },
    ],
  },
  authRoutes,
];

export default routes;
