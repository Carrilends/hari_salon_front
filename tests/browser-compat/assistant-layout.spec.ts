/**
 * Lo que jsdom no puede comprobar del panel del asistente: que a 390 px ocupe
 * la pantalla con nada flotando encima, que a 1280 quepa en la ventana sobre un
 * velo, y que un mensaje sin un solo espacio no arrastre la página.
 *
 * Las reseñas y la respuesta del asistente las sirve `page.route`: ni depende
 * del backend ni gasta cuota del proveedor de IA.
 */
import { test, expect, type Page } from '@playwright/test';
import { irA, json, servirApiVacia } from './api-offline';

const MOVIL = { width: 390, height: 844 };
/**
 * 800 y no 900 de alto a propósito: el panel mide 848 px de base y se recorta
 * con `max-height`. A 900 la suma `26 + 848 = 874` cabe igual aunque el recorte
 * no funcione, así que la aserción de «cabe en la ventana» no comprobaba nada.
 * A 800 solo cabe si el recorte está puesto — y es el alto de un portátil
 * cualquiera, no un caso raro.
 */
const ESCRITORIO = { width: 1280, height: 800 };

async function servirApi(page: Page) {
  await servirApiVacia(page);
  await page.route(
    (url) => url.pathname === '/api/assistant/messages',
    (route) =>
      route.fulfill(
        json({
          conversationId: 'c1',
          reply: 'a'.repeat(400),
          presentaciones: [],
        }),
      ),
  );
}

async function abrirPanel(page: Page) {
  await servirApi(page);
  await irA(page, '/');
  await page.locator('[data-test="abrir-asistente"]').click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
}

test.describe('el panel del asistente', () => {
  test('en móvil ocupa la pantalla y nada le queda encima', async ({ page }) => {
    await page.setViewportSize(MOVIL);
    await abrirPanel(page);

    const caja = await page.locator('[role="dialog"]').boundingBox();
    expect(caja!.width).toBeCloseTo(MOVIL.width, 0);

    // El flotante que lo abrió desaparece mientras está abierto.
    await expect(page.locator('.assistant-launcher__fab')).toHaveCount(0);

    /**
     * Y la barra fija del inicio queda DEBAJO del panel. Se comprueba con un
     * toque, no con geometría: el panel ocupa la pantalla entera, así que la
     * barra sigue en su sitio de siempre —abajo— y lo único que cambia es quién
     * recibe el dedo. Comparar coordenadas diría que la barra «asoma» cuando en
     * realidad está tapada.
     */
    const barra = page.locator('.mobile-bar');
    if (await barra.count()) {
      const caja2 = (await barra.boundingBox())!;
      const punto = {
        x: Math.round(caja2.x + caja2.width / 2),
        y: Math.round(Math.min(caja2.y + caja2.height / 2, MOVIL.height - 2)),
      };
      const tapada = await page.evaluate(
        ({ x, y }) =>
          !!document.elementFromPoint(x, y)?.closest('[role="dialog"]'),
        punto,
      );

      expect(tapada).toBe(true);
    }
  });

  test('en escritorio atenúa la página y cabe en la ventana', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await abrirPanel(page);

    await expect(page.locator('[data-test="velo"]')).toBeVisible();
    const caja = await page.locator('[role="dialog"]').boundingBox();
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(ESCRITORIO.height);
  });

  test('un mensaje larguísimo sin espacios no arrastra la pantalla', async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await abrirPanel(page);

    await page.fill('input#assistant-composer-campo', 'a'.repeat(400));
    await page.press('input#assistant-composer-campo', 'Enter');
    await expect(page.locator('[data-test="burbuja-clienta"]')).toBeVisible();

    const { scroll, ventana } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      ventana: window.innerWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(ventana);

    /**
     * Y la palabra se parte dentro de su burbuja. Esta es la aserción que de
     * verdad vigila `overflow-wrap: anywhere`: la página no se arrastra ni sin
     * él —el panel recorta con `overflow: hidden`—, así que medir solo el
     * `scrollWidth` del documento daría verde con el texto cortado a la mitad y
     * la clienta sin poder leer lo que acaba de escribir.
     */
    const burbuja = await page
      .locator('[data-test="burbuja-clienta"]')
      .evaluate((el) => ({
        contenido: el.scrollWidth,
        caja: el.clientWidth,
      }));

    expect(burbuja.contenido).toBeLessThanOrEqual(burbuja.caja);
  });

  test('Escape lo cierra', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await abrirPanel(page);

    await page.keyboard.press('Escape');

    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });
});
