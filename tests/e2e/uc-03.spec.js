import { test, expect } from '@playwright/test';

const obras = [
  { id: 'casa-aurora', nome: 'Casa Aurora', tipo: 'casa', cliente: 'Marina Costa', localizacao: 'Campinas, SP', descricao: 'Residência com dois pavimentos.', inicio: '2025-01-10', entrega: { modalidade: 'data_exata', data: '2025-12-20' }, estado: 'em andamento', alertas: ['atrasada'] },
  { id: 'residencial-ipe', nome: 'Residencial Ipê', tipo: 'apartamentos', cliente: 'Incorporadora Horizonte', localizacao: 'São Paulo, SP', descricao: 'Edifício residencial.', inicio: '2024-01-01', entrega: { modalidade: 'intervalo_estimado', inicio: '2025-11-01', fim: '2025-12-31' }, estado: 'concluída', alertas: [], data_conclusao: '2025-12-15' },
  { id: 'casa-legada', nome: 'Casa das Palmeiras', tipo: 'casa', cliente: 'Pedro Lima', localizacao: 'Santos, SP', descricao: 'Cadastro legado.', inicio: '2023-01-01', entrega: { modalidade: 'data_exata', data: '2023-12-01' }, estado: 'concluída', alertas: [] },
];

async function mockApi(page, options = {}) {
  const state = { lists: [], details: [], ...options };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    expect(route.request().method()).toBe('GET');
    if (path === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Horizonte Construções' } } });
    if (path === '/api/obras') {
      state.lists.push(url.searchParams);
      if (state.list) return state.list(route, url.searchParams);
      return route.fulfill({ json: { obras, situacao: 'com_resultados', filtros_aplicados: Object.fromEntries(url.searchParams) } });
    }
    if (path.startsWith('/api/obras/')) {
      const id = decodeURIComponent(path.slice('/api/obras/'.length));
      state.details.push(id);
      if (state.detail) return state.detail(route, id);
      const obra = obras.find((obra) => obra.id === id);
      return route.fulfill({ status: obra ? 200 : 404, json: obra || { mensagem: 'Obra não encontrada' } });
    }
    throw new Error(`Endpoint inesperado: ${path}`);
  });
  return state;
}

async function apply(page) { await page.getByRole('button', { name: 'Aplicar filtros', exact: true }).click(); }
async function cards(page) { await expect(page.getByRole('status')).toHaveText('3 obras encontradas'); }

test.describe('FE-UC-03 — lista, filtros e contexto da obra', () => {
  test.skip(process.env.E2E_REAL === '1', 'API controlada; não comprova Atlas/EC2');
  test.use({ timezoneId: 'America/Sao_Paulo' });

  test('cartões mostram dados da API, estado e atraso separados; layout desktop e mobile', async ({ page }, testInfo) => {
    await mockApi(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/obras');
    await cards(page);
    const casa = page.getByRole('article').filter({ hasText: 'Casa Aurora' });
    await expect(casa).toContainText('Marina Costa');
    await expect(casa).toContainText('Data exata: 20/12/2025');
    await expect(casa.getByText('Em andamento', { exact: true })).toBeVisible();
    await expect(casa.getByText('Atrasada', { exact: true })).toBeVisible();
    const concluida = page.getByRole('article').filter({ hasText: 'Residencial Ipê' });
    await expect(concluida).toContainText('Intervalo estimado: 01/11/2025 a 31/12/2025');
    await expect(concluida.getByText('Atrasada', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('article').filter({ hasText: 'Casa das Palmeiras' }).getByText('Atrasada', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('painel-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: 'Aplicar filtros' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('painel-mobile.png'), fullPage: true });
  });

  test('combina todos os filtros uma vez, omite vazios e mantém textos literais', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto('/obras');
    await cards(page);
    await page.getByLabel('Nome da obra', { exact: true }).fill(' Aurora [A].* ');
    await page.getByLabel('Cliente de referência', { exact: true }).fill('Marina');
    await page.getByLabel('Estado da obra', { exact: true }).selectOption('em andamento');
    await page.getByLabel('Somente obras atrasadas').check();
    await page.getByText('Filtrar por datas', { exact: true }).click();
    const dates = { entregaDe: ['Entrega a partir de', '2025-12-20'], entregaAte: ['Entrega até', '2025-12-20'], registroDe: ['Registro a partir de', '2024-01-01'], registroAte: ['Registro até', '2026-11-02'] };
    for (const [, [label, value]] of Object.entries(dates)) await page.getByLabel(label, { exact: true }).fill(value);
    expect(state.lists).toHaveLength(1);
    await apply(page);
    await expect(page.getByRole('button', { name: /Remover filtro Nome da obra/ })).toBeVisible();
    const query = state.lists.at(-1);
    expect(Object.fromEntries(query)).toEqual({ nome: 'Aurora [A].*', cliente: 'Marina', estado: 'em andamento', alerta: 'atrasada', entregaDe: '2025-12-20', entregaAte: '2025-12-20', registroDe: '2024-01-01', registroAte: '2026-11-02' });
    for (const key of query.keys()) expect(query.getAll(key)).toHaveLength(1);
    // O frontend apresenta a resposta sem refiltrar, ordenar ou calcular atraso.
    await cards(page);
    await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
    await expect(page).toHaveURL('/obras');
    await cards(page);
    expect([...state.lists.at(-1)]).toEqual([]);
    await expect(page.getByLabel('Somente obras atrasadas')).not.toBeChecked();
  });

  for (const [campo, valor] of Object.entries({ nome: 'Aurora', cliente: 'Marina', estado: 'suspensa', alerta: 'atrasada', entregaDe: '2025-01-01', entregaAte: '2025-12-31', registroDe: '2024-01-01', registroAte: '2026-11-02' })) {
    test(`filtro isolado na URL: ${campo}`, async ({ page }) => {
      const state = await mockApi(page);
      await page.goto(`/obras?${new URLSearchParams({ [campo]: valor })}`);
      await cards(page);
      expect(Object.fromEntries(state.lists.at(-1))).toEqual({ [campo]: valor });
      await page.getByRole('button', { name: /Remover filtro/ }).click();
      await expect(page).toHaveURL('/obras');
      await cards(page);
      expect([...state.lists.at(-1)]).toEqual([]);
    });
  }

  test('vazios são omitidos inclusive alerta', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto('/obras?nome=++&cliente=&estado=&alerta=&entregaDe=&registroAte=');
    await cards(page);
    expect([...state.lists.at(-1)]).toEqual([]);
  });

  test('retorno, abas e recarga preservam busca; detalhe mostra conclusão somente se existente', async ({ page }) => {
    const state = await mockApi(page);
    const search = new URLSearchParams({ cliente: 'Horizonte', estado: 'concluída' }).toString();
    await page.goto(`/obras?${search}`);
    await cards(page);
    await page.reload();
    await cards(page);
    await expect(page.getByLabel('Estado da obra', { exact: true })).toHaveValue('concluída');
    await page.getByRole('link', { name: 'Residencial Ipê', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Residencial Ipê', exact: true })).toBeVisible();
    const detail = page.getByRole('region', { name: 'Cadastro da obra' });
    await expect(detail).toContainText('Edifício residencial.');
    await expect(detail).toContainText('01/01/2024');
    await expect(detail).toContainText('Conclusão efetiva');
    await expect(detail).toContainText('15/12/2025');
    await page.getByRole('link', { name: 'Histórico', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/historico\\?busca=`));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Residencial Ipê', exact: true })).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Painel das Obras', exact: true }).click();
    await expect(page).toHaveURL(`/obras?${search}`);
    await cards(page);
    await expect(page.getByLabel('Cliente de referência', { exact: true })).toHaveValue('Horizonte');
    await expect(page.getByLabel('Estado da obra', { exact: true })).toHaveValue('concluída');
    expect(state.details.filter((id) => id === 'residencial-ipe').length).toBeGreaterThan(1);
    await page.getByRole('link', { name: 'Casa das Palmeiras', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Casa das Palmeiras', exact: true })).toBeVisible();
    await expect(page.getByText('Conclusão efetiva', { exact: true })).toHaveCount(0);
  });

  for (const situacao of ['lista_vazia', 'sem_resultados']) {
    test(`estado vazio distinto: ${situacao}`, async ({ page }) => {
      await mockApi(page, { list: (route, params) => route.fulfill({ json: { obras: [], situacao, filtros_aplicados: Object.fromEntries(params) } }) });
      await page.goto(situacao === 'lista_vazia' ? '/obras' : '/obras?nome=Inexistente');
      await expect(page.getByRole('heading', { name: situacao === 'lista_vazia' ? 'Nenhuma obra cadastrada' : 'Nenhuma obra encontrada', exact: true })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
    });
  }

  test('datas invertidas indicam campo e não disparam busca', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto('/obras');
    await cards(page);
    await page.getByText('Filtrar por datas', { exact: true }).click();
    await page.getByLabel('Entrega a partir de', { exact: true }).fill('2025-12-21');
    await page.getByLabel('Entrega até', { exact: true }).fill('2025-12-20');
    await apply(page);
    await expect(page.getByRole('alert')).toContainText('Revise os filtros indicados');
    await expect(page.getByLabel('Entrega até', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    expect(state.lists).toHaveLength(1);
  });

  test('URL com filtros repetidos é corrigível e nunca envia repetidos à API', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto('/obras?estado=planejada&estado=suspensa');
    await expect(page.getByRole('alert')).toContainText('filtros repetidos');
    expect(state.lists).toHaveLength(0);
    await apply(page);
    await cards(page);
    expect([...state.lists.at(-1)]).toEqual([['estado', 'planejada']]);
  });

  for (const status of [422, 500]) {
    test(`erro ${status} mantém URL e não apresenta lista vazia`, async ({ page }) => {
      const state = await mockApi(page, { list: (route) => route.fulfill({ status, json: { mensagem: status === 422 ? 'Filtro inválido' : 'Falha ao consultar obras', campos: status === 422 ? ['registroAte'] : [] } }) });
      await page.goto('/obras?registroAte=2025-12-20');
      await expect(page.getByRole('alert')).toContainText(status === 422 ? 'Filtro inválido' : 'Falha ao consultar obras');
      await expect(page.getByText('Nenhuma obra cadastrada', { exact: true })).toHaveCount(0);
      await expect(page.getByText('Nenhuma obra encontrada', { exact: true })).toHaveCount(0);
      if (status === 422) await expect(page.getByLabel('Registro até', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      state.list = null;
      await page.getByRole('button', { name: status === 422 ? 'Aplicar filtros' : 'Tentar novamente', exact: true }).click();
      await cards(page);
      await expect(page).toHaveURL('/obras?registroAte=2025-12-20');
    });
  }

  test('duas buscas fora de ordem nunca misturam resultados', async ({ page }) => {
    // Ignorar o cancelamento no transporte força a resposta antiga a chegar:
    // a proteção de estado ainda deve descartá-la.
    await page.addInitScript(() => {
      const original = window.fetch;
      window.fetch = (url, options = {}) => original(url, String(url).includes('/api/obras?') ? { ...options, signal: undefined } : options);
    });
    let release;
    await mockApi(page, { list: async (route, params) => {
      const old = params.get('nome') === 'Antiga';
      if (old) await new Promise((resolve) => { release = resolve; });
      return route.fulfill({ json: { obras: old ? [obras[0]] : [obras[1]], situacao: 'com_resultados', filtros_aplicados: Object.fromEntries(params) } });
    } });
    await page.goto('/obras');
    await expect(page.getByRole('link', { name: 'Residencial Ipê', exact: true })).toBeVisible();
    await page.getByLabel('Nome da obra', { exact: true }).fill('Antiga');
    await apply(page);
    await expect.poll(() => Boolean(release)).toBe(true);
    await page.getByLabel('Nome da obra', { exact: true }).fill('Nova');
    await apply(page);
    await expect(page.getByRole('link', { name: 'Residencial Ipê', exact: true })).toBeVisible();
    const oldResponse = page.waitForResponse((response) => response.url().includes('nome=Antiga'));
    release();
    await (await oldResponse).finished();
    await expect(page.getByRole('link', { name: 'Casa Aurora', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Remover filtro Nome da obra: Nova/ })).toBeVisible();
  });

  test('troca rápida de obra ignora detalhe antigo e remove cabeçalho anterior', async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.fetch;
      window.fetch = (url, options = {}) => original(url, String(url).includes('/api/obras/') ? { ...options, signal: undefined } : options);
    });
    let release;
    await mockApi(page, { detail: async (route, id) => {
      if (id === 'casa-aurora') await new Promise((resolve) => { release = resolve; });
      return route.fulfill({ json: obras.find((obra) => obra.id === id) });
    } });
    await page.goto('/obras/casa-aurora/marcos');
    await expect.poll(() => Boolean(release)).toBe(true);
    await page.evaluate(() => { history.pushState(null, '', '/obras/residencial-ipe/marcos'); dispatchEvent(new PopStateEvent('popstate')); });
    await expect(page.getByRole('heading', { name: 'Residencial Ipê', exact: true })).toBeVisible();
    const oldResponse = page.waitForResponse((response) => response.url().endsWith('/obras/casa-aurora'));
    release();
    await (await oldResponse).finished();
    await expect(page.getByRole('heading', { name: 'Casa Aurora', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Residencial Ipê', exact: true })).toBeVisible();
  });

  for (const status of [400, 404, 500]) {
    test(`detalhe ${status} não mantém obra anterior`, async ({ page }) => {
      const state = await mockApi(page);
      await page.goto('/obras/casa-aurora/marcos');
      await expect(page.getByRole('heading', { name: 'Casa Aurora', exact: true })).toBeVisible();
      state.detail = (route) => route.fulfill({ status, json: { mensagem: 'Não foi possível consultar este cadastro' } });
      await page.evaluate(() => { history.pushState(null, '', '/obras/ausente/marcos'); dispatchEvent(new PopStateEvent('popstate')); });
      await expect(page.getByRole('alert')).toContainText('Não foi possível consultar este cadastro');
      await expect(page.getByRole('heading', { name: 'Casa Aurora', exact: true })).toHaveCount(0);
      await expect(page.getByRole('region', { name: 'Cadastro da obra' })).toHaveCount(0);
      await expect(page.getByRole('navigation', { name: 'Seções da obra' })).toHaveCount(0);
    });
  }
});
