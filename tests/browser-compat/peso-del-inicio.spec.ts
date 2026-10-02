/**
 * El techo de peso del inicio. Antes de esta tanda la página pedía 9,8 MB de
 * fotos; el objetivo es quedarse por debajo de 400 KB.
 *
 * Mide lo que el navegador **elige de verdad**, no lo que pesa el disco: con
 * `srcset` cada pantalla se lleva solo su variante, que es justamente la gracia.
 *
 * **Por qué se suma lo que se pinta y no todo lo que se pide.** Con el `<picture>`
 * construido por Vue en el cliente, WebKit pide dos ficheros por foto: el `<img>`
 * recibe su `src` antes de estar dentro del `<picture>` —un `<img>` empieza a
 * cargar en cuanto se le pone el `src`, aunque esté suelto—, arranca el JPEG, y al
 * insertarlo vuelve a elegir y se lleva el WebP. Comprobado que el marcado está
 * bien: la misma plantilla en un HTML estático pide un solo fichero en WebKit.
 * Y la portada **se sirve prerenderizada** (`ssg.routes` incluye `/`), así que a
 * una visitante le llega el `<picture>` ya armado por el parser, no construido a
 * mano; eso se verifica sobre `dist/ssg/index.html`. Esta carpeta corre contra
 * `quasar dev`, que sirve la SPA, así que aquí se mide lo que la página acaba
 * pintando, que es lo que la visitante descarga de verdad.
 */
import { test, expect } from '@playwright/test';
import { irA, servirApiVacia } from './api-offline';

const TECHO_KB = 400;

/** Ninguna foto suelta puede acercarse a los megas de los originales. */
const TECHO_POR_FOTO_KB = 150;

/** Las fotos que el inicio acaba pintando, con su peso y su tamaño real. */
async function fotosDelInicio(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await servirApiVacia(page);

  const pesos = new Map<string, Promise<number>>();
  page.on('response', (respuesta) => {
    const url = respuesta.url();
    if (!/\/people\//.test(url)) return;
    pesos.set(
      url,
      respuesta
        .body()
        .then((cuerpo) => cuerpo.length)
        // Una respuesta sin cuerpo no suma.
        .catch(() => 0)
    );
  });

  await irA(page, '/');
  await expect(page.locator('.catalog-band__foto').first()).toBeVisible();
  // Las de la carta se aplazan: hay que bajar para que se pidan.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForLoadState('networkidle');

  const pintadas = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLImageElement>(
        '.hero-band__foto img, .catalog-band__foto img'
      ),
    ].map((img) => ({
      url: img.currentSrc,
      anchoReal: img.naturalWidth,
      anchoPintado: img.clientWidth,
    }))
  );

  const bytes = new Map<string, number>();
  for (const [url, promesa] of pesos) bytes.set(url, await promesa);

  return { pintadas, bytes };
}

test.describe('el peso del inicio', () => {
  test('las fotos del inicio caben en el techo', async ({ page }) => {
    const { pintadas, bytes } = await fotosDelInicio(page);

    expect(pintadas.length).toBeGreaterThan(0);

    // Las fotos elegidas, sin repetir: la misma variante en dos sitios se
    // descarga una vez.
    const elegidas = new Set(pintadas.map((f) => f.url));
    let total = 0;
    for (const url of elegidas) {
      const peso = bytes.get(url);
      // Un `currentSrc` sin respuesta medida sería una foto que no se pidió:
      // mejor romper que sumar cero y dar un verde falso.
      expect(peso, `sin medir: ${url}`).toBeGreaterThan(0);
      expect(peso! / 1024, `pesa demasiado: ${url}`).toBeLessThan(
        TECHO_POR_FOTO_KB
      );
      total += peso!;
    }

    // El fondo de CSS de la cabecera también es peso del inicio.
    for (const [url, peso] of bytes) {
      if (/rainbow_hair\.jpg$/.test(url)) total += peso;
    }

    expect(total / 1024).toBeLessThan(TECHO_KB);
  });

  /**
   * Punto 2 del enfoque de revisión, medido: la gracia de `srcset` es no bajar
   * once veces los píxeles que se pintan. Se admite el doble, que es lo que pide
   * una pantalla de 2x.
   */
  test('ninguna foto baja más píxeles de los que pinta', async ({ page }) => {
    const { pintadas } = await fotosDelInicio(page);

    for (const foto of pintadas) {
      // Siempre una variante, nunca el original con su nombre pelado.
      expect(foto.url, `no es una variante: ${foto.url}`).toMatch(
        /-\d+\.(webp|jpg)$/
      );
      expect(foto.anchoPintado).toBeGreaterThan(0);
      expect(
        foto.anchoReal,
        `${foto.url} trae ${foto.anchoReal}px para pintar ${foto.anchoPintado}px`
      ).toBeLessThanOrEqual(foto.anchoPintado * 2 + 1);
    }
  });

  /**
   * Punto 5: `/` se prerenderiza, así que el `<picture>` entero viaja en el HTML
   * publicado. Si las rutas fueran relativas, el `srcset` apuntaría a ninguna
   * parte en el fichero que se indexa.
   */
  test('el srcset va en el HTML y con rutas absolutas', async ({ page }) => {
    await servirApiVacia(page);
    await irA(page, '/');
    // `irA` no espera a que Vue monte: sin esto no hay `<source>` todavía.
    await expect(page.locator('.hero-band__foto source')).toHaveCount(1);

    const rutas = await page.evaluate(() =>
      [...document.querySelectorAll('source')].map((s) => s.getAttribute('srcset') ?? '')
    );

    expect(rutas.length).toBeGreaterThan(0);
    for (const srcset of rutas) {
      expect(srcset).toContain('.webp');
      for (const trozo of srcset.split(',')) {
        expect(trozo.trim().startsWith('/people/')).toBe(true);
      }
    }
  });
});
