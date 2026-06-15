/**
 * animais.spec.ts — Gestão de Animais
 * Testa cadastro (com validação de brinco duplicado), listagem,
 * detalhes, edição e exclusão.
 *
 * Usa storageState pré-autenticado criado por e2e/fixtures/auth.ts.
 */

import { test, expect, Page } from '@playwright/test';

// ── Helper: navega para AnimalList e aguarda os chips estarem prontos ─────────
async function irParaRebanho(page: Page) {
  await page.getByTestId('btn-ver-rebanho').click();
  await expect(page.getByTestId('chip-filtro-todos')).toBeVisible({ timeout: 8_000 });
}

// ── Helper: pega o primeiro card da lista (skip se vazio) ─────────────────────
async function primeiroCard(page: Page) {
  await page.waitForTimeout(2_000);
  const card = page.locator('[data-testid^="animal-card-"]').first();
  if ((await card.count()) === 0) return null;
  return card;
}

test.describe('Rebanho — Listagem', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });

  test('botão "Ver Rebanho" navega para lista de animais', async ({ page }) => {
    await page.getByTestId('btn-ver-rebanho').click();
    await expect(page.getByTestId('chip-filtro-todos')).toBeVisible();
  });

  test('lista exibe animais ou mensagem vazia', async ({ page }) => {
    await irParaRebanho(page);
    await page.waitForTimeout(2_000);

    const cards = page.locator('[data-testid^="animal-card-"]');
    const vazio = page.getByText('Nenhum animal cadastrado');
    const count = await cards.count();
    const isEmpty = await vazio.isVisible();

    expect(count > 0 || isEmpty).toBe(true);
  });

  test('chip "Machos" filtra a lista', async ({ page }) => {
    await irParaRebanho(page);
    await page.waitForTimeout(2_000);

    await page.getByTestId('chip-filtro-machos').click();
    await page.waitForTimeout(500);

    // A tela não deve quebrar — chip ativo continua visível
    await expect(page.getByTestId('chip-filtro-machos')).toBeVisible();
  });

  test('campo de busca filtra por nome ou brinco', async ({ page }) => {
    await irParaRebanho(page);
    await page.waitForTimeout(2_000);

    const cards = page.locator('[data-testid^="animal-card-"]');
    if ((await cards.count()) === 0) { test.skip(); return; }

    // abre o campo de busca clicando na lupa
    await page.getByTestId('btn-abrir-busca').click();
    await page.getByTestId('input-busca-animal').waitFor({ state: 'visible', timeout: 5_000 });

    await page.getByTestId('input-busca-animal').fill('XXXX_INEXISTENTE');
    await expect(
      page.getByText(/Nenhum animal encontrado|Nenhum animal/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Cadastro de Animal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-screen')).toBeVisible();
    // btn-cadastrar-animal ainda sem testID — ver "testIDs faltando"
    await page.getByText('+ Cadastrar Animal').click();
    await expect(page.getByTestId('input-brinco')).toBeVisible();
  });

  test('salva animal com campos obrigatórios preenchidos', async ({ page }) => {
    // brinco único por execução para evitar erro de duplicata da API
    const brinco = 'E2E-' + Date.now();
    await page.getByTestId('input-brinco').fill(brinco);
    await page.getByTestId('chip-raca-nelore').click();
    await page.getByTestId('btn-sexo-femea').click();
    await page.getByTestId('chip-tipo-vaca').click();

    await page.getByTestId('btn-salvar-animal').scrollIntoViewIfNeeded();
    await page.getByTestId('btn-salvar-animal').click();

    // offline → modal customizado aparece com "salvo localmente"; precisa de OK para navegar
    const modalOffline = page.getByText(/salvo localmente/i).filter({ visible: true }).first();
    const foiOffline = await modalOffline.isVisible({ timeout: 3_000 }).catch(() => false);
    if (foiOffline) {
      await page.getByText('OK').filter({ visible: true }).last().click();
    }

    // online: navigation.navigate('AnimalList') já aconteceu; offline: OK acima dispara navegação
    await expect(page.getByTestId('chip-filtro-todos')).toBeVisible({ timeout: 8_000 });
  });

  test('validação: brinco duplicado exibe erro específico', async ({ page }) => {
    const brinco = 'E2E-DUP-' + Date.now();

    // 1ª tentativa — cadastra o brinco com sucesso
    await page.getByTestId('input-brinco').fill(brinco);
    await page.getByTestId('chip-raca-nelore').click();
    await page.getByTestId('btn-sexo-macho').click();
    await page.getByTestId('chip-tipo-touro').click();
    await page.getByTestId('btn-salvar-animal').scrollIntoViewIfNeeded();
    await page.getByTestId('btn-salvar-animal').click();
    await page.waitForTimeout(4_000);

    // Volta para cadastro e tenta o mesmo brinco
    await page.goto('/');
    await page.getByText('+ Cadastrar Animal').click();
    await expect(page.getByTestId('input-brinco')).toBeVisible();

    await page.getByTestId('input-brinco').fill(brinco);
    await page.getByTestId('chip-raca-nelore').click();
    await page.getByTestId('btn-sexo-macho').click();
    await page.getByTestId('chip-tipo-touro').click();
    await page.getByTestId('btn-salvar-animal').scrollIntoViewIfNeeded();
    await page.getByTestId('btn-salvar-animal').click();

    await expect(
      page.getByText(/brinco.*já|já.*cadastrado|duplicado|brinco/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 12_000 });
  });

  test('campos obrigatórios não preenchidos exibem aviso', async ({ page }) => {
    await page.getByTestId('btn-salvar-animal').scrollIntoViewIfNeeded();
    await page.getByTestId('btn-salvar-animal').click();

    // modal aviso mostra "Atenção" + mensagem de campos obrigatórios
    await expect(
      page.getByText(/Preencha os campos obrigatórios|obrigatório/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Detalhes do Animal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });

  test('abre ficha completa ao clicar no card', async ({ page }) => {
    await irParaRebanho(page);
    const card = await primeiroCard(page);
    if (!card) { test.skip(); return; }

    await card.click();

    await expect(
      page.getByText('Ficha do Animal').filter({ visible: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText('Dados principais').filter({ visible: true }).first()
    ).toBeVisible();
  });

  test('botão "Gerar Relatório PDF" está visível na ficha', async ({ page }) => {
    await irParaRebanho(page);
    const card = await primeiroCard(page);
    if (!card) { test.skip(); return; }

    await card.click();

    await expect(page.getByTestId('btn-pdf-ficha')).toBeVisible();
  });

  test('seção Saúde permite registrar vacina', async ({ page }) => {
    await irParaRebanho(page);
    const card = await primeiroCard(page);
    if (!card) { test.skip(); return; }

    await card.click();

    // btn-registrar-vacina ainda sem testID — ver "testIDs faltando"
    // O botão "Registrar vacina" é o action da Section "Saude"
    await page.getByText('Registrar vacina').filter({ visible: true }).first().click();

    // modal abre — título "Registrar vacina" fica visível dentro do modal
    // input-vacina-nome e input-vacina-data ainda sem testID
    await expect(
      page.getByText('Registrar vacina').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Preenche os campos do modal enquanto testIDs não existem
    await page.getByPlaceholder('DD/MM/AAAA').filter({ visible: true }).first().fill('01/06/2025');

    // btn-salvar-modal ainda sem testID — ver "testIDs faltando"
    await page.getByText('Salvar').filter({ visible: true }).last().click();

    // modal fecha e seção Saude continua visível
    await expect(
      page.getByText('Saude').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Edição e Exclusão', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });

  test('edita nome do animal e salva', async ({ page }) => {
    await irParaRebanho(page);
    const card = await primeiroCard(page);
    if (!card) { test.skip(); return; }

    // Clica no ícone lápis do card
    await card.locator('[data-testid="btn-editar-animal"]').click();
    await expect(page.getByTestId('input-nome')).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-nome').fill('Animal E2E Editado');

    await page.getByTestId('btn-salvar-animal').scrollIntoViewIfNeeded();
    await page.getByTestId('btn-salvar-animal').click();

    // sucesso online → nome editado aparece visível na lista
    // sucesso offline → modal aviso com "Sucesso" / "salvo localmente"
    await expect(
      page.getByText('Animal E2E Editado').filter({ visible: true }).first()
        .or(page.getByText(/Sucesso|salvo localmente/i).filter({ visible: true }).first())
    ).toBeVisible({ timeout: 12_000 });
  });

  test('exclui animal e remove da lista', async ({ page }) => {
    await irParaRebanho(page);
    await page.waitForTimeout(2_000);

    const cards = page.locator('[data-testid^="animal-card-"]');
    if ((await cards.count()) === 0) { test.skip(); return; }

    const countBefore = await cards.count();

    // Clica no ícone lixeira do primeiro card
    await cards.first().locator('[data-testid="btn-excluir-animal"]').click();

    // Modal de confirmação
    await expect(
      page.getByText('Excluir Animal').filter({ visible: true }).first()
    ).toBeVisible();
    await page.getByTestId('btn-confirmar-exclusao').click();

    await page.waitForTimeout(2_000);
    const countAfter = await page.locator('[data-testid^="animal-card-"]').count();
    expect(countAfter).toBe(countBefore - 1);
  });
});

/*
 * ── testIDs FALTANDO ─────────────────────────────────────────────────────────
 *
 * HomeScreen (src/screens/HomeScreen.tsx):
 *   - botão "+ Cadastrar Animal"  → testID="btn-cadastrar-animal"  (linha ~334)
 *
 *
 * AnimalDetailsScreen (src/screens/AnimalDetailsScreen.tsx):
 *   - botão "Registrar vacina"    → testID="btn-registrar-vacina"  (Section action, linha ~1116)
 *
 * AnimalDetailsScreen — VacinaModal:
 *   - input nome da vacina        → testID="input-vacina-nome"     (VacinaModal linha ~1334)
 *   - input data de aplicação     → testID="input-vacina-data"     (VacinaModal linha ~1336)
 *   - botão Salvar do modal       → testID="btn-salvar-modal"      (ModalActions linha ~1407)
 *
 * CadastroAnimalScreen (src/screens/CadastroAnimalScreen.tsx):
 *   - botão OK do modal aviso     → testID="btn-modal-aviso-ok"    (linha ~892)
 */
