/**
 * Los flujos E2E sobre la pila local segura (`tests/e2e/README.md`).
 *
 * Distinta de `playwright.config.ts` (compatibilidad de navegadores, API
 * simulada): aquí el navegador habla con una API de verdad, arrancada por este
 * archivo en el 3101 contra la base `HairSalonE2E` y con los tokens de los
 * proveedores vacíos (`entornoApi()`), y con un portal en el 9100.
 *
 * Falla cerrada (todo esto pasa al cargar este archivo, antes de que
 * Playwright arranque ningún `webServer`, salvo lo marcado):
 * - `comprobarEntornoSeguro()` lanza si el entorno que se va a pasar a la API
 *   no es exactamente el seguro (tokens vacíos, base E2E, red bloqueada…);
 * - `comprobarEntornoEnElBackend()` carga el `@nestjs/config` del backend con
 *   ese entorno y lanza si el `.env` ganara a alguna clave;
 * - (al arrancar) `reuseExistingServer: false` en los dos servidores: si algo
 *   ya escucha en 3101 o 9100, Playwright se niega a arrancar;
 * - (al arrancar) la API corre con `bloquear-red.cjs`: ninguna conexión de
 *   salida fuera de la propia máquina;
 * - (al probar) el proyecto `pila` (`pila-segura.spec.ts`) corre antes que los
 *   flujos y, si falla, los flujos no corren.
 *
 * La base la recrea antes `node tests/e2e/preparar-bd.mjs` (`yarn test:e2e`).
 */
import { mkdirSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';
import {
  DIR_REGISTROS,
  PUERTO_PORTAL,
  REGISTRO_API,
  URL_PORTAL,
  URL_SALUD,
  comprobarEntornoEnElBackend,
  comprobarEntornoSeguro,
  entornoApi,
  entornoPortal,
} from './tests/e2e/pila.mjs';

const ENTORNO_API = comprobarEntornoSeguro(entornoApi());

// Playwright vuelve a cargar este archivo en cada proceso de pruebas; la
// comprobación dentro del backend basta en el proceso principal, que es el que
// arranca los servidores.
if (!process.env.TEST_WORKER_INDEX) {
  console.log(comprobarEntornoEnElBackend(ENTORNO_API));
}

// El registro de la API va a un archivo que lee `pila-segura.spec.ts`. Está
// fuera del `outputDir`, que Playwright vacía al empezar; `tee` lo trunca en
// cada arranque.
mkdirSync(DIR_REGISTROS, { recursive: true });

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results/e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/e2e', open: 'never' }],
  ],
  use: {
    baseURL: URL_PORTAL,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      name: 'api',
      command: `npm --prefix ../hair_salon_back run start:dev 2>&1 | tee "${REGISTRO_API}"`,
      url: URL_SALUD,
      env: ENTORNO_API,
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      name: 'portal',
      command: `npx quasar dev --port ${PUERTO_PORTAL}`,
      url: URL_PORTAL,
      // `VITE_API_URL=/api` fijada: los flujos van por el proxy al 3101 aunque
      // el `.env` local del front dijera otra cosa.
      env: entornoPortal(),
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
  projects: [
    {
      name: 'pila',
      testMatch: /pila-segura\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: /pila-segura\.spec\.ts$/,
      dependencies: ['pila'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
});
