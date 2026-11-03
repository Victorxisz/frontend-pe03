import { test, expect } from '@playwright/test';

test('renova sessão ao restaurar, edita conta e revoga ao sair', async ({ page }) => {
  let refreshes = 0; let nome = 'Construtora';
  await page.addInitScript(() => { sessionStorage.setItem('pe03:access-token', 'expirado'); sessionStorage.setItem('pe03:refresh-token', 'renovacao'); });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname; const auth = route.request().headers().authorization;
    if (path === '/api/construtora/refresh/') { refreshes++; expect(auth).toBe('Bearer renovacao'); return route.fulfill({ json: { access_token: 'novo' } }); }
    if (auth === 'Bearer expirado') return route.fulfill({ status: 401, json: { msg: 'Token has expired' } });
    expect(auth).toBe('Bearer novo');
    if (path === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'abc', nome, email: 'a@b.com', telefone: null } } });
    if (path === '/api/construtora/abc' && route.request().method() === 'PATCH') { expect(route.request().postDataJSON()).toEqual({ nome: 'Nova' }); nome = 'Nova'; return route.fulfill({ json: { mensagem: 'Atualizada' } }); }
    if (path === '/api/construtora/logout/') return route.fulfill({ json: { mensagem: 'Saiu' } });
    throw new Error(path);
  });
  await page.goto('/configuracoes'); await expect(page.getByRole('heading', { name: 'Configurações' })).toBeVisible();
  await page.getByLabel('Nome', { exact: true }).fill('Nova'); await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Dados atualizados' })).toBeVisible();
  expect(refreshes).toBe(1); expect(await page.evaluate(() => sessionStorage.getItem('pe03:refresh-token'))).toBe('renovacao');
  await page.getByRole('button', { name: 'Sair', exact: true }).click(); await expect(page).toHaveURL(/login/);
  expect(await page.evaluate(() => sessionStorage.getItem('pe03:refresh-token'))).toBeNull();
});

test('cadastro público mostra bloqueio informado pelo servidor', async ({ page }) => {
  await page.route('**/api/construtora/', route => route.fulfill({ status: 403, json: { erro: 'Cadastro público de construtora indisponível' } }));
  await page.goto('/cadastro'); await page.getByLabel('Nome', { exact: true }).fill('Construtora'); await page.getByLabel('E-mail').fill('a@b.com'); await page.getByLabel('Senha', { exact: true }).fill('senha-segura');
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('cadastro público está indisponível');
});

test('exclusão exige confirmação e limpa a sessão após resposta', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'acesso'));
  let deletions = 0;
  await page.route('**/api/**', route => { const path = new URL(route.request().url()).pathname;
    if (path === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'abc', nome: 'Construtora', email: 'a@b.com' } } });
    if (path === '/api/construtora/abc') { deletions++; return route.fulfill({ json: { mensagem: 'Excluída' } }); } throw new Error(path);
  });
  await page.goto('/configuracoes'); await page.getByRole('button', { name: 'Excluir conta', exact: true }).click(); expect(deletions).toBe(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir conta' }).click(); await expect(page).toHaveURL(/login/); expect(deletions).toBe(1);
});
