import { test, expect } from '@playwright/test';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF5kAAAAASUVORK5CYII=', 'base64');
const file = { name: 'perspectiva.png', mimeType: 'image/png', buffer: png };
const base = { id: 'obra-teste', nome: 'Casa Aurora', tipo: 'casa', cliente: 'Marina Costa', localizacao: 'Campinas, SP', descricao: 'Residência com dois pavimentos.', inicio: '2026-01-10', entrega: { modalidade: 'data_exata', data: '2027-12-20' }, estado: 'planejada', alertas: [] };
const image = (id = 'imagem-1') => ({ id, nome: 'perspectiva.png', mime: 'image/png', tamanho: png.length, conteudo: `/obras/obra-teste/imagem-projeto/${id}/conteudo` });

function formField(route, campo) {
  return route.request().postDataBuffer().toString('utf8').match(new RegExp(`name="${campo}"\\r\\n\\r\\n([\\s\\S]*?)\\r\\n--`))?.[1];
}

async function setup(page, options = {}) {
  const state = { obra: { ...base }, posts: 0, puts: [], deletes: [], contents: 0, ...options };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    expect(url.searchParams.has('token')).toBe(false);
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    if (path === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Horizonte Construções' } } });
    if (path.includes('/imagem-projeto/') && path.endsWith('/conteudo')) {
      state.contents++;
      if (state.content) return state.content(route);
      return route.fulfill({ contentType: 'image/png', body: png, headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (path.endsWith('/imagem-projeto')) {
      if (route.request().method() === 'PUT') {
        expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');
        const atual = formField(route, 'imagem_atual');
        state.puts.push(atual);
        if (state.put) return state.put(route);
        state.obra = { ...state.obra, imagem_projeto: image(`imagem-${state.puts.length + 1}`) };
        return route.fulfill({ json: { imagem_projeto: state.obra.imagem_projeto, limpeza_pendente: false } });
      }
      expect(route.request().method()).toBe('DELETE');
      state.deletes.push(route.request().postDataJSON());
      state.obra = { ...state.obra, imagem_projeto: null };
      return route.fulfill({ json: { imagem_projeto: null, limpeza_pendente: false } });
    }
    if (path === '/api/obras' && route.request().method() === 'POST') {
      state.posts++;
      expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');
      expect(route.request().postDataBuffer().toString('utf8')).toContain('name="imagem_projeto"; filename="perspectiva.png"');
      const cadastro = JSON.parse(formField(route, 'cadastro'));
      expect(Object.keys(cadastro).sort()).toEqual(['cliente', 'descricao', 'entrega', 'inicio', 'localizacao', 'nome', 'tipo']);
      if (state.post) return state.post(route);
      state.obra = { ...cadastro, id: 'obra-teste', estado: 'planejada', alertas: [], imagem_projeto: image() };
      return route.fulfill({ status: 201, json: state.obra, headers: { Location: '/obras/obra-teste' } });
    }
    if (path === '/api/obras') return route.fulfill({ json: { obras: [state.obra], situacao: 'com_resultados', filtros_aplicados: {} } });
    if (path === '/api/obras/obra-teste/marcos') return route.fulfill({ json: [] });
    if (path === '/api/obras/obra-teste') {
      expect(route.request().method()).toBe('GET');
      return route.fulfill({ json: state.obra });
    }
    throw new Error(`Endpoint inesperado: ${path}`);
  });
  return state;
}

async function preencher(page) {
  await page.goto('/obras/nova');
  for (const [label, value] of [['Nome da obra', base.nome], ['Cliente de referência', base.cliente], ['Localização', base.localizacao], ['Descrição', base.descricao], ['Início da obra', base.inicio]]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Tipo de obra').selectOption('casa');
  await page.getByLabel('Modalidade de entrega').selectOption('data_exata');
  await page.getByLabel('Data de entrega', { exact: true }).fill(base.entrega.data);
  await page.getByLabel('Imagem do projeto (opcional)', { exact: true }).setInputFiles(file);
}
async function saveNew(page) {
  await page.getByRole('button', { name: 'Revisar cadastro' }).click();
  await expect(page.getByRole('img', { name: 'Prévia da imagem selecionada para o projeto' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar e salvar' }).click();
}
async function openEdit(page) {
  await page.goto('/obras/obra-teste/editar');
  await expect(page.getByLabel('Nome da obra', { exact: true })).toHaveValue(base.nome);
}

test.describe('Imagem do projeto — API controlada', () => {
  test.skip(process.env.E2E_REAL === '1', 'Requer execução própria com mídia real');

  test('cadastro multipart, revisão, imagem autenticada no detalhe e no painel após recarga', async ({ page }) => {
    const state = await setup(page);
    await preencher(page);
    expect(state.posts).toBe(0);
    await saveNew(page);
    await expect(page).toHaveURL('/obras/obra-teste/marcos');
    const img = page.getByRole('img', { name: `Perspectiva ilustrativa do projeto: ${base.nome}`, exact: true });
    await expect(img).toBeVisible();
    await expect(img).toHaveJSProperty('naturalWidth', 1);
    await expect(img).toHaveAttribute('src', /^blob:/);
    await page.reload();
    await expect(img).toBeVisible();
    await page.getByRole('main').getByRole('link', { name: 'Painel das Obras', exact: true }).click();
    await expect(page.getByRole('article').getByRole('img')).toBeVisible();
    expect(state.posts).toBe(1);
    expect(state.contents).toBeGreaterThan(1);
  });

  test('cancelar com imagem selecionada não envia arquivo nem cria obra', async ({ page }) => {
    const state = await setup(page);
    await preencher(page);
    await page.getByRole('link', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL('/obras');
    expect(state.posts).toBe(0);
    expect(state.puts).toEqual([]);
  });

  test('upload rejeitado no cadastro mantém textos e seleção para corrigir', async ({ page }) => {
    const state = await setup(page, { post: (route) => route.fulfill({ status: 422, json: { mensagem: 'Imagem inválida ou corrompida', campos: ['imagem_projeto'] } }) });
    await preencher(page);
    await saveNew(page);
    await expect(page.getByRole('alert').first()).toContainText('Imagem inválida ou corrompida');
    await expect(page.getByLabel('Nome da obra', { exact: true })).toHaveValue(base.nome);
    await expect(page.getByRole('img', { name: 'Prévia da imagem selecionada para o projeto' })).toBeVisible();
    expect(state.posts).toBe(1);
  });

  test('imagem é salva separadamente e preserva texto ainda não salvo', async ({ page }) => {
    const state = await setup(page);
    await openEdit(page);
    await page.getByLabel('Nome da obra', { exact: true }).fill('Nome ainda não salvo');
    await page.getByLabel('Imagem do projeto (opcional)', { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Salvar imagem do projeto', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Imagem do projeto salva.' })).toBeVisible();
    expect(state.puts).toEqual(['']);
    expect(state.obra.nome).toBe(base.nome);
    await expect(page.getByLabel('Nome da obra', { exact: true })).toHaveValue('Nome ainda não salvo');
    await expect(page.getByRole('img', { name: `Perspectiva ilustrativa do projeto: ${base.nome}`, exact: true })).toBeVisible();
  });

  test('substitui com referência atual e remove somente após confirmação', async ({ page }) => {
    const state = await setup(page, { obra: { ...base, imagem_projeto: image() } });
    await openEdit(page);
    await page.getByLabel('Imagem do projeto (opcional)', { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Salvar imagem do projeto', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Imagem do projeto salva.' })).toBeVisible();
    expect(state.puts).toEqual(['imagem-1']);
    await page.getByRole('button', { name: 'Remover imagem do projeto', exact: true }).click();
    expect(state.deletes).toEqual([]);
    await page.getByRole('button', { name: 'Manter imagem', exact: true }).click();
    expect(state.deletes).toEqual([]);
    await page.getByRole('button', { name: 'Remover imagem do projeto', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar remoção da imagem', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Imagem removida da obra.' })).toBeVisible();
    expect(state.deletes).toEqual([{ imagem_atual: 'imagem-2' }]);
    await expect(page.getByRole('img', { name: `Perspectiva ilustrativa do projeto: ${base.nome}`, exact: true })).toHaveCount(0);
    expect({ ...state.obra, imagem_projeto: undefined }).toEqual({ ...base, imagem_projeto: undefined });
  });

  test('conflito exige nova consulta antes de substituir', async ({ page }) => {
    const state = await setup(page, { obra: { ...base, imagem_projeto: image() } });
    state.put = (route) => {
      state.obra = { ...base, imagem_projeto: image('imagem-concorrente') };
      return route.fulfill({ status: 409, json: { mensagem: 'Imagem alterada' } });
    };
    await openEdit(page);
    await page.getByLabel('Imagem do projeto (opcional)', { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Salvar imagem do projeto', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('outra operação');
    await expect(page.getByRole('button', { name: 'Salvar imagem do projeto', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Consultar imagem atual', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Imagem atual consultada' })).toBeVisible();
    state.put = null;
    await page.getByRole('button', { name: 'Salvar imagem do projeto', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Imagem do projeto salva.' })).toBeVisible();
    expect(state.puts).toEqual(['imagem-1', 'imagem-concorrente']);
  });

  test('falha de upload preserva imagem anterior e exige consulta, sem retry automático', async ({ page }) => {
    const state = await setup(page, { obra: { ...base, imagem_projeto: image() }, put: (route) => route.fulfill({ status: 503, json: { mensagem: 'Armazenamento indisponível' } }) });
    await openEdit(page);
    await page.getByLabel('Imagem do projeto (opcional)', { exact: true }).setInputFiles(file);
    await page.getByRole('button', { name: 'Salvar imagem do projeto', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Armazenamento indisponível');
    await expect(page.getByRole('img', { name: `Perspectiva ilustrativa do projeto: ${base.nome}`, exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar imagem do projeto', exact: true })).toBeDisabled();
    expect(state.puts).toEqual(['imagem-1']);
    expect(state.obra.imagem_projeto.id).toBe('imagem-1');
  });

  test('reconsulta após conflito descarta confirmação de remoção da imagem anterior', async ({ page }) => {
    const state = await setup(page, { obra: { ...base, imagem_projeto: image() } });
    await openEdit(page);
    await page.getByRole('button', { name: 'Remover imagem do projeto', exact: true }).click();
    await page.route('**/api/obras/obra-teste/imagem-projeto', async (route) => {
      state.obra = { ...base, imagem_projeto: image('imagem-concorrente') };
      await route.fulfill({ status: 409, json: { mensagem: 'Imagem alterada' } });
    }, { times: 1 });
    await page.getByRole('button', { name: 'Confirmar remoção da imagem', exact: true }).click();
    await page.getByRole('button', { name: 'Consultar imagem atual', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Imagem atual consultada' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmar remoção da imagem', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Remover imagem do projeto', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar remoção da imagem', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Imagem removida da obra.' })).toBeVisible();
    expect(state.deletes).toEqual([{ imagem_atual: 'imagem-concorrente' }]);
  });

  test('indisponibilidade de conteúdo não oculta os dados da obra e permite reconsulta', async ({ page }) => {
    const state = await setup(page, { obra: { ...base, imagem_projeto: image() }, content: (route) => route.fulfill({ status: 503, json: { mensagem: 'Indisponível' } }) });
    await page.goto('/obras/obra-teste/marcos');
    await expect(page.getByText('Imagem indisponível no momento.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: base.nome, exact: true })).toBeVisible();
    state.content = null;
    await page.getByRole('button', { name: 'Carregar imagem novamente', exact: true }).click();
    await expect(page.getByRole('img', { name: `Perspectiva ilustrativa do projeto: ${base.nome}`, exact: true })).toBeVisible();
  });
});
