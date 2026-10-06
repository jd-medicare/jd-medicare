import { defineConfig } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
export default defineConfig({
  testDir: '.',
  outputDir: 'test-results',
  fullyParallel: false,
  workers: 1,                       // flows share seeded state and rate-limit counters
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { outputFolder: 'reports/html', open: 'never' }], ['junit', { outputFile: 'reports/junit.xml' }]],
  use: { baseURL, ignoreHTTPSErrors: process.env.E2E_INSECURE_TLS === '1', trace: 'retain-on-failure' },
  projects: [
    { name: 'e2e', testDir: './e2e' },
    { name: 'security', testDir: './security' },
  ],
});
