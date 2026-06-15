// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('API requer autenticação para /api/animais', async ({ request }) => {
  const response = await request.get('http://localhost:5249/api/animais');
  // Endpoint protegido — espera 400 ou 401 sem token
  expect([400, 401]).toContain(response.status());
});

test('Login retorna 401 com credenciais inválidas', async ({ request }) => {
  const response = await request.post('http://localhost:5249/api/auth/login', {
    data: { usuario: 'usuario_invalido_xyz', senha: 'senha_invalida_xyz' }
  });
  expect(response.status()).toBe(401);
});
