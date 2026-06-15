/**
 * financas.spec.ts — Financeiro
 * Todos os seletores usam testID reais. Seletores-texto só onde testID ausente
 * (documentado na seção "testIDs faltando" ao final).
 *
 * Usa storageState pré-autenticado criado por e2e/fixtures/auth.ts.
 */

import { test, expect, Page } from '@playwright/test';

// ── Helper: navega para FinanceiroScreen e aguarda botão principal ─────────────
async function irParaFinanceiro(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('home-screen')).toBeVisible();
  // btn-nav-financas: BottomMenu não tem testID → label "Finanças" (com acento)
  await page.getByText('Finanças').filter({ visible: true }).first().click();
  // btn-nova-despesa só aparece após carregando=false
  await expect(page.getByTestId('btn-nova-despesa')).toBeVisible({ timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visão Geral — Resumo Financeiro', () => {
  test.beforeEach(async ({ page }) => { await irParaFinanceiro(page); });

  test('cards de resumo estão visíveis', async ({ page }) => {
    await expect(page.getByTestId('card-receita-total')).toBeVisible();
    await expect(page.getByTestId('card-custos-total')).toBeVisible();
    await expect(page.getByTestId('card-lucro-liquido')).toBeVisible();
  });

  test('botões de lançamento estão todos visíveis', async ({ page }) => {
    await expect(page.getByTestId('btn-nova-despesa')).toBeVisible();
    await expect(page.getByTestId('btn-nova-receita')).toBeVisible();
    await expect(page.getByTestId('btn-nova-venda-animal')).toBeVisible();
    await expect(page.getByTestId('btn-nova-compra-animal')).toBeVisible();
    await expect(page.getByTestId('btn-novo-insumo')).toBeVisible();
    await expect(page.getByTestId('btn-novo-funcionario')).toBeVisible();
  });

  test('seção de gráfico de evolução está visível', async ({ page }) => {
    // Gráfico não tem testID — verifica pelo título da seção
    await expect(
      page.getByText('Evolução do Lucro').filter({ visible: true }).first()
    ).toBeVisible();
  });

  test('seção de alertas financeiros está visível', async ({ page }) => {
    // alertaCard não tem testID — verifica pelo título "Atenção"
    await expect(
      page.getByText('Atenção').filter({ visible: true }).first()
    ).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Despesa Geral', () => {
  test.beforeEach(async ({ page }) => { await irParaFinanceiro(page); });

  test('abre modal e exibe campo de valor e botão salvar', async ({ page }) => {
    await page.getByTestId('btn-nova-despesa').click();

    await expect(page.getByTestId('input-valor-despesa').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-salvar-despesa').filter({ visible: true })).toBeVisible();
  });

  test('salva despesa com valor preenchido e modal fecha', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-nova-despesa').click();
    await expect(page.getByTestId('input-valor-despesa').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-despesa').filter({ visible: true }).fill('500,00');
    // Data já vem preenchida com hojeBr() — não precisa preencher

    await page.getByTestId('btn-salvar-despesa').filter({ visible: true }).click();

    // Sucesso: modal fecha (btn-salvar sai do DOM)
    await expect(page.getByTestId('btn-salvar-despesa')).toHaveCount(0, { timeout: 10_000 });
  });

  test('validação: salvar sem valor mantém modal aberto', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-nova-despesa').click();
    await expect(page.getByTestId('btn-salvar-despesa').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    // Campo valor vazio → salvarDespesa dispara Alert.alert e retorna sem fechar
    await page.getByTestId('btn-salvar-despesa').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('btn-salvar-despesa').filter({ visible: true })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Receita', () => {
  test.beforeEach(async ({ page }) => { await irParaFinanceiro(page); });

  test('abre modal e exibe campo de valor e botão salvar', async ({ page }) => {
    await page.getByTestId('btn-nova-receita').click();

    await expect(page.getByTestId('input-valor-receita').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-salvar-receita').filter({ visible: true })).toBeVisible();
  });

  test('salva receita com valor preenchido e modal fecha', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-nova-receita').click();
    await expect(page.getByTestId('input-valor-receita').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-receita').filter({ visible: true }).fill('1200,00');

    await page.getByTestId('btn-salvar-receita').filter({ visible: true }).click();

    await expect(page.getByTestId('btn-salvar-receita')).toHaveCount(0, { timeout: 10_000 });
  });

  test('validação: salvar sem valor mantém modal aberto', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-nova-receita').click();
    await expect(page.getByTestId('btn-salvar-receita').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('btn-salvar-receita').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('btn-salvar-receita').filter({ visible: true })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Venda de Animal', () => {
  test.beforeEach(async ({ page }) => { await irParaFinanceiro(page); });

  test('abre modal e exibe campo de valor e botão salvar', async ({ page }) => {
    await page.getByTestId('btn-nova-venda-animal').click();

    await expect(page.getByTestId('input-valor-venda').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-salvar-venda-animal').filter({ visible: true })).toBeVisible();
  });

  test('validação: salvar sem animal selecionado mantém modal aberto', async ({ page }) => {
    // input-busca-animal-venda FALTANDO → não é possível selecionar animal via testID
    // salvarVendaAnimal() verifica animalSelecionado primeiro → modal não fecha
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-nova-venda-animal').click();
    await expect(page.getByTestId('btn-salvar-venda-animal').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-venda').filter({ visible: true }).fill('8500,00');
    await page.getByTestId('btn-salvar-venda-animal').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    // Sem animal selecionado → modal permanece aberto
    await expect(page.getByTestId('btn-salvar-venda-animal').filter({ visible: true })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Compra de Animal', () => {
  test.beforeEach(async ({ page }) => { await irParaFinanceiro(page); });

  test('abre modal e exibe campo de valor e botão salvar', async ({ page }) => {
    await page.getByTestId('btn-nova-compra-animal').click();

    await expect(page.getByTestId('input-valor-compra').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-salvar-compra-animal').filter({ visible: true })).toBeVisible();
  });

  test('salva compra de animal com valor preenchido e modal fecha', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-nova-compra-animal').click();
    await expect(page.getByTestId('input-valor-compra').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-compra').filter({ visible: true }).fill('5000,00');

    await page.getByTestId('btn-salvar-compra-animal').filter({ visible: true }).click();

    await expect(page.getByTestId('btn-salvar-compra-animal')).toHaveCount(0, { timeout: 10_000 });
  });

  test('validação: salvar sem valor mantém modal aberto', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-nova-compra-animal').click();
    await expect(page.getByTestId('btn-salvar-compra-animal').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('btn-salvar-compra-animal').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('btn-salvar-compra-animal').filter({ visible: true })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Compra de Insumos', () => {
  test.beforeEach(async ({ page }) => { await irParaFinanceiro(page); });

  test('abre modal e exibe campo de valor e botão salvar', async ({ page }) => {
    await page.getByTestId('btn-novo-insumo').click();

    await expect(page.getByTestId('input-valor-insumo').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-salvar-insumo').filter({ visible: true })).toBeVisible();
  });

  test('salva insumo com valor preenchido e modal fecha', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-novo-insumo').click();
    await expect(page.getByTestId('input-valor-insumo').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-insumo').filter({ visible: true }).fill('350,00');

    await page.getByTestId('btn-salvar-insumo').filter({ visible: true }).click();

    await expect(page.getByTestId('btn-salvar-insumo')).toHaveCount(0, { timeout: 10_000 });
  });

  test('validação: salvar sem valor mantém modal aberto', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-novo-insumo').click();
    await expect(page.getByTestId('btn-salvar-insumo').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('btn-salvar-insumo').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('btn-salvar-insumo').filter({ visible: true })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Pagamento de Funcionário', () => {
  test.beforeEach(async ({ page }) => { await irParaFinanceiro(page); });

  test('abre modal e exibe campo de valor e botão salvar', async ({ page }) => {
    await page.getByTestId('btn-novo-funcionario').click();

    await expect(page.getByTestId('input-valor-funcionario').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-salvar-funcionario').filter({ visible: true })).toBeVisible();
  });

  test('salva pagamento com valor preenchido e modal fecha', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-novo-funcionario').click();
    await expect(page.getByTestId('input-valor-funcionario').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-valor-funcionario').filter({ visible: true }).fill('2500,00');

    await page.getByTestId('btn-salvar-funcionario').filter({ visible: true }).click();

    await expect(page.getByTestId('btn-salvar-funcionario')).toHaveCount(0, { timeout: 10_000 });
  });

  test('validação: salvar sem valor mantém modal aberto', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-novo-funcionario').click();
    await expect(page.getByTestId('btn-salvar-funcionario').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('btn-salvar-funcionario').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    await expect(page.getByTestId('btn-salvar-funcionario').filter({ visible: true })).toBeVisible();
  });
});

/*
 * ── testIDs FALTANDO ─────────────────────────────────────────────────────────
 *
 * BottomMenu (src/components/BottomMenu.tsx):
 *   - aba Finanças        → testID="btn-nav-financas"  (TouchableOpacity, chave 'financeiro')
 *
 * FinanceiroScreen — containers (src/screens/FinanceiroScreen.tsx):
 *   - container da tela   → testID="financeiro-screen"  (SafeAreaView raiz)
 *
 * FinanceiroScreen — seção gráfico:
 *   - chips de período    → testID={`chip-periodo-${m}m`}  (3m, 6m, 12m — linha ~831)
 *
 * FinanceiroScreen — ChipGroup (usada em todos os modais):
 *   - sem testID nos chips de categoria/tipo/unidade de nenhum modal
 *   - adicionar testID={opt} ou testID={`chip-${opt.toLowerCase()}`} no componente ChipGroup
 *
 * FinanceiroScreen — campos de data (via Field sem testID):
 *   - Modal Despesa       → testID="input-data-despesa"       (linha ~995)
 *   - Modal Receita       → testID="input-data-receita"       (linha ~1029)
 *   - Modal Venda Animal  → testID="input-data-venda"         (linha ~1093)
 *   - Modal Compra Animal → testID="input-data-compra"        (linha ~1127)
 *   - Modal Insumos       → testID="input-data-insumo"        (linha ~1164)
 *   - Modal Funcionário   → testID="input-data-funcionario"   (linha ~1199)
 *
 * FinanceiroScreen — Modal Venda de Animal (busca de animal):
 *   - input de busca      → testID="input-busca-animal-venda"  (TextInput, linha ~1053)
 *   - item resultado      → testID={`venda-resultado-${a.id}`} (TouchableOpacity, linha ~1077)
 *   (sem esses testIDs não é possível selecionar animal → teste de save completo impossível)
 */
