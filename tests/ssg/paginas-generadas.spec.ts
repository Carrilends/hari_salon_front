/**
 * Las páginas públicas se generan con sus datos (RF62 c1, NF04 c1).
 *
 * Se prueba el HTML que se publicaría, servido por `quasar ssg serve` (ver
 * `playwright.ssg.config.ts`). Antes hay que generarlo con datos, contra la
 * pila E2E:
 *
 *   yarn e2e:pila                                   # API en el 3101
 *   node tests/ssg/preparar-datos.mjs               # preguntas de prueba si faltan
 *   NODE_OPTIONS="--require $PWD/tests/ssg/vigilar-peticiones.cjs" \
 *     SSG_API_URL=http://localhost:3101/api yarn build:ssg
 *   npx playwright test -c playwright.ssg.config.ts
 *
 * `vigilar-peticiones.cjs` hace fallar la compilación si el render construye
 * una URL relativa `/api/…` o abre una conexión fuera de `SSG_API_URL`.
 *
 * Sin JavaScript: lo que ve un rastreador o quien abre la página con la red
 * lenta. Con JavaScript: que la hidratación encuentra en el HTML lo mismo que
 * pinta el navegador, sin avisos de desajuste.
 */
import { expect, test, type Page } from '@playwright/test';

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('el catálogo pregenerado trae servicios con su precio', async ({ page }) => {
    await page.goto('/services');

    const tarjetas = page.locator('[data-test="tarjeta"]');
    await expect(tarjetas.first()).toBeVisible();
    await expect(tarjetas.first().locator('[data-test="nombre"]')).not.toBeEmpty();
    await expect(tarjetas.first().locator('[data-test="precio"]')).toContainText(
      /\$\s*\d/
    );
  });

  test('las preguntas pregeneradas traen su texto', async ({ page }) => {
    await page.goto('/preguntas-frecuentes');

    const preguntas = page.locator('[data-test="pregunta"]');
    await expect(preguntas.first()).toBeVisible();
    await expect(preguntas.first()).toContainText(/\S{3,}/);
    await expect(page.locator('[data-test="preguntas-vacio"]')).toHaveCount(0);
  });

  test('el JSON-LD del catálogo no está vacío', async ({ page }) => {
    await page.goto('/services');

    const bloques = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const listas = bloques
      .map((texto) => JSON.parse(texto) as Record<string, unknown>)
      .filter((bloque) => bloque['@type'] === 'ItemList');

    expect(listas).toHaveLength(1);
    const elementos = listas[0].itemListElement as Array<{
      item: { name: string };
    }>;
    expect(elementos.length).toBeGreaterThan(0);
    expect(elementos[0].item.name).toBeTruthy();
  });
});

/**
 * Las rutas pregeneradas que hidratan datos: las cuatro de `ssg.routes` con
 * consultas y las dos que el rastreador encuentra (`/plans`, `/promotions`,
 * que montan `IndexPage`).
 */
const RUTAS = [
  '/',
  '/services',
  '/testimonios',
  '/preguntas-frecuentes',
  '/plans',
  '/promotions',
];

/** El endpoint de la consulta que cada ruta trae precargada. */
const PRECARGA: Record<string, RegExp> = {
  '/': /\/api\/reviews$/,
  '/services': /\/api\/service\/search$/,
  '/testimonios': /\/api\/reviews$/,
  '/preguntas-frecuentes': /\/api\/faqs$/,
  '/plans': /\/api\/reviews$/,
  '/promotions': /\/api\/reviews$/,
};

/** Avisos de hidratación en la consola, con la API cortada. */
async function avisosDeHidratacion(page: Page): Promise<string[]> {
  const avisos: string[] = [];
  page.on('console', (mensaje) => {
    if (/hydrat/i.test(mensaje.text())) avisos.push(mensaje.text());
  });
  // Sin API detrás del servidor estático: las recargas en segundo plano
  // se cortan para que no lleguen respuestas que no son de la prueba.
  await page.route('**/api/**', (ruta) => ruta.abort());
  return avisos;
}

/**
 * Lo publicado SIEMPRE es más viejo que el `staleTime` (60 s, 3 min en algún
 * caso): la compilación se hace una vez y la página se visita durante días.
 * Si al montar el navegador ve los datos viejos y vuelve a pedir, la primera
 * pintura enseña «Actualizando…» y ya no casa con el HTML. Se adelanta el
 * reloj del navegador un día para verlo sin esperar.
 */
test.describe('con JavaScript, con el HTML de hace un día', () => {
  for (const ruta of RUTAS) {
    test(`la página pregenerada se hidrata sin avisos de Hydration aunque sus datos estén viejos (${ruta})`, async ({
      page,
    }) => {
      await page.clock.setSystemTime(new Date(Date.now() + 24 * 60 * 60_000));
      const avisos = await avisosDeHidratacion(page);
      const pedidas: string[] = [];
      page.on('request', (peticion) => pedidas.push(peticion.url()));

      await page.goto(ruta);
      await page.waitForLoadState('networkidle');

      expect(avisos).toEqual([]);
      // Y, ya hidratada, la consulta vieja se refresca en segundo plano.
      expect(pedidas.some((url) => PRECARGA[ruta].test(url))).toBe(true);
    });
  }
});

test.describe('con JavaScript', () => {
  for (const ruta of RUTAS) {
    test(`la página pregenerada se hidrata sin avisos de Hydration en la consola (${ruta})`, async ({
      page,
      request,
    }) => {
      // El HTML publicado lleva el estado de Vue Query para hidratar con él.
      const html = await (await request.get(ruta)).text();
      expect(html).toContain('window.__VQ_STATE__=');

      const avisos = await avisosDeHidratacion(page);

      await page.goto(ruta);
      await page.waitForLoadState('networkidle');

      // Y el cliente lo recogió (y lo borró, como hace Quasar con Pinia).
      expect(await page.evaluate(() => '__VQ_STATE__' in window)).toBe(false);
      expect(avisos).toEqual([]);
    });
  }
});
