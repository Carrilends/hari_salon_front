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
  await page.route('**/api/reviews', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(resenas),
    }),
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

    await page.goto('/', { waitUntil: 'networkidle' });
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

    await page.goto('/', { waitUntil: 'networkidle' });
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

    await page.goto('/', { waitUntil: 'networkidle' });

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

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    const pie = await page.locator('.footer-band__whatsapp').boundingBox();
    const barra = await page.locator('.mobile-bar').boundingBox();
    expect(pie, 'el WhatsApp del pie no se ve').not.toBeNull();
    expect(barra, 'la barra fija no se ve').not.toBeNull();

    expect(pie!.y + pie!.height).toBeLessThanOrEqual(barra!.y + 1);
  });
});

test.describe('el flotante del asistente y la barra fija', () => {
  /**
   * La barra marca el `body` mientras está montada, y el flotante sube por
   * encima de ella. Pero la barra solo se ve por debajo de 700 px: en
   * escritorio la marca sigue puesta y el flotante se apartaba de una barra
   * que no está, quedando a 89 px del borde y dejando un hueco en el pie que
   * se le había reservado.
   */
  test('en escritorio se queda en su esquina', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const fab = page.locator('.assistant-launcher__fab');
    await expect(fab).toBeVisible();

    const separacion = await fab.evaluate(
      (el) => window.innerHeight - el.getBoundingClientRect().bottom,
    );
    expect(separacion).toBeLessThan(40);
  });

  test('en móvil sube por encima de la barra sin taparla', async ({ page }) => {
    await page.setViewportSize(MOVIL);
    await page.goto('/', { waitUntil: 'networkidle' });

    const fab = await page.locator('.assistant-launcher__fab').boundingBox();
    const barra = await page.locator('.mobile-bar').boundingBox();
    expect(fab!.y + fab!.height).toBeLessThanOrEqual(barra!.y + 1);
  });
});
