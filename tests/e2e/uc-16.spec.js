import { test, expect } from '@playwright/test';

const path = '/obras/obra-teste/ocorrencias/ocorrencia-teste/aceitacoes';
const acceptancePath = '/api/ocorrencias/ocorrencia-teste/aceitacoes';

async function setup(page, options = {}) {
  const state = { occurrence: { id: 'ocorrencia-teste', titulo: 'Infiltração', estado: 'sem solução' }, items: [], posts: [], failPostOnce: false, ...options };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(); const url = new URL(req.url()); const pathname = url.pathname;
    const json = (body, status = 200) => route.fulfill({ status, json: body });
    if (pathname === '/api/sessoes/atual') return json({ construtora: { id: 'conta', nome: 'Construtora' } });
    if (pathname === '/api/obras/obra-teste') return json({ id: 'obra-teste', nome: 'Obra teste', estado: 'planejada' });
    if (pathname === '/api/ocorrencias/ocorrencia-teste' && req.method() === 'GET') return json(state.occurrence);
    if (pathname === acceptancePath && req.method() === 'GET') return json(state.items);
    if (pathname === acceptancePath && req.method() === 'POST') {
      const body = req.postDataJSON(); const key = req.headers()['idempotency-key'];
      state.posts.push({ body, key });
      if (state.failPostOnce) { state.failPostOnce = false; return route.abort(); }
      if (!state.occurrence.estado || state.occurrence.estado !== 'sem solução') return json({ mensagem: 'Somente ocorrência sem solução pode ser aceita', campos: ['estado'] }, 409);
      const prior = state.items.find((item) => item.chave_reenvio === key);
      if (prior) return json(prior, 200);
      const item = { ...body, autor: 'conta-teste', data: '2026-11-02T12:00:00Z', chave_reenvio: key };
      state.items.push(item);
      return json(item, 201);
    }
    throw new Error(`Endpoint inesperado: ${req.method()} ${pathname}`);
  });
  return state;
}

test('aceita sem medida, não muda estado e preserva histórico após recarga', async ({ page }) => {
  const state = await setup(page);
  await page.goto(path);
  await expect(page.getByRole('region', { name: 'Estado atual da ocorrência' })).toContainText('sem solução');
  await page.getByRole('textbox', { name: 'Justificativa' }).fill('A limitação estrutural foi documentada.');
  await page.getByRole('button', { name: 'Revisar aceitação' }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  expect(state.posts).toHaveLength(0);
  await page.getByRole('button', { name: 'Revisar aceitação' }).click();
  await page.getByRole('button', { name: 'Registrar decisão' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Nova decisão registrada' })).toBeVisible();
  expect(state.occurrence.estado).toBe('sem solução');
  expect(state.posts[0].body).toEqual({ justificativa: 'A limitação estrutural foi documentada.' });
  await expect(page.getByRole('region', { name: 'Histórico de aceitações' })).toContainText('conta-teste');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Histórico de aceitações' })).toContainText('A limitação estrutural foi documentada.');
});

test('timeout mantém chave e conteúdo entre recarga e reenvio', async ({ page }) => {
  const state = await setup(page, { failPostOnce: true });
  await page.goto(path);
  await page.getByRole('textbox', { name: 'Justificativa' }).fill('Revisão trimestral definida.');
  await page.getByRole('button', { name: 'Revisar aceitação' }).click();
  await page.getByRole('button', { name: 'Registrar decisão' }).click();
  await expect(page.getByRole('alert')).toContainText('Reenvie esta mesma decisão');
  const first = state.posts[0];
  await page.reload();
  await expect(page.getByRole('button', { name: 'Reenviar para confirmar resultado' })).toBeVisible();
  await page.getByRole('button', { name: 'Reenviar para confirmar resultado' }).click();
  expect(state.posts[1]).toEqual(first);
  await expect(page.getByRole('status').filter({ hasText: 'Nova decisão registrada' })).toBeVisible();
});

test('campo compensatório vazio é omitido e estado incompatível impede nova decisão', async ({ page }) => {
  const state = await setup(page);
  await page.goto(path);
  await page.getByRole('textbox', { name: 'Justificativa' }).fill('Decisão registrada sem medida.');
  await page.getByRole('textbox', { name: 'Medida compensatória (opcional)' }).fill('   ');
  await page.getByRole('button', { name: 'Revisar aceitação' }).click();
  await page.getByRole('button', { name: 'Registrar decisão' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Nova decisão registrada' })).toBeVisible();
  expect(state.posts[0].body).toEqual({ justificativa: 'Decisão registrada sem medida.' });
  state.occurrence.estado = 'resolvida';
  await page.reload();
  await expect(page.getByText(/Uma nova aceitação só pode ser registrada/)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Justificativa' })).toHaveCount(0);
});
