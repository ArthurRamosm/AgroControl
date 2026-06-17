/**
 * evidencias.spec.ts — Relatório com Evidências Fotográficas
 *
 * 15 testes cobrindo as principais funcionalidades do AgroControl.
 * Cada teste captura um screenshot nomeado para compor o relatório de evidências.
 *
 * Screenshots salvos em: screenshots/evidencias/
 * Relatório HTML gerado em: playwright-report/e2e/
 *
 * Execução:
 *   npx playwright test e2e/evidencias.spec.ts --config e2e/playwright.config.ts
 */

import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// ── Diretório de screenshots ─────────────────────────────────────────────────
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots', 'evidencias');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function shot(name: string) {
  return path.join(SCREENSHOTS_DIR, name);
}

// ── Helpers de navegação ──────────────────────────────────────────────────────
async function aguardarHome(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 20_000 });
}

async function irParaFinanceiro(page: Page) {
  await aguardarHome(page);
  await page.getByText('Finanças').filter({ visible: true }).first().click();
  await expect(page.getByTestId('btn-nova-despesa')).toBeVisible({ timeout: 10_000 });
}

async function irParaSaude(page: Page) {
  await aguardarHome(page);
  await page.getByText('Saúde').filter({ visible: true }).first().click();
  await expect(page.getByTestId('btn-registrar-vacina')).toBeVisible({ timeout: 10_000 });
}

async function irParaRelatorios(page: Page) {
  await aguardarHome(page);
  await page.getByText('Fazenda').filter({ visible: true }).first().click();
  await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 8_000 });
  await page.getByText('Relatório de Produtividade').filter({ visible: true }).first().click();
  await expect(page.getByTestId('btn-relatorio-produtividade').filter({ visible: true })).toBeVisible({ timeout: 8_000 });
}

async function irParaRebanho(page: Page) {
  await aguardarHome(page);
  await page.getByTestId('btn-ver-rebanho').click();
  await expect(page.getByTestId('chip-filtro-todos')).toBeVisible({ timeout: 8_000 });
}

async function irParaMapa(page: Page) {
  await aguardarHome(page);
  await page.getByText('Mapa da Propriedade').filter({ visible: true }).first().click();
  await page.waitForTimeout(2_000);
}

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 1 — AUTENTICAÇÃO
// ═════════════════════════════════════════════════════════════════════════════

test.describe('01 — Autenticação', () => {
  // Inicia sem sessão para poder testar a tela de login
  test.use({ storageState: { cookies: [], origins: [] } });

  test('EVIDÊNCIA 01 — Tela de login exibida ao abrir o app', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Usuário')).toBeVisible({ timeout: 15_000 });

    await page.screenshot({ path: shot('01-tela-login.png'), fullPage: false });
  });

  test('EVIDÊNCIA 02 — Login com credenciais válidas navega para Home', async ({ page }) => {
    const user = process.env.TEST_USER;
    const pass = process.env.TEST_PASS;
    if (!user || !pass) throw new Error('TEST_USER e TEST_PASS são obrigatórios (OWASP M1/M8).');

    await page.goto('/');
    await expect(page.getByPlaceholder('Usuário')).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('Usuário').fill(user);
    await page.getByPlaceholder('Senha').fill(pass);
    await page.getByText('Entrar').click();

    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 20_000 });

    await page.screenshot({ path: shot('02-home-apos-login.png'), fullPage: false });
  });

  test('EVIDÊNCIA 03 — Credenciais inválidas exibem mensagem de erro', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Usuário')).toBeVisible({ timeout: 15_000 });

    await page.getByPlaceholder('Usuário').fill('usuario_invalido_xyz');
    await page.getByPlaceholder('Senha').fill('senhaerrada000');
    await page.getByText('Entrar').click();

    await expect(
      page.locator('text=/Usuário ou senha|Credencial|Não foi possível|inválid/i')
    ).toBeVisible({ timeout: 12_000 });

    await page.screenshot({ path: shot('03-login-erro-credenciais.png'), fullPage: false });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 2 — HOME
// ═════════════════════════════════════════════════════════════════════════════

test.describe('02 — Home Screen', () => {
  test('EVIDÊNCIA 04 — Home exibe botões de navegação principais', async ({ page }) => {
    await aguardarHome(page);

    await expect(page.getByTestId('btn-ver-rebanho')).toBeVisible();

    await page.screenshot({ path: shot('04-home-botoes-navegacao.png'), fullPage: false });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 3 — FINANCEIRO
// ═════════════════════════════════════════════════════════════════════════════

test.describe('03 — Financeiro', () => {
  test('EVIDÊNCIA 05 — Tela Financeiro com cards de resumo', async ({ page }) => {
    await irParaFinanceiro(page);

    await expect(page.getByTestId('card-receita-total')).toBeVisible();
    await expect(page.getByTestId('card-custos-total')).toBeVisible();
    await expect(page.getByTestId('card-lucro-liquido')).toBeVisible();

    await page.screenshot({ path: shot('05-financeiro-visao-geral.png'), fullPage: false });
  });

  test('EVIDÊNCIA 06 — Modal Nova Despesa aberto com campos preenchidos', async ({ page }) => {
    await irParaFinanceiro(page);

    await page.getByTestId('btn-nova-despesa').click();
    await expect(page.getByTestId('input-valor-despesa').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-despesa').filter({ visible: true }).fill('750,00');

    await page.screenshot({ path: shot('06-financeiro-modal-despesa.png'), fullPage: false });
  });

  test('EVIDÊNCIA 07 — Modal Nova Receita aberto com campos preenchidos', async ({ page }) => {
    await irParaFinanceiro(page);

    await page.getByTestId('btn-nova-receita').click();
    await expect(page.getByTestId('input-valor-receita').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-receita').filter({ visible: true }).fill('2.500,00');

    await page.screenshot({ path: shot('07-financeiro-modal-receita.png'), fullPage: false });
  });

  test('EVIDÊNCIA 08 — Modal Compra de Insumo aberto', async ({ page }) => {
    await irParaFinanceiro(page);

    await page.getByTestId('btn-novo-insumo').click();
    await expect(page.getByTestId('input-valor-insumo').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-insumo').filter({ visible: true }).fill('320,00');

    await page.screenshot({ path: shot('08-financeiro-modal-insumo.png'), fullPage: false });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 4 — SAÚDE ANIMAL
// ═════════════════════════════════════════════════════════════════════════════

test.describe('04 — Saúde Animal', () => {
  test('EVIDÊNCIA 09 — Tela Saúde com status de vacinação', async ({ page }) => {
    await irParaSaude(page);

    await expect(page.getByTestId('chip-atrasada')).toBeVisible();
    await expect(page.getByTestId('chip-pendente')).toBeVisible();
    await expect(page.getByTestId('chip-em-dia')).toBeVisible();

    await page.screenshot({ path: shot('09-saude-visao-geral.png'), fullPage: false });
  });

  test('EVIDÊNCIA 10 — Modal Registrar Vacina com chips de seleção', async ({ page }) => {
    await irParaSaude(page);

    await page.getByTestId('btn-registrar-vacina').click();
    await expect(page.getByTestId('input-nome-vacina').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('chip-vacina-febre aftosa').filter({ visible: true }).click();
    await page.getByTestId('input-data-vacina').filter({ visible: true }).clear();
    await page.getByTestId('input-data-vacina').filter({ visible: true }).fill('15/06/2026');

    await page.screenshot({ path: shot('10-saude-modal-vacina.png'), fullPage: false });
  });

  test('EVIDÊNCIA 11 — Tela Estoque de Medicamentos', async ({ page }) => {
    await irParaSaude(page);

    await page.getByTestId('btn-gerenciar-estoque').click();
    await expect(page.getByTestId('aba-vacinas')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId('aba-medicamentos')).toBeVisible();
    await expect(page.getByTestId('aba-historico')).toBeVisible();

    await page.screenshot({ path: shot('11-saude-estoque-medicamentos.png'), fullPage: false });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 5 — RELATÓRIOS
// ═════════════════════════════════════════════════════════════════════════════

test.describe('05 — Relatórios', () => {
  test('EVIDÊNCIA 12 — Tela Relatórios com 4 cards de geração', async ({ page }) => {
    await irParaRelatorios(page);

    await expect(page.getByTestId('btn-relatorio-produtividade').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-relatorio-sanitario').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-relatorio-financeiro').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-relatorio-reprodutivo').filter({ visible: true })).toBeVisible();

    await page.screenshot({ path: shot('12-relatorios-cards.png'), fullPage: false });
  });

  test('EVIDÊNCIA 13 — Modal de Período com campos de data pré-preenchidos', async ({ page }) => {
    await irParaRelatorios(page);

    await page.getByTestId('btn-relatorio-produtividade').filter({ visible: true }).click();
    await expect(page.getByTestId('input-data-inicio').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('input-data-fim').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-gerar-relatorio').filter({ visible: true })).toBeVisible();

    const inicio = await page.getByTestId('input-data-inicio').filter({ visible: true }).inputValue();
    const fim = await page.getByTestId('input-data-fim').filter({ visible: true }).inputValue();
    expect(inicio).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(fim).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);

    await page.screenshot({ path: shot('13-relatorios-modal-periodo.png'), fullPage: false });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BLOCO 6 — ANIMAIS
// ═════════════════════════════════════════════════════════════════════════════

test.describe('06 — Gestão de Animais', () => {
  test('EVIDÊNCIA 14 — Lista do Rebanho com chips de filtro', async ({ page }) => {
    await irParaRebanho(page);
    await page.waitForTimeout(2_000);

    await expect(page.getByTestId('chip-filtro-todos')).toBeVisible();
    await expect(page.getByTestId('chip-filtro-machos')).toBeVisible();

    await page.screenshot({ path: shot('14-animais-lista-rebanho.png'), fullPage: false });
  });

  test('EVIDÊNCIA 15 — Tela de Cadastro de Animal com campos obrigatórios', async ({ page }) => {
    await aguardarHome(page);

    await page.getByText('+ Cadastrar Animal').click();
    await expect(page.getByTestId('input-brinco')).toBeVisible({ timeout: 8_000 });

    // Preenche os campos obrigatórios para a evidência
    await page.getByTestId('input-brinco').fill('E2E-EVIDENCIA-' + Date.now());
    await page.getByTestId('chip-raca-nelore').click();
    await page.getByTestId('btn-sexo-femea').click();
    await page.getByTestId('chip-tipo-vaca').click();

    await page.getByTestId('btn-salvar-animal').scrollIntoViewIfNeeded();

    await page.screenshot({ path: shot('15-animais-cadastro.png'), fullPage: false });
  });
});
