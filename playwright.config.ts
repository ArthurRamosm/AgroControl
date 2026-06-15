import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Testes do fluxo principal rodam em série (serial) — não paralelizar
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    // App Expo Web — inicie com: npx expo start --web
    baseURL: process.env.APP_URL ?? 'http://localhost:8081',

    // Viewport de celular (iPhone 14) para simular uso real do app
    viewport: { width: 390, height: 844 },

    // Captura trace em falha para diagnóstico
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Aguardar ações de navegação estabilizarem
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Apenas Chromium — o app usa react-native-web, testado em Chrome
  projects: [
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Para rodar os testes:
  //   1. Terminal 1: npx expo start --web
  //   2. Terminal 2: npx playwright test
  //
  // Ou com servidor automático (descomente):
  // webServer: {
  //   command: 'npx expo start --web --port 8081 --no-dev',
  //   url: 'http://localhost:8081',
  //   reuseExistingServer: true,
  //   timeout: 120_000,
  // },
});
