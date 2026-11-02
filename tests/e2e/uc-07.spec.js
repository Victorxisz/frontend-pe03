import { test, expect } from '@playwright/test';

const obraId = 'obra-a', marcoId = 'marco-a';
const base = `/obras/${obraId}/marcos/${marcoId}`;
const initial = { id: marcoId, obra_id: obraId, nome: 'Alvenaria', descricao: 'Entrega da alvenaria.', estado: 'a iniciar', versao: 5, inicio_previsto: '2030-02-01', fim_previsto: '2030-02-15' };
const pending = [{ id: 'marco-b', nome: 'Estrutura', estado: 'em andamento' }, { id: 'marco-c', nome: 'Fundação', estado: 'a iniciar' }];
async function setup(page, options = {}) {
  const state = { record: { ...initial }, events: [], posts: [], details: 0, lists: 0, histories: 0, pending: [], ...options };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  state.apply = (body) => {
    const before = state.record.estado;
    state.record = { ...state.record, estado: body.novo_valor, versao: state.record.versao + 1 };
    state.events.push({ id: `evento-${state.events.length + 1}`, obra_id: obraId, tipo: 'estado_marco', alvo: body.alvo, campos: ['estado'], antes: before, depois: body.novo_valor, motivo: body.motivo, autor: 'construtora-teste', instante: '2030-02-10T12:00:00+00:00' });
    return state.record;
  };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    if (path === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Horizonte Construções' } } });
    if (path === `/api/obras/${obraId}` && method === 'GET') return route.fulfill({ json: { id: obraId, nome: 'Casa Aurora', tipo: 'casa', cliente: 'Cliente de referência', localizacao: 'Campinas, SP', descricao: 'Residência em construção.', inicio: '2030-01-10', entrega: { modalidade: 'data_exata', data: '2030-12-20' }, estado: 'planejada', alertas: [] } });
    if (path === `/api/obras/${obraId}/marcos/${marcoId}` && method === 'GET') {
      state.details++;
      return state.detail ? state.detail(route) : route.fulfill({ json: state.record });
    }
    if (path === `/api/obras/${obraId}/marcos` && method === 'GET') {
      state.lists++;
      return state.list ? state.list(route) : route.fulfill({ json: [state.record] });
    }
    if (path === `/api/marcos/${marcoId}/dependencias` && method === 'GET') return route.fulfill({ json: [] });
    if (path === `/api/obras/${obraId}/mudancas`) {
      if (method === 'GET') {
        state.histories++;
        return state.history ? state.history(route) : route.fulfill({ json: { mudancas: state.events } });
      }
      if (method === 'POST') {
        const body = route.request().postDataJSON(); state.posts.push(body);
        if (state.post) return state.post(route, body);
        if (body.versao !== state.record.versao) return route.fulfill({ status: 409, json: { mensagem: 'O alvo foi alterado; consulte novamente', campos: ['versao'] } });
        if (body.novo_valor === 'concluído' && state.pending.length && body.confirmar_dependencias !== true) return route.fulfill({ status: 409, json: { mensagem: 'Há dependências pendentes', codigo: 'DEPENDENCIAS_PENDENTES', dependencias: state.pending } });
        return route.fulfill({ json: state.apply(body) });
      }
    }
    throw new Error(`Endpoint inesperado: ${method} ${path}`);
  });
  return state;
}
const form = (page) => page.getByRole('region', { name: 'Alterar estado do marco', exact: true });
const select = (page) => form(page).getByRole('combobox', { name: 'Novo estado' });
const reason = (page) => form(page).getByRole('textbox', { name: 'Motivo da alteração' });
const badge = (page) => page.locator('.section-heading .status-badge');
async function choose(page, value = 'concluído', motive = ' Entrega conferida em vistoria. ') {
  await expect(select(page)).toBeEnabled();
  await select(page).selectOption(value);
  await reason(page).fill(motive);
}
async function save(page) { await form(page).getByRole('button', { name: /^(Salvar estado|Reabrir marco)$/ }).click(); }
const success = (page) => page.getByRole('status').filter({ hasText: 'Alteração de estado confirmada pelo servidor.' });

test.describe('FE-UC-07 — estado, conclusão e reabertura de marco', () => {
  test.skip(process.env.E2E_REAL === '1', 'API controlada; não comprova transações/Atlas');
  test('altera, conclui, reabre e mantém motivo e histórico após recarga', async ({ page }, testInfo) => {
    const state = await setup(page);
    await page.goto(`${base}?busca=nome%3DAurora`);
    for (const [value, label] of [['em andamento', 'Em andamento'], ['concluído', 'Concluído'], ['a iniciar', 'A iniciar']]) {
      await choose(page, value); await save(page);
      await expect(badge(page)).toHaveText(label);
      await expect(success(page)).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Decisões registradas' })).toBeVisible();
      await expect(select(page)).toBeEnabled();
    }
    expect(state.posts).toEqual(['em andamento', 'concluído', 'a iniciar'].map((novo_valor, index) => ({ alvo: { tipo: 'marco', id: marcoId }, campo: 'estado', novo_valor, motivo: 'Entrega conferida em vistoria.', versao: 5 + index })));
    expect(state.events).toHaveLength(3);
    expect(state.lists).toBe(3); expect(state.histories).toBeGreaterThanOrEqual(4);
    await expect(page.locator('.decisoes-marco article')).toHaveCount(3);
    await expect(page.locator('.decisoes-marco')).toContainText('construtora-teste');
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    await page.screenshot({ path: testInfo.outputPath('estado-marco-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('estado-marco-mobile.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(badge(page)).toHaveText('A iniciar');
    await expect(page.locator('.decisoes-marco article')).toHaveCount(3);
    expect(state.events).toHaveLength(3);
    await page.getByRole('link', { name: 'Marcos da obra', exact: true }).click();
    await expect(page).toHaveURL(`/obras/${obraId}/marcos?busca=nome%3DAurora`);
    await expect(page.getByRole('article')).toContainText('A iniciar');
  });
  test('motivo vazio não envia; estado atual não gera nova decisão', async ({ page }) => {
    const state = await setup(page); await page.goto(base);
    await expect(form(page).getByRole('button', { name: 'Salvar estado' })).toBeDisabled();
    await choose(page, 'em andamento', '   '); await save(page);
    await expect(form(page).getByRole('alert')).toContainText('Revise os campos');
    await expect(reason(page)).toHaveAttribute('aria-invalid', 'true');
    expect(state.posts).toHaveLength(0);
  });
  for (const action of ['Cancelar', 'Escape']) test(`pendências: ${action} preserva estado e não reenvia`, async ({ page }) => {
    const state = await setup(page, { pending }); await page.goto(base);
    await choose(page); await save(page);
    const dialog = page.getByRole('dialog', { name: 'Concluir com pré-requisitos pendentes?' });
    await expect(dialog).toContainText('Estrutura'); await expect(dialog).toContainText('Em andamento');
    await expect(dialog).toContainText('Fundação'); await expect(dialog).toContainText('A iniciar');
    if (action === 'Escape') await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog).toHaveCount(0); await expect(badge(page)).toHaveText('A iniciar');
    expect(state.posts).toHaveLength(1); expect(state.events).toHaveLength(0);
    expect(state.posts[0].confirmar_dependencias).toBeUndefined();
  });
  test('confirmar pendências reenvia apenas a mesma decisão com flag explícita', async ({ page }, testInfo) => {
    const state = await setup(page, { pending }); await page.goto(base);
    await choose(page); await save(page);
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: testInfo.outputPath('confirmacao-pendencias-mobile.png') });
    await dialog.getByRole('button', { name: 'Concluir mesmo assim', exact: true }).click();
    await expect(badge(page)).toHaveText('Concluído');
    expect(state.posts).toHaveLength(2);
    expect(state.posts[1]).toEqual({ ...state.posts[0], confirmar_dependencias: true });
    expect(state.events).toHaveLength(1);
    await expect(page.locator('.decisoes-marco')).toContainText('Entrega conferida em vistoria.');
  });
  for (const code of ['DEPENDENCIA_INCONSISTENTE', 'VERSAO_OBSOLETA', undefined]) test(`409 ${code || 'sem código'} exige nova consulta sem confirmar`, async ({ page }) => {
    const state = await setup(page, { post: (route) => route.fulfill({ status: 409, json: { mensagem: 'O marco precisa ser consultado novamente', codigo: code, dependencias: pending, campos: ['versao'] } }) });
    await page.goto(base); await choose(page); await save(page);
    await expect(form(page).getByRole('alert')).toContainText('O marco precisa ser consultado novamente');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(select(page)).toBeDisabled();
    expect(state.posts).toHaveLength(1); expect(state.events).toHaveLength(0);
    state.record = { ...state.record, estado: 'em andamento', versao: 6 }; state.post = null;
    await form(page).getByRole('button', { name: 'Consultar marco atualizado' }).click();
    await expect(badge(page)).toHaveText('Em andamento');
    await expect(select(page)).toHaveValue('em andamento'); await expect(reason(page)).toHaveValue('');
    await choose(page); await save(page);
    await expect(badge(page)).toHaveText('Concluído');
    expect(state.posts[1].versao).toBe(6); expect(state.posts[1].confirmar_dependencias).toBeUndefined();
  });
  test('versão muda durante confirmação: rejeita e exige revisão da decisão', async ({ page }) => {
    const state = await setup(page, { pending }); await page.goto(base);
    await choose(page); await save(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    state.record = { ...state.record, versao: 6, estado: 'em andamento' };
    await page.getByRole('button', { name: 'Concluir mesmo assim' }).click();
    await expect(form(page).getByRole('alert')).toContainText('O alvo foi alterado');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(state.posts).toHaveLength(2); expect(state.posts[1].versao).toBe(5);
    expect(state.events).toHaveLength(0);
  });
  test('voltar de outra aba revalida e bloqueia rascunho de uma versão antiga', async ({ page }) => {
    const state = await setup(page); await page.goto(base); await choose(page);
    const before = state.details;
    state.record = { ...state.record, versao: 6, estado: 'em andamento' };
    await page.evaluate(() => dispatchEvent(new Event('focus')));
    await expect(form(page).getByRole('alert')).toContainText('atualizado em outra aba');
    await expect(select(page)).toBeDisabled();
    expect(state.details).toBeGreaterThan(before); expect(state.posts).toHaveLength(0);
    await form(page).getByRole('button', { name: 'Consultar marco atualizado' }).click();
    await expect(select(page)).toHaveValue('em andamento'); await expect(reason(page)).toHaveValue('');
    await choose(page); await save(page); await expect(badge(page)).toHaveText('Concluído');
    expect(state.posts[0].versao).toBe(6);
  });
  test('voltar à aba sem mudanças preserva motivo e decisão em edição', async ({ page }) => {
    const state = await setup(page); await page.goto(base); await choose(page);
    const before = state.details;
    await page.evaluate(() => dispatchEvent(new Event('focus')));
    await expect.poll(() => state.details).toBeGreaterThan(before);
    await expect(select(page)).toBeEnabled(); await expect(select(page)).toHaveValue('concluído');
    await expect(reason(page)).toHaveValue(' Entrega conferida em vistoria. ');
    expect(state.posts).toHaveLength(0);
  });
  test('duplo clique não duplica comando nem evento', async ({ page }) => {
    let held;
    const state = await setup(page, { post: (route, body) => { held = { route, body }; } });
    await page.goto(base); await choose(page);
    await form(page).getByRole('button', { name: 'Salvar estado' }).evaluate((button) => { button.click(); button.click(); });
    await expect.poll(() => Boolean(held)).toBe(true);
    await expect(form(page).getByRole('button', { name: 'Salvando decisão…' })).toBeDisabled();
    expect(state.posts).toHaveLength(1);
    await held.route.fulfill({ json: state.apply(held.body) });
    await expect(badge(page)).toHaveText('Concluído'); expect(state.events).toHaveLength(1);
  });
  for (const status of [404, 422, 500, 201]) test(`POST ${status} não presume estado nem evento`, async ({ page }) => {
    const state = await setup(page, { post: (route) => route.fulfill({ status, json: { mensagem: 'Decisão rejeitada', campos: ['motivo'] } }) });
    await page.goto(base); await choose(page); await save(page);
    await expect(form(page).getByRole('alert')).toContainText(status === 201 ? 'não confirmou' : 'Decisão rejeitada');
    await expect(badge(page)).toHaveText('A iniciar'); await expect(success(page)).toHaveCount(0);
    await expect(page.locator('.decisoes-marco article')).toHaveCount(0);
    expect(state.events).toHaveLength(0); expect(state.posts).toHaveLength(1);
    if (status === 422) { await expect(reason(page)).toHaveAttribute('aria-invalid', 'true'); await expect(reason(page)).toBeEnabled(); }
    else await expect(select(page)).toBeDisabled();
  });
  test('200 incompleto pede consulta sem anunciar sucesso', async ({ page }) => {
    const state = await setup(page, { post: (route) => route.fulfill({ json: { estado: 'concluído' } }) });
    await page.goto(base); await choose(page); await save(page);
    await expect(form(page).getByRole('alert')).toContainText('não confirmou os dados');
    await expect(badge(page)).toHaveText('A iniciar'); await expect(success(page)).toHaveCount(0);
    expect(state.posts).toHaveLength(1);
  });
  for (const failure of ['detail', 'list', 'history']) test(`falha na releitura de ${failure} após 200 não repete escrita`, async ({ page }) => {
    const state = await setup(page); await page.goto(base); await choose(page);
    state[failure] = (route) => route.fulfill({ status: 500, json: { mensagem: 'Consulta indisponível' } });
    await save(page);
    await expect(success(page)).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Consulta indisponível');
    await expect(select(page)).toBeDisabled();
    if (failure === 'detail') await expect(badge(page)).toHaveText('A iniciar');
    if (failure === 'history') await expect(page.getByRole('heading', { name: 'Decisões registradas' })).toHaveCount(0);
    state[failure] = null;
    await page.getByRole('button', { name: 'Reconsultar marco e histórico' }).click();
    await expect(badge(page)).toHaveText('Concluído');
    await expect(select(page)).toBeEnabled();
    await expect(page.locator('.decisoes-marco article')).toHaveCount(1);
    expect(state.posts).toHaveLength(1); expect(state.events).toHaveLength(1);
  });
  test('aviso malformado não oferece confirmação de dependências', async ({ page }) => {
    await setup(page, { post: (route) => route.fulfill({ status: 409, json: { codigo: 'DEPENDENCIAS_PENDENTES', mensagem: 'Dependências indisponíveis', dependencias: [] } }) });
    await page.goto(base); await choose(page); await save(page);
    await expect(form(page).getByRole('alert')).toContainText('Dependências indisponíveis');
    await expect(page.getByRole('dialog')).toHaveCount(0); await expect(select(page)).toBeDisabled();
  });
});
