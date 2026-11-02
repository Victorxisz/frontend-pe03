import { defineConfig, devices } from '@playwright/test';

const real = process.env.E2E_REAL === '1';
const external = process.env.E2E_BASE_URL;
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: external || 'http://127.0.0.1:4173',
    // Evidências reais podem conter credenciais/tokens: não gravá-las.
    trace: real ? 'off' : 'retain-on-failure',
    screenshot: real ? 'off' : 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: {
    ...devices['Desktop Chrome'],
    ...(process.env.E2E_BROWSER_CHANNEL ? { channel: process.env.E2E_BROWSER_CHANNEL } : {}),
  } }],
  webServer: external ? undefined : {
    command: real
      ? 'npm run dev -- --port 4173 --strictPort'
      : 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
