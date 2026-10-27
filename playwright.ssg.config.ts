/**
 * Las páginas pregeneradas por `yarn build:ssg` (RF62, NF04), servidas tal
 * cual con `quasar ssg serve` en el 9200.
 *
 * Distinta de `playwright.config.ts` (que arranca `quasar dev` en el 9000) y
 * de `playwright.e2e.config.ts` (la pila con API): aquí no hay API ni
 * servidor de desarrollo. Lo que se mira es el HTML que se publicaría, así
 * que antes hay que generarlo con datos (ver `tests/ssg/paginas-generadas.spec.ts`).
 *
 * `reuseExistingServer: false`: si algo ya escucha en el 9200, Playwright se
 * niega a arrancar en vez de probar contra otra cosa.
 */
import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const PUERTO = 9200;
const URL_BASE = `http://localhost:${PUERTO}`;

if (!existsSync('dist/ssg/index.html')) {
  throw new Error(
    'No hay dist/ssg: genera antes las páginas con `SSG_API_URL=… yarn build:ssg`.'
  );
}

export default defineConfig({
  testDir: './tests/ssg',
  outputDir: './test-results/ssg',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/ssg', open: 'never' }],
  ],
  use: {
    baseURL: URL_BASE,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `yarn serve:ssg --port ${PUERTO}`,
    url: URL_BASE,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
