import { test, expect } from '@playwright/test';

test.skip(process.env.E2E_REAL === '1', 'Cenários isolados de contrato; não excluir dados reais.');
const root = '/obras/obra';
const detail = tipo => `${root}/${tipo === 'avanco' ? 'avancos/a' : 'ocorrencias/c'}`;
const endpoint = tipo => `/${tipo === 'avanco' ? 'avancos/a' : 'ocorrencias/c'}`;
const label = tipo => tipo === 'avanco' ? 'avanço' : 'ocorrência';

async function setup(page, options = {}, shared) {
  const state = shared || { deleted: false, deletes: [], previews: [], responses: [204], draft: false,
    previewStatus: 200, patch: null, noMarco: false, retryAfter: null, ...options };
  const marco = { id: 'marco', obra_id: 'obra', nome: 'Fundação', estado: 'a iniciar', versao: 1 };
  const avanco = () => ({ id: 'a', marco_id: 'marco', descricao: 'Concretagem', data: '2026-11-02', estado: state.draft ? 'rascunho' : 'publicado', midias: [] });
  const occurrence = () => ({ id: 'c', obra_id: 'obra', marco_id: state.noMarco ? null : 'marco', titulo: 'Infiltração', descricao: 'Água na parede', estado: 'sem solução', autor: 'conta', data_registro: '2026-11-02T12:00:00Z', versao: 1, episodio: 1, midias: [], historico_estados: [], aceitacoes: [], aceitacoes_do_estado_atual: [] });
  const publication = () => ({ ...avanco(), avanco_id: 'a', estado: 'publicado', autor: 'conta', instante: '2026-11-02T13:00:00Z' });
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-uc18'));
  await page.route(`${process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'}/api/**`, async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace('/api', '');
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/marcos/marco') return route.fulfill({ json: marco });
    if (path === '/obras/obra/marcos') return route.fulfill({ json: [marco] });
    if (path === '/trabalhadores/obra/obra/') return route.fulfill({ json: [] });
    const tipo = path.startsWith('/avancos/') ? 'avanco' : 'ocorrencia';
    if (path === `${endpoint(tipo)}/exclusao`) {
      state.previews.push({ path, query: [...url.searchParams] });
      if (state.previewStatus !== 200) return route.fulfill({ status: state.previewStatus, json: { mensagem: 'Impacto indisponível' } });
      const data = { alvo: { tipo, id: tipo === 'avanco' ? 'a' : 'c', obra_id: 'obra', marco_id: tipo === 'ocorrencia' && state.noMarco ? null : 'marco', nome: tipo === 'avanco' ? 'Concretagem' : 'Infiltração' },
        perda: tipo === 'avanco' ? state.draft ? { avancos: 1, midias: 2 } : { avancos: 1, publicacoes: 1, versoes: 2, midias: 3, exemplos_simulados: 1, historico: 2 }
          : { ocorrencias: 1, historico: 3, aceitacoes: 2, midias: 1 } };
      if (state.patch) state.patch(data);
      return route.fulfill({ json: data });
    }
    if (path === endpoint(tipo) && req.method() === 'DELETE') {
      state.deletes.push({ path, query: [...url.searchParams], body: req.postData() ? req.postDataJSON() : null });
      const status = state.responses[Math.min(state.deletes.length - 1, state.responses.length - 1)];
      if ([204, 503].includes(status)) state.deleted = true;
      if (state.lostFirst && state.deletes.length === 1) { state.deleted = true; return route.abort(); }
      return route.fulfill(status === 204 ? { status } : { status, headers: state.retryAfter ? { 'Retry-After': state.retryAfter } : {}, json: {
        mensagem: status === 503 ? 'Limpeza externa em andamento' : 'Exclusão recusada',
        codigo: status === 503 ? 'LIMPEZA_PENDENTE' : status === 409 ? 'REFERENCIA_EXTERNA' : 'RECUSADA',
        ...(status === 503 ? { pendencia: 'limpeza-123' } : {}),
      } });
    }
    if (path === '/avancos/a') return route.fulfill(state.deleted ? { status: 404, json: { mensagem: 'Avanço ausente' } } : { json: avanco() });
    if (path === '/ocorrencias/c') return route.fulfill(state.deleted ? { status: 404, json: { mensagem: 'Ocorrência ausente' } } : { json: occurrence() });
    if (path === '/avancos/a/midias') return route.fulfill({ json: [] });
    if (path === '/avancos/a/publicacoes') return route.fulfill({ json: { publicacoes: state.deleted || state.draft ? [] : [publication()] } });
    if (path === '/obras/obra/previa') return route.fulfill({ json: { atualizacoes: state.deleted || state.draft ? [] : [publication()] } });
    if (path === '/marcos/marco/avancos') return route.fulfill({ json: state.deleted ? [] : [avanco()] });
    if (path === '/obras/obra/ocorrencias') return route.fulfill({ json: { ocorrencias: state.deleted ? [] : [occurrence()] } });
    if (path === '/obras/obra/historico') return route.fulfill({ json: { eventos: [] } });
    return route.fulfill({ status: 404, json: { mensagem: 'Não encontrado' } });
  });
  return state;
}

async function open(page, tipo) {
  await page.goto(detail(tipo));
  await page.getByRole('button', { name: `Excluir ${label(tipo)}`, exact: true }).click();
}
const confirm = page => page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();

for (const tipo of ['avanco', 'ocorrencia']) {
  test(`${tipo}: mostra impacto real, Cancelar/Escape preservam e 204 atualiza listas`, async ({ page }) => {
    const state = await setup(page);
    await open(page, tipo);
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(tipo === 'avanco' ? 'Concretagem' : 'Infiltração');
    await expect(dialog).toContainText(tipo === 'avanco' ? 'Correções / versões' : 'Aceitações');
    await expect(dialog).toContainText('Mídias');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: `Excluir ${label(tipo)}`, exact: true }).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    expect(state.deletes).toEqual([]);
    await page.getByRole('button', { name: `Excluir ${label(tipo)}`, exact: true }).click();
    await confirm(page);
    await expect(page).toHaveURL(`${root}/${tipo === 'avanco' ? 'publicacoes' : 'ocorrencias'}`);
    await expect(page.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
    expect(state.deletes).toEqual([{ path: endpoint(tipo), query: [], body: { confirmar: true, obra_id: 'obra', marco_id: 'marco' } }]);
    await expect(page.locator('a[href*="/versoes"]')).toHaveCount(0);
    await expect(page.getByText(tipo === 'avanco' ? 'Concretagem' : 'Infiltração', { exact: true })).toHaveCount(0);
    await page.reload();
    await expect(page.getByText(tipo === 'avanco' ? 'Nenhuma publicação nesta obra.' : 'Nenhuma ocorrência', { exact: false })).toBeVisible();
    await page.goto(detail(tipo));
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button', { name: `Excluir ${label(tipo)}`, exact: true })).toHaveCount(0);
    await expect(page.locator('a[href*="/versoes"], a[href*="/aceitacoes"]')).toHaveCount(0);
  });

  test(`${tipo}: limpeza pendente sobrevive a nova sessão e retoma o mesmo DELETE após GET 404`, async ({ page, browser, baseURL }) => {
    const state = await setup(page, { responses: [503, 404, 204], retryAfter: '1' });
    await open(page, tipo); await confirm(page);
    await expect(page.getByText('Operação de limpeza: limpeza-123')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retomar exclusão' })).toBeDisabled();
    await expect(page.locator('a[href*="/versoes"]')).toHaveCount(0);
    const persisted = await page.context().storageState();
    await page.close();
    const context = await browser.newContext({ baseURL, storageState: persisted });
    try {
      const resumed = await context.newPage(); await setup(resumed, {}, state);
      await resumed.goto(detail(tipo));
      await expect(resumed.getByText('Operação de limpeza: limpeza-123')).toBeVisible();
      expect(await resumed.evaluate(async path => (await fetch(`/api${path}`)).status, endpoint(tipo))).toBe(404);
      await expect(resumed.getByRole('button', { name: 'Retomar exclusão' })).toBeEnabled();
      await resumed.getByRole('button', { name: 'Retomar exclusão' }).click();
      await expect(resumed.getByText('Isso não comprova', { exact: false })).toBeVisible();
      await expect(resumed.getByText('Exclusão concluída.', { exact: false })).toHaveCount(0);
      await resumed.getByRole('button', { name: 'Retomar exclusão' }).click();
      await expect(resumed.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
      expect(state.deletes).toEqual(Array(3).fill({ path: endpoint(tipo), query: [], body: { confirmar: true, obra_id: 'obra', marco_id: 'marco' } }));
    } finally { await context.close(); }
  });
}

test('ocorrência sem marco não envia marco_id nulo nem contexto duplicado', async ({ page }) => {
  const state = await setup(page, { noMarco: true });
  await open(page, 'ocorrencia'); await confirm(page);
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
  expect(state.deletes[0]).toEqual({ path: '/ocorrencias/c', query: [], body: { confirmar: true, obra_id: 'obra' } });
  expect(state.previews[0].query).toEqual([['obra_id', 'obra']]);
});

test('rascunho usa o contrato único UC-09 sem corpo e retorna aos avanços', async ({ page }) => {
  const state = await setup(page, { draft: true });
  await open(page, 'avanco'); await confirm(page);
  await expect(page).toHaveURL(`${root}/marcos/marco/avancos`);
  expect(state.deletes).toEqual([{ path: '/avancos/a', query: [], body: null }]);
  await expect(page.getByRole('heading', { name: 'Ainda não há avanços' })).toBeVisible();
});

for (const [name, patch] of [
  ['alvo', data => { data.alvo.id = 'outro'; }],
  ['obra', data => { data.alvo.obra_id = 'outra'; }],
  ['marco', data => { data.alvo.marco_id = 'outro'; }],
  ['perda', data => { data.perda = {}; }],
]) test(`prévia adulterada em ${name} não abre confirmação`, async ({ page }) => {
  const state = await setup(page, { patch });
  await open(page, 'avanco');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.deletes).toEqual([]);
});

for (const status of [400, 404, 409, 422, 503]) test(`prévia ${status} não permite exclusão`, async ({ page }) => {
  const state = await setup(page, { previewStatus: status });
  await open(page, 'ocorrencia');
  await expect(page.getByRole('alert')).toContainText('Impacto indisponível');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.deletes).toEqual([]);
});

for (const status of [400, 409, 422]) test(`DELETE ${status} exige nova prévia e confirmação`, async ({ page }) => {
  const state = await setup(page, { responses: [status, 204] });
  await open(page, 'avanco'); await confirm(page);
  await expect(page.getByText('Exclusão não concluída.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retomar exclusão' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Excluir avanço', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(state.previews).toHaveLength(2);
  expect(state.deletes).toHaveLength(1);
});

for (const status of [200, 202, 404]) test(`DELETE ${status} não confirma conclusão`, async ({ page }) => {
  await setup(page, { responses: [status] });
  await open(page, 'avanco'); await confirm(page);
  await expect(page.getByRole('button', { name: 'Retomar exclusão' })).toBeEnabled();
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toHaveCount(0);
});

test('sem persistência local não envia DELETE', async ({ page }) => {
  const state = await setup(page);
  await open(page, 'ocorrencia');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Armazenamento indisponível'); }; });
  await confirm(page);
  await expect(page.getByText('Armazenamento indisponível', { exact: false })).toBeVisible();
  expect(state.deletes).toEqual([]);
});

test('duplo clique envia uma única exclusão', async ({ page }) => {
  const state = await setup(page);
  await open(page, 'avanco');
  await page.getByRole('button', { name: 'Excluir definitivamente' }).evaluate(button => { button.click(); button.click(); });
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
  expect(state.deletes).toHaveLength(1);
});

test('resposta perdida mantém a operação e permite repetir o comando sem nova exclusão visual', async ({ page }) => {
  const state = await setup(page, { lostFirst: true });
  await open(page, 'avanco'); await confirm(page);
  await expect(page.getByText('Exclusão pendente de confirmação', { exact: false })).toBeVisible();
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Retomar exclusão' }).click();
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
  expect(state.deletes).toHaveLength(2);
  expect(state.deletes[1]).toEqual(state.deletes[0]);
});

test('conflito durante retomada não apaga a referência de limpeza já registrada', async ({ page }) => {
  const state = await setup(page, { responses: [503, 409, 204] });
  await open(page, 'avanco'); await confirm(page);
  await expect(page.getByText('Operação de limpeza: limpeza-123')).toBeVisible();
  await page.getByRole('button', { name: 'Retomar exclusão' }).click();
  await expect(page.getByText('Exclusão recusada', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Operação de limpeza: limpeza-123')).toBeVisible();
  await page.getByRole('button', { name: 'Retomar exclusão' }).click();
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
  expect(state.deletes).toHaveLength(3);
});

for (const width of [320, 1280]) test(`diálogo de impacto legível em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page); await open(page, 'avanco');
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused();
  await page.screenshot({ path: test.info().outputPath(`impacto-${width}.png`) });
});
