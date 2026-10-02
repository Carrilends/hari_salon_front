import { test, expect } from '@playwright/test';
import { irA, servirApiVacia } from './api-offline';

const ROUTES: Array<{ path: string; slug: string }> = [
  { path: '/', slug: 'home' },
  { path: '/services', slug: 'services' },
  { path: '/testimonios', slug: 'testimonios' },
  { path: '/preguntas-frecuentes', slug: 'faq' },
  { path: '/politica-tratamiento-datos', slug: 'privacy-policy' },
];

for (const { path, slug } of ROUTES) {
  test(`renderiza ${slug} (${path})`, async ({ page }, testInfo) => {
    // Ver `api-offline.ts`: sin esto, con la API apagada el `goto` no vuelve.
    await servirApiVacia(page);
    const response = await irA(page, path);
    expect(response, `sin respuesta HTTP en ${path}`).not.toBeNull();
    expect(response!.status(), `status no OK en ${path}`).toBeLessThan(400);

    await expect(page.locator('#q-app')).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath(`${testInfo.project.name}-${slug}.png`),
      fullPage: true,
    });
  });
}
