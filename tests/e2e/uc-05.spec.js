import { test, expect } from '@playwright/test';

const obraId = '111111111111111111111111';
const outraId = '222222222222222222222222';
const marcoId = '333333333333333333333333';
const base = `/obras/${obraId}/marcos`;
const marco = { id: marcoId, obra_id: obraId, nome: 'Fundação', descricao: 'Fundação concluída e conferida.', inicio_previsto: '2030-02-01', fim_previsto: '2030-02-15', estado: 'a iniciar', versao: 7 };
async function mockApi(page, options = {}) {
  const state = { records: options.empty ? [] : [marco], posts: [], lists: 0, details: 0 };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    if (path === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Horizonte Construções' } } });
    if (/^\/api\/marcos\/[^/]+\/dependencias$/.test(path)) return route.fulfill({ json: [] });
    if (/^\/api\/obras\/[^/]+\/mudancas$/.test(path)) return route.fulfill({ json: { mudancas: [] } });
    const match = path.match(/^\/api\/obras\/([^/]+)(?:\/marcos(?:\/([^/]+))?)?$/);
    if (!match) throw new Error(`Endpoint inesperado: ${method} ${path}`);
    const [, obra, id] = match;
    if (!path.includes('/marcos')) return route.fulfill({ json: { id: obra, nome: obra === obraId ? 'Casa Aurora' : 'Casa Ipê', localizacao: 'Campinas, SP', estado: 'planejada', alertas: [], entrega: { modalidade: 'data_exata', data: '2030-12-01' } } });
    if (method === 'POST') {
      state.posts.push(route.request().postDataJSON());
      if (options.create) return options.create(route, state);
      const created = { ...marco, ...state.posts.at(-1), obra_id: obra };
      state.records.push(created);
      return route.fulfill({ status: 201, json: created });
    }
    if (id) {
      state.details++;
      if (options.detail) return options.detail(route, obra, id);
      const record = state.records.find((item) => item.id === id && item.obra_id === obra);
      return route.fulfill({ status: record ? 200 : 404, json: record || { mensagem: 'Marco não encontrado' } });
    }
    state.lists++;
    if (options.list) return options.list(route, obra, state);
    return route.fulfill({ json: state.records.filter((item) => item.obra_id === obra).map(({ obra_id, ...item }) => item) });
  });
  return state;
}
async function preencher(page, fim = '2030-02-15') {
  await page.getByLabel('Nome do marco', { exact: true }).fill(' Fundação ');
  await page.getByLabel('Descrição', { exact: true }).fill(' Fundação concluída e conferida. ');
  await page.getByLabel('Início previsto', { exact: true }).fill('2030-02-01');
  await page.getByLabel('Fim previsto', { exact: true }).fill(fim);
}

test.describe('FE-UC-05 — criar e consultar marcos', () => {
  test.skip(process.env.E2E_REAL === '1', 'API controlada; não comprova Atlas/EC2');
  test('array, detalhe direto, recarga e links preservam contexto', async ({ page }, testInfo) => {
    const state = await mockApi(page);
    await page.goto(`${base}?busca=nome%3DAurora`);
    await expect(page.getByRole('article')).toContainText('Fundação');
    await page.screenshot({ path: testInfo.outputPath('marcos-lista-desktop.png'), fullPage: true });
    await page.getByRole('link', { name: 'Fundação', exact: true }).click();
    await expect(page).toHaveURL(`${base}/${marcoId}?busca=nome%3DAurora`);
    await expect(page.getByRole('heading', { name: 'Fundação', exact: true })).toBeVisible();
    await expect(page.getByText('01/02/2030', { exact: true })).toBeVisible();
    await expect(page.locator('.section-heading').getByText('A iniciar', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dependências/ })).toHaveAttribute('href', `${base}/${marcoId}/dependencias?busca=nome%3DAurora`);
    await expect(page.getByRole('link', { name: /Avanços e evidências/ })).toHaveAttribute('href', `${base}/${marcoId}/avancos?busca=nome%3DAurora`);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Fundação', exact: true })).toBeVisible();
    expect(state.details).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: testInfo.outputPath('marco-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('marco-mobile.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
  test('201 abre detalhe, reconsulta lista e envia apenas campos permitidos', async ({ page }, testInfo) => {
    const state = await mockApi(page, { empty: true });
    await page.goto(base);
    await expect(page.getByRole('heading', { name: 'Nenhum marco cadastrado' })).toBeVisible();
    await page.getByRole('link', { name: 'Criar primeiro marco' }).click();
    await preencher(page, '2030-02-01');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    await page.screenshot({ path: testInfo.outputPath('marco-cadastro-mobile.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Salvar marco', exact: true }).click();
    await expect(page).toHaveURL(`${base}/${marcoId}`);
    await expect(page.getByRole('heading', { name: 'Fundação', exact: true })).toBeVisible();
    await expect.poll(() => state.lists).toBeGreaterThanOrEqual(2);
    expect(state.posts).toEqual([{ nome: 'Fundação', descricao: 'Fundação concluída e conferida.', inicio_previsto: '2030-02-01', fim_previsto: '2030-02-01' }]);
    await page.getByRole('link', { name: 'Marcos da obra', exact: true }).click();
    await expect(page.getByRole('article')).toContainText('Fundação');
  });
  test('campos vazios e período invertido não salvam; cancelar não envia POST', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto(`${base}/novo`);
    await page.getByRole('button', { name: 'Salvar marco', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Revise os campos');
    await preencher(page, '2030-01-31');
    await page.getByRole('button', { name: 'Salvar marco', exact: true }).click();
    await expect(page.getByText('O fim deve ser maior ou igual ao início previsto.')).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(base);
    expect(state.posts).toHaveLength(0);
  });
  test('lista vazia, falha de banco e resposta com envelope são diferentes; nova tentativa', async ({ page }) => {
    let mode = 'error';
    await mockApi(page, { list: (route) => route.fulfill(mode === 'error' ? { status: 500, json: { mensagem: 'Não foi possível consultar os marcos da obra' } } : { json: mode === 'envelope' ? { marcos: [] } : [] }) });
    await page.goto(base);
    await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
    await expect(page.getByRole('heading', { name: 'Nenhum marco cadastrado' })).toHaveCount(0);
    mode = 'envelope';
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByRole('alert')).toContainText('interpretar a lista');
    mode = 'empty';
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByRole('heading', { name: 'Nenhum marco cadastrado' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
  for (const status of [400, 404, 500]) test(`detalhe trata ${status} sem exibir dados de outra obra`, async ({ page }) => {
    await mockApi(page, { detail: (route) => route.fulfill({ status, json: { mensagem: 'Consulta rejeitada' } }) });
    await page.goto(`${base}/${marcoId}`);
    await expect(page.getByRole('alert')).toContainText('Consulta rejeitada');
    await expect(page.getByRole('heading', { name: 'Fundação', exact: true })).toHaveCount(0);
  });
  for (const status of [400, 404, 422, 500]) test(`cadastro trata ${status} e preserva formulário`, async ({ page }) => {
    await mockApi(page, { create: (route) => route.fulfill({ status, json: { mensagem: 'Cadastro rejeitado', campos: ['nome'] } }) });
    await page.goto(`${base}/novo`);
    await preencher(page);
    await page.getByRole('button', { name: 'Salvar marco', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Cadastro rejeitado');
    await expect(page.getByLabel('Nome do marco', { exact: true })).toHaveValue(' Fundação ');
    if (status === 422) await expect(page.getByLabel('Nome do marco', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(`${base}/novo`);
  });
  test('alterar obra na URL oculta marco anterior e rejeita vínculo incorreto até com 200', async ({ page }) => {
    await mockApi(page, { detail: (route) => route.fulfill({ json: marco }) });
    await page.goto(`${base}/${marcoId}`);
    await expect(page.getByRole('heading', { name: 'Fundação', exact: true })).toBeVisible();
    await page.goto(`/obras/${outraId}/marcos/${marcoId}`);
    await expect(page.getByRole('alert')).toContainText('Marco não encontrado nesta obra');
    await expect(page.getByRole('heading', { name: 'Fundação', exact: true })).toHaveCount(0);
  });
  test('navegação rápida não reapresenta resposta atrasada da obra anterior', async ({ page }) => {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    let started = false;
    await mockApi(page, { list: async (route, obra) => {
      if (obra === obraId) { started = true; await gate; return route.fulfill({ json: [marco] }).catch(() => {}); }
      return route.fulfill({ json: [] });
    } });
    await page.goto(base);
    await expect.poll(() => started).toBe(true);
    // Navegar pela história preserva o mesmo Router e exercita cleanup/AbortController.
    await page.evaluate((url) => { history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate')); }, `/obras/${outraId}/marcos`);
    await expect(page.getByRole('heading', { name: 'Nenhum marco cadastrado' })).toBeVisible();
    release();
    await expect(page.getByRole('heading', { name: 'Casa Ipê', exact: true })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(0);
  });
});
