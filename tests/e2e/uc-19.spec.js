import { test, expect } from '@playwright/test';

test.skip(process.env.E2E_REAL === '1', 'Testes isolados de contrato, sem gravar cadastros reais.');
const base = '/obras/obra/trabalhadores';
const worker = (overrides = {}) => ({ id: 'pessoa', nome: 'João Silva', cargo: 'pedreiro', email: 'joao@exemplo.com',
  telefone: '11999998888', obras: ['obra'], ativo: true, data_cadastro: 'Mon, 02 Nov 2026 15:30:00 GMT', ...overrides });

async function setup(page, options = {}) {
  const state = { items: [], posts: [], gets: [], status: 201, ...options };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-uc19'));
  await page.route(`${process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'}/api/**`, async route => {
    const req = route.request(); const path = new URL(req.url()).pathname.replace('/api', '');
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra' || path === '/obras/outra') return route.fulfill({ json: { id: path.split('/').at(-1), nome: 'Residencial Aurora', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/marcos') return route.fulfill({ json: [] });
    if (path === '/trabalhadores/obra/obra/' && req.method() === 'POST') {
      state.posts.push({ path, body: req.postDataJSON(), auth: req.headers().authorization });
      if (state.status !== 201) return route.fulfill({ status: state.status, json: { erro: 'Cadastro recusado pelo servidor' } });
      const sent = state.posts.at(-1).body;
      const item = worker({ ...sent, cargo: sent.cargo.toLowerCase(), telefone: sent.telefone.replace(/[^0-9]/g, '') });
      state.items.push(item);
      if (state.lost) return route.abort();
      return route.fulfill({ status: 201, headers: { Location: '/trabalhadores/pessoa/' }, json: state.incomplete ? { mensagem: 'ok' } : { mensagem: 'Criado', id: item.id, obra_id: 'obra' } });
    }
    if (path === '/trabalhadores/obra/obra/' || path === '/trabalhadores/obra/outra/') {
      state.gets.push(path);
      if (state.listStatus) return route.fulfill({ status: state.listStatus, json: { erro: 'Consulta indisponível' } });
      return route.fulfill({ json: path.includes('/outra/') ? [] : state.items });
    }
    if (path === '/trabalhadores/pessoa/') {
      state.gets.push(path);
      if (state.detailStatus) return route.fulfill({ status: state.detailStatus, json: { erro: 'Detalhe indisponível' } });
      return route.fulfill({ json: state.items.find(item => item.id === 'pessoa') || worker() });
    }
    return route.fulfill({ status: 404, json: { erro: 'Não encontrado' } });
  });
  return state;
}
async function fill(page) {
  await page.getByRole('textbox', { name: 'Nome completo' }).fill('  João Silva  ');
  await page.getByRole('textbox', { name: 'Cargo', exact: true }).fill(' Pedreiro ');
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('joao@exemplo.com');
  await page.getByRole('textbox', { name: 'Telefone com DDD' }).fill('(11) 99999-8888');
}
const submit = page => page.getByRole('button', { name: 'Cadastrar trabalhador', exact: true }).click();

test('cadastro usa contrato autenticado, consulta detalhe, recarrega lista e habilita responsável', async ({ page }) => {
  const state = await setup(page);
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Nenhum trabalhador nesta obra' })).toBeVisible();
  await page.getByRole('link', { name: 'Cadastrar trabalhador', exact: true }).click();
  await fill(page); await submit(page);
  await expect(page).toHaveURL(`${base}/pessoa`);
  await expect(page.getByText('Trabalhador cadastrado. Dados confirmados pelo servidor.')).toBeVisible();
  await expect(page.getByText('(11) 99999-8888', { exact: true })).toBeVisible();
  await expect(page.getByText('02/11/2026 : 12:30')).toBeVisible();
  await expect(page.getByText('pedreiro', { exact: true })).toBeVisible();
  expect(state.posts).toEqual([{ path: '/trabalhadores/obra/obra/', auth: 'Bearer token-uc19',
    body: { nome: 'João Silva', email: 'joao@exemplo.com', cargo: 'Pedreiro', telefone: '(11) 99999-8888' } }]);
  expect(state.gets).toContain('/trabalhadores/pessoa/');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'João Silva' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à equipe' }).click();
  await expect(page.getByRole('heading', { name: 'João Silva' })).toBeVisible();
  await page.goto('/obras/outra/trabalhadores');
  await expect(page.getByRole('heading', { name: 'Nenhum trabalhador nesta obra' })).toBeVisible();
  await page.goto('/obras/obra/ocorrencias/nova');
  await expect(page.getByRole('combobox', { name: 'Responsável (opcional)' })).toBeEnabled();
  await page.getByRole('combobox', { name: 'Responsável (opcional)' }).selectOption('pessoa');
  expect(state.posts).toHaveLength(1);
});

test('obrigatórios, foco e erros associados; cancelar não envia POST', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/novo`); await submit(page);
  await expect(page.getByRole('textbox', { name: 'Nome completo' })).toBeFocused();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
  await expect(page.getByRole('textbox', { name: 'Nome completo' })).toHaveAttribute('aria-describedby', 'erro-nome');
  await page.getByRole('link', { name: 'Cancelar', exact: true }).click();
  await expect(page).toHaveURL(base); expect(state.posts).toHaveLength(0);
});

for (const [field, value] of [['E-mail', 'invalido'], ['Telefone com DDD', '+55 11 99999-8888'], ['Telefone com DDD', '123'], ['Nome completo', '   '], ['Cargo', '   ']]) {
  test(`rejeita ${field}: ${value}`, async ({ page }) => {
    const state = await setup(page); await page.goto(`${base}/novo`); await fill(page);
    await page.getByRole('textbox', { name: field, exact: true }).fill(value); await submit(page);
    await expect(page.getByRole('alert')).toBeVisible(); expect(state.posts).toHaveLength(0);
  });
}

test('busca local por nome/cargo ignora acentos e não inclui outra obra', async ({ page }) => {
  const state = await setup(page, { items: [worker(), worker({ id: 'outro', nome: 'Maria', cargo: 'eletricista' }), worker({ id: 'fora', nome: 'Carlos', obras: ['outra'] })] });
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'Carlos' })).toHaveCount(0);
  const search = page.getByRole('searchbox', { name: 'Buscar por nome ou cargo nesta obra' });
  await search.fill('joao'); await expect(page.getByRole('heading', { name: 'João Silva' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Maria', exact: true })).toHaveCount(0);
  await search.fill('eletricista'); await expect(page.getByRole('heading', { name: 'Maria', exact: true })).toBeVisible();
  await search.fill('inexistente'); await expect(page.getByRole('heading', { name: 'Nenhum resultado para esta busca' })).toBeVisible();
  expect(state.gets.every(path => path === '/trabalhadores/obra/obra/')).toBe(true);
});

for (const status of [400, 404, 422, 503]) test(`POST ${status} não anuncia sucesso`, async ({ page }) => {
  const state = await setup(page, { status }); await page.goto(`${base}/novo`); await fill(page); await submit(page);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Trabalhador cadastrado.', { exact: false })).toHaveCount(0);
  const button = page.getByRole('button', { name: 'Cadastrar trabalhador', exact: true });
  if (status === 503) await expect(button).toBeDisabled();
  else await expect(button).toBeEnabled();
  expect(state.posts).toHaveLength(1);
});

for (const options of [{ lost: true }, { incomplete: true }]) test(`resposta ${options.lost ? 'perdida' : 'incompleta'} exige consulta inclusive após recarga`, async ({ page }) => {
  const state = await setup(page, options); await page.goto(`${base}/novo`); await fill(page); await submit(page);
  await expect(page.getByRole('button', { name: 'Cadastrar trabalhador' })).toBeDisabled();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cadastrar trabalhador' })).toBeDisabled();
  await page.getByRole('link', { name: 'Consultar equipe' }).click();
  await expect(page.getByRole('heading', { name: 'João Silva' })).toBeVisible();
  await page.getByRole('link', { name: 'Consultar cadastro de João Silva' }).click();
  await expect(page.getByRole('heading', { name: 'João Silva' })).toBeVisible();
  expect(state.posts).toHaveLength(1);
});

test('duplo clique envia um único POST', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/novo`); await fill(page);
  await page.getByRole('button', { name: 'Cadastrar trabalhador' }).evaluate(button => { button.click(); button.click(); });
  await expect(page).toHaveURL(`${base}/pessoa`); expect(state.posts).toHaveLength(1);
});

for (const status of [400, 404, 503]) test(`lista ${status} não vira estado vazio; nova consulta recupera`, async ({ page }) => {
  const state = await setup(page, { listStatus: status }); await page.goto(base);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nenhum trabalhador nesta obra' })).toHaveCount(0);
  state.listStatus = null;
  await page.getByRole('button', { name: 'Consultar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Nenhum trabalhador nesta obra' })).toBeVisible();
});

test('detalhe com falha permite consultar sem repetir criação', async ({ page }) => {
  const state = await setup(page, { detailStatus: 503 }); await page.goto(`${base}/novo`); await fill(page); await submit(page);
  await expect(page.getByRole('alert')).toBeVisible(); expect(state.posts).toHaveLength(1);
  state.detailStatus = null;
  await page.getByRole('button', { name: 'Consultar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'João Silva' })).toBeVisible(); expect(state.posts).toHaveLength(1);
});

for (const width of [320, 1280]) test(`lista, detalhe e formulário legíveis em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await setup(page, { items: [worker()] });
  for (const [name, path] of [['equipe', base], ['detalhe', `${base}/pessoa`], ['cadastro', `${base}/novo`]]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: name === 'equipe' ? 'Trabalhadores da obra' : name === 'detalhe' ? 'Detalhe do trabalhador' : 'Cadastrar trabalhador', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`${name}-${width}.png`), fullPage: true });
  }
});
