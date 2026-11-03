import { test, expect } from '@playwright/test';

const path = '/obras/obra/marcos/marco/avancos/novo';
async function setup(page, { failFirst = false, wrongObra = false } = {}) {
  const state = { marcoReads: 0, legacyReads: 0, posts: [] };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'teste'));
  await page.route(`${process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'}/api/**`, route => {
    const request = route.request();
    const endpoint = new URL(request.url()).pathname.replace('/api', '');
    if (endpoint === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (endpoint === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa', entrega: {}, alertas: [] } });
    if (endpoint === '/marcos/marco') state.legacyReads++;
    if (endpoint === '/obras/obra/marcos/marco') {
      state.marcoReads++;
      if (failFirst && state.marcoReads === 1) return route.fulfill({ status: 503, json: { mensagem: 'Consulta temporariamente indisponível' } });
      return route.fulfill({ json: { id: 'marco', obra_id: wrongObra ? 'outra' : 'obra', nome: 'Fundação' } });
    }
    if (endpoint === '/marcos/marco/avancos' && request.method() === 'POST') {
      state.posts.push({ body: request.postData(), headers: request.headers() });
      return route.fulfill({ status: 201, json: { id: 'novo', obra_id: 'obra', marco_id: 'marco', estado: 'rascunho' } });
    }
    return route.fulfill({ status: 404, json: { mensagem: 'Não encontrado' } });
  });
  return state;
}

test('consulta marco pela obra e envia o cadastro com evidência como rascunho', async ({ page }) => {
  const state = await setup(page);
  await page.goto(path);
  await expect(page.getByText('Marco: Fundação', { exact: true })).toBeVisible();
  await page.getByLabel('Data do trabalho').fill('2026-11-02');
  await page.getByLabel('Descrição', { exact: true }).fill('Concretagem da fundação');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByText('Adicione ao menos uma evidência. O rascunho não será salvo sem mídia.')).toBeVisible();
  expect(state.posts).toHaveLength(0);
  await page.locator('input[type="file"]').setInputFiles({ name: 'fundacao.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page).toHaveURL('/obras/obra/avancos/novo');
  expect(state.legacyReads).toBe(0);
  expect(state.posts).toHaveLength(1);
  expect(state.posts[0].headers['content-type']).toContain('multipart/form-data');
  expect(state.posts[0].headers['idempotency-key']).toBeTruthy();
  expect(state.posts[0].body).toContain('Concretagem da fundação');
  expect(state.posts[0].body).toContain('2026-11-02');
  expect(state.posts[0].body).toContain('fundacao.png');
});

test('tentar novamente recupera a consulta e abre o formulário', async ({ page }) => {
  const state = await setup(page, { failFirst: true });
  await page.goto(path);
  await expect(page.getByRole('alert')).toContainText('Consulta temporariamente indisponível');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByLabel('Descrição', { exact: true })).toBeVisible();
  expect(state.marcoReads).toBe(2);
  expect(state.legacyReads).toBe(0);
});

test('não permite registrar em marco pertencente a outra obra', async ({ page }) => {
  await setup(page, { wrongObra: true });
  await page.goto(path);
  await expect(page.getByRole('alert')).toContainText('Marco não encontrado nesta obra.');
  await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toHaveCount(0);
});
