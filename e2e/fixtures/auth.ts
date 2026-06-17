/**
 * Global setup: faz login UMA VEZ e grava storageState para reutilizar
 * em todas as specs.
 *
 * Expo Web usa localStorage como backend do AsyncStorage, então o
 * storageState do Playwright captura a sessão completa.
 *
 * Para ativar, adicione ao playwright.config.ts (ou use e2e/playwright.config.ts):
 *   globalSetup: './e2e/fixtures/auth.ts'
 *   use: { storageState: './e2e/.auth/session.json' }
 *
 * Credenciais via variáveis de ambiente (obrigatórias, sem fallback fixo):
 *   TEST_USER=<usuario>  TEST_PASS=<senha>
 * [OWASP M1-04] Ver docs/security/owasp-m1-relatorio.json
 */

import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';

export const STORAGE_STATE = path.join(__dirname, '..', '.auth', 'session.json');

export default async function globalSetup(_config: FullConfig) {
  const testUser = process.env.TEST_USER;
  const testPass = process.env.TEST_PASS;
  if (!testUser || !testPass) {
    throw new Error(
      'TEST_USER e TEST_PASS precisam ser definidos como variáveis de ambiente ' +
      'para rodar os testes E2E. Nenhuma credencial fixa é usada como fallback ' +
      '(OWASP M1).'
    );
  }

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  const baseURL = process.env.APP_URL ?? 'http://localhost:8081';
  await page.goto(baseURL);

  await page.getByPlaceholder('Usuário').fill(testUser);
  await page.getByPlaceholder('Senha').fill(testPass);
  await page.getByText('Entrar').click();

  await page.waitForSelector('[data-testid="home-screen"]', { timeout: 20_000 });

  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();

  console.log(`[auth] storageState gravado em ${STORAGE_STATE}`);
}
