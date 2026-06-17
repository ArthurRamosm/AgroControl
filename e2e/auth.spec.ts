/**
 * auth.spec.ts — Autenticação
 * Testa login, login inválido, registro e logout.
 *
 * Este spec NÃO usa storageState pré-autenticado — precisa testar
 * o fluxo de auth em si. Cada teste começa na tela de Login.
 */

import { test, expect } from '@playwright/test';

// Sobrescreve storageState para iniciar sem sessão
test.use({ storageState: { cookies: [], origins: [] } });

const USER = process.env.TEST_USER;
const PASS = process.env.TEST_PASS;
if (!USER || !PASS) {
  throw new Error('TEST_USER e TEST_PASS são obrigatórios (OWASP M1/M8). Defina via variáveis de ambiente.');
}

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Usuário')).toBeVisible();
  });

  test('credenciais válidas navegam para home', async ({ page }) => {
    await page.getByPlaceholder('Usuário').fill(USER);
    await page.getByPlaceholder('Senha').fill(PASS);
    await page.getByText('Entrar').click();
    await expect(page.getByTestId('home-screen')).toBeVisible({ timeout: 15_000 });
  });

  test('credenciais inválidas exibem mensagem de erro', async ({ page }) => {
    await page.getByPlaceholder('Usuário').fill('usuario_invalido_xyz');
    await page.getByPlaceholder('Senha').fill('senhaerrada000');
    await page.getByText('Entrar').click();
    // O app renderiza a mensagem de erro abaixo dos campos sem testID
    await expect(
      page.locator('text=/Usuário ou senha|Credencial|Não foi possível|inválid/i')
    ).toBeVisible({ timeout: 10_000 });
  });

  test('campos vazios exibem aviso de preenchimento', async ({ page }) => {
    await page.getByText('Entrar').click();
    await expect(page.locator('text=Preencha usuário e senha')).toBeVisible();
  });

  test('link "Criar conta" abre tela de registro', async ({ page }) => {
    await page.getByText('Criar conta').click();
    await expect(page.locator('text=DADOS PESSOAIS')).toBeVisible();
  });
});

test.describe('Registro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('btn-criar-conta').click();
    await expect(page.getByTestId('input-reg-nome')).toBeVisible();
  });

  test('registro completo exibe tela de sucesso', async ({ page }) => {
    const ts = Date.now();

    await page.getByTestId('input-reg-nome').fill(`Teste E2E ${ts}`);
    await page.getByTestId('input-reg-email').fill(`e2e${ts}@agrocontrol.test`);
    await page.getByTestId('input-reg-propriedade').fill(`Fazenda E2E ${ts}`);
    await page.getByTestId('input-reg-cidade').fill('Uberlândia');

    await page.getByTestId('btn-estado').click();
    await page.getByTestId('opcao-estado-mg').click();

    await page.getByTestId('input-reg-usuario').fill(`e2euser${ts}`);
    await page.getByTestId('input-reg-senha').fill('Teste@1234');
    await page.getByTestId('input-reg-confirma-senha').fill('Teste@1234');

    await page.getByTestId('btn-registrar').click();

    // tela de sucesso inline — RegisterScreen.tsx:139-140
    await expect(page.getByText('Cadastro realizado!')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Bem-vindo,/)).toBeVisible();
  });

  test('senha e confirmação divergentes exibem erro', async ({ page }) => {
    await page.getByTestId('input-reg-nome').fill('Usuário Teste');
    await page.getByTestId('input-reg-email').fill('teste@teste.com');
    await page.getByTestId('input-reg-propriedade').fill('Fazenda X');
    await page.getByTestId('input-reg-cidade').fill('São Paulo');

    await page.getByTestId('btn-estado').click();
    await page.getByTestId('opcao-estado-sp').click();

    // campo Usuário ainda sem testID — remover nth() após adicionar testID="input-reg-usuario"
    await page.locator('input').nth(4).fill('userteste123');

    await page.getByTestId('input-reg-senha').fill('Senha@123');
    await page.getByTestId('input-reg-confirma-senha').fill('SenhaDiferente@456');

    await page.getByTestId('btn-registrar').click();
    await expect(page.locator('text=Senhas não coincidem')).toBeVisible();
  });

  test('"Já tenho conta" volta para login', async ({ page }) => {
    await page.getByTestId('btn-ja-tenho-conta').click();
    // filtra pelo elemento visível — evita resolver para o login empilhado oculto
    await expect(page.locator('[data-testid="btn-entrar"]:visible')).toBeVisible();
  });
});

test.describe('Logout', () => {
  test('botão Sair retorna para tela de login', async ({ page }) => {
    // Faz login manualmente neste spec (sem storageState)
    await page.goto('/');
    await page.getByPlaceholder('Usuário').fill(USER);
    await page.getByPlaceholder('Senha').fill(PASS);
    await page.getByText('Entrar').click();
    await page.waitForSelector('[data-testid="home-screen"]', { timeout: 15_000 });

    await page.getByText('Sair').click();

    await expect(page.getByPlaceholder('Usuário')).toBeVisible({ timeout: 10_000 });
  });
});

/*
 * ── testIDs FALTANDO ─────────────────────────────────────────────────────────
 *
 * LoginScreen (src/screens/LoginScreen.tsx):
 *   - input Usuário        → adicionar testID="input-usuario" no TextInput (linha 99)
 *   - input Senha          → adicionar testID="input-senha" no TextInput (linha 119)
 *   - botão Entrar         → adicionar testID="btn-entrar" no TouchableOpacity (linha 141)
 *   - botão Criar conta    → adicionar testID="btn-criar-conta" no TouchableOpacity (linha 158)
 *   - texto de erro        → adicionar testID="erro-login" no Text (linha 135)
 *
 * RegisterScreen (src/screens/RegisterScreen.tsx):
 *   - TextInput nomeCompleto  → testID="input-nome-completo"
 *   - TextInput email         → testID="input-email"
 *   - TextInput nomeProp      → testID="input-nome-prop"
 *   - TextInput cidade        → testID="input-cidade"
 *   - seletor de estado       → testID="btn-selecionar-estado"
 *   - TextInput usuario       → testID="input-usuario-reg"
 *   - TextInput senha         → testID="input-senha-reg"
 *   - TextInput confirmarSenha → testID="input-confirmar-senha"
 *   - botão Cadastrar         → testID="btn-cadastrar"
 *   - tela de sucesso         → testID="registro-sucesso"
 */
