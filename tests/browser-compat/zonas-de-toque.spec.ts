/**
 * NF01: ningún control que se toca con el dedo mide menos de 44 px. Estos son
 * los que fallaban a 390 px: los de la cabecera, «Ver todo →», «Limpiar» de la
 * hoja de filtros y «Entra» del paso de datos.
 */
import { test, expect, type Locator } from '@playwright/test';
import { irA, servirApiVacia } from './api-offline';
import { prepararConBolsa } from './apoyo-cajon';

const ANCHOS = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
];

// 43,9: Firefox reparte los subpíxeles y mide 43,99999 donde el CSS dice 44.
async function mide44(nodo: Locator) {
  await expect(nodo).toBeVisible();
  const caja = await nodo.boundingBox();
  expect(caja!.width, 'ancho').toBeGreaterThanOrEqual(43.9);
  expect(caja!.height, 'alto').toBeGreaterThanOrEqual(43.9);
}

for (const viewport of ANCHOS) {
  test.describe(`zonas de toque a ${viewport.width} px`, () => {
    test.use({ viewport });

    test('los botones de la cabecera miden al menos 44 px', async ({ page }) => {
      await servirApiVacia(page);
      await irA(page, '/');
      const cabecera = page.locator('.main-header__actions');
      await expect(cabecera).toBeVisible();
      const botones = cabecera.locator('.q-btn');
      const n = await botones.count();
      expect(n).toBeGreaterThan(1);
      for (let i = 0; i < n; i++) await mide44(botones.nth(i));
      const alto = await page.locator('.main-header').boundingBox();
      expect(alto!.height).toBeLessThanOrEqual(64);
    });

    test('«Ver todo» mide al menos 44 px de alto', async ({ page }) => {
      await servirApiVacia(page);
      await irA(page, '/');
      const nodo = page.locator('[data-test="ver-todo"]');
      await expect(nodo).toBeVisible();
      expect((await nodo.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    });

    test('«Limpiar» de la hoja de filtros mide al menos 44 px de alto', async ({ page }) => {
      await servirApiVacia(page);
      await irA(page, '/services');
      await page.locator('[data-test="boton-filtros"]').first().click();
      const nodo = page.locator('[data-test="hoja-filtros"] [data-test="limpiar"]');
      await expect(nodo).toBeVisible();
      expect((await nodo.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    });

    test('«Entra» del paso de datos mide al menos 44 px de alto', async ({ page }) => {
      await prepararConBolsa(page);
      await irA(page, '/');
      await page.locator('.main-header__cta').click();
      // «Continuar» ignora los toques justo tras cambiar de paso: se repite.
      await expect(async () => {
        await page.locator('[data-test="continuar"]').click();
        await expect(page.locator('[data-test="paso-cuando"]')).toBeVisible({ timeout: 1000 });
      }).toPass();
      await page.locator('[data-test="dia"]').first().click();
      await page.locator('[data-test="ficha-hora"]').first().click();
      await expect(async () => {
        await page.locator('[data-test="continuar"]').click();
        await expect(page.locator('[data-test="entrar"]')).toBeVisible({ timeout: 1000 });
      }).toPass();
      const nodo = page.locator('[data-test="entrar"]');
      await expect(nodo).toBeVisible();
      expect((await nodo.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    });
  });
}
