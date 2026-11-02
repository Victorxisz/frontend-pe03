import { test, expect } from '@playwright/test';
const url = '/obras/obra/historico/nova-mudanca';
const initialObra = { id: 'obra', versao: 2, nome: 'Casa Aurora', localizacao: 'SP', tipo: 'casa', estado: 'planejada', inicio: '2030-01-01', entrega: { modalidade: 'data_exata', data: '2030-12-01' }, alertas: ['atrasada'], data_conclusao: null };
const initialMarco = { id: 'marco', obra_id: 'obra', versao: 4, nome: 'Estrutura', descricao: 'Entrega da estrutura', estado: 'a iniciar', inicio_previsto: '2030-01-01', fim_previsto: '2030-02-01' };
function scenario(extra = {}) { return { obra: structuredClone(initialObra), marco: structuredClone(initialMarco), events: [], posts: [], reads: { obra: 0, lists: 0, history: 0 }, ...extra }; }
async function setup(page, state = scenario()) {
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api', '');
    expect(req.headers().authorization).toBe('Bearer token');
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') { state.reads.obra++; return route.fulfill({ json: state.obra }); }
    if (path === '/obras') { state.reads.lists++; return route.fulfill({ json: [state.obra] }); }
    if (path === '/obras/obra/marcos') { state.reads.lists++; return route.fulfill({ json: [state.marco] }); }
    if (path === '/obras/obra/marcos/marco') {
      if (state.detailStatus) return route.fulfill({ status: state.detailStatus, json: { mensagem: 'Alvo indisponível' } });
      return route.fulfill({ json: state.marco });
    }
    if (path === '/obras/obra/mudancas') {
      if (req.method() === 'GET') {
        state.reads.history++;
        if (state.historyHandler) return state.historyHandler(route);
        if (state.failHistory && state.posts.length) return route.fulfill({ status: 500, json: { mensagem: 'Falha ao consultar histórico' } });
        return route.fulfill({ json: { mudancas: state.events } });
      }
      const body = req.postDataJSON(); state.posts.push(body);
      if (state.status) return route.fulfill({ status: state.status, json: { mensagem: 'Decisão recusada', campos: ['novo_valor'] } });
      const target = body.alvo.tipo === 'obra' ? state.obra : state.marco;
      if (body.versao !== target.versao) return route.fulfill({ status: 409, json: { mensagem: 'Versão desatualizada', campos: ['versao'] } });
      if (body.alvo.tipo === 'marco' && body.campo === 'estado' && body.novo_valor === 'concluído' && state.pending && !body.confirmar_dependencias) return route.fulfill({ status: 409, json: { codigo: 'DEPENDENCIAS_PENDENTES', mensagem: 'Pré-requisitos pendentes', dependencias: [{ id: 'fundacao', nome: 'Fundação', estado: 'em andamento' }] } });
      const prior = body.campo === 'periodo_previsto' ? { inicio_previsto: target.inicio_previsto, fim_previsto: target.fim_previsto } : body.campo === 'estado' && body.alvo.tipo === 'obra' ? { estado: target.estado, data_conclusao: target.data_conclusao } : structuredClone(target[body.campo]);
      const previousValue = body.campo === 'estado' && body.alvo.tipo === 'obra' ? target.estado : prior;
      if (JSON.stringify(previousValue) !== JSON.stringify(body.novo_valor)) {
        if (body.campo === 'periodo_previsto') Object.assign(target, body.novo_valor);
        else target[body.campo] = structuredClone(body.novo_valor);
        if (body.campo === 'estado' && body.alvo.tipo === 'obra') target.data_conclusao = body.novo_valor === 'concluída' ? '2030-05-20' : null;
        target.versao++;
        if (body.campo === 'entrega') target.alertas = [];
        const after = body.campo === 'estado' && body.alvo.tipo === 'obra' ? { estado: target.estado, data_conclusao: target.data_conclusao } : body.novo_valor;
        state.events.push({ id: `evento-${state.events.length + 1}`, obra_id: 'obra', tipo: 'mudanca', alvo: body.alvo, campos: [body.campo], antes: prior, depois: after, motivo: body.motivo, autor: 'autor-servidor', instante: '2030-05-20T00:01:00Z' });
      }
      if (state.lost) return route.abort();
      return route.fulfill({ json: target });
    }
    if (path === '/marcos/marco/dependencias') return route.fulfill({ json: [] });
    throw Error(`Endpoint inesperado: ${req.method()} ${path}`);
  });
  return state;
}
const form = page => page.getByRole('region', { name: 'Decisão de mudança', exact: true });
const history = page => page.getByRole('region', { name: 'Mudanças registradas', exact: true });
const save = page => form(page).getByRole('button', { name: 'Salvar mudança', exact: true });
async function reason(page, text = 'Replanejamento aprovado') { await page.getByRole('textbox', { name: 'Motivo da mudança' }).fill(text); }
async function stateField(page, value) { await page.getByRole('combobox', { name: 'Campo da mudança' }).selectOption('estado'); await page.getByRole('combobox', { name: 'Novo estado' }).selectOption(value); }
async function confirmed(page) { await expect(page.getByRole('status').filter({ hasText: 'Decisão confirmada pelo servidor.' })).toBeVisible(); }
async function marco(page) { await page.getByRole('combobox', { name: 'Tipo do alvo' }).selectOption('marco'); await page.getByRole('combobox', { name: 'Marco', exact: true }).selectOption('marco'); }

test('troca modalidades sem resíduos, atualiza resumo, alerta e histórico persistido na recarga', async ({ page }, info) => {
  const state = await setup(page); await page.goto(`${url}?busca=nome%3DAurora`);
  await page.getByRole('combobox', { name: 'Modalidade de entrega' }).selectOption('intervalo_estimado');
  await page.getByRole('textbox', { name: 'Início do intervalo' }).fill('2031-01-01'); await page.getByRole('textbox', { name: 'Fim do intervalo' }).fill('2031-02-01');
  await reason(page); await save(page).evaluate(b => { b.click(); b.click(); }); await confirmed(page);
  await expect(history(page).locator('article')).toHaveCount(1); await expect(page.getByRole('region', { name: 'Cadastro da obra' })).toContainText('01/01/2031');
  await expect(page.locator('.obra-detail-heading .obra-alerta')).toHaveCount(0);
  expect(state.posts).toEqual([{ alvo: { tipo: 'obra', id: 'obra' }, campo: 'entrega', novo_valor: { modalidade: 'intervalo_estimado', inicio: '2031-01-01', fim: '2031-02-01' }, motivo: 'Replanejamento aprovado', versao: 2 }]);
  await page.getByRole('combobox', { name: 'Modalidade de entrega' }).selectOption('data_exata'); await page.getByRole('textbox', { name: 'Data de entrega' }).fill('2032-03-01'); await reason(page); await save(page).click(); await confirmed(page);
  await expect(history(page).locator('article')).toHaveCount(2); expect(state.posts[1].novo_valor).toEqual({ modalidade: 'data_exata', data: '2032-03-01' });
  expect(state.reads.lists).toBeGreaterThanOrEqual(4);
  await page.evaluate(() => { document.activeElement?.blur(); scrollTo(0, 0); });
  await page.screenshot({ path: info.outputPath('mudanca-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: info.outputPath('mudanca-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.reload(); await expect(history(page).locator('article')).toHaveCount(2); await expect(history(page)).toContainText('autor-servidor');
});
test('conclui, repete sem evento artificial e reabre preservando conclusão anterior', async ({ page }) => {
  const state = await setup(page); await page.goto(url); await stateField(page, 'concluída'); await reason(page); await save(page).click(); await confirmed(page);
  await expect(page.getByRole('region', { name: 'Cadastro da obra' })).toContainText('20/05/2030'); await expect(history(page).locator('article')).toHaveCount(1);
  await reason(page, 'Conferência da mesma decisão'); await save(page).click(); await confirmed(page); await expect(history(page).locator('article')).toHaveCount(1); expect(state.events).toHaveLength(1);
  await page.getByRole('combobox', { name: 'Novo estado' }).selectOption('em andamento'); await reason(page, 'Reabertura para ajustes'); await save(page).click(); await confirmed(page);
  await expect(history(page).locator('article')).toHaveCount(2); expect(state.obra.data_conclusao).toBeNull(); await expect(history(page)).toContainText('20/05/2030');
  expect(state.posts[2]).toEqual({ alvo: { tipo: 'obra', id: 'obra' }, campo: 'estado', novo_valor: 'em andamento', motivo: 'Reabertura para ajustes', versao: 3 });
});
test('altera período de marco com início igual ao fim', async ({ page }) => {
  const state = await setup(page); await page.goto(url); await marco(page);
  await page.getByRole('textbox', { name: 'Início previsto', exact: true }).fill('2030-03-01'); await page.getByRole('textbox', { name: 'Fim previsto', exact: true }).fill('2030-03-01');
  await reason(page); await save(page).click(); await confirmed(page); await expect(history(page).locator('article')).toHaveCount(1);
  expect(state.posts[0]).toEqual({ alvo: { tipo: 'marco', id: 'marco' }, campo: 'periodo_previsto', novo_valor: { inicio_previsto: '2030-03-01', fim_previsto: '2030-03-01' }, motivo: 'Replanejamento aprovado', versao: 4 });
});
test('dependências exigem confirmação, cancelamento não reenvia e confirmação preserva comando', async ({ page }) => {
  const state = await setup(page, scenario({ pending: true })); await page.goto(url); await marco(page); await stateField(page, 'concluído'); await reason(page); await save(page).click();
  await expect(page.getByRole('dialog')).toContainText('Fundação'); await page.getByRole('button', { name: 'Cancelar', exact: true }).click(); expect(state.posts).toHaveLength(1); expect(state.events).toHaveLength(0);
  await save(page).click(); await page.getByRole('button', { name: 'Concluir mesmo assim' }).click(); await confirmed(page);
  expect(state.posts[2]).toEqual({ ...state.posts[1], confirmar_dependencias: true }); await expect(history(page).locator('article')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Novo estado' }).selectOption('a iniciar'); await reason(page); await save(page).click(); await confirmed(page); expect(state.marco.estado).toBe('a iniciar');
});
test('duas abas: versão antiga não sobrescreve nova e preserva intenção até revisão explícita', async ({ page, context }) => {
  const state = await setup(page);
  await page.goto(url); await stateField(page, 'suspensa'); await reason(page, 'Chuva intensa');
  const other = await context.newPage(); await setup(other, state);
  await other.goto(url); await stateField(other, 'em andamento'); await reason(other); await save(other).click(); await confirmed(other);
  await page.bringToFront(); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('complementary', { name: 'Intenção preservada' })).toContainText('Chuva intensa');
  await expect(save(page)).toBeDisabled(); expect(state.obra.estado).toBe('em andamento');
  await page.getByRole('button', { name: 'Revisar intenção com versão atual' }).click();
  await expect(page.getByRole('combobox', { name: 'Novo estado' })).toHaveValue('suspensa'); await expect(page.getByRole('textbox', { name: 'Motivo da mudança' })).toHaveValue('Chuva intensa');
  await save(page).click(); await confirmed(page); expect(state.posts.at(-1).versao).toBe(3); expect(state.obra.estado).toBe('suspensa');
});
test('retorno à aba detecta mudança externa antes do envio', async ({ page }) => {
  const state = await setup(page); await page.goto(url); await reason(page, 'Minha intenção');
  state.obra.versao++; state.obra.entrega = { modalidade: 'data_exata', data: '2032-01-01' };
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByText(/O alvo foi atualizado em outra aba/)).toBeVisible(); await expect(save(page)).toBeDisabled(); expect(state.posts).toHaveLength(0);
});
test('datas invertidas e motivo vazio bloqueiam; cancelar não grava', async ({ page }) => {
  const state = await setup(page); await page.goto(url); await expect(save(page)).toBeDisabled();
  await page.getByRole('combobox', { name: 'Modalidade de entrega' }).selectOption('intervalo_estimado');
  await page.getByRole('textbox', { name: 'Início do intervalo' }).fill('2030-05-10'); await page.getByRole('textbox', { name: 'Fim do intervalo' }).fill('2030-05-01');
  await reason(page); await save(page).click(); await expect(page.getByText(/entrega.fim: O fim não pode anteceder/)).toBeVisible();
  await page.getByRole('link', { name: 'Cancelar e voltar' }).click(); expect(state.posts).toHaveLength(0); expect(state.events).toHaveLength(0);
});
for (const status of [400, 404, 422, 500]) test(`erro ${status} não anuncia histórico criado`, async ({ page }) => {
  const state = await setup(page, scenario({ status })); await page.goto(url); await stateField(page, 'suspensa'); await reason(page); await save(page).click();
  await expect(page.getByText('Decisão recusada', { exact: true })).toBeVisible(); expect(state.events).toHaveLength(0);
  await expect(page.getByRole('status').filter({ hasText: 'Decisão confirmada pelo servidor.' })).toHaveCount(0);
  if (status === 422) await expect(save(page)).toBeEnabled(); else await expect(save(page)).toBeDisabled();
});
test('resposta perdida exige consulta antes de repetir e reconhece valor aplicado', async ({ page }) => {
  const state = await setup(page, scenario({ lost: true })); await page.goto(url); await stateField(page, 'suspensa'); await reason(page); await save(page).click();
  await page.getByRole('button', { name: 'Revisar intenção com versão atual' }).click(); await expect(history(page).locator('article')).toHaveCount(1); expect(state.posts).toHaveLength(1);
});
test('falha de consulta após 200 permite repetir somente leituras', async ({ page }) => {
  const state = await setup(page, scenario({ failHistory: true })); await page.goto(url); await stateField(page, 'suspensa'); await reason(page); await save(page).click(); await confirmed(page);
  await expect(page.getByText(/Decisão confirmada, mas a atualização/)).toBeVisible(); state.failHistory = false;
  await page.getByRole('button', { name: 'Atualizar consultas' }).click(); await expect(history(page).locator('article')).toHaveCount(1); expect(state.posts).toHaveLength(1);
});
test('link do detalhe abre o marco e campo corretos preservando busca', async ({ page }) => {
  await setup(page); await page.goto('/obras/obra/marcos/marco?busca=nome%3DAurora'); await page.getByRole('link', { name: 'Replanejar período do marco' }).click();
  await expect(page.getByRole('combobox', { name: 'Marco', exact: true })).toHaveValue('marco'); await expect(page.getByRole('textbox', { name: 'Início previsto', exact: true })).toHaveValue('2030-01-01'); await expect(page).toHaveURL(/busca=nome%3DAurora/);
});

test('409 sem aviso de foco relê valor atual e mantém intenção sem reenviar', async ({ page }) => {
  const state = await setup(page); await page.goto(url); await stateField(page, 'suspensa'); await reason(page, 'Intenção antiga');
  state.obra.versao = 8; state.obra.estado = 'em andamento';
  await save(page).evaluate(b => b.click());
  await expect(page.getByText('Versão desatualizada', { exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Intenção preservada' })).toContainText('Intenção antiga');
  await expect(page.locator('.mudanca-current')).toContainText('em andamento'); expect(state.posts).toHaveLength(1);
  await page.getByRole('button', { name: 'Revisar intenção com versão atual' }).click(); await save(page).click(); await confirmed(page);
  expect(state.posts[1].versao).toBe(8); expect(state.obra.estado).toBe('suspensa');
});


test('consulta inicial atrasada não substitui histórico confirmado mais recente', async ({ page }) => {
  let release;
  const state = await setup(page, scenario({ historyHandler: route => new Promise(resolve => { release = async () => { await route.fulfill({ json: { mudancas: [] } }); resolve(); }; }) }));
  await page.goto(url); await stateField(page, 'suspensa'); await reason(page);
  state.historyHandler = null;
  await save(page).click(); await confirmed(page); await expect(history(page).locator('article')).toHaveCount(1);
  await release(); await expect(history(page).locator('article')).toHaveCount(1);
});

test('atualizar consultas não adota versão nova para intenção antiga sem revisão', async ({ page }) => {
  const state = await setup(page, scenario({ historyHandler: route => route.fulfill({ status: 500, json: { mensagem: 'Histórico indisponível' } }) }));
  await page.goto(url); await stateField(page, 'suspensa'); await reason(page, 'Intenção antiga');
  await expect(page.getByRole('button', { name: 'Atualizar consultas' })).toBeVisible();
  state.historyHandler = null; state.obra.versao = 8; state.obra.estado = 'em andamento';
  await page.getByRole('button', { name: 'Atualizar consultas' }).click();
  await expect(page.locator('.mudanca-current')).toContainText('Versão: 8');
  await expect(save(page)).toBeDisabled();
  await expect(page.getByRole('complementary', { name: 'Intenção preservada' })).toContainText('Intenção antiga');
  expect(state.posts).toHaveLength(0);
  await page.getByRole('button', { name: 'Revisar intenção com versão atual' }).click();
  await expect(page.getByRole('combobox', { name: 'Novo estado' })).toHaveValue('suspensa');
  await save(page).click(); await confirmed(page);
  expect(state.posts[0].versao).toBe(8); expect(state.obra.estado).toBe('suspensa');
});

test('releitura após salvar detecta mudança concorrente sem liberá-la como base', async ({ page }) => {
  const state = await setup(page); let changed = false;
  await page.route('**/api/obras/obra', async route => {
    if (state.posts.length && !changed) { state.obra.versao++; state.obra.estado = 'em andamento'; changed = true; }
    return route.fallback();
  });
  await page.goto(url); await stateField(page, 'suspensa'); await reason(page); await save(page).click(); await confirmed(page);
  await expect(page.locator('.mudanca-current')).toContainText('Versão: 4');
  await expect(save(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Revisar intenção com versão atual' })).toBeVisible();
  expect(state.posts).toHaveLength(1); expect(state.obra.estado).toBe('em andamento');
  await page.getByRole('button', { name: 'Revisar intenção com versão atual' }).click();
  await reason(page, 'Revisão consciente da intenção'); await save(page).click(); await confirmed(page);
  expect(state.posts[1].versao).toBe(4); expect(state.obra.estado).toBe('suspensa');
});
