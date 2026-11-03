import { test, expect } from '@playwright/test';
const base = '/obras/obra/ocorrencias';
async function setup(page) {
  const state = { items: [], posts: [], writes: [], status: 201, lost: false, workers: [{ id: 'vinculado', nome: 'Ana', obras: ['obra'] }, { id: 'alheio', nome: 'Outra pessoa', obras: ['outra'] }], listStatus: 200, previous: null };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = decodeURIComponent(new URL(req.url()).pathname.replace('/api', ''));
    if (req.method() !== 'GET') state.writes.push(`${req.method()} ${path}`);
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa', localizacao: 'SP', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/marcos') return route.fulfill({ json: [{ id: 'marco', nome: 'Fundação', obra_id: 'obra' }] });
    if (path === '/trabalhadores/obra/obra/') return route.fulfill({ json: state.workers });
    if (path === '/midias/foto/conteudo') return route.fulfill({ contentType: 'image/png', body: Buffer.from('image') });
    if (path === '/obras/obra/ocorrencias' && req.method() === 'GET') return state.listStatus === 200 ? route.fulfill({ json: { ocorrencias: state.items } }) : route.fulfill({ status: state.listStatus, json: { mensagem: 'Lista indisponível' } });
    if (path === '/obras/obra/ocorrencias' && req.method() === 'POST') {
      const multipart = req.headers()['content-type'].includes('multipart/form-data');
      const body = multipart ? req.postData() : req.postDataJSON(); state.posts.push({ body, multipart, headers: req.headers() });
      if (state.status !== 201) return route.fulfill({ status: state.status, json: { mensagem: 'Cadastro recusado', campos: ['responsavel_id'] } });
      const value = multipart ? { titulo: 'Infiltração', descricao: 'Água na parede', estado: 'sem solução', marco_id: 'marco', responsavel_id: 'vinculado' } : body;
      const item = { id: `oc-${state.items.length + 1}`, obra_id: 'obra', titulo: value.titulo, descricao: value.descricao, estado: value.estado, marco_id: value.marco_id || null, responsavel_id: value.responsavel_id || null, autor: 'autor-servidor', data_registro: '2030-10-20T12:00:00Z', midias: multipart ? [{ id: 'foto', nome: 'foto.png', mime: 'image/png' }] : [], aceitacoes: [], aceitacoes_do_estado_atual: [], versao: 0, episodio: 0 };
      state.items.push(item);
      if (state.lost) return route.abort();
      return route.fulfill({ status: 201, headers: { Location: `/ocorrencias/${item.id}` }, json: item });
    }
    if (path.startsWith('/ocorrencias/')) {
      const item = state.items.find(i => i.id === path.split('/')[2]);
      return item ? route.fulfill({ json: state.previous ? { ...item, responsavel_id: null, responsavel_anterior: state.previous } : item }) : route.fulfill({ status: 404, json: { mensagem: 'Ocorrência não encontrada' } });
    }
    return route.fulfill({ status: 404, json: { mensagem: 'Não encontrado' } });
  });
  return state;
}
async function preencher(page) {
  await page.getByLabel('Título', { exact: true }).fill('Infiltração');
  await page.getByLabel('Descrição', { exact: true }).fill('Água na parede');
}
test('cadastro mínimo usa JSON, consulta detalhe e lista após recarga', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/nova`); await preencher(page);
  await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
  await expect(page.getByText('Ocorrência registrada com sucesso.')).toBeVisible();
  expect(state.posts[0].body).toEqual({ titulo: 'Infiltração', descricao: 'Água na parede', estado: 'aberta' });
  expect(state.posts[0].headers['idempotency-key']).toBeUndefined();
  await expect(page.getByText('Responsável atual: Não atribuído')).toBeVisible(); await expect(page.getByText(/Registrada em:/)).toContainText('20/10/2030');
  await page.reload(); await expect(page.getByRole('heading', { name: 'Infiltração' })).toBeVisible();
  await page.getByRole('link', { name: 'Voltar às ocorrências' }).click(); await expect(page.getByRole('link', { name: 'Infiltração' })).toBeVisible();
});
test('multipart com vínculos, arquivo e sem aceitação automática', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/nova`); await preencher(page);
  await page.getByLabel('Estado inicial').selectOption('sem solução'); await page.getByLabel('Marco (opcional)').selectOption('marco');
  await expect(page.getByLabel('Responsável (opcional)').locator('option')).toHaveCount(2);
  await page.getByLabel('Responsável (opcional)').selectOption('vinculado');
  await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
  await expect(page.getByText(/Sem aceitação registrada/)).toBeVisible(); await expect(page.getByText('Responsável atual: Ana')).toBeVisible();
  expect(state.posts[0].multipart).toBe(true); for (const text of ['name="marco_id"', 'name="responsavel_id"', 'name="midias"']) expect(state.posts[0].body).toContain(text);
  expect(state.writes).toEqual(['POST /obras/obra/ocorrencias']);
  state.previous = { nome: 'Ana anterior', cargo: 'Pedreira', id: 'antigo' }; await page.reload();
  await expect(page.getByText('Responsável atual: Não atribuído')).toBeVisible(); await expect(page.getByText(/Responsável anterior \(histórico\): Ana anterior/)).toBeVisible();
});
test('opcionais vazios no multipart são omitidos e cancelar não grava', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/nova`); await preencher(page); await page.getByRole('link', { name: 'Cancelar' }).click(); expect(state.posts).toHaveLength(0);
  await page.goto(`${base}/nova`); await preencher(page); await page.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await page.getByRole('button', { name: 'Registrar ocorrência' }).click(); await expect(page.getByText('Ocorrência registrada com sucesso.')).toBeVisible();
  expect(state.posts[0].body).not.toContain('name="marco_id"'); expect(state.posts[0].body).not.toContain('name="responsavel_id"'); expect(state.posts[0].body).not.toContain('null');
});
for (const status of [400, 404, 413, 415, 422]) test(`erro ${status} não anuncia sucesso`, async ({ page }) => {
  const state = await setup(page); state.status = status; await page.goto(`${base}/nova`); await preencher(page); await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
  await expect(page.getByText('Cadastro recusado')).toBeVisible(); await expect(page.getByText('Ocorrência registrada com sucesso.')).toHaveCount(0); expect(state.posts).toHaveLength(1);
});
test('resposta perdida exige consultar lista e não repete POST', async ({ page }) => {
  const state = await setup(page); state.lost = true; await page.goto(`${base}/nova`); await preencher(page);
  await page.getByRole('button', { name: 'Registrar ocorrência' }).evaluate(b => { b.click(); b.click(); });
  await expect(page.getByText(/Não foi possível confirmar o cadastro/)).toBeVisible(); await expect(page.getByRole('button', { name: 'Registrar ocorrência' })).toBeDisabled();
  await page.getByRole('link', { name: 'Consultar lista de ocorrências' }).click(); await expect(page.getByRole('link', { name: 'Infiltração' })).toBeVisible(); expect(state.posts).toHaveLength(1);
});
test('lista vazia, falha temporária e detalhe de outra obra são distintos', async ({ page }) => {
  const state = await setup(page); await page.goto(base); await expect(page.getByText('Nenhuma ocorrência registrada nesta obra.')).toBeVisible();
  state.listStatus = 503; await page.reload(); await expect(page.getByText('Lista indisponível')).toBeVisible(); await expect(page.getByText('Nenhuma ocorrência registrada nesta obra.')).toHaveCount(0);
  state.listStatus = 200; await page.getByRole('button', { name: 'Consultar novamente' }).click(); await expect(page.getByText('Nenhuma ocorrência registrada nesta obra.')).toBeVisible();
  state.items.push({ id: 'foreign', obra_id: 'outra', titulo: 'Outra', descricao: 'Não mostrar', estado: 'aberta', autor: 'x', data_registro: '2030', midias: [], aceitacoes: [], aceitacoes_do_estado_atual: [], versao: 0, episodio: 0 });
  await page.goto(`${base}/foreign`); await expect(page.getByText(/Registro não encontrado/)).toBeVisible(); await expect(page.getByText('Não mostrar')).toHaveCount(0);
});

test('503 mantém o resultado como incerto e não reenvia automaticamente', async ({ page }) => {
  const state = await setup(page); state.status = 503; await page.goto(`${base}/nova`); await preencher(page);
  await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
  await expect(page.getByText(/Não foi possível confirmar o cadastro/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrar ocorrência' })).toBeDisabled(); expect(state.posts).toHaveLength(1);
});
test('mais de cinco evidências impede o envio', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/nova`); await preencher(page);
  await page.locator('input[type=file]').setInputFiles(Array.from({ length: 6 }, (_, i) => ({ name: `foto${i}.png`, mimeType: 'image/png', buffer: Buffer.from('png') })));
  await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
  await expect(page.getByText('Selecione no máximo cinco arquivos.')).toBeVisible(); expect(state.posts).toHaveLength(0);
});
test('sem trabalhador cadastrado permite seguir sem responsável', async ({ page }) => {
  const state = await setup(page); state.workers = [];
  await page.goto(`${base}/nova`); await expect(page.getByText(/Nenhum trabalhador vinculado/)).toBeVisible();
  await preencher(page); await page.getByRole('button', { name: 'Registrar ocorrência' }).click();
  await expect(page.getByText('Ocorrência registrada com sucesso.')).toBeVisible();
  expect(state.posts[0].body.responsavel_id).toBeUndefined();
});
