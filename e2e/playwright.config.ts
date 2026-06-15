/**
 * Config Playwright para a suíte E2E em e2e/.
 *
 * Uso:
 *   npx playwright test --config e2e/playwright.config.ts
 *
 * Pré-requisitos:
 *   1. App Expo Web rodando: npx expo start --web
 *   2. Backend .NET rodando: dotnet run (http://localhost:5249)
 *   3. Credenciais: TEST_USER=<user> TEST_PASS=<pass>
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: path.join(__dirname),
  testMatch: '**/*.spec.ts',
  globalSetup: path.join(__dirname, 'fixtures', 'auth.ts'),

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,

  reporter: [
    ['html', { open: 'never', outputFolder: path.join(__dirname, '..', 'playwright-report', 'e2e') }],
    ['list'],
  ],

  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:8081',
    storageState: path.join(__dirname, '.auth', 'session.json'),

    viewport: { width: 390, height: 844 },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
