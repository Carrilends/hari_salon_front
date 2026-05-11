import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PW_PORT ?? 9000);
const BASE_URL = `http://localhost:${PORT}`;

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
      name: 'chromium-chrome87',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-78',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-safari13',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
