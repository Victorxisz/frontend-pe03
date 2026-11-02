import { test, expect } from '@playwright/test';

const obra = { id: 'obra-teste', nome: 'Residencial Aurora', cliente: 'Marina Costa', localizacao: 'Campinas, SP', descricao: 'Casa com dois pavimentos.', tipo: 'casa', inicio: '2024-01-10', entrega: { modalidade: 'intervalo_estimado', inicio: '2025-11-01', fim: '2025-12-31' }, estado: 'concluída', data_conclusao: '2026-01-10', alertas: ['atrasada'], autor: 'conta', data_registro: '2024-01-01T12:00:00Z', versao: 3 };
const labels = { nome: 'Nome da obra', cliente: 'Cliente de referência', localizacao: 'Localização', descricao: 'Descrição' };
const editPath = '/obras/obra-teste/editar';
const detailPath = '/obras/obra-teste/marcos';

async function setup(page, overrides = {}) {
  const state = { obra: structuredClone(obra), patches: [], reads: 0, lists: 0, ...overrides };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    if (path === '/api/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Horizonte Construções' } } });
    if (path === '/api/obras') {
      state.lists++;
      return route.fulfill({ json: { obras: [state.obra], situacao: 'com_resultados', filtros_aplicados: {} } });
    }
    if (path === '/api/obras/obra-teste/mudancas' && route.request().method() === 'GET') return route.fulfill({ json: { mudancas: [] } });
    if (path === '/api/obras/obra-teste/marcos') return route.fulfill({ json: [] });
    if (path === '/api/obras/obra-teste' && route.request().method() === 'GET') {
      state.reads++;
      if (state.get) return state.get(route);
      return route.fulfill({ json: state.obra });
    }
    if (path === '/api/obras/obra-teste' && route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      state.patches.push(body);
      if (state.patch) return state.patch(route, body);
      state.obra = { ...state.obra, ...body };
      // Contrato real: sucesso é parcial, sem prazo/alertas/auditoria.
      return route.fulfill({ json: Object.fromEntries(['id', ...Object.keys(labels)].map((campo) => [campo, state.obra[campo]])) });
    }
    throw new Error(`Endpoint inesperado: ${route.request().method()} ${path}`);
  });
  return state;
}

async function openEdit(page, path = editPath) {
  await page.goto(path);
  await expect(page.getByLabel('Nome da obra', { exact: true })).toHaveValue(obra.nome);
}
async function save(page) { await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click(); }

test.describe('FE-UC-04 — edição descritiva', () => {
  test.skip(process.env.E2E_REAL === '1', 'API controlada; persistência Atlas exige teste próprio');

  for (const [campo, label] of Object.entries(labels)) {
    test(`edita ${campo}, reconsulta e preserva planejamento após resposta parcial`, async ({ page }) => {
      const state = await setup(page);
      await page.goto(detailPath);
      await page.getByRole('link', { name: 'Editar obra', exact: true }).click();
      await expect(page.getByLabel(label, { exact: true })).toHaveValue(obra[campo]);
      const corrected = `${obra[campo]} corrigido`;
      await page.getByLabel(label, { exact: true }).fill(corrected);
      await save(page);
      await expect(page).toHaveURL(detailPath);
      await expect(page.getByRole('region', { name: 'Cadastro da obra' })).toContainText(corrected);
      await expect(page.getByRole('status')).toHaveText('Dados da obra atualizados.');
      expect(state.patches).toEqual([{ [campo]: corrected }]);
      expect(state.obra).toEqual({ ...obra, [campo]: corrected });
      expect(state.reads).toBeGreaterThanOrEqual(3);
      const detail = page.getByRole('region', { name: 'Cadastro da obra' });
      await expect(detail).toContainText('Intervalo estimado: 01/11/2025 a 31/12/2025');
      await expect(detail).toContainText('10/01/2026');
      await expect(page.getByText('Atrasada', { exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByRole('region', { name: 'Cadastro da obra' })).toContainText(corrected);
      await page.getByRole('main').getByRole('link', { name: 'Painel das Obras', exact: true }).click();
      await expect(page.getByRole('article')).toContainText(state.obra.nome);
      await expect(page.getByRole('article')).toContainText(state.obra.cliente);
      expect(state.lists).toBeGreaterThan(0);
    });
  }

  test('somente quatro campos editáveis, sem alterações não envia PATCH, cancelamento preserva busca', async ({ page }) => {
    const state = await setup(page);
    const query = '?busca=nome%3DAurora';
    await openEdit(page, editPath + query);
    await expect(page.getByRole('textbox')).toHaveCount(4);
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    await page.getByLabel('Nome da obra', { exact: true }).fill(`  ${obra.nome}  `);
    await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    await page.getByLabel('Nome da obra', { exact: true }).fill('Mudança descartada');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page).toHaveURL(detailPath + query);
    await expect(page.getByRole('heading', { name: obra.nome, exact: true })).toBeVisible();
    expect(state.patches).toHaveLength(0);
    expect(state.obra).toEqual(obra);
  });

  test('UC-12 é acessível sem permitir replanejamento pelo formulário descritivo', async ({ page }) => {
    const state = await setup(page);
    await openEdit(page);
    await page.getByRole('link', { name: 'Registrar mudança', exact: true }).click();
    await expect(page).toHaveURL('/obras/obra-teste/historico/nova-mudanca');
    await expect(page.getByRole('heading', { name: 'Registrar mudança', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Campo da mudança' })).toHaveValue('entrega');
    await expect(page.locator('.mudanca-current')).toContainText('01/11/2025');
    expect(state.patches).toHaveLength(0);
  });

  for (const [campo, label] of Object.entries(labels)) {
    test(`texto vazio em ${campo} é rejeitado sem envio`, async ({ page }) => {
      const state = await setup(page);
      await openEdit(page);
      await page.getByLabel(label, { exact: true }).fill('   ');
      await save(page);
      await expect(page.getByRole('alert')).toContainText('Revise os campos indicados');
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
      expect(state.patches).toHaveLength(0);
    });
  }

  test('carrega antes de editar e não oferece formulário durante a consulta', async ({ page }) => {
    let release;
    await setup(page, { get: async (route) => {
      await new Promise((resolve) => { release = resolve; });
      return route.fulfill({ json: obra });
    } });
    await page.goto(editPath);
    await expect(page.getByRole('status')).toHaveText('Carregando dados da obra…');
    await expect(page.getByRole('textbox')).toHaveCount(0);
    release();
    await expect(page.getByLabel('Nome da obra', { exact: true })).toHaveValue(obra.nome);
  });

  test('salvamento bloqueia duplo clique, edição e cancelamento', async ({ page }) => {
    let release;
    const state = await setup(page, { patch: async (route, body) => {
      await new Promise((resolve) => { release = resolve; });
      state.obra = { ...state.obra, ...body };
      return route.fulfill({ json: Object.fromEntries(['id', ...Object.keys(labels)].map((campo) => [campo, state.obra[campo]])) });
    } });
    await openEdit(page);
    await page.getByLabel('Nome da obra', { exact: true }).fill('Aurora atualizada');
    await page.getByRole('button', { name: 'Salvar alterações' }).evaluate((button) => { button.click(); button.click(); });
    await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    await expect(page.getByLabel('Nome da obra', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
    expect(state.patches).toHaveLength(1);
    release();
    await expect(page.getByRole('heading', { name: 'Aurora atualizada', exact: true })).toBeVisible();
  });

  for (const status of [400, 404, 500]) {
    test(`GET ${status} não mostra formulário e permite reconsulta`, async ({ page }) => {
      const state = await setup(page, { get: (route) => route.fulfill({ status, json: { mensagem: 'Consulta recusada' } }) });
      await page.goto(editPath);
      await expect(page.getByRole('alert')).toContainText(status === 400 ? 'referência da obra é inválida' : status === 404 ? 'Obra não encontrada' : 'Não foi possível carregar');
      await expect(page.getByRole('textbox')).toHaveCount(0);
      state.get = null;
      await page.getByRole('button', { name: 'Consultar novamente' }).click();
      await expect(page.getByLabel('Nome da obra', { exact: true })).toHaveValue(obra.nome);
      expect(state.patches).toHaveLength(0);
    });
  }

  for (const status of [400, 404, 422, 500, 503, 0]) {
    test(`PATCH ${status} preserva o que foi digitado sem anunciar sucesso`, async ({ page }) => {
      const state = await setup(page, { patch: (route) => status ? route.fulfill({ status, json: { mensagem: 'Localização inválida', campos: status === 422 ? ['localizacao'] : [] } }) : route.abort('failed') });
      await openEdit(page);
      await page.getByLabel('Localização', { exact: true }).fill('Localização corrigida');
      await save(page);
      await expect(page.getByRole('alert')).toContainText(status === 400 ? 'referência da obra é inválida' : status === 404 ? 'Obra não encontrada' : status === 422 ? 'Localização inválida' : 'Não foi possível confirmar');
      await expect(page.getByLabel('Localização', { exact: true })).toHaveValue('Localização corrigida');
      await expect(page).toHaveURL(editPath);
      await expect(page.getByText('Dados da obra atualizados.', { exact: true })).toHaveCount(0);
      if (status === 422) await expect(page.getByLabel('Localização', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      if (!status || status >= 500) {
        await page.getByLabel('Nome da obra', { exact: true }).fill('Outro nome');
        await expect(page.getByRole('button', { name: 'Salvar alterações', exact: true })).toBeDisabled();
        await expect(page.getByRole('link', { name: 'Consultar obra', exact: true })).toBeVisible();
      }
      expect(state.obra).toEqual(obra);
      expect(state.patches).toHaveLength(1);
    });
  }

  test('422 de campo controlado mantém cadastro e ligação para UC-12', async ({ page }) => {
    const state = await setup(page, { patch: (route) => route.fulfill({ status: 422, json: { mensagem: 'Prazo e conclusão exigem mudança com motivo e histórico.', campos: ['entrega'] } }) });
    await openEdit(page);
    await page.getByLabel('Nome da obra', { exact: true }).fill('Novo nome');
    await save(page);
    await expect(page.getByRole('alert')).toContainText('mudança com motivo e histórico');
    await expect(page.getByLabel('Nome da obra', { exact: true })).toHaveValue('Novo nome');
    expect(state.patches).toEqual([{ nome: 'Novo nome' }]);
    await expect(page.getByRole('link', { name: 'Registrar mudança', exact: true })).toBeVisible();
  });

  test('falha na releitura após PATCH só permite repetir a consulta', async ({ page }) => {
    const state = await setup(page);
    await openEdit(page);
    await page.getByLabel('Nome da obra', { exact: true }).fill('Novo nome');
    state.get = (route) => route.fulfill({ status: 500, json: { mensagem: 'Não foi possível consultar a obra' } });
    await save(page);
    await expect(page).toHaveURL(detailPath);
    await expect(page.getByRole('alert')).toContainText('Não foi possível consultar');
    await expect(page.getByText('Dados da obra atualizados.', { exact: true })).toHaveCount(0);
    state.get = null;
    await page.getByRole('button', { name: 'Consultar novamente' }).click();
    await expect(page.getByRole('heading', { name: 'Novo nome', exact: true })).toBeVisible();
    expect(state.patches).toHaveLength(1);
  });

  test('visual da edição em desktop e celular', async ({ page }, testInfo) => {
    await setup(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openEdit(page);
    await page.screenshot({ path: testInfo.outputPath('edicao-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('edicao-mobile.png'), fullPage: true });
  });
});
