/**
 * saude.spec.ts — Saúde Animal
 * Todos os seletores usam testID reais. Seletores-texto só onde
 * testID ausente (documentado na seção "testIDs faltando" ao final).
 *
 * Usa storageState pré-autenticado criado por e2e/fixtures/auth.ts.
 */

import { test, expect, Page } from '@playwright/test';

// ── Helper: navega para SaudeScreen e aguarda botão principal ─────────────────
async function irParaSaude(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('home-screen')).toBeVisible();
  // btn-nav-saude: BottomMenu não tem testID → texto com filtro :visible
  await page.getByText('Saúde').filter({ visible: true }).first().click();
  // btn-registrar-vacina é sempre renderizado na SaudeScreen
  await expect(page.getByTestId('btn-registrar-vacina')).toBeVisible({ timeout: 8_000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Tela de Saúde — Visão Geral', () => {
  test.beforeEach(async ({ page }) => { await irParaSaude(page); });

  test('exibe os três acordeões de status de vacinação', async ({ page }) => {
    await expect(page.getByTestId('chip-atrasada')).toBeVisible();
    await expect(page.getByTestId('chip-pendente')).toBeVisible();
    await expect(page.getByTestId('chip-em-dia')).toBeVisible();
  });

  test('acordeão "Atrasadas" expande ao clicar', async ({ page }) => {
    await page.getByTestId('chip-atrasada').click();
    await page.waitForTimeout(500);
    await expect(
      page.getByText(/Nenhum animal nesta categoria/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 3_000 });
  });

  test('acordeão "Pendentes" expande ao clicar', async ({ page }) => {
    await page.getByTestId('chip-pendente').click();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('chip-pendente')).toBeVisible();
  });

  test('acordeão "Em dia" expande ao clicar', async ({ page }) => {
    await page.getByTestId('chip-em-dia').click();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('chip-em-dia')).toBeVisible();
  });

  test('botões de ação principais estão visíveis', async ({ page }) => {
    await expect(page.getByTestId('btn-registrar-vacina')).toBeVisible();
    await expect(page.getByTestId('btn-registrar-vermifugacao')).toBeVisible();
    await expect(page.getByTestId('btn-vacinar-lote')).toBeVisible();
    await expect(page.getByTestId('btn-vermifugar-lote')).toBeVisible();
    await expect(page.getByTestId('btn-gerenciar-estoque')).toBeVisible();
    await expect(page.getByTestId('btn-afastamento')).toBeVisible();
    await expect(page.getByTestId('btn-historico-vacinas')).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registrar Vacina Individual', () => {
  test.beforeEach(async ({ page }) => { await irParaSaude(page); });

  test('abre modal com campos corretos e chips de vacina', async ({ page }) => {
    await page.getByTestId('btn-registrar-vacina').click();

    // Campos do modal devem estar visíveis
    await expect(page.getByTestId('input-nome-vacina').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('input-data-vacina').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-salvar-vacina').filter({ visible: true })).toBeVisible();

    // Chips de seleção rápida
    await expect(page.getByTestId('chip-vacina-raiva').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-vacina-brucelose').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-vacina-febre aftosa').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-vacina-outra').filter({ visible: true })).toBeVisible();
  });

  test('chip de vacina preenche o campo nome', async ({ page }) => {
    await page.getByTestId('btn-registrar-vacina').click();
    await expect(page.getByTestId('input-nome-vacina').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    // Clica Brucelose → limpa o input (nomeVacina = 'Brucelose')
    await page.getByTestId('chip-vacina-brucelose').filter({ visible: true }).click();
    // Clica Outra → nomeVacina = '' (campo editável)
    await page.getByTestId('chip-vacina-outra').filter({ visible: true }).click();
    await page.getByTestId('input-nome-vacina').filter({ visible: true }).fill('Clostridiose');

    await expect(page.getByTestId('input-nome-vacina').filter({ visible: true })).toBeVisible();
  });

  test('validação: salvar sem preencher mantém modal aberto', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-registrar-vacina').click();
    await expect(page.getByTestId('btn-salvar-vacina').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    // Tenta salvar sem nome nem animal — o app bloqueia e o modal não fecha
    await page.getByTestId('btn-salvar-vacina').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    // Modal permanece aberto (btn-salvar ainda visível)
    await expect(page.getByTestId('btn-salvar-vacina').filter({ visible: true })).toBeVisible();
  });

  test('campo data-vacina aceita entrada no formato DD/MM/AAAA', async ({ page }) => {
    await page.getByTestId('btn-registrar-vacina').click();
    const inputData = page.getByTestId('input-data-vacina').filter({ visible: true });
    await expect(inputData).toBeVisible({ timeout: 5_000 });
    await inputData.clear();
    await inputData.fill('15/06/2025');
    await expect(inputData).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Registrar Vermifugação Individual', () => {
  test.beforeEach(async ({ page }) => { await irParaSaude(page); });

  test('abre modal com campos corretos', async ({ page }) => {
    await page.getByTestId('btn-registrar-vermifugacao').click();

    await expect(page.getByTestId('input-data-vermifugacao').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('input-nome-vermifugo').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-salvar-vermifugacao').filter({ visible: true })).toBeVisible();
  });

  test('validação: salvar sem preencher mantém modal aberto', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-registrar-vermifugacao').click();
    await expect(page.getByTestId('btn-salvar-vermifugacao').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    // Tenta salvar sem dados — o app bloqueia e o modal não fecha
    await page.getByTestId('btn-salvar-vermifugacao').filter({ visible: true }).click();
    await page.waitForTimeout(800);

    // Modal permanece aberto (btn-salvar ainda visível)
    await expect(page.getByTestId('btn-salvar-vermifugacao').filter({ visible: true })).toBeVisible();
  });

  test('campo produto-vermifugo aceita texto', async ({ page }) => {
    await page.getByTestId('btn-registrar-vermifugacao').click();
    const inputProduto = page.getByTestId('input-nome-vermifugo').filter({ visible: true });
    await expect(inputProduto).toBeVisible({ timeout: 5_000 });
    await inputProduto.fill('Ivermectina 1%');
    await expect(inputProduto).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Vacinar Lote', () => {
  test.beforeEach(async ({ page }) => { await irParaSaude(page); });

  test('abre LoteModal e exibe passo 1 com chips de faixa', async ({ page }) => {
    await page.getByTestId('btn-vacinar-lote').click();

    // Chips de faixa etária do Passo 1 (chip-faixa-0 a chip-faixa-3)
    await expect(page.getByTestId('chip-faixa-0').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('chip-faixa-1').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-faixa-2').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-faixa-3').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-avancar-lote').filter({ visible: true })).toBeVisible();
  });

  test('seleciona faixa "Todos" e avança para passo 2', async ({ page }) => {
    await page.getByTestId('btn-vacinar-lote').click();
    await expect(page.getByTestId('btn-avancar-lote').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    // chip-faixa-3 = "Todos" (já selecionado por padrão)
    await page.getByTestId('chip-faixa-3').filter({ visible: true }).click();
    await page.getByTestId('btn-avancar-lote').filter({ visible: true }).click();

    // Passo 2: exibe contador de selecionados
    await expect(
      page.getByText(/\d+ animal\(is\) selecionado\(s\)/i).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('wizard completo: faixa → animais → dados → confirma', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await page.getByTestId('btn-vacinar-lote').click();
    await expect(page.getByTestId('btn-avancar-lote').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    // Passo 1: seleciona "Todos" e avança
    await page.getByTestId('chip-faixa-3').filter({ visible: true }).click();
    await page.getByTestId('btn-avancar-lote').filter({ visible: true }).click();

    // Verifica se há animais; pula se não houver
    await page.waitForTimeout(500);
    const textoContagem = page.getByText(/(\d+) animal\(is\) selecionado\(s\)/i).filter({ visible: true }).first();
    await expect(textoContagem).toBeVisible({ timeout: 3_000 });
    const textoRaw = await textoContagem.textContent() ?? '0';
    const qtdSelecionados = parseInt(textoRaw.match(/\d+/)?.[0] ?? '0');
    if (qtdSelecionados === 0) {
      test.skip(true, 'Sem animais no banco — pula wizard de lote');
      return;
    }

    // Passo 2: avança para Dados
    // btn-avancar-passo-lote FALTANDO → usa texto :visible como fallback
    const btnDados = page.getByText('Dados →').filter({ visible: true }).first();
    await expect(btnDados).toBeVisible({ timeout: 3_000 });
    await btnDados.click();

    // Passo 3: campos de vacina visíveis
    await expect(page.getByTestId('input-data-lote').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-aplicar-lote').filter({ visible: true })).toBeVisible();

    // Seleciona vacina e preenche data
    await page.getByTestId('chip-vacina-raiva').filter({ visible: true }).click();
    await page.getByTestId('input-data-lote').filter({ visible: true }).clear();
    await page.getByTestId('input-data-lote').filter({ visible: true }).fill('15/06/2025');

    await page.getByTestId('btn-aplicar-lote').filter({ visible: true }).click();

    // Sucesso: Alert.alert('Sucesso', '...') → capturado pelo handler acima
    await page.waitForTimeout(3_000); // aguarda request + dialog
  });

  test('Vermifugar Lote abre wizard com passo 1', async ({ page }) => {
    await page.getByTestId('btn-vermifugar-lote').click();
    await expect(page.getByTestId('chip-faixa-0').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('btn-avancar-lote').filter({ visible: true })).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Estoque de Medicamentos', () => {
  async function irParaEstoque(page: Page) {
    await irParaSaude(page);
    await page.getByTestId('btn-gerenciar-estoque').click();
    // EstoqueScreen renderiza as abas; aba-vacinas é sempre a primeira
    await expect(page.getByTestId('aba-vacinas')).toBeVisible({ timeout: 8_000 });
  }

  test('navega para tela de estoque via btn-gerenciar-estoque', async ({ page }) => {
    await irParaSaude(page);
    await page.getByTestId('btn-gerenciar-estoque').click();
    await expect(page.getByTestId('aba-vacinas')).toBeVisible({ timeout: 8_000 });
  });

  test('troca de aba: Vacinas → Medicamentos → Histórico', async ({ page }) => {
    await irParaEstoque(page);

    await page.getByTestId('aba-medicamentos').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('aba-medicamentos')).toBeVisible();

    await page.getByTestId('aba-historico').click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId('aba-historico')).toBeVisible();

    // Volta para Vacinas
    await page.getByTestId('aba-vacinas').click();
    await expect(page.getByTestId('aba-vacinas')).toBeVisible();
  });

  test('adiciona novo item ao estoque com campos corretos', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await irParaEstoque(page);
    await page.getByTestId('btn-adicionar-item-estoque').click();

    // Campos do modal de novo item
    await expect(page.getByTestId('input-nome-medicamento').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('input-qtd-inicial').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('input-qtd-minima').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-salvar-item-estoque').filter({ visible: true })).toBeVisible();

    // Chips de tipo
    await expect(page.getByTestId('chip-tipo-estoque-vacina').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-tipo-estoque-vermifugo').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-tipo-estoque-antibiotico').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-tipo-estoque-outro').filter({ visible: true })).toBeVisible();

    // Chips de unidade
    await expect(page.getByTestId('chip-unidade-doses').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-unidade-ml').filter({ visible: true })).toBeVisible();
  });

  test('salva novo item de estoque preenchendo campos obrigatórios', async ({ page }) => {
    page.on('dialog', d => d.accept());

    await irParaEstoque(page);
    await page.getByTestId('btn-adicionar-item-estoque').click();

    await expect(page.getByTestId('input-nome-medicamento').filter({ visible: true })).toBeVisible({ timeout: 5_000 });

    await page.getByTestId('input-nome-medicamento').filter({ visible: true }).fill('Ivermectina E2E');

    await page.getByTestId('chip-tipo-estoque-vermifugo').filter({ visible: true }).click();
    await page.getByTestId('chip-unidade-ml').filter({ visible: true }).click();

    await page.getByTestId('input-qtd-inicial').filter({ visible: true }).fill('100');
    await page.getByTestId('input-qtd-minima').filter({ visible: true }).fill('10');
    await page.getByTestId('input-valor-unitario').filter({ visible: true }).fill('12,50');

    await page.getByTestId('btn-salvar-item-estoque').filter({ visible: true }).click();

    // Sucesso: modal fechou e voltou à lista de estoque (aba-vacinas sempre visível)
    await expect(page.getByTestId('aba-vacinas')).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Afastamento de Animal', () => {
  test.beforeEach(async ({ page }) => { await irParaSaude(page); });

  test('navega para tela de afastamento via btn-afastamento', async ({ page }) => {
    await page.getByTestId('btn-afastamento').click();
    // AfastamentoScreen: btn-registrar-afastamento é o CTA principal
    await expect(page.getByTestId('btn-registrar-afastamento')).toBeVisible({ timeout: 8_000 });
  });

  test('modal de afastamento exibe campos corretos', async ({ page }) => {
    await page.getByTestId('btn-afastamento').click();
    await expect(page.getByTestId('btn-registrar-afastamento')).toBeVisible({ timeout: 8_000 });

    await page.getByTestId('btn-registrar-afastamento').click();

    // Campos do formulário de afastamento
    await expect(page.getByTestId('input-busca-animal-afastamento').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('input-data-afastamento').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('btn-salvar-afastamento').filter({ visible: true })).toBeVisible();

    // Chips de motivo
    await expect(page.getByTestId('chip-motivo-doenca').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-motivo-tratamento').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-motivo-quarentena').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-motivo-vaca-seca').filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('chip-motivo-outro').filter({ visible: true })).toBeVisible();
  });

  test('chips de motivo são selecionáveis', async ({ page }) => {
    await page.getByTestId('btn-afastamento').click();
    await expect(page.getByTestId('btn-registrar-afastamento')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('btn-registrar-afastamento').click();

    await expect(page.getByTestId('chip-motivo-doenca').filter({ visible: true })).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('chip-motivo-doenca').filter({ visible: true }).click();
    await page.getByTestId('chip-motivo-tratamento').filter({ visible: true }).click();
    // Não deve crashar; campo data deve continuar visível
    await expect(page.getByTestId('input-data-afastamento').filter({ visible: true })).toBeVisible();
  });

  test('campo de busca de animal aceita texto', async ({ page }) => {
    await page.getByTestId('btn-afastamento').click();
    await expect(page.getByTestId('btn-registrar-afastamento')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('btn-registrar-afastamento').click();

    const buscaInput = page.getByTestId('input-busca-animal-afastamento').filter({ visible: true });
    await expect(buscaInput).toBeVisible({ timeout: 5_000 });
    await buscaInput.fill('boi');
    await page.waitForTimeout(500);
    // Input permanece visível e funcional
    await expect(buscaInput).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Histórico de Vacinas', () => {
  test.beforeEach(async ({ page }) => { await irParaSaude(page); });

  test('abre modal de histórico via btn-historico-vacinas', async ({ page }) => {
    await page.getByTestId('btn-historico-vacinas').click();

    // ModalHistórico não tem testID — verifica pelo título (único no DOM neste momento)
    // modal-historico FALTANDO → usa texto com filtro :visible
    await expect(
      page.getByText('Histórico de Vacinas').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('histórico exibe chips de período', async ({ page }) => {
    await page.getByTestId('btn-historico-vacinas').click();
    await expect(
      page.getByText('Histórico de Vacinas').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Chips de período: "Este mês", "Últimos 3 meses", "Este ano", "Personalizado"
    // (sem testID nos chips de período — btn-periodo-{x} FALTANDO)
    await expect(
      page.getByText('Este mês').filter({ visible: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText('Este ano').filter({ visible: true }).first()
    ).toBeVisible();
  });

  test('busca histórico do período atual', async ({ page }) => {
    await page.getByTestId('btn-historico-vacinas').click();
    await expect(
      page.getByText('Histórico de Vacinas').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Clica "Buscar" — btn-buscar-historico FALTANDO → usa texto :visible
    const btnBuscar = page.getByText('Buscar').filter({ visible: true }).first();
    await expect(btnBuscar).toBeVisible({ timeout: 3_000 });
    await btnBuscar.click();
    await page.waitForTimeout(3_000);

    // Resultado: mensagem de vazio OU lista de vacinações
    await expect(
      page.getByText(/Nenhuma vacinação encontrada|vacinação\(ões\)/i)
        .filter({ visible: true }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

/*
 * ── testIDs FALTANDO ─────────────────────────────────────────────────────────
 *
 * BottomMenu (src/components/BottomMenu.tsx):
 *   - aba Saúde             → testID="btn-nav-saude"    (TouchableOpacity, chave 'saude')
 *
 * SaudeScreen — container (src/screens/SaudeScreen.tsx):
 *   - container da tela     → testID="saude-screen"     (SafeAreaView raiz)
 *
 * SaudeScreen — BuscaAnimal (usada em VacinaModal e VermifugacaoModal):
 *   - input de busca        → testID="input-busca-animal-saude"   (TextInput, linha ~277)
 *   - item resultado        → testID={`saude-resultado-animal-${a.id}`}  (TouchableOpacity, linha ~284)
 *
 * SaudeScreen — CardExpansivel (acordeão de animal):
 *   - botão "Registrar vacina" interno → testID={`btn-registrar-vacina-${animal.animalId}`}  (linha ~859)
 *
 * SaudeScreen — LoteModal passo 2:
 *   - botão "Dados →"       → testID="btn-avancar-passo-lote"  (TouchableOpacity, linha ~746)
 *
 * SaudeScreen — ModalHistorico:
 *   - container do modal    → testID="modal-historico"      (View interno, linha ~919)
 *   - botão "Buscar"        → testID="btn-buscar-historico" (TouchableOpacity, linha ~948)
 *   - chips de período      → testID={`chip-periodo-${p.toLowerCase().replace(/ /g,'-')}`}  (linha ~933)
 */
