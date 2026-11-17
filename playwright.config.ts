import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PW_PORT ?? 9000);
// PW_BASE_URL permite apuntar a un quasar dev del anfitrion desde un contenedor.
const BASE_URL = process.env.PW_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/browser-compat',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: BASE_URL,
    screenshot: 'on',
    video: 'off',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx quasar dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      // Safari se prueba con el motor WebKit de Playwright.
      name: 'webkit-safari',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
