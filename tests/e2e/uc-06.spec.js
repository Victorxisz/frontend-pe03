import { test, expect } from '@playwright/test';

const obraId = 'obra-a';
const a = 'marco-a', b = 'marco-b', c = 'marco-c';
const base = `/obras/${obraId}/marcos/${a}`;
const path = `${base}/dependencias`;
const records = ['Alvenaria', 'Estrutura', 'Fundação'].map((nome, index) => ({ id: [a, b, c][index], obra_id: obraId, nome, descricao: `Entrega ${nome}`, inicio_previsto: '2030-02-01', fim_previsto: '2030-02-15', estado: 'a iniciar', versao: 3 }));
const link = { id: 'vinculo-ab', marco_id: a, depende_de_id: b, marco_nome: 'Alvenaria', depende_de_nome: 'Estrutura' };
async function setup(page, options = {}) {
  const state = { records: structuredClone(records), deps: [], posts: [], deletes: [], reads: 0, candidateReads: 0, ...options };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    if (url.pathname === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Horizonte Construções' } } });
    const obra = url.pathname.match(/^\/api\/obras\/([^/]+)(?:\/marcos(?:\/([^/]+))?)?$/);
    if (obra) {
      const [, id, marcoId] = obra;
      if (!url.pathname.includes('/marcos')) return route.fulfill({ json: { id, nome: 'Casa Aurora', tipo: 'casa', cliente: 'Cliente de referência', localizacao: 'Campinas, SP', descricao: 'Residência em construção.', inicio: '2030-01-10', entrega: { modalidade: 'data_exata', data: '2030-12-20' }, estado: 'planejada', alertas: [] } });
      if (!marcoId) {
        state.candidateReads++;
        if (state.candidates) return state.candidates(route);
        return route.fulfill({ json: state.records.filter((item) => item.obra_id === id) });
      }
      const record = state.records.find((item) => item.id === marcoId && item.obra_id === id);
      return route.fulfill({ status: record ? 200 : 404, json: record || { mensagem: 'Marco não encontrado nesta obra' } });
    }
    const dependency = url.pathname.match(/^\/api\/marcos\/([^/]+)\/dependencias(?:\/([^/]+))?$/);
    if (dependency) {
      const [, marcoId, dependencyId] = dependency;
      if (method === 'GET' && !dependencyId) {
        state.reads++;
        if (state.list) return state.list(route, marcoId);
        return route.fulfill({ json: state.deps.filter((item) => item.marco_id === marcoId) });
      }
      if (method === 'POST' && !dependencyId) {
        const body = route.request().postDataJSON(); state.posts.push(body);
        if (state.post) return state.post(route, body);
        const origin = state.records.find((item) => item.id === marcoId);
        const target = state.records.find((item) => item.id === body.depende_de_id);
        const created = { id: `vinculo-${state.posts.length}`, marco_id: marcoId, depende_de_id: target.id, marco_nome: origin.nome, depende_de_nome: target.nome };
        state.deps.push(created);
        return route.fulfill({ status: 201, json: created, headers: { Location: `/marcos/${marcoId}/dependencias/${created.id}` } });
      }
      if (method === 'DELETE' && dependencyId) {
        state.deletes.push({ marcoId, dependencyId, body: route.request().postData() });
        if (state.remove) return state.remove(route);
        state.deps = state.deps.filter((item) => item.id !== dependencyId);
        return route.fulfill({ status: 204 });
      }
    }
    throw new Error(`Endpoint inesperado: ${method} ${url.pathname}`);
  });
  return state;
}
const select = (page) => page.getByRole('combobox', { name: 'Marco pré-requisito', exact: true });
const add = (page) => page.getByRole('button', { name: 'Adicionar dependência', exact: true });
const item = (page) => page.locator('.dependencia-item');
async function ready(page) { await expect(select(page)).toBeEnabled(); }

test.describe('FE-UC-06 — dependências entre marcos', () => {
  test.skip(process.env.E2E_REAL === '1', 'API controlada; não comprova persistência real');
  test('cria relação com direção e nomes, filtra opções e consulta após recarga', async ({ page }, testInfo) => {
    const state = await setup(page);
    await page.goto(`${path}?busca=nome%3DAurora`);
    await ready(page);
    await expect(page.getByRole('heading', { name: 'Nenhuma dependência definida' })).toBeVisible();
    await expect(select(page).locator('option')).toHaveText(['Selecione um marco', 'Estrutura', 'Fundação']);
    await select(page).selectOption(b);
    await expect(page.locator('.dependencia-preview')).toHaveText(/Alvenaria.*depende de.*Estrutura/);
    await add(page).click();
    await expect(item(page)).toHaveText(/Alvenaria.*depende de.*Estrutura/);
    expect(state.posts).toEqual([{ depende_de_id: b }]);
    await expect(select(page).locator('option')).toHaveText(['Selecione um marco', 'Fundação']);
    await expect.poll(() => state.reads).toBeGreaterThanOrEqual(2);
    await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
    await page.screenshot({ path: testInfo.outputPath('dependencias-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath('dependencias-mobile.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(item(page)).toHaveText(/Alvenaria.*depende de.*Estrutura/);
    await page.getByRole('link', { name: 'Detalhe do marco', exact: true }).click();
    await expect(page).toHaveURL(`${base}?busca=nome%3DAurora`);
    await expect(page.locator('.dependencias-resumo')).toHaveText(/Alvenaria.*depende de.*Estrutura/);
    await page.getByRole('link', { name: 'Marcos da obra', exact: true }).click();
    const card = page.locator('.marco-card').filter({ has: page.getByRole('heading', { name: 'Alvenaria', exact: true }) });
    await expect(card.locator('.marco-card-dependencies')).toHaveText(/Depende de:.*Estrutura/);
    await expect(page.locator('.marco-card').filter({ has: page.getByRole('heading', { name: 'Estrutura', exact: true }) }).locator('.marco-card-dependencies')).toContainText('Sem dependências');
    await card.screenshot({ path: testInfo.outputPath('marco-com-dependencia.png') });
  });
  test('cancelar e Escape não excluem; foco fica no diálogo e volta ao acionador', async ({ page }, testInfo) => {
    const state = await setup(page, { deps: [link] });
    await page.goto(path);
    await ready(page);
    const trigger = page.getByRole('button', { name: 'Retirar dependência de Estrutura' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Retirar dependência?' });
    const cancel = dialog.getByRole('button', { name: 'Cancelar', exact: true });
    await expect(dialog).toContainText('Alvenaria');
    await expect(dialog).toContainText('Estrutura');
    await expect(cancel).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: 'Retirar vínculo', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(cancel).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('confirmacao-retirada.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await trigger.click();
    await page.screenshot({ path: testInfo.outputPath('confirmacao-retirada-mobile.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await cancel.click();
    await expect(trigger).toBeFocused();
    expect(state.deletes).toHaveLength(0);
    await expect(item(page)).toHaveCount(1);
  });
  test('DELETE usa ID do vínculo, só 204 confirma e marcos permanecem candidatos', async ({ page }) => {
    const state = await setup(page, { deps: [link] });
    await page.goto(path); await ready(page);
    await page.getByRole('button', { name: 'Retirar dependência de Estrutura' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Retirar vínculo', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Dependência retirada.' })).toBeVisible();
    await expect(item(page)).toHaveCount(0);
    await expect(select(page).locator('option')).toHaveText(['Selecione um marco', 'Estrutura', 'Fundação']);
    expect(state.deletes).toEqual([{ marcoId: a, dependencyId: 'vinculo-ab', body: null }]);
    expect(state.records).toEqual(records);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Nenhuma dependência definida' })).toBeVisible();
  });
  for (const message of ['A dependência formaria um ciclo direto', 'A dependência formaria um ciclo indireto', 'Esta dependência já existe', 'A dependência deve pertencer à mesma obra', 'As dependências foram alteradas por outra requisição; tente novamente']) {
    test(`409: ${message}`, async ({ page }) => {
      const state = await setup(page, { post: (route) => route.fulfill({ status: 409, json: { mensagem: message, campos: ['depende_de_id'] } }) });
      await page.goto(path); await ready(page);
      await select(page).selectOption(b); await add(page).click();
      await expect(page.getByRole('alert')).toContainText(message);
      await expect(item(page)).toHaveCount(0);
      await expect(add(page)).toBeDisabled();
      await expect(page.getByRole('status').filter({ hasText: 'Dependência adicionada.' })).toHaveCount(0);
      state.deps = [link];
      state.post = null;
      await page.getByRole('button', { name: 'Reconsultar dependências', exact: true }).click();
      await expect(item(page)).toHaveText(/Alvenaria.*depende de.*Estrutura/);
      await expect(select(page).locator('option')).toHaveText(['Selecione um marco', 'Fundação']);
      await expect(select(page)).toHaveValue('');
      expect(state.posts).toHaveLength(1);
    });
  }
  for (const status of [400, 404, 422, 500, 200]) test(`POST ${status} não apresenta vínculo como salvo`, async ({ page }) => {
    await setup(page, { post: (route) => route.fulfill({ status, json: { mensagem: 'Dependência rejeitada', campos: ['depende_de_id'] } }) });
    await page.goto(path); await ready(page);
    await select(page).selectOption(b); await add(page).click();
    await expect(page.locator('.dependencia-error')).toContainText(status === 200 ? 'não confirmou' : 'Dependência rejeitada');
    await expect(item(page)).toHaveCount(0);
    await expect(add(page)).toBeDisabled();
    if (status === 422) await expect(select(page)).toHaveAttribute('aria-invalid', 'true');
  });
  for (const status of [400, 404, 409, 500, 200]) test(`DELETE ${status} não anuncia retirada e exige nova consulta`, async ({ page }) => {
    const state = await setup(page, { deps: [link], remove: (route) => route.fulfill({ status, json: { mensagem: 'Retirada rejeitada' } }) });
    await page.goto(path); await ready(page);
    await page.getByRole('button', { name: 'Retirar dependência de Estrutura' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Retirar vínculo', exact: true }).click();
    await expect(page.locator('.dependencia-error')).toContainText(status === 200 ? 'não confirmou' : 'Retirada rejeitada');
    await expect(item(page)).toHaveCount(1);
    await expect(page.getByRole('status').filter({ hasText: 'Dependência retirada.' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Reconsultar dependências', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retirar dependência de Estrutura' })).toBeEnabled();
    expect(state.deletes).toHaveLength(1);
  });
  test('lista indisponível e envelope inválido diferem de vazio; nova tentativa recupera', async ({ page }) => {
    const state = await setup(page, { list: (route) => route.fulfill({ status: 500, json: { mensagem: 'Falha ao consultar dependências' } }) });
    await page.goto(path);
    await expect(page.getByRole('alert')).toContainText('Falha ao consultar dependências');
    await expect(page.getByRole('heading', { name: 'Nenhuma dependência definida' })).toHaveCount(0);
    state.list = (route) => route.fulfill({ json: { dependencias: [] } });
    await page.getByRole('button', { name: 'Consultar dependências novamente', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('interpretar a lista de dependências');
    state.list = null;
    await page.getByRole('button', { name: 'Consultar dependências novamente', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nenhuma dependência definida' })).toBeVisible();
  });
  test('201 com resposta incompleta exige consulta e não inventa vínculo', async ({ page }) => {
    const state = await setup(page, { post: (route) => route.fulfill({ status: 201, json: { marco_id: a, depende_de_id: b } }) });
    await page.goto(path); await ready(page);
    await select(page).selectOption(b); await add(page).click();
    await expect(page.locator('.dependencia-error')).toContainText('interpretar a dependência');
    await expect(item(page)).toHaveCount(0);
    expect(state.posts).toHaveLength(1);
  });
  test('falha de releitura após 201 permite consultar sem repetir cadastro', async ({ page }) => {
    const state = await setup(page);
    await page.goto(path); await ready(page);
    state.list = (route) => route.fulfill({ status: 500, json: { mensagem: 'Consulta indisponível' } });
    await select(page).selectOption(b); await add(page).click();
    await expect(page.getByRole('status').filter({ hasText: 'Dependência adicionada.' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Consulta indisponível');
    state.list = null;
    await page.getByRole('button', { name: 'Consultar dependências novamente', exact: true }).click();
    await expect(item(page)).toHaveText(/Alvenaria.*depende de.*Estrutura/);
    expect(state.posts).toHaveLength(1);
  });
  test('falha de candidatos impede POST e permite nova consulta', async ({ page }) => {
    const state = await setup(page, { candidates: (route) => route.fulfill({ status: 500, json: { mensagem: 'Não foi possível consultar os marcos' } }) });
    await page.goto(path);
    await expect(page.getByRole('alert')).toContainText('Não foi possível consultar os marcos');
    await expect(add(page)).toBeDisabled();
    state.candidates = null;
    await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
    await ready(page);
    await expect(select(page).locator('option')).toHaveCount(3);
  });
  test('sem candidatos orienta criar outro marco; todos escolhidos orienta estado completo', async ({ page }) => {
    const state = await setup(page, { records: [records[0]] });
    await page.goto(path);
    await expect(page.getByText('Cadastre outro marco nesta obra para definir uma dependência.')).toBeVisible();
    await expect(select(page)).toBeDisabled();
    await expect(add(page)).toBeDisabled();
    state.records = records; state.deps = [link, { ...link, id: 'vinculo-ac', depende_de_id: c, depende_de_nome: 'Fundação' }];
    await page.reload();
    await expect(page.getByText('Todos os outros marcos já foram escolhidos como pré-requisitos.')).toBeVisible();
    await expect(select(page)).toBeDisabled();
  });
  test('obra incorreta não consulta endpoints de dependências sem contexto', async ({ page }) => {
    const state = await setup(page);
    await page.goto(`/obras/outra-obra/marcos/${a}/dependencias`);
    await expect(page.getByRole('alert')).toContainText('Marco não encontrado nesta obra');
    expect(state.reads).toBe(0);
    expect(state.candidateReads).toBe(0);
    await expect(select(page)).toHaveCount(0);
  });
  test('resposta atrasada de outro marco não mistura vínculos', async ({ page }) => {
    let pending;
    await setup(page, { list: (route, id) => id === a ? (pending = route, undefined) : route.fulfill({ json: [] }) });
    await page.goto(path);
    await expect.poll(() => Boolean(pending)).toBe(true);
    await expect(page.getByRole('status').filter({ hasText: 'Carregando dependências…' })).toBeVisible();
    await page.evaluate((url) => { history.pushState({}, '', url); dispatchEvent(new PopStateEvent('popstate')); }, `/obras/${obraId}/marcos/${b}/dependencias`);
    await expect(page.getByText('Defina quais entregas são pré-requisitos de')).toContainText('Estrutura');
    await pending.fulfill({ json: [link] }).catch(() => {});
    await expect(page.getByRole('heading', { name: 'Nenhuma dependência definida' })).toBeVisible();
    await expect(item(page)).toHaveCount(0);
  });
});
