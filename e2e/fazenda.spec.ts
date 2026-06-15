/**
 * fazenda.spec.ts — Hub Fazenda + Queijaria + Curral
 *
 * Caminho de navegação:
 *   Home → BottomMenu "Fazenda" (texto, sem testID no tab) → fazenda-hub
 *   → item por texto do label (sem testID nos itens do ModuleCard)
 *
 * Telas com SQLite (Platform.OS !== 'web'):
 *   db = null no Expo Web → operações de leitura/escrita são no-ops,
 *   mas setSavedMsg('Salvo com sucesso') roda mesmo assim.
 *   Testes de persistência real são marcados como test.skip.
 *
 * Usa storageState pré-autenticado de e2e/fixtures/auth.ts.
 */

import { test, expect, Page } from '@playwright/test';

async function irParaFazenda(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('home-screen')).toBeVisible();
  await page.getByText('Fazenda').filter({ visible: true }).first().click();
  await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 8_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Hub Fazenda', () => {
  test.beforeEach(async ({ page }) => { await irParaFazenda(page); });

  test('hub carrega e exibe módulos Queijaria e Curral', async ({ page }) => {
    await expect(page.getByTestId('fazenda-hub')).toBeVisible();
    await expect(page.getByText('Queijaria').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Curral').filter({ visible: true }).first()).toBeVisible();
  });

  test('itens da seção Queijaria estão visíveis', async ({ page }) => {
    const itens = ['Produção Diária', 'Controle Leiteiro', 'Vendas de Queijo', 'Potabilidade da Água'];
    for (const label of itens) {
      await expect(page.getByText(label).filter({ visible: true }).first()).toBeVisible();
    }
  });

  test('itens da seção Curral estão visíveis', async ({ page }) => {
    const itens = ['Relatório de Produtividade', 'Mastite Clínica', 'Afastamentos'];
    for (const label of itens) {
      await expect(page.getByText(label).filter({ visible: true }).first()).toBeVisible();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Produção Diária', () => {
  test.beforeEach(async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Produção Diária').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-producao-diaria')).toBeVisible({ timeout: 8_000 });
  });

  test('tela carrega com header e navegação de mês', async ({ page }) => {
    await expect(page.getByTestId('btn-mes-anterior')).toBeVisible();
    await expect(page.getByTestId('btn-mes-proximo')).toBeVisible();
  });

  test('navega mês anterior e próximo sem erros', async ({ page }) => {
    await page.getByTestId('btn-mes-anterior').click();
    await page.waitForTimeout(300);
    await page.getByTestId('btn-mes-proximo').click();
    await expect(page.getByTestId('header-producao-diaria')).toBeVisible();
  });

  test('botão Voltar retorna ao hub da Fazenda', async ({ page }) => {
    await page.getByTestId('btn-voltar').click();
    await expect(page.getByTestId('fazenda-hub').filter({ visible: true })).toBeVisible({ timeout: 8_000 });
  });

  test.skip('salva registro diário (SQLite = null no web — sem persistência)', () => {
    // db = null no Expo Web → SQLite.openDatabaseSync retorna null
    // handleSave() ignora o bloco if(db) mas exibe 'Salvo com sucesso' mesmo assim
    // Não testar persistência no browser; rodar em ambiente nativo ou CI com db
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Controle Leiteiro', () => {
  test.beforeEach(async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Controle Leiteiro').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-controle-leiteiro')).toBeVisible({ timeout: 8_000 });
  });

  test('campos do formulário diário estão visíveis', async ({ page }) => {
    await expect(page.getByTestId('input-litros-dia').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('input-vp-preco').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('input-vs').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('input-leite-familiar').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('input-leite-bezerro').filter({ visible: true })).toBeVisible();
  });

  test('preencher campos e salvar exibe confirmação', async ({ page }) => {
    // db = null no web → save é no-op mas setSavedMsg('Salvo com sucesso') roda
    await page.getByTestId('input-litros-dia').filter({ visible: true }).fill('180');
    await page.getByTestId('input-vp-preco').filter({ visible: true }).fill('2,80');
    await page.getByTestId('input-vs').filter({ visible: true }).fill('100');
    await page.getByTestId('input-leite-familiar').filter({ visible: true }).fill('8');
    await page.getByTestId('input-leite-bezerro').filter({ visible: true }).fill('15');

    // Save button: texto dinâmico 'Salvar dia {N}' — sem testID
    await page.getByText(/^Salvar dia/i).filter({ visible: true }).first().click();
    await expect(
      page.getByText('Salvo com sucesso').filter({ visible: true })
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Vendas de Queijo', () => {
  test.beforeEach(async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Vendas de Queijo').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-venda-queijo')).toBeVisible({ timeout: 8_000 });
  });

  test('botão Nova Venda abre formulário', async ({ page }) => {
    await page.getByTestId('btn-nova-venda-queijo').click();
    // Modal ou formulário abre — sem testID em campos, verifica visibilidade geral
    await expect(
      page.getByText(/Nova Venda|Queijo|Cliente/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('botão gerar PDF visível e clicável', async ({ page }) => {
    page.on('dialog', d => d.accept());
    await expect(page.getByTestId('btn-pdf-venda-queijo')).toBeVisible();
    await page.getByTestId('btn-pdf-venda-queijo').click();
    await page.waitForTimeout(1_500);
    // Tela não deve ter crashado
    await expect(page.getByTestId('header-venda-queijo')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Potabilidade da Água', () => {
  test.beforeEach(async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Potabilidade da Água').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-potabilidade')).toBeVisible({ timeout: 8_000 });
  });

  test('campos de teor de cloro e pH estão visíveis', async ({ page }) => {
    await expect(page.getByTestId('input-teor-cloro').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('input-ph').filter({ visible: true })).toBeVisible();
  });

  test('preencher e salvar exibe confirmação (db no-op no web)', async ({ page }) => {
    await page.getByTestId('input-teor-cloro').filter({ visible: true }).fill('0,5');
    await page.getByTestId('input-ph').filter({ visible: true }).fill('7,2');
    await page.getByText(/Salvar|Registrar/i).filter({ visible: true }).first().click();
    await expect(
      page.getByText('Salvo com sucesso').filter({ visible: true })
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Higienização de Equipamentos', () => {
  test.beforeEach(async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Higienização Equipamentos').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-higienizacao-equip')).toBeVisible({ timeout: 8_000 });
  });

  test('salvar exibe feedback-salvo', async ({ page }) => {
    await page.getByText(/Salvar|Registrar/i).filter({ visible: true }).first().click();
    await expect(page.getByTestId('feedback-salvo').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Condições Vestiário', () => {
  test('tela carrega com header de vestiário', async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Condições Vestiário').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-vestiario')).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Rastreabilidade', () => {
  test.beforeEach(async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Rastreabilidade').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-rastreabilidade')).toBeVisible({ timeout: 8_000 });
  });

  test('botão Nova Venda Rastreada abre modal', async ({ page }) => {
    await page.getByTestId('btn-nova-venda').click();
    await expect(
      page.getByText(/Nova Venda|Lote|Queijo/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Análises Laboratoriais', () => {
  test('tela carrega', async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Análises Laboratoriais').filter({ visible: true }).first().click();
    // Sem testID no header → verifica por texto da tela
    await expect(
      page.getByText(/Análise|Laboratorial/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Higiene Caixas D\'água', () => {
  test('tela carrega', async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText("Higiene Caixas D'água").filter({ visible: true }).first().click();
    await expect(
      page.getByText(/Higiene|Caixa|Água/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Queijaria — Depósito de Limpeza', () => {
  test('tela carrega', async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Depósito de Limpeza').filter({ visible: true }).first().click();
    await expect(
      page.getByText(/Depósito|Limpeza/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Curral — Mastite Clínica', () => {
  test.beforeEach(async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Mastite Clínica').filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-mastite-clinica')).toBeVisible({ timeout: 8_000 });
  });

  test('botão novo registro de mastite abre formulário', async ({ page }) => {
    await page.getByTestId('btn-novo-registro-mastite').click();
    await expect(
      page.getByText(/Animal|Brinco|Registro/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Curral — Mastite Subclínica (CMT)', () => {
  test('tela carrega', async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Mastite Subclínica (CMT)').filter({ visible: true }).first().click();
    await expect(
      page.getByText(/Mastite|Subclínica|CMT/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Curral — Endo/Ectoparasitas', () => {
  test('tela carrega', async ({ page }) => {
    await irParaFazenda(page);
    await page.getByText('Endo/Ectoparasitas').filter({ visible: true }).first().click();
    await expect(
      page.getByText(/Parasita|Ecto|Endo/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

/*
 * ── testIDs FALTANDO ─────────────────────────────────────────────────────────
 *
 * BottomMenu (src/components/BottomMenu.tsx):
 *   - aba Fazenda           → testID="btn-nav-fazenda"   (TouchableOpacity, key 'fazenda')
 *
 * FazendaScreen (src/screens/FazendaScreen.tsx):
 *   - cada item ModuleCard  → testID={`nav-item-${item.route}`}  (~linha 44)
 *     Ex: testID="nav-item-ProducaoDiaria", testID="nav-item-ControleLeiteiro"
 *
 * ProducaoDiariaScreen (src/screens/queijaria/ProducaoDiariaScreen.tsx):
 *   - botão salvar          → testID="btn-salvar-producao-diaria"  (~linha 394)
 *   - campos leite/queijo   → testID="input-leite-manha" etc.
 *
 * ControleLeiteiroScreen (src/screens/queijaria/ControleLeiteiroScreen.tsx):
 *   - botão salvar          → testID="btn-salvar-controle-leiteiro"  (~linha 379)
 *   - input leite descarte  → testID="input-leite-descarte"           (~linha 337)
 *
 * AnaliseLabScreen (src/screens/queijaria/AnaliseLabScreen.tsx):
 *   - header                → testID="header-analise-lab"
 *   - btn novo registro     → testID="btn-novo-analise"
 *
 * HigieneCaixaScreen (src/screens/queijaria/HigieneCaixaScreen.tsx):
 *   - header                → testID="header-higiene-caixa"
 *
 * DepositoLimpezaScreen (src/screens/queijaria/DepositoLimpezaScreen.tsx):
 *   - header                → testID="header-deposito-limpeza"
 *   - feedback salvo        → testID="feedback-salvo"
 *
 * MastiteSubclinicaScreen (src/screens/saude/MastiteSubclinicaScreen.tsx):
 *   - header                → testID="header-mastite-subclinica"
 *   - btn novo registro     → testID="btn-novo-registro-mastite-sub"
 *
 * ParasitasScreen (src/screens/saude/ParasitasScreen.tsx):
 *   - header                → testID="header-parasitas"
 *   - btn novo registro     → testID="btn-novo-registro-parasitas"
 */
