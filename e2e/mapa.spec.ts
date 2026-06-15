/**
 * mapa.spec.ts — Mapa da Propriedade
 *
 * Caminho de navegação:
 *   Home → botão "Mapa da Propriedade" (texto, sem testID)
 *
 * MapaPropriedadeScreen usa react-leaflet (web) e localDb (SQLite via WASM).
 *
 * Estado inicial sem área cadastrada:
 *   mostrarMapa = false → exibe card de onboarding
 *
 * Estado após clicar "Cadastrar Área da Propriedade":
 *   cadastroAreaTotalAtivo = true → mostrarMapa = true → leaflet-container renderiza
 *
 * ATENÇÃO: Botões e campos dos modais (SalvarAreaModal, SalvarPontoModal)
 * não têm testID → interações de draw e save são marcadas com test.skip.
 * Ver seção "testIDs FALTANDO" ao final.
 *
 * Usa storageState pré-autenticado de e2e/fixtures/auth.ts.
 */

import { test, expect, Page } from '@playwright/test';

async function irParaMapa(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('home-screen')).toBeVisible();
  // HomeScreen botão "Mapa da Propriedade" não tem testID → navega por texto
  await page.getByText('Mapa da Propriedade').filter({ visible: true }).first().click();
  // Aguarda API carregarAreas() e carregarPontos() terminarem
  await page.waitForTimeout(2_000);
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mapa da Propriedade — Carregamento', () => {
  test.beforeEach(async ({ page }) => { await irParaMapa(page); });

  test('título "Mapa da Propriedade" está visível no cabeçalho', async ({ page }) => {
    // Cabeçalho sempre renderizado, independente de área cadastrada
    await expect(
      page.getByText('Mapa da Propriedade').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('botão Voltar está visível no cabeçalho', async ({ page }) => {
    // ← Voltar (texto, sem testID)
    await expect(
      page.getByText(/Voltar/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('seção de listagem de áreas está presente', async ({ page }) => {
    // Títulos "Area Total" e "Areas internas" aparecem quando mostrarMapa=true
    // Ou card de onboarding quando mostrarMapa=false
    const temMapa = await page.locator('.leaflet-container').isVisible().catch(() => false);
    if (temMapa) {
      await expect(
        page.getByText(/Area Total|Área Total/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 5_000 });
    } else {
      await expect(
        page.getByText(/Você ainda não cadastrou|Cadastrar Área/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mapa da Propriedade — Estado inicial sem área', () => {
  test.beforeEach(async ({ page }) => { await irParaMapa(page); });

  test('exibe card de onboarding quando nenhuma área está cadastrada', async ({ page }) => {
    const temArea = await page.locator('.leaflet-container').isVisible().catch(() => false);
    if (temArea) {
      // Área já cadastrada no ambiente de teste → pula este cenário
      test.skip(true, 'Área Total já cadastrada — estado inicial não aplicável');
      return;
    }
    await expect(
      page.getByText('Você ainda não cadastrou a Área da Propriedade').filter({ visible: true })
    ).toBeVisible({ timeout: 5_000 });
  });

  test('clicar em "Cadastrar Área da Propriedade" exibe mapa Leaflet', async ({ page }) => {
    const temArea = await page.locator('.leaflet-container').isVisible().catch(() => false);
    if (!temArea) {
      // Sem área → clicar no botão do card de onboarding ativa o modo de desenho
      const btn = page.getByText('Cadastrar Área da Propriedade').filter({ visible: true }).first();
      await expect(btn).toBeVisible({ timeout: 5_000 });
      await btn.click();
      await page.waitForTimeout(1_000);
    }
    // Com cadastroAreaTotalAtivo = true OU área já existente → leaflet-container aparece
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mapa da Propriedade — Mapa Leaflet (requer área ou modo desenho)', () => {
  test.beforeEach(async ({ page }) => {
    await irParaMapa(page);
    // Garante que mostrarMapa = true iniciando modo de cadastro se necessário
    const temArea = await page.locator('.leaflet-container').isVisible().catch(() => false);
    if (!temArea) {
      const btn = page.getByText('Cadastrar Área da Propriedade').filter({ visible: true }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1_000);
      }
    }
  });

  test('container Leaflet renderiza tiles (Platform.OS web)', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });
  });

  test('botões da toolbar estão visíveis após ativar mapa', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });
    // Toolbar tem textos: 'Remover ultimo', 'Limpar', 'Fechar area' / 'Salvar area'
    await expect(
      page.getByText(/Remover|Limpar/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test.skip('adicionar pontos no mapa via clique e salvar área', () => {
    // NÃO IMPLEMENTADO: SalvarAreaModal não tem testID em nenhum campo ou botão
    // Campos: input-nome-area (FALTANDO), chips tipo-area (sem testID),
    // btn-salvar-area (FALTANDO)
    // Adicionar testIDs e reimplementar este teste
  });

  test.skip('adicionar ponto de nascente/poço via modo adicionarPonto', () => {
    // NÃO IMPLEMENTADO: botão "Adicionar ponto" não tem testID
    // SalvarPontoModal campos: input-nome-ponto (FALTANDO), btn-salvar-ponto (FALTANDO)
    // Adicionar testIDs e reimplementar este teste
  });

  test.skip('selecionar área existente e ver opções', () => {
    // NÃO IMPLEMENTADO: AreaItem não tem testID, AreaOptionsModal botões sem testID
    // Adicionar testID={`area-item-${area.id}`} e testIDs nos botões do modal
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Mapa da Propriedade — Lista de Áreas e Pontos', () => {
  test.beforeEach(async ({ page }) => {
    await irParaMapa(page);
    // Ativa modo de mapa para mostrar listaCard
    const temArea = await page.locator('.leaflet-container').isVisible().catch(() => false);
    if (!temArea) {
      const btn = page.getByText('Cadastrar Área da Propriedade').filter({ visible: true }).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(1_000);
      }
    }
  });

  test('seção "Area Total" está visível na lista', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Area Total/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('seção "Nascentes e pocos" está visível na lista', async ({ page }) => {
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Nascentes|pocos/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

/*
 * ── testIDs FALTANDO ─────────────────────────────────────────────────────────
 *
 * HomeScreen (src/screens/HomeScreen.tsx):
 *   - botão Mapa da Propriedade  → testID="btn-mapa-propriedade"  (~linha 347)
 *
 * MapaPropriedadeScreen (src/screens/MapaPropriedadeScreen.tsx):
 *   - root View / header         → testID="mapa-screen"
 *   - botão Cadastrar Area Total → testID="btn-cadastrar-area-total"  (~linha 551)
 *   - botão Dividir propriedade  → testID="btn-dividir-propriedade"   (~linha 571)
 *   - botão Adicionar area       → testID="btn-nova-area-interna"     (~linha 578)
 *   - botão Centralizar          → testID="btn-centralizar"           (~linha 676)
 *   - toolbar btn Adicionar ponto→ testID="btn-adicionar-ponto"       (~linha 691)
 *   - toolbar btn Remover ultimo → testID="btn-remover-ultimo"        (~linha 696)
 *   - toolbar btn Limpar         → testID="btn-limpar"                (~linha 699)
 *   - toolbar btn Fechar/Salvar  → testID="btn-fechar-area"           (~linha 702)
 *
 * SalvarAreaModal (local, ~linha 779):
 *   - input nome da área         → testID="input-nome-area"
 *   - chips tipo de área         → testID={`chip-tipo-${tipo.toLowerCase()}`}
 *   - botão Salvar               → testID="btn-salvar-area"
 *   - botão Cancelar             → testID="btn-cancelar-area"
 *
 * SalvarPontoModal (local, ~linha 878):
 *   - chips tipo de ponto        → testID={`chip-tipo-${tipo}`}
 *   - input nome do ponto        → testID="input-nome-ponto"
 *   - botão Salvar               → testID="btn-salvar-ponto"
 *
 * AreaItem (local, ~linha 973):
 *   - item de área               → testID={`area-item-${area.id}`}
 *   - botão Opcoes               → testID={`btn-opcoes-area-${area.id}`}
 *
 * AreaOptionsModal (local, ~linha 933):
 *   - botão Editar area          → testID="btn-editar-area"
 *   - botão Dividir area         → testID="btn-dividir-area"
 *   - botão Excluir area         → testID="btn-excluir-area"
 */
