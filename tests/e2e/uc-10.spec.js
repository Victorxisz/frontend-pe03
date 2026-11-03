import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'America/Sao_Paulo' });
const base = '/obras/obra/avancos/avanco';
async function setup(page, options = {}) {
  const state = { posts: 0, published: false, ...options };
  const draft = { id: 'avanco', marco_id: 'marco', descricao: 'Concretagem revisada', data: '2030-01-01', estado: 'rascunho', midias: [] };
  const published = () => ({ ...draft, estado: 'publicado', avanco_id: 'avanco', marco: { id: 'marco', nome: 'Fundação' }, autor: 'autor-servidor', instante: '2030-02-10T12:00:00Z' });
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api', '');
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa', localizacao: 'SP', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/marcos/marco') return route.fulfill({ json: { id: 'marco', obra_id: 'obra', nome: 'Fundação' } });
    if (path === '/avancos/avanco') return route.fulfill({ json: { ...draft, estado: state.published ? 'publicado' : 'rascunho' } });
    if (path === '/avancos/avanco/midias') return route.fulfill({ json: [] });
    if (path === '/marcos/marco/avancos') return route.fulfill({ json: [draft] });
    if (path === '/avancos/avanco/publicacoes') {
      if (route.request().method() === 'POST') {
        state.posts++; expect(route.request().postDataJSON()).toEqual({});
        if (state.status) return route.fulfill({ status: state.status, json: { mensagem: 'Falha controlada', campos: ['midias'] } });
        state.published = true;
        if (state.lost) return route.abort();
        await new Promise(resolve => setTimeout(resolve, 100));
        return route.fulfill({ status: 201, json: published() });
      }
      return route.fulfill({ json: { publicacoes: state.published ? [published()] : [] } });
    }
    if (path === '/obras/obra/previa') {
      if (state.failPreview) return route.fulfill({ status: 503, json: { mensagem: 'Consulta indisponível' } });
      return route.fulfill({ json: { atualizacoes: state.published ? [published(), published()] : [] } });
    }
    throw Error(path);
  });
  return state;
}
async function confirm(page) {
  await page.getByRole('button', { name: 'Publicar avanço', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).click();
}
test('confirma uma vez, distingue datas e deduplica prévia após recarga', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/publicar`); await confirm(page);
  await expect(page.getByText('Publicação confirmada pelo servidor.', { exact: true })).toBeVisible();
  expect(state.posts).toBe(1);
  await expect(page.getByText(/Data do trabalho:/)).toContainText('01/01/2030');
  await expect(page.getByText(/Publicado em:/)).toContainText('autor-servidor');
  await page.goto('/obras/obra/publicacoes'); await expect(page.locator('article')).toHaveCount(1);
  await page.reload(); await expect(page.locator('article')).toHaveCount(1); expect(state.posts).toBe(1);
});
test('cancelar revisão e confirmação não publica; rascunho fora da prévia', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/publicar`);
  await page.getByRole('button', { name: 'Publicar avanço', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('link', { name: 'Cancelar e voltar ao detalhe' }).click();
  await expect(page.getByRole('heading', { name: 'Concretagem revisada' })).toBeVisible();
  await page.goto('/obras/obra/publicacoes'); await expect(page.locator('article')).toHaveCount(0); expect(state.posts).toBe(0);
});
test('falha na leitura depois de confirmar repete somente GET', async ({ page }) => {
  const state = await setup(page, { failPreview: true }); await page.goto(`${base}/publicar`); await confirm(page);
  await expect(page.getByText('A publicação foi confirmada, mas a visualização não pôde ser atualizada.')).toBeVisible();
  state.failPreview = false; await page.getByRole('button', { name: 'Atualizar visualização' }).click();
  await expect(page.getByText('A publicação foi confirmada, mas a visualização não pôde ser atualizada.')).toHaveCount(0); expect(state.posts).toBe(1);
});
test('resposta perdida exige consulta e reconhece publicação existente', async ({ page }) => {
  const state = await setup(page, { lost: true }); await page.goto(`${base}/publicar`); await confirm(page);
  await page.getByRole('button', { name: 'Revisar estado atual' }).click();
  await expect(page.getByText(/Este avanço já está publicado/)).toBeVisible(); expect(state.posts).toBe(1);
});
for (const status of [404, 422, 409, 503]) test(`erro ${status} preserva revisão sem sucesso`, async ({ page }) => {
  const state = await setup(page, { status }); await page.goto(`${base}/publicar`); await confirm(page);
  await expect(page.getByText('Falha controlada', { exact: true })).toBeVisible();
  await expect(page.getByText('Publicação confirmada pelo servidor.', { exact: true })).toHaveCount(0); expect(state.posts).toBe(1);
});

test('duplo clique na confirmação envia uma única decisão', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/publicar`);
  await page.getByRole('button', { name: 'Publicar avanço', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).evaluate(button => { button.click(); button.click(); });
  await expect(page.getByText('Publicação confirmada pelo servidor.', { exact: true })).toBeVisible();
  expect(state.posts).toBe(1);
});

test('preserva ordem original mesmo com datas de trabalho diferentes e mídia indisponível', async ({ page }) => {
  await setup(page);
  await page.route('**/api/obras/obra/previa', route => route.fulfill({ json: { atualizacoes: [
    { id: 'novo', avanco_id: 'novo', estado: 'publicado', descricao: 'Publicação mais recente', data: '2020-01-01', autor: 'servidor', instante: '2030-03-01T12:00:00Z', editado: true, midias: [{ id: 'arquivo', nome: 'foto.png', mime: 'image/png' }] },
    { id: 'antigo', avanco_id: 'antigo', estado: 'publicado', descricao: 'Publicação anterior', data: '2030-02-01', autor: 'servidor', instante: '2030-02-01T12:00:00Z', midias: [] },
  ] } }));
  await page.route('**/api/midias/arquivo/conteudo', route => route.fulfill({ status: 503, json: { mensagem: 'Arquivo indisponível' } }));
  await page.goto('/obras/obra/publicacoes');
  await expect(page.locator('article').first()).toContainText('Publicação mais recente');
  await expect(page.locator('article').last()).toContainText('Publicação anterior');
  await expect(page.getByText(/Falha ao recuperar este arquivo/)).toBeVisible();
  await expect(page.locator('article')).toHaveCount(2);
});

test('releitura mostra conteúdo corrigido no cartão sem repetir publicação', async ({ page }) => {
  const state = await setup(page, { failPreview: true }); await page.goto(`${base}/publicar`); await confirm(page);
  await expect(page.getByText('A publicação foi confirmada, mas a visualização não pôde ser atualizada.')).toBeVisible();
  const latest = { id: 'avanco', avanco_id: 'avanco', marco_id: 'marco', marco: { id: 'marco', nome: 'Fundação' }, estado: 'publicado', descricao: 'Conteúdo corrigido por outra aba', data: '2030-01-01', midias: [], editado: true, autor: 'autor-servidor', instante: '2030-02-10T12:00:00Z' };
  await page.route('**/api/avancos/avanco', route => route.fulfill({ json: latest }));
  await page.route('**/api/avancos/avanco/publicacoes', route => route.fulfill({ json: { publicacoes: [latest] } }));
  await page.route('**/api/obras/obra/previa', route => route.fulfill({ json: { atualizacoes: [latest] } }));
  await page.getByRole('button', { name: 'Atualizar visualização' }).click();
  await expect(page.locator('article')).toContainText(latest.descricao);
  await expect(page.locator('article')).not.toContainText('Concretagem revisada');
  await expect(page.getByText('A publicação foi confirmada, mas a visualização não pôde ser atualizada.')).toHaveCount(0);
  expect(state.posts).toBe(1);
});
