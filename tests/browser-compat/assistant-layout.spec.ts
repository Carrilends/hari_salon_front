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

/**
 * Dispara `Escape` y, en el primer fotograma de la salida, devuelve las clases
 * de la raíz del panel y la duración que el navegador calcula para ella. Todo
 * dentro de la página: ni esperas por reloj ni idas y venidas.
 */
async function medirLaSalida(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ clases: string; duracion: string }>((listo) => {
        const raiz = document
          .querySelector('[role="dialog"]')!
          .closest('.assistant-panel')!;
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        requestAnimationFrame(() =>
          listo({
            clases: raiz.className,
            duracion: getComputedStyle(raiz).transitionDuration,
          }),
        );
      }),
  );
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

  /**
   * Al cerrarse no desaparece de golpe: se desvanece.
   *
   * Se mide la **duración efectiva** en el primer fotograma de la salida, no
   * cuántos fotogramas sobrevive el nodo. Lo segundo parece más directo y no lo
   * es: entre animar y no animar hay un fotograma de diferencia —Vue necesita
   * uno para poner las clases— y una aserción así se cae sola el día que la
   * máquina vaya cargada. La duración es el hecho; los fotogramas, una
   * consecuencia.
   */
  test('al cerrarse se desvanece en vez de desaparecer de golpe', async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await abrirPanel(page);

    const salida = await medirLaSalida(page);

    expect(salida.clases).toContain('assistant-panel-leave-active');
    expect(salida.duracion).toBe('0.2s');
    // Y termina de irse.
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });

  /**
   * Abrir el panel no puede mover la página de detrás.
   *
   * Poner `overflow: hidden` en el elemento que desplaza —que bajo Quasar es
   * `html`— hace que el navegador **recorte el scroll a cero**: la página daba
   * un salto al principio al abrir el panel, y al cerrarlo la clienta aparecía
   * en un sitio que no había elegido. Medido antes de arreglarlo: de 154 px a
   * 0, y el 0 se quedaba.
   */
  test('abrir el panel no mueve la página de detrás ni pierde el sitio', async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await servirApi(page);
    await irA(page, '/');
    // Se abre con `dispatchEvent` y no con `click`: el flotante ya no existe en
    // el inicio, así que hay que tirar del botón de la banda de reseñas — y un
    // `click` de Playwright lo traería a la vista, moviendo el scroll justo
    // antes de medirlo. `dispatchEvent` no desplaza nada.
    const abrir = page.locator('[data-test="abrir-asistente"]');
    await abrir.waitFor();

    await page.evaluate(() => window.scrollTo(0, 150));
    await page.waitForTimeout(200);
    const antes = await page.evaluate(() => ({
      y: Math.round(window.scrollY),
      carta: Math.round(
        document.querySelector('.catalog-band')!.getBoundingClientRect().top,
      ),
    }));
    expect(antes.y).toBeGreaterThan(0);

    await abrir.dispatchEvent('click');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    const durante = await page.evaluate(() =>
      Math.round(
        document.querySelector('.catalog-band')!.getBoundingClientRect().top,
      ),
    );
    // Lo de detrás sigue exactamente donde estaba: ni un píxel.
    expect(durante).toBe(antes.carta);

    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);

    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(antes.y);
  });

  /**
   * La cabecera se queda detrás del velo **desde el primer fotograma**, no de
   * golpe al acabar la animación.
   *
   * Es un fallo de apilamiento, no de opacidad: mientras el `<Transition>`
   * anima, la raíz del panel tiene `opacity < 1`, y eso **crea un contexto de
   * apilamiento** que encierra al velo (2650) y a la caja (2700). Si la raíz no
   * tiene z-index propio, todo eso pinta por debajo de la cabecera (2000)
   * durante los 200 ms de la entrada; al llegar a opacidad 1 el contexto
   * desaparece, los z-index vuelven a valer y la cabecera se esconde de un
   * tirón. Medido: los 20 primeros fotogramas daban «cabecera».
   */
  test('la cabecera queda tras el velo desde el primer fotograma, no de un tirón', async ({
    page,
  }) => {
    await page.setViewportSize(ESCRITORIO);
    await servirApi(page);
    await irA(page, '/');
    await page.locator('[data-test="abrir-asistente"]').waitFor();

    const traza = await page.evaluate(
      () =>
        new Promise<string[]>((listo) => {
          // Un punto que cae sobre la cabecera, a la altura de sus botones.
          const quienCubre = () => {
            const e = document.elementFromPoint(1050, 33);
            if (!e) return 'nada';
            if (e.closest('.assistant-panel')) return 'panel';
            return e.closest('.q-header') ? 'cabecera' : 'otro';
          };
          (
            document.querySelector('[data-test="abrir-asistente"]') as HTMLElement
          ).click();
          const marcas: string[] = [];
          let n = 0;
          const paso = () => {
            marcas.push(quienCubre());
            if (++n >= 6) return listo(marcas);
            requestAnimationFrame(paso);
          };
          requestAnimationFrame(paso);
        }),
    );

    expect(traza).toEqual(['panel', 'panel', 'panel', 'panel', 'panel', 'panel']);
  });

  test('Escape lo cierra', async ({ page }) => {
    await page.setViewportSize(ESCRITORIO);
    await abrirPanel(page);

    await page.keyboard.press('Escape');

    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });
});

/**
 * Quien pidió menos movimiento no recibe ni entrada ni salida: el panel se va
 * en el acto. Es el contraste del caso de arriba — mismos dos fotogramas, y a
 * esas alturas ya no queda nada en el DOM.
 */
test.describe('con prefers-reduced-motion', () => {
  test('el panel se cierra sin animación', async ({ page }) => {
    // `page.emulateMedia` y no `test.use({ reducedMotion })`: esa opción de
    // fixture no la admite el programa de tipos del proyecto, y `vue-tsc` tumba
    // la build por ello aunque Jest no se entere.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize(ESCRITORIO);
    await abrirPanel(page);

    const salida = await medirLaSalida(page);

    // Mismas clases, duración cero: quien pidió menos movimiento no la ve.
    expect(salida.clases).toContain('assistant-panel-leave-active');
    expect(salida.duracion).toBe('0s');
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
  });
});
