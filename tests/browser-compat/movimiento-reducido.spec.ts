/**
 * NF02: con `prefers-reduced-motion: reduce` los diálogos de Quasar no se
 * deslizan. QDialog fija `--q-transition-duration` en línea, así que la regla
 * global de `app.scss` va sobre `[class*='q-transition--']`.
 */
import { test, expect, type Page } from '@playwright/test';
import { irA, json, servirApiVacia } from './api-offline';
import { prepararConBolsa } from './apoyo-cajon';

test.use({ viewport: { width: 390, height: 844 } });

/** Mientras el diálogo entra, lo más lento que se anime con `transform`. */
/** Pulsa `disparador` dentro de la página y mide fotograma a fotograma. */
async function medirEntrada(page: Page, disparador: string, selectorInterior: string) {
  return page.evaluate(async ([boton, sel]) => {
    (document.querySelector(boton) as HTMLElement).click();
    const lecturas: { duracion: number; animaciones: { ms: number; quien: string }[] }[] = [];
    for (let i = 0; i < 240 && lecturas.length < 6; i++) {
      const nodo = document.querySelector(sel);
      if (nodo) {
        const estilo = getComputedStyle(nodo);
        const dur = estilo.transitionDuration
          .split(',')
          .map((d) => (d.trim().endsWith('ms') ? parseFloat(d) : parseFloat(d) * 1000));
        const anims = document
          .getAnimations()
          .filter((a) => {
            const efecto = a.effect as KeyframeEffect | null;
            // Solo lo que vive en el diálogo: la onda del botón pulsado
            // (`q-ripple`) no es el diálogo deslizándose.
            const blanco = efecto?.target as Element | null | undefined;
            return (
              Boolean(blanco?.closest('.q-dialog, .q-transition--slide-up, [class*="q-transition--"]')) &&
              efecto?.getKeyframes?.().some((k) => 'transform' in k)
            );
          })
          .map((a) => ({
            ms: Number(a.effect?.getComputedTiming().duration ?? 0),
            quien: String((a.effect as KeyframeEffect).target?.className),
          }));
        lecturas.push({ duracion: Math.max(...dur), animaciones: anims });
      }
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    return lecturas;
  }, [disparador, selectorInterior]);
}

function sinDeslizar(lecturas: { duracion: number; animaciones: { ms: number; quien: string }[] }[]) {
  expect(lecturas.length).toBeGreaterThan(0);
  for (const l of lecturas) {
    expect(l.duracion).toBeLessThanOrEqual(1);
    for (const a of l.animaciones) expect(a.ms, a.quien).toBeLessThanOrEqual(1);
  }
}

test.describe('con prefers-reduced-motion', () => {
  test('el cajón de reserva se abre sin deslizarse', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await prepararConBolsa(page);
    await irA(page, '/');
    await expect(page.locator('.main-header__cta')).toBeVisible();
    const lecturas = await medirEntrada(page, '.main-header__cta', '.q-dialog__inner');
    await expect(page.locator('[data-test="cajon-reserva"]')).toBeVisible();
    sinDeslizar(lecturas);
  });

  test('la reseña se abre sin transición', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await servirApiVacia(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({
          fullname: 'Ana María López',
          email: 'ana@correo.com',
          roles: ['user'],
          emailVerified: true,
        }),
      );
    });
    await page.route(
      (url) => url.pathname === '/api/auth/refresh',
      (route) =>
        route.fulfill(
          json({
            id: 'u1',
            email: 'ana@correo.com',
            fullName: 'Ana María López',
            roles: ['user'],
            isActive: true,
            emailVerified: true,
            token: 'cabecera.e30.firma',
            expiresIn: 900,
          }),
        ),
    );
    await irA(page, '/');
    const boton = page.locator('[data-test="dejar-resena"]');
    await expect(boton).toBeVisible();
    const lecturas = await medirEntrada(page, '[data-test="dejar-resena"]', '.q-dialog__inner');
    await expect(page.locator('[data-test="resena"]')).toBeVisible();
    sinDeslizar(lecturas);
  });
});
