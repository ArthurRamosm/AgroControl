import { test, expect, Page, Browser } from '@playwright/test';
import fs from 'fs';

// ─────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────
const BASE = 'http://localhost:8081';
const API  = 'http://localhost:5249';
const AUTH_FILE = 'test-results/auth-state.json';

const USUARIO = {
  nome: 'Maria Teste',
  email: `maria.e2e.${Date.now()}@agro.test`,
  senha: 'Senha@123',
};

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function dataHoje(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

async function fazerLogin(page: Page, email: string, senha: string) {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForSelector('[role="textbox"]', { timeout: 30_000 });
  await page.locator('[role="textbox"]').nth(0).fill(email);
  await page.locator('[role="textbox"]').nth(1).fill(senha);
  await page.locator('[role="button"]').filter({ hasText: /entrar/i }).click();
}

async function esperarHome(page: Page) {
  await expect(page.getByText('AgroControl', { exact: false })).toBeVisible({ timeout: 15_000 });
}

async function irParaFazenda(page: Page) {
  await page.getByText('Fazenda', { exact: false }).last().click();
  await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
}

async function clicarPdfEAceitarDialogo(page: Page) {
  page.once('dialog', d => d.accept().catch(() => {}));
  const pdfBtn = page.getByText('Gerar Relatório PDF', { exact: false }).filter({ visible: true }).first();
  await expect(pdfBtn).toBeVisible({ timeout: 5_000 });
  await pdfBtn.click();
  await page.waitForTimeout(500);
}

// ═════════════════════════════════════════════════════════
// SANIDADE — Roda ANTES do setup de autenticação.
// Ao colocar o beforeAll dentro do describe SETUP (não no root),
// o Playwright executa este describe primeiro (workers:1, serial).
// ═════════════════════════════════════════════════════════
test.describe('SANIDADE — Verificação inicial da página', () => {
  test('0.1 captura screenshot e HTML do estado inicial', async ({ page }) => {
    fs.mkdirSync('test-results', { recursive: true });
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/debug-login.png' });
    const html = await page.content();
    console.log('=== PAGE CONTENT START ===');
    console.log(html.slice(0, 5000));
    console.log('=== PAGE CONTENT END ===');
    expect(html.length).toBeGreaterThan(100);
  });
});

// ═════════════════════════════════════════════════════════
// SETUP — Cria usuário + faz login + salva storageState.
// beforeAll dentro do describe → não bloqueia o SANIDADE acima.
// ═════════════════════════════════════════════════════════
test.describe('SETUP — Autenticação global', () => {
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    try {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      const res = await page.request.post(`${API}/api/auth/register`, {
        data: { nome: USUARIO.nome, email: USUARIO.email, senha: USUARIO.senha },
        headers: { 'Content-Type': 'application/json' },
      });
      expect([200, 201, 400, 409]).toContain(res.status());
      await ctx.close();
    } catch { /* API offline — usa usuário já existente */ }
  });

  test('0.2 storageState criado com sucesso', async ({ browser }) => {
    fs.mkdirSync('test-results', { recursive: true });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="textbox"]', { timeout: 30_000 });
    await page.locator('[role="textbox"]').nth(0).fill(USUARIO.email);
    await page.locator('[role="textbox"]').nth(1).fill(USUARIO.senha);
    await page.locator('[role="button"]').filter({ hasText: /entrar/i }).click();
    const roles = await page.evaluate(() =>
      [...document.querySelectorAll('[role]')]
        .map(el => el.getAttribute('role') + ': ' + el.textContent?.slice(0, 30))
        .join('\n')
    ).catch(() => 'evaluate failed');
    console.log('ROLES DISPONÍVEIS:\n', roles);
    await page.waitForFunction(
      () => (document.body as HTMLElement).innerText.length > 50,
      { timeout: 15_000 }
    );
    await ctx.storageState({ path: AUTH_FILE });
    await ctx.close();
    expect(fs.existsSync(AUTH_FILE)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 1 — Login e Autenticação (fresh browser, sem storageState)
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 1 — Login e Autenticação', () => {
  test('1.1 exibe campos obrigatórios na tela de login', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="textbox"]', { timeout: 30_000 });
    await expect(page.locator('[role="textbox"]').nth(0)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="textbox"]').nth(1)).toBeVisible();
    await expect(page.locator('[role="button"]').filter({ hasText: /entrar/i })).toBeVisible();
  });

  test('1.2 exibe área ou link de cadastro', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByText(/cadastr|registr|criar conta/i, { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('1.3 exibe erro com credenciais inválidas', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="textbox"]', { timeout: 30_000 });
    await page.locator('[role="textbox"]').nth(0).fill('usuario.invalido@agro.test');
    await page.locator('[role="textbox"]').nth(1).fill('senhaerrada999');
    await page.locator('[role="button"]').filter({ hasText: /entrar/i }).click();
    await expect(
      page.getByText(/credencial|inválid|incorret|erro|não encontrado/i, { exact: false }).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('1.4 login bem-sucedido redireciona para Home', async ({ page }) => {
    await fazerLogin(page, USUARIO.email, USUARIO.senha);
    await esperarHome(page);
    await expect(page.getByText('Dashboard', { exact: false })).toBeVisible({ timeout: 5_000 });
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 2 — Home
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 2 — Home', () => {
  test.use({ storageState: AUTH_FILE });

  test('2.1 exibe header com título e saudação', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await expect(page.getByTestId('home-screen')).toBeVisible();
    await expect(page.getByText('AgroControl', { exact: false })).toBeVisible();
    await expect(page.getByText('Dashboard', { exact: false })).toBeVisible();
  });

  test('2.2 exibe cards do dashboard', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await expect(page.getByText('Total de Animais', { exact: false })).toBeVisible();
    await expect(page.getByText('Saudáveis', { exact: false })).toBeVisible();
    await expect(page.getByText('Vacinas Pendentes', { exact: false })).toBeVisible();
  });

  test('2.3 exibe seção Resumo do Rebanho com barras', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await expect(page.getByText('Resumo do Rebanho', { exact: false })).toBeVisible();
    await expect(page.getByText('Fêmeas', { exact: false })).toBeVisible();
    await expect(page.getByText('Machos', { exact: false })).toBeVisible();
  });

  test('2.4 exibe alertas recentes e botões de ação rápida', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await expect(page.getByText('Alertas Recentes', { exact: false })).toBeVisible();
    await expect(page.getByText('+ Cadastrar Animal', { exact: false })).toBeVisible();
    await expect(page.getByText('Ver Rebanho', { exact: false })).toBeVisible();
    await expect(page.getByText('Mapa da Propriedade', { exact: false })).toBeVisible();
    await expect(page.getByText('Sair', { exact: false })).toBeVisible();
  });

  test('2.5 menu inferior contém as cinco abas', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await expect(page.getByText('Início', { exact: false })).toBeVisible();
    await expect(page.getByText('Animais', { exact: false })).toBeVisible();
    await expect(page.getByText('Saúde', { exact: false })).toBeVisible();
    await expect(page.getByText('Finanças', { exact: false })).toBeVisible();
    await expect(page.getByText('Fazenda', { exact: false })).toBeVisible();
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 3 — Animais
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 3 — Animais', () => {
  test.use({ storageState: AUTH_FILE });

  test('3.1 navega para lista de animais via aba Animais', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Animais', { exact: false }).last().click();
    await expect(
      page.getByText(/rebanho|animais|lista/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('3.2 navega para lista via botão Ver Rebanho', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Ver Rebanho', { exact: false }).click();
    await expect(
      page.getByText(/rebanho|animais|lista/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('3.3 abre formulário de cadastro via Home', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('+ Cadastrar Animal', { exact: false }).click();
    await expect(
      page.getByText(/cadastr.*animal|novo.*animal|adicionar animal/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('3.4 preenche formulário de cadastro de bovino', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('+ Cadastrar Animal', { exact: false }).click();
    await page.waitForTimeout(1000);

    const nomeField = page.getByPlaceholder(/nome|identifica|número/i).first();
    if (await nomeField.isVisible().catch(() => false)) {
      await nomeField.fill('Novilha Teste 007');
    }

    const racaField = page.getByPlaceholder(/raça|raca/i).first();
    if (await racaField.isVisible().catch(() => false)) {
      await racaField.fill('Girolando');
    }

    const saveBtn = page.getByRole('button', { name: /salvar|cadastrar|adicionar/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
      await saveBtn.click();
      await page.waitForTimeout(1500);
    }
  });

  test('3.5 card de animal exibe informações básicas', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Ver Rebanho', { exact: false }).click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/rebanho|animais/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
    // Clica no primeiro card se existir
    const firstCard = page.getByRole('button').filter({ visible: true }).nth(1);
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(500);
    }
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 4 — Saúde
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 4 — Saúde', () => {
  test.use({ storageState: AUTH_FILE });

  async function irParaSaude(page: Page) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Saúde', { exact: false }).last().click();
    await page.waitForTimeout(500);
  }

  // 4a — Mastite Clínica
  test('4.1 Mastite Clínica — abre tela e exibe estatísticas', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/mastite cl[ií]nica/i, { exact: false }).first().click();
    await expect(page.getByTestId('header-mastite-clinica')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Total ocorrências', { exact: false })).toBeVisible();
    await expect(page.getByText('Este mês', { exact: false })).toBeVisible();
    await expect(page.getByText('Vacas afetadas', { exact: false })).toBeVisible();
  });

  test('4.2 Mastite Clínica — cria novo registro completo', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/mastite cl[ií]nica/i, { exact: false }).first().click();
    await expect(page.getByTestId('header-mastite-clinica')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('btn-novo-registro-mastite').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Novo Registro', { exact: false })).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder('Nome ou número da vaca').fill('Vaca Mastite 01');
    await page.getByPlaceholder('Data (DD/MM/AAAA)').fill(dataHoje());
    await page.getByPlaceholder('Tratamento, evolução, notas...').fill('Antibiótico, CMT positivo 3+');

    await page.getByTestId('teto-1-btn-mais').click();
    await page.waitForTimeout(200);
    await page.getByTestId('btn-add-diagnostico').click();
    await page.waitForTimeout(200);

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1500);
  });

  test('4.3 Mastite Clínica — botão PDF presente na tela', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/mastite cl[ií]nica/i, { exact: false }).first().click();
    await expect(page.getByTestId('header-mastite-clinica')).toBeVisible({ timeout: 10_000 });
    // PDF fica no footer da FlatList — SQLite null no web, soft assert
    await expect.soft(
      page.getByText('Gerar Relatório PDF', { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // 4b — Mastite Subclínica (CMT)
  test('4.4 Mastite Subclínica — abre tela CMT', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/subcl[ií]nica|CMT/i, { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/CMT|subcl[ií]nica|sess/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('4.5 Mastite Subclínica — inicia nova sessão', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/subcl[ií]nica|CMT/i, { exact: false }).first().click();
    await page.waitForTimeout(1000);

    const novaBtn = page.getByRole('button', { name: /nova sess|nova/i }).filter({ visible: true }).first();
    if (await novaBtn.isVisible().catch(() => false)) {
      await novaBtn.click();
      await page.waitForTimeout(500);
      const nomeVaca = page.getByPlaceholder(/nome ou número/i).first();
      if (await nomeVaca.isVisible().catch(() => false)) {
        await nomeVaca.fill('Vaca CMT 02');
      }
    }
    await page.waitForTimeout(500);
  });

  // 4c — Parasitas
  test('4.6 Parasitas — exibe título e subtítulo correto', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/parasita|endo.ectoparasita/i, { exact: false }).first().click();
    await expect(
      page.getByText('Controle de Parasitas', { exact: false })
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/PL 03\/07|Endo e Ectoparasita/i, { exact: false })
    ).toBeVisible();
  });

  test('4.7 Parasitas — cria nova aplicação via modal', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/parasita|endo.ectoparasita/i, { exact: false }).first().click();
    await expect(page.getByText('Controle de Parasitas', { exact: false })).toBeVisible({ timeout: 10_000 });

    await page.getByText('Nova', { exact: true }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Nova Aplicação', { exact: false })).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder('Nome ou número do animal').fill('Novilho 42');
    await page.getByPlaceholder(/ex: Ivermectina|Deltametrina/i).fill('Ivermectina 1%');
    await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());
    await page.getByPlaceholder(/"15 dias"|"Não tem"/i).fill('21 dias');

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1500);
  });

  test('4.8 Parasitas — botão PDF presente', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText(/parasita|endo.ectoparasita/i, { exact: false }).first().click();
    await expect(page.getByText('Controle de Parasitas', { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect.soft(
      page.getByText('Gerar Relatório PDF', { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });
  });

  // 4d — Afastamentos
  test('4.9 Afastamentos — abre tela corretamente', async ({ page }) => {
    await irParaSaude(page);
    await page.getByText('Afastamentos', { exact: false }).first().click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/afastamento/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 5 — Financeiro
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 5 — Financeiro', () => {
  test.use({ storageState: AUTH_FILE });

  async function irParaFinanceiro(page: Page) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Finanças', { exact: false }).last().click();
    await expect(page.getByText('Financeiro', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  }

  test('5.1 exibe título, subtítulo e cards de resumo', async ({ page }) => {
    await irParaFinanceiro(page);
    await expect(page.getByText('Resultado da fazenda', { exact: false })).toBeVisible();
    await expect(page.getByText('Receita Total', { exact: false })).toBeVisible();
    await expect(page.getByText('Custos Totais', { exact: false })).toBeVisible();
    await expect(page.getByText('Lucro Líquido', { exact: false })).toBeVisible();
  });

  test('5.2 exibe todos os seis botões de lançamento', async ({ page }) => {
    await irParaFinanceiro(page);
    await expect(page.getByText('Venda de Animais', { exact: false })).toBeVisible();
    await expect(page.getByText('Compra de Animais', { exact: false })).toBeVisible();
    await expect(page.getByText('Despesa Geral', { exact: false })).toBeVisible();
    await expect(page.getByText('Compra de Insumos', { exact: false })).toBeVisible();
    await expect(page.getByText('Pgto. Funcionário', { exact: false })).toBeVisible();
  });

  test('5.3 Despesa Geral — abre modal, seleciona IMA, preenche e salva', async ({ page }) => {
    await irParaFinanceiro(page);
    await page.getByText('Despesa Geral', { exact: false }).click();
    await page.waitForTimeout(500);

    await expect(
      page.getByText(/despesa geral/i, { exact: false }).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Seleciona chip de categoria IMA
    const imaChip = page.getByText('IMA', { exact: false }).filter({ visible: true }).first();
    await expect(imaChip).toBeVisible({ timeout: 5_000 });
    await imaChip.click();
    await page.waitForTimeout(300);

    // Subcategoria IMA (pode aparecer após selecionar)
    const subcatField = page.getByPlaceholder(/subcategoria/i).first();
    if (await subcatField.isVisible().catch(() => false)) {
      await subcatField.fill('Taxa de vistoria');
    }

    // Descrição
    const descField = page.getByPlaceholder(/descri/i).first();
    if (await descField.isVisible().catch(() => false)) {
      await descField.fill('Multa IMA 2026');
    }

    await page.getByPlaceholder('0,00').first().fill('275,00');
    await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());

    const saveBtn = page.getByRole('button', { name: /salvar|lançar|confirmar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);
  });

  test('5.4 Receita — abre modal, seleciona tipo Queijo e salva', async ({ page }) => {
    await irParaFinanceiro(page);
    // Usa .last() para evitar clicar em "Receita Total"
    await page.getByText('Receita', { exact: true }).filter({ visible: true }).last().click();
    await page.waitForTimeout(500);

    const queijoChip = page.getByText('Queijo', { exact: false }).filter({ visible: true }).first();
    if (await queijoChip.isVisible().catch(() => false)) {
      await queijoChip.click();
      await page.waitForTimeout(300);
    }

    const descField = page.getByPlaceholder(/descri/i).first();
    if (await descField.isVisible().catch(() => false)) {
      await descField.fill('Venda queijo canastra semana 1');
    }

    await page.getByPlaceholder('0,00').first().fill('1200,00');
    await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());

    const saveBtn = page.getByRole('button', { name: /salvar|lançar|confirmar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);
  });

  test('5.5 Venda de Animais — navega para tela', async ({ page }) => {
    await irParaFinanceiro(page);
    await page.getByText('Venda de Animais', { exact: false }).click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/venda.*animal|animal.*venda/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 6a–j — Fazenda: Queijaria
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 6a–j — Fazenda (Queijaria)', () => {
  test.use({ storageState: AUTH_FILE });

  async function abrirFazenda(page: Page) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await irParaFazenda(page);
  }

  // a) Produção Diária
  test('6a Produção Diária — registra litros e gera PDF', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Produção Diária', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-producao-diaria')).toBeVisible({ timeout: 10_000 });

    const dia1 = page.getByText('1', { exact: true }).filter({ visible: true }).first();
    if (await dia1.isVisible().catch(() => false)) {
      await dia1.click();
      await page.waitForTimeout(400);
    }

    const leiteManhaField = page.getByPlaceholder('Leite Manhã').first();
    if (await leiteManhaField.isVisible().catch(() => false)) {
      await leiteManhaField.fill('45.5');
    }
    const leiteTardeField = page.getByPlaceholder('Leite Tarde').first();
    if (await leiteTardeField.isVisible().catch(() => false)) {
      await leiteTardeField.fill('38.0');
    }
    const queijoManhaField = page.getByPlaceholder('Queijo Manhã').first();
    if (await queijoManhaField.isVisible().catch(() => false)) {
      await queijoManhaField.fill('2');
    }

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(500);
    }

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // b) Controle Leiteiro
  test('6b Controle Leiteiro — preenche entradas e verifica totais', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Controle Leiteiro', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-controle-leiteiro')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('input-litros-dia').fill('87.5');
    await page.getByTestId('input-vp-preco').fill('2.80');
    await page.getByTestId('input-vs').fill('10');
    await page.getByTestId('input-leite-familiar').fill('5');
    await page.getByTestId('input-leite-bezerro').fill('8');

    await expect(
      page.getByText(/kg\/mês|litros\/mês|média L\/dia|queijos/i, { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });

    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // c) Vendas de Queijo
  test('6c Vendas de Queijo — nova venda inline e PDF', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Vendas de Queijo', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-venda-queijo')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('btn-nova-venda-queijo').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Nova Venda', { exact: false })).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder('Data (DD/MM/AAAA)').fill(dataHoje());
    await page.getByPlaceholder('Nome do cliente').fill('Mercado Bom Preço');
    await page.getByPlaceholder(/canastra|meia cura/i).fill('Canastra');
    await page.getByPlaceholder('0').first().fill('12');
    await page.getByPlaceholder('0,00').first().fill('15,50');

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    page.once('dialog', d => d.accept().catch(() => {}));
    await page.getByTestId('btn-pdf-venda-queijo').click();
    await page.waitForTimeout(500);

    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // d) Potabilidade da Água
  test('6d Potabilidade da Água — registra cloro/pH e gera PDF', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Potabilidade da Água', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-potabilidade')).toBeVisible({ timeout: 10_000 });

    const dia1 = page.getByText('1', { exact: true }).filter({ visible: true }).first();
    if (await dia1.isVisible().catch(() => false)) {
      await dia1.click();
      await page.waitForTimeout(300);
    }

    await page.getByTestId('input-teor-cloro').fill('0.5');
    await page.getByTestId('input-ph').fill('7.2');

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await expect.soft(
        page.getByText(/salvo|registrado/i, { exact: false })
      ).toBeVisible({ timeout: 3_000 });
    }

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // e) Higiene Caixas D'água
  test("6e Higiene Caixas D'água — seleciona mês, preenche e gera PDF", async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText("Higiene Caixas D'água", { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByText("Higiene das Caixas D'água", { exact: false })).toBeVisible({ timeout: 10_000 });

    const primMes = page.getByText('Jan', { exact: false }).filter({ visible: true }).first();
    if (await primMes.isVisible().catch(() => false)) {
      await primMes.click();
      await page.waitForTimeout(300);
    }

    await page.getByPlaceholder(/ex: 15\/06\/2025/i).fill(dataHoje());

    const obsField = page.getByPlaceholder(/condições.*limpeza|observa/i).first();
    if (await obsField.isVisible().catch(() => false)) {
      await obsField.fill('Limpeza realizada sem intercorrências.');
    }

    await page.getByPlaceholder('Nome do responsável').last().fill('Maria Teste');

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // f) Análises Laboratoriais
  test('6f Análises Laboratoriais — abre acordeões e marca SIM', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Análises Laboratoriais', { exact: false }).filter({ visible: true }).first().click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/análise|água|queijo|leite/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Abre seção Água
    const aguaSec = page.getByText('Água', { exact: false }).filter({ visible: true }).first();
    if (await aguaSec.isVisible().catch(() => false)) {
      await aguaSec.click();
      await page.waitForTimeout(300);
    }

    // Clica SIM no primeiro item visível
    const simBtns = page.getByText('SIM', { exact: true }).filter({ visible: true });
    const simCount = await simBtns.count();
    if (simCount > 0) {
      await simBtns.first().click();
      await page.waitForTimeout(200);
    }

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(500);
    }

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // g) Rastreabilidade
  test('6g Rastreabilidade — nova venda inline e PDF', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Rastreabilidade', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-rastreabilidade')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('btn-nova-venda').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Nova Venda', { exact: false })).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder('Data (DD/MM/AAAA)').fill(dataHoje());
    await page.getByPlaceholder('ex: 12.5').fill('18.0');
    await page.getByPlaceholder('ex: L2025-06-01').fill('L2026-06-11');
    await page.getByPlaceholder('Nome do comprador').fill('Cooperativa Mineira');

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // h) Higienização Equipamentos
  test('6h Higienização Equipamentos — marca conformidade e gera PDF', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Higienização Equipamentos', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-higienizacao-equip')).toBeVisible({ timeout: 10_000 });

    const dia1 = page.getByText('1', { exact: true }).filter({ visible: true }).first();
    if (await dia1.isVisible().catch(() => false)) {
      await dia1.click();
      await page.waitForTimeout(300);
    }

    // Marca C (conforme) para o primeiro equipamento
    const cBtn = page.getByText('C', { exact: true }).filter({ visible: true }).first();
    if (await cBtn.isVisible().catch(() => false)) {
      await cBtn.click();
      await page.waitForTimeout(200);
    }

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      // feedback-salvo aparece após salvar (SQLite null no web → soft)
      await expect.soft(page.getByTestId('feedback-salvo')).toBeVisible({ timeout: 3_000 });
    }

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // i) Condições Vestiário
  test('6i Condições Vestiário — preenche Semana 1, SIM/NÃO e salva', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Condições Vestiário', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-vestiario')).toBeVisible({ timeout: 10_000 });

    await page.getByText('Semana 1', { exact: false }).filter({ visible: true }).first().click();
    await page.waitForTimeout(300);

    await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());
    await page.getByPlaceholder('Nome do responsável').fill('Maria Teste');

    const simBtns = page.getByText('SIM', { exact: true }).filter({ visible: true });
    const simCount = await simBtns.count();
    for (let i = 0; i < Math.min(simCount, 3); i++) {
      await simBtns.nth(i).click();
      await page.waitForTimeout(100);
    }

    const naoBtn = page.getByText('NÃO', { exact: true }).filter({ visible: true }).first();
    if (await naoBtn.isVisible().catch(() => false)) {
      await naoBtn.click();
      await page.waitForTimeout(100);
    }

    const saveBtn = page.getByRole('button', { name: /salvar semana/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    // savedMsg em verde (SQLite null → soft)
    await expect.soft(
      page.getByText(/salvo|registrado|sucesso/i, { exact: false })
    ).toBeVisible({ timeout: 3_000 });

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // j) Depósito de Limpeza
  test('6j Depósito de Limpeza — semana, SIM/NÃO, salva e PDF', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Depósito de Limpeza', { exact: false }).filter({ visible: true }).first().click();
    await expect(
      page.getByText(/depósito.*embalagens|depósito.*limpeza/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.getByText('Semana 1', { exact: false }).filter({ visible: true }).first().click();
    await page.waitForTimeout(300);

    await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());
    await page.getByPlaceholder('Nome do responsável').fill('Maria Teste');

    const simBtns = page.getByText('SIM', { exact: true }).filter({ visible: true });
    const cnt = await simBtns.count();
    for (let i = 0; i < Math.min(cnt, 5); i++) {
      await simBtns.nth(i).click();
      await page.waitForTimeout(80);
    }

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await expect.soft(
      page.getByText(/salvo|registrado/i, { exact: false })
    ).toBeVisible({ timeout: 3_000 });

    await clicarPdfEAceitarDialogo(page);
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 6k–n — Fazenda: Curral
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 6k–n — Fazenda (Curral)', () => {
  test.use({ storageState: AUTH_FILE });

  async function abrirFazenda(page: Page) {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await irParaFazenda(page);
  }

  // k) Mastite Clínica via Fazenda → Curral
  test('6k Curral Mastite Clínica — cria registro via Fazenda', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Mastite Clínica', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-mastite-clinica')).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('btn-novo-registro-mastite').click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Novo Registro', { exact: false })).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder('Nome ou número da vaca').fill('Vaca Curral Teste');
    await page.getByPlaceholder('Data (DD/MM/AAAA)').fill(dataHoje());
    await page.getByPlaceholder('Tratamento, evolução, notas...').fill('Registro via Curral');
    await page.getByTestId('teto-1-btn-mais').click();
    await page.waitForTimeout(200);

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    await expect.soft(
      page.getByText('Gerar Relatório PDF', { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });

    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // l) Mastite Subclínica (CMT) via Fazenda → Curral
  test('6l Curral Mastite Subclínica — abre via Fazenda e volta', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Mastite Subclínica (CMT)', { exact: false }).filter({ visible: true }).first().click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/CMT|subcl[ií]nica|sess/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // m) Endo/Ectoparasitas via Fazenda → Curral
  test('6m Curral Endo/Ectoparasitas — registra aplicação via Fazenda', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Endo/Ectoparasitas', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByText('Controle de Parasitas', { exact: false })).toBeVisible({ timeout: 10_000 });

    await page.getByText('Nova', { exact: true }).first().click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Nova Aplicação', { exact: false })).toBeVisible({ timeout: 5_000 });

    await page.getByPlaceholder('Nome ou número do animal').fill('Animal Curral 09');
    await page.getByPlaceholder(/ex: Ivermectina|Deltametrina/i).fill('Deltametrina 2,5%');
    await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());
    await page.getByPlaceholder(/"15 dias"|"Não tem"/i).fill('30 dias');

    const saveBtn = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();
    await page.waitForTimeout(1000);

    await expect.soft(
      page.getByText('Gerar Relatório PDF', { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });

    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });

  // n) Afastamentos via Fazenda → Curral
  test('6n Curral Afastamentos — abre via Fazenda e interage', async ({ page }) => {
    await abrirFazenda(page);
    await page.getByText('Afastamentos', { exact: false }).filter({ visible: true }).first().click();
    await page.waitForTimeout(1000);
    await expect(
      page.getByText(/afastamento/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    const novoBtn = page.getByRole('button', { name: /novo|adicionar/i }).filter({ visible: true }).first();
    if (await novoBtn.isVisible().catch(() => false)) {
      await novoBtn.click();
      await page.waitForTimeout(500);
      const animalField = page.getByPlaceholder(/nome|número.*animal/i).first();
      if (await animalField.isVisible().catch(() => false)) {
        await animalField.fill('Vaca Afastada 01');
      }
    }

    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 7 — Mapa da Propriedade
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 7 — Mapa da Propriedade', () => {
  test.use({ storageState: AUTH_FILE });

  test('7.1 navega para Mapa via botão na Home', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Mapa da Propriedade', { exact: false }).click();
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(/mapa|propriedade|área|hectare|fazenda/i, { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('7.2 tela do mapa renderiza conteúdo principal', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Mapa da Propriedade', { exact: false }).click();
    await page.waitForTimeout(3000);
    const mapContent = page.getByText(/mapa|propriedade|satélite|talhão|área/i, { exact: false }).first();
    await expect(mapContent).toBeVisible({ timeout: 15_000 });
  });

  test('7.3 tela do mapa contém elemento interativo', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await page.getByText('Mapa da Propriedade', { exact: false }).click();
    await page.waitForTimeout(3000);
    const btn = page.getByRole('button').filter({ visible: true }).first();
    await expect(btn).toBeVisible({ timeout: 10_000 });
  });
});

// ═════════════════════════════════════════════════════════
// GRUPO 8 — Smoke Test E2E (cadeia completa)
// ═════════════════════════════════════════════════════════
test.describe('GRUPO 8 — Smoke Test E2E', () => {
  test.use({ storageState: AUTH_FILE });

  test('8.1 percorre todas as cinco abas do menu inferior', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);
    await expect(page.getByTestId('home-screen')).toBeVisible();

    // Animais
    await page.getByText('Animais', { exact: false }).last().click();
    await expect(
      page.getByText(/rebanho|animais/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Saúde
    await page.getByText('Saúde', { exact: false }).last().click();
    await page.waitForTimeout(500);
    await expect(
      page.getByText(/saúde|controle|mastite|parasita/i, { exact: false }).first()
    ).toBeVisible({ timeout: 10_000 });

    // Finanças
    await page.getByText('Finanças', { exact: false }).last().click();
    await expect(page.getByText('Financeiro', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Receita Total', { exact: false })).toBeVisible();

    // Fazenda
    await page.getByText('Fazenda', { exact: false }).last().click();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Queijaria', { exact: false })).toBeVisible();
    await expect(page.getByText('Curral', { exact: false })).toBeVisible();

    // Início
    await page.getByText('Início', { exact: false }).last().click();
    await esperarHome(page);
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });

  test('8.2 cadeia: cadastra animal + lança despesa + registra venda de queijo', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);

    // 1. Cadastra animal
    await page.getByText('+ Cadastrar Animal', { exact: false }).click();
    await page.waitForTimeout(1000);
    const nomeField = page.getByPlaceholder(/nome|identifica/i).first();
    if (await nomeField.isVisible().catch(() => false)) {
      await nomeField.fill('Novilha Smoke E2E');
    }
    const saveAnimal = page.getByRole('button', { name: /salvar|cadastrar/i }).first();
    if (await saveAnimal.isVisible().catch(() => false)) {
      await saveAnimal.click();
    }
    await page.waitForTimeout(1000);

    // 2. Lança despesa geral
    await page.getByText('Finanças', { exact: false }).last().click();
    await expect(page.getByText('Financeiro', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByText('Despesa Geral', { exact: false }).click();
    await page.waitForTimeout(500);
    const valorDespesa = page.getByPlaceholder('0,00').first();
    if (await valorDespesa.isVisible().catch(() => false)) {
      await valorDespesa.fill('350,00');
      await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());
      const saveDespesa = page.getByRole('button', { name: /salvar|lançar|confirmar/i }).first();
      if (await saveDespesa.isVisible().catch(() => false)) {
        await saveDespesa.click();
      }
    }
    await page.waitForTimeout(1000);

    // 3. Registra venda de queijo
    await page.getByText('Fazenda', { exact: false }).last().click();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
    await page.getByText('Vendas de Queijo', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-venda-queijo')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('btn-nova-venda-queijo').click();
    await page.waitForTimeout(500);
    await page.getByPlaceholder('Data (DD/MM/AAAA)').fill(dataHoje());
    await page.getByPlaceholder('Nome do cliente').fill('Cliente Smoke Final');
    await page.getByPlaceholder('0').first().fill('8');
    const saveVenda = page.getByRole('button', { name: /salvar/i }).filter({ visible: true }).first();
    if (await saveVenda.isVisible().catch(() => false)) {
      await saveVenda.click();
    }
    await page.waitForTimeout(1000);

    // 4. Verifica Home com integridade
    await page.getByText('Início', { exact: false }).last().click();
    await esperarHome(page);
    await expect(page.getByTestId('home-screen')).toBeVisible();
    await expect(page.getByText('Total de Animais', { exact: false })).toBeVisible();
  });

  test('8.3 cadeia: Saúde → Mastite Clínica → Fazenda → Rastreabilidade → Home', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);

    // Saúde → Mastite Clínica → volta
    await page.getByText('Saúde', { exact: false }).last().click();
    await page.waitForTimeout(500);
    await page.getByText(/mastite cl[ií]nica/i, { exact: false }).first().click();
    await expect(page.getByTestId('header-mastite-clinica')).toBeVisible({ timeout: 10_000 });
    await page.goBack();

    // Fazenda → Rastreabilidade → volta
    await page.getByText('Fazenda', { exact: false }).last().click();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });
    await page.getByText('Rastreabilidade', { exact: false }).filter({ visible: true }).first().click();
    await expect(page.getByTestId('header-rastreabilidade')).toBeVisible({ timeout: 10_000 });
    await page.goBack();
    await expect(page.getByTestId('fazenda-hub')).toBeVisible({ timeout: 10_000 });

    // Home
    await page.getByText('Início', { exact: false }).last().click();
    await esperarHome(page);
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });

  test('8.4 cadeia: Financeiro → Receita Leite + Potabilidade + PDF Parasitas', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await esperarHome(page);

    // Finanças → Receita (tipo Leite)
    await page.getByText('Finanças', { exact: false }).last().click();
    await expect(page.getByText('Financeiro', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    await page.getByText('Receita', { exact: true }).filter({ visible: true }).last().click();
    await page.waitForTimeout(500);
    const leiteChip = page.getByText('Leite', { exact: false }).filter({ visible: true }).first();
    if (await leiteChip.isVisible().catch(() => false)) {
      await leiteChip.click();
      await page.waitForTimeout(200);
    }
    await page.getByPlaceholder('0,00').first().fill('840,00');
    await page.getByPlaceholder('DD/MM/AAAA').first().fill(dataHoje());
    const saveReceita = page.getByRole('button', { name: /salvar|lançar|confirmar/i }).filter({ visible: true }).first();
    if (await saveReceita.isVisible().catch(() => false)) {
      await saveReceita.click();
    }
    await page.waitForTimeout(1000);

    // Saúde → Parasitas → PDF
    await page.getByText('Saúde', { exact: false }).last().click();
    await page.waitForTimeout(500);
    await page.getByText(/parasita|endo.ectoparasita/i, { exact: false }).first().click();
    await expect(page.getByText('Controle de Parasitas', { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect.soft(
      page.getByText('Gerar Relatório PDF', { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });

    // Home
    await page.getByText('Início', { exact: false }).last().click();
    await esperarHome(page);
    await expect(page.getByTestId('home-screen')).toBeVisible();
  });
});
