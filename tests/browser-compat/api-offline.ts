import type { Page } from '@playwright/test';

/**
 * Sirve TODA la API desde el propio navegador, para que esta carpeta mida la
 * maqueta y no el estado del backend.
 *
 * El motivo es concreto: con la API apagada, el proxy de `quasar dev` ni
 * contesta ni falla —deja la XHR colgada para siempre—, así que una sola
 * petición sin interceptar basta para que `networkidle` no llegue nunca y la
 * suite entera muera por tiempo en el `goto`. Por eso además se navega con
 * `domcontentloaded` (`irA`) y se espera después el nodo que interesa.
 *
 * Tres detalles que costaron una vuelta cada uno:
 *
 * - **Se casa por `pathname`, no con un comodín.** `**\/api\/**` también casa
 *   `/src/api/services-api.ts`, que en `quasar dev` es un módulo de verdad: el
 *   navegador recibiría `application/json` donde espera JavaScript y la
 *   aplicación no arrancaría.
 * - **El genérico se registra primero.** Playwright casa las rutas de la última
 *   a la primera, así que uno registrado al final se come a los concretos.
 * - **`shared-info/filters` necesita su forma**, no un array: `useOptions` hace
 *   `setGenres(data.genders)` y con `[]` eso es `undefined`, lo que revienta el
 *   inicio al pintar.
 */
export const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const esRuta = (ruta: string) => (url: URL) => url.pathname === ruta;

/** Respuestas vacías y bien formadas para todo lo que el portal pide. */
export async function servirApiVacia(page: Page) {
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => route.fulfill(json([])),
  );
  await page.route(esRuta('/api/shared-info/filters'), (route) =>
    route.fulfill(json({ genders: [], principalParents: [] })),
  );
}

/**
 * Navega sin esperar `networkidle`. Quien llama espera después el nodo que le
 * interesa, que es más barato y no depende de que no quede ninguna petición en
 * vuelo.
 */
export async function irA(page: Page, ruta: string) {
  return page.goto(ruta, { waitUntil: 'domcontentloaded' });
}
