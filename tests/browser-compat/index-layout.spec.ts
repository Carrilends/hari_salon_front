/**
 * Lo que jsdom no puede comprobar: que la maqueta del inicio aguante los datos
 * reales en un teléfono. Las dos entradas que rompían la página venían de
 * texto que escribe la clienta y de reseñas que se acumulan con el tiempo —
 * nada exótico, solo un negocio que lleva un año abierto.
 *
 * La medida es siempre la misma: `document.scrollWidth` no puede pasar de
 * `innerWidth`. Si pasa, la página principal se arrastra en horizontal.
 */
import { test, expect, type Page } from '@playwright/test';
import { irA, json, servirApiVacia } from './api-offline';

const MOVIL = { width: 390, height: 844 };

type Resena = {
  id: string;
  name: string;
  description: string;
  score: number;
  createdAt: string;
};

const resena = (n: number, extra: Partial<Resena> = {}): Resena => ({
  id: `r${n}`,
  name: `Clienta ${n}`,
  description: 'Muy buena atención, salí encantada con el resultado.',
  score: 5,
  createdAt: '2026-09-01T12:00:00.000Z',
  ...extra,
});

async function servirResenas(page: Page, resenas: Resena[]) {
  // Toda la API, no solo las reseñas: con el backend apagado una XHR sin
  // interceptar se queda colgada y `networkidle` no llega nunca. Ver
  // `api-offline.ts`.
  await servirApiVacia(page);
  await page.route(
    (url) => url.pathname === '/api/reviews',
    (route) => route.fulfill(json(resenas)),
  );
}

async function anchoDesbordado(page: Page) {
  return page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    ventana: window.innerWidth,
  }));
}

test.describe('maqueta del inicio en móvil', () => {
  test.use({ viewport: MOVIL });

  test('cuarenta reseñas no arrastran la página en horizontal', async ({ page }) => {
    await servirResenas(
      page,
      Array.from({ length: 40 }, (_, i) => resena(i + 1)),
    );

    await irA(page, '/');
    await expect(page.locator('.review-band')).toBeVisible();

    const { scroll, ventana } = await anchoDesbordado(page);
    expect(scroll, `la página pide ${scroll}px en una ventana de ${ventana}px`).toBeLessThanOrEqual(
      ventana,
    );
  });

  test('un nombre larguísimo y sin espacios tampoco', async ({ page }) => {
    await servirResenas(page, [
      resena(1, {
        name: 'MariaDelPilarEcheverriMontoyaDeLaCruzYSantamariaDelCarmenRodriguezGutierrez',
      }),
      resena(2),
      resena(3),
    ]);

    await irA(page, '/');
    await expect(page.locator('.review-band__autor')).toBeVisible();

    const { scroll, ventana } = await anchoDesbordado(page);
    expect(scroll).toBeLessThanOrEqual(ventana);
  });

  test('una reseña kilométrica se recorta y no empuja la tarjeta del asistente', async ({
    page,
  }) => {
    await servirResenas(page, [
      resena(1, { description: 'palabra '.repeat(300) }),
      resena(2),
      resena(3),
    ]);

    await irA(page, '/');

    const cita = page.locator('.review-band__cita');
    await expect(cita).toBeVisible();

    // Tres líneas recortadas: la caja tiene que ser mucho más baja que su
    // contenido. Si el recorte se cae, estos dos números se igualan.
    const { caja, contenido } = await cita.evaluate((el) => ({
      caja: el.clientHeight,
      contenido: el.scrollHeight,
    }));
    expect(caja).toBeLessThan(contenido / 2);

    const { scroll, ventana } = await anchoDesbordado(page);
    expect(scroll).toBeLessThanOrEqual(ventana);
  });

  test('la barra fija no tapa el botón de WhatsApp del pie', async ({ page }) => {
    await servirResenas(page, [resena(1), resena(2), resena(3)]);

    await irA(page, '/');
    // `scrollIntoViewIfNeeded` y no un `scrollTo` al alto del documento: sin
    // esperar a `networkidle` ese alto todavía crece —fuentes, fotos— y el
    // salto dejaba el pie fuera de la pantalla. Esto espera al nodo y lo trae.
    const whatsapp = page.locator('.footer-band__whatsapp');
    await whatsapp.scrollIntoViewIfNeeded();

    const pie = await whatsapp.boundingBox();
    const barra = await page.locator('.mobile-bar').boundingBox();
    expect(pie, 'el WhatsApp del pie no se ve').not.toBeNull();
    expect(barra, 'la barra fija no se ve').not.toBeNull();

    expect(pie!.y + pie!.height).toBeLessThanOrEqual(barra!.y + 1);
  });
});

/**
 * El flotante del asistente **no sale en el inicio**: la banda de reseñas ya
 * ofrece el asistente con sus chips. Fuera del inicio sí, y es una píldora con
 * rótulo, porque allí nadie ha visto esa tarjeta.
 *
 * Esto jubila las dos pruebas que vivían aquí —que el flotante se quedaba en su
 * esquina en escritorio y que subía por encima de la barra fija en móvil—: la
 * barra solo se pinta en el inicio, así que esos dos nunca vuelven a coincidir.
 */
test.describe('el flotante del asistente', () => {
  test('en el inicio no existe, y la barra fija se queda la esquina', async ({
    page,
  }) => {
    await page.setViewportSize(MOVIL);
    await servirResenas(page, [resena(1), resena(2), resena(3)]);
    await irA(page, '/');
    await expect(page.locator('.mobile-bar')).toBeVisible();

    await expect(page.locator('[data-test="fab"]')).toHaveCount(0);
  });

  test('fuera del inicio es una píldora con rótulo, y abre el panel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await servirResenas(page, []);
    await irA(page, '/preguntas-frecuentes');

    const flotante = page.locator('[data-test="fab"]');
    await expect(flotante).toBeVisible();
    await expect(flotante).toHaveText(/asistente/i);

    // Píldora, no círculo: más ancha que alta, y con área táctil de sobra.
    const caja = (await flotante.boundingBox())!;
    expect(caja.width).toBeGreaterThan(caja.height);
    expect(caja.height).toBeGreaterThanOrEqual(44);

    await flotante.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    // Y mientras está abierto no queda flotando encima.
    await expect(flotante).toHaveCount(0);
  });
});

/**
 * La página en una ventana alta, que es donde se veía la costura: con el
 * contenido más corto que la pantalla, `q-page` estira por su `min-height` y
 * el sobrante asomaba DEBAJO del pie como una franja de hueso. Ahora la página
 * es una columna flexible y ese sobrante se lo queda la portada.
 */
test.describe('el reparto vertical del inicio', () => {
  const ALTA = { width: 1280, height: 1400 };

  test('el pie termina al final del documento, sin franja debajo', async ({
    page,
  }) => {
    await page.setViewportSize(ALTA);
    await servirResenas(page, [resena(1), resena(2), resena(3)]);
    await irA(page, '/');
    await expect(page.locator('.footer-band')).toBeVisible();

    const { pie, documento } = await page.evaluate(() => ({
      pie: document.querySelector('.footer-band')!.getBoundingClientRect().bottom,
      documento: document.documentElement.scrollHeight,
    }));

    expect(Math.round(pie)).toBe(documento);
  });

  test('el sobrante se lo queda la portada, no el final de la página', async ({
    page,
  }) => {
    await page.setViewportSize(ALTA);
    await servirResenas(page, [resena(1), resena(2), resena(3)]);
    await irA(page, '/');
    await expect(page.locator('.hero-band')).toBeVisible();

    const alto = await page
      .locator('.hero-band')
      .evaluate((el) => el.getBoundingClientRect().height);

    // Su alto natural ronda los 294 px; en una ventana alta tiene que crecer.
    expect(alto).toBeGreaterThan(350);
  });

  /**
   * La foto llega hasta el borde de la banda oscura. Antes se quedaba corta
   * —tenía un tope de 268 px mientras la banda crecía con el texto— y parecía
   * flotar sobre una franja de hueso.
   */
  test('la foto de la portada toca la banda oscura', async ({ page }) => {
    await page.setViewportSize(ALTA);
    await servirResenas(page, [resena(1), resena(2), resena(3)]);
    await irA(page, '/');
    await expect(page.locator('.hero-band__foto')).toBeVisible();

    const { foto, carta } = await page.evaluate(() => ({
      foto: document.querySelector('.hero-band__foto')!.getBoundingClientRect()
        .bottom,
      carta: document.querySelector('.catalog-band')!.getBoundingClientRect().top,
    }));

    expect(Math.abs(foto - carta)).toBeLessThanOrEqual(1);
  });

  /**
   * La tarjeta del asistente adelgaza y la reseña se queda ese ancho. Antes la
   * tarjeta era la ancha de las dos (591 contra 556 a 1280 px).
   */
  test('la tarjeta del asistente es más estrecha que la columna de la reseña', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await servirResenas(page, [resena(1), resena(2), resena(3)]);
    await irA(page, '/');
    await expect(page.locator('.review-band__asistente')).toBeVisible();

    const { tarjeta, columna } = await page.evaluate(() => ({
      tarjeta: document
        .querySelector('.review-band__asistente')!
        .getBoundingClientRect().width,
      columna: document
        .querySelector('.review-band__resena')!
        .getBoundingClientRect().width,
    }));

    expect(tarjeta).toBeLessThan(columna);
    // «Unos 50 px» menos de los 591 que medía.
    expect(tarjeta).toBeLessThan(560);
  });
});

/**
 * El desplegable de «Más» lo monta Quasar en un portal, fuera del árbol de la
 * cabecera: comprobar su hoja de estilos en el fuente no basta para saber que
 * de verdad se pinta así. Esto lo abre y lo mide.
 *
 * Movida el 2026-10-07 a la carta por secciones: las filas ya no son
 * `.more-menu__item` sino las entradas de `MenuMasContenido`. Se sigue midiendo
 * lo mismo (fondo nieve, filete, icono en oro profundo, Jost, 44 px) y se añade
 * lo nuevo: 344 px, la sombra flotante, filas en caja normal y versalitas solo
 * en los títulos de sección.
 */
test.describe('el desplegable de «Más»', () => {
  test('se pinta con la paleta y sus entradas se pueden tocar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await servirApiVacia(page);
    await irA(page, '/preguntas-frecuentes');

    const disparador = page.locator('button[aria-label="Más opciones"]');
    await disparador.click();
    const menu = page.locator('.more-menu');
    await expect(menu).toBeVisible();
    await expect(disparador).toHaveAttribute('aria-expanded', 'true');

    const pintura = await menu.evaluate((el) => {
      const lista = el.querySelector('.more-menu__list')!;
      const entrada = el.querySelector('[data-test="menu-entrada-testimonios"]')!;
      const icono = entrada.querySelector('svg')!;
      const titulo = el.querySelector('#menu-mas-titulo-desplegable-peluqueria')!;
      return {
        fondo: getComputedStyle(lista).backgroundColor,
        borde: getComputedStyle(el).borderTopColor,
        sombra: getComputedStyle(el).boxShadow,
        ancho: el.getBoundingClientRect().width,
        letra: getComputedStyle(lista).fontFamily,
        icono: getComputedStyle(icono).color,
        alto: entrada.getBoundingClientRect().height,
        cajaEntrada: getComputedStyle(entrada).textTransform,
        cajaTitulo: getComputedStyle(titulo).textTransform,
        colorTitulo: getComputedStyle(titulo).color,
      };
    });

    expect(pintura.fondo).toBe('rgb(255, 255, 255)'); // nieve
    expect(pintura.borde).toBe('rgb(217, 209, 199)'); // filete
    expect(pintura.sombra).toContain('rgba(22, 19, 15, 0.16)'); // sombra flotante
    expect(Math.round(pintura.ancho)).toBe(344);
    expect(pintura.icono).toBe('rgb(122, 92, 40)'); // oro profundo
    expect(pintura.letra).toContain('Jost');
    expect(pintura.alto).toBeGreaterThanOrEqual(44);
    expect(pintura.cajaEntrada).toBe('none'); // M5
    expect(pintura.cajaTitulo).toBe('uppercase');
    expect(pintura.colorTitulo).toBe('rgb(122, 92, 40)');
  });
});
