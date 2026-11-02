import { test, expect } from '@playwright/test';

const base = { nome: 'Residencial Aurora', tipo: 'casa', cliente: 'Cliente de referência', localizacao: 'Campinas, SP', descricao: 'Construção residencial', inicio: '2030-01-15', entrega: { modalidade: 'data_exata', data: '2030-12-20' } };

async function setup(page, options = {}) {
  const state = { obras: [], posts: [], reads: 0, lists: 0 };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-teste'));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, json: body });
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    if (path === '/api/sessoes/atual') return json({ construtora: { id: 'conta', nome: 'Construtora de teste' } });
    if (path === '/api/obras' && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON();
      state.posts.push(payload);
      if (options.create) return options.create(route, state, payload);
      const obra = { ...payload, id: 'obra-criada', estado: 'planejada', autor: 'conta', data_registro: '2026-11-02T10:00:00Z', alertas: [] };
      state.obras.push(obra);
      return route.fulfill({ status: 201, json: obra, headers: { Location: '/obras/obra-criada' } });
    }
    if (path === '/api/obras') { state.lists++; return json({ obras: state.obras, situacao: state.obras.length ? 'com_resultados' : 'lista_vazia', filtros_aplicados: {} }); }
    if (path === '/api/obras/obra-criada') {
      state.reads++;
      if (options.detail) return options.detail(route);
      return state.obras.length ? json(state.obras[0]) : json({ mensagem: 'Obra não encontrada' }, 404);
    }
    throw new Error(`Endpoint inesperado: ${path}`);
  });
  await page.goto('/obras/nova');
  return state;
}

async function preencher(page, dados = base) {
  for (const [label, value] of [['Nome da obra', dados.nome], ['Cliente de referência', dados.cliente], ['Localização', dados.localizacao], ['Descrição', dados.descricao], ['Início da obra', dados.inicio]]) await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel('Tipo de obra').selectOption(dados.tipo);
  await page.getByLabel('Modalidade de entrega').selectOption(dados.entrega.modalidade);
  if (dados.entrega.modalidade === 'data_exata') await page.getByLabel('Data de entrega', { exact: true }).fill(dados.entrega.data);
  else {
    await page.getByLabel('Início do intervalo').fill(dados.entrega.inicio);
    await page.getByLabel('Fim do intervalo').fill(dados.entrega.fim);
  }
}

async function revisar(page) {
  await page.getByRole('button', { name: 'Revisar cadastro' }).click();
  await expect(page.getByRole('heading', { name: 'Revisar obra' })).toBeVisible();
}

test.describe('FE-UC-02 — cadastro com API controlada', () => {
  test.skip(process.env.E2E_REAL === '1', 'API controlada; não comprova Atlas/EC2');
  test.use({ timezoneId: 'America/Sao_Paulo' });

  for (const entrega of [base.entrega, { modalidade: 'intervalo_estimado', inicio: '2030-12-20', fim: '2030-12-20' }]) {
    test(`cria, consulta detalhe, recarrega e atualiza lista: ${entrega.modalidade}`, async ({ page }) => {
      const state = await setup(page);
      const dados = { ...base, tipo: entrega.modalidade === 'data_exata' ? 'casa' : 'apartamentos', entrega };
      await preencher(page, dados);
      await revisar(page);
      expect(state.posts).toHaveLength(0);
      await expect(page.getByText('15/01/2030', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Voltar ao formulário' }).click();
      await expect(page.getByLabel('Nome da obra')).toHaveValue(base.nome);
      await revisar(page);
      await page.getByRole('button', { name: 'Confirmar e salvar' }).click();
      await expect(page).toHaveURL('/obras/obra-criada/marcos');
      await expect(page.getByRole('heading', { name: base.nome })).toBeVisible();
      expect(state.posts).toEqual([dados]);
      expect(state.reads).toBeGreaterThan(0);
      await expect(page.getByRole('region', { name: 'Cadastro da obra' })).toContainText('20/12/2030');
      await page.reload();
      await expect(page.getByRole('heading', { name: base.nome })).toBeVisible();
      expect(state.reads).toBeGreaterThan(1);
      await page.getByRole('main').getByRole('link', { name: 'Painel das Obras', exact: true }).click();
      await expect(page).toHaveURL('/obras');
      await expect(page.getByRole('article').getByRole('heading', { name: base.nome })).toBeVisible();
      expect(state.lists).toBeGreaterThan(0);
      expect(state.posts).toHaveLength(1);
    });
  }

  test('alternância repetida limpa campos incompatíveis e envia somente modalidade ativa', async ({ page }) => {
    const state = await setup(page);
    await preencher(page);
    for (let i = 0; i < 3; i++) {
      await page.getByLabel('Modalidade de entrega').selectOption('intervalo_estimado');
      await expect(page.getByLabel('Início do intervalo')).toHaveValue('');
      await expect(page.getByLabel('Data de entrega', { exact: true })).toHaveCount(0);
      await page.getByLabel('Início do intervalo').fill('2030-11-01');
      await page.getByLabel('Fim do intervalo').fill('2030-12-01');
      await page.getByLabel('Modalidade de entrega').selectOption('data_exata');
      await expect(page.getByLabel('Data de entrega', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('Fim do intervalo')).toHaveCount(0);
      await page.getByLabel('Data de entrega', { exact: true }).fill('2030-12-20');
    }
    await revisar(page);
    await page.getByRole('button', { name: 'Confirmar e salvar' }).click();
    await expect(page.getByRole('heading', { name: base.nome })).toBeVisible();
    expect(state.posts).toEqual([base]);
  });

  test('textos vazios, data impossível e intervalo invertido impedem POST', async ({ page }) => {
    const state = await setup(page);
    await preencher(page);
    for (const label of ['Nome da obra', 'Cliente de referência', 'Localização', 'Descrição']) {
      await page.getByLabel(label, { exact: true }).fill('   ');
      await page.getByRole('button', { name: 'Revisar cadastro' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByLabel(label, { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await preencher(page);
    }
    // O input date normaliza dias impossíveis para vazio, também rejeitado.
    await page.getByLabel('Início da obra').evaluate((input) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, '2030-02-30');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.getByRole('button', { name: 'Revisar cadastro' }).click();
    await expect(page.getByLabel('Início da obra')).toHaveAttribute('aria-invalid', 'true');
    await preencher(page, { ...base, entrega: { modalidade: 'intervalo_estimado', inicio: '2030-12-21', fim: '2030-12-20' } });
    await page.getByRole('button', { name: 'Revisar cadastro' }).click();
    await expect(page.getByLabel('Fim do intervalo')).toHaveAttribute('aria-invalid', 'true');
    expect(state.posts).toHaveLength(0);
  });

  test('cancelar no formulário ou na revisão retorna à lista sem POST', async ({ page }) => {
    const state = await setup(page);
    await preencher(page);
    await page.getByRole('link', { name: 'Cancelar', exact: true }).click();
    await expect(page.getByText('Nenhuma obra cadastrada')).toBeVisible();
    await page.getByRole('link', { name: 'Nova obra', exact: true }).click();
    await preencher(page);
    await revisar(page);
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.getByText('Nenhuma obra cadastrada')).toBeVisible();
    expect(state.posts).toHaveLength(0);
  });

  test('salvamento visível bloqueia cliques duplicados e cancelamento', async ({ page }) => {
    let release;
    const state = await setup(page, { create: async (route, state, payload) => {
      await new Promise((resolve) => { release = resolve; });
      state.obras.push({ ...payload, id: 'obra-criada', estado: 'planejada' });
      return route.fulfill({ status: 201, json: state.obras[0] });
    } });
    await preencher(page);
    await revisar(page);
    await page.getByRole('button', { name: 'Confirmar e salvar' }).evaluate((button) => { button.click(); button.click(); });
    await expect(page.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled();
    await expect(page.getByRole('status')).toHaveText('Salvando obra…');
    expect(state.posts).toHaveLength(1);
    release();
    await expect(page.getByRole('heading', { name: base.nome })).toBeVisible();
  });

  test('422 exibe mensagem e campos, preserva valores e permite correção', async ({ page }) => {
    const state = await setup(page, { create: (route) => route.fulfill({ status: 422, json: { mensagem: 'Localização inválida', campos: ['localizacao'] } }) });
    await preencher(page);
    await revisar(page);
    await page.getByRole('button', { name: 'Confirmar e salvar' }).click();
    await expect(page.getByRole('alert')).toContainText('Localização inválida');
    await expect(page.getByLabel('Localização', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Nome da obra')).toHaveValue(base.nome);
    await page.getByLabel('Localização', { exact: true }).fill('Local corrigido');
    await revisar(page);
    expect(state.posts).toHaveLength(1);
    expect(state.obras).toHaveLength(0);
  });

  for (const failure of ['500', 'rede', 'resposta-perdida', '201-sem-id', '200-inesperado']) {
    test(`${failure}: orienta consulta antes de repetir e não reenvia automaticamente`, async ({ page }) => {
      const state = await setup(page, { create: (route, state, payload) => {
        if (failure === 'resposta-perdida') state.obras.push({ ...payload, id: 'obra-criada' });
        if (failure === 'rede' || failure === 'resposta-perdida') return route.abort('failed');
        return route.fulfill({ status: failure === '500' ? 500 : failure === '200-inesperado' ? 200 : 201, json: failure === '500' ? { mensagem: 'Não foi possível salvar a obra' } : {} });
      } });
      await preencher(page);
      await revisar(page);
      await page.getByRole('button', { name: 'Confirmar e salvar' }).click();
      await expect(page.getByRole('alert')).toContainText('Consulte a lista de obras antes de repetir');
      await expect(page.getByRole('button', { name: 'Confirmar e salvar' })).toBeDisabled();
      await page.getByRole('link', { name: 'Consultar lista de obras' }).click();
      if (failure === 'resposta-perdida') await expect(page.getByRole('heading', { name: base.nome })).toBeVisible();
      else await expect(page.getByText('Nenhuma obra cadastrada')).toBeVisible();
      expect(state.posts).toHaveLength(1);
    });
  }

  test('falha no GET depois de 201 permite consultar novamente sem recriar', async ({ page }) => {
    let failed = true;
    const state = await setup(page, { detail: (route) => failed
      ? route.fulfill({ status: 500, json: { mensagem: 'Não foi possível consultar a obra' } })
      : route.fulfill({ json: state.obras[0] }) });
    await preencher(page);
    await revisar(page);
    await page.getByRole('button', { name: 'Confirmar e salvar' }).click();
    await expect(page.getByRole('alert')).toContainText('Não foi possível consultar a obra');
    failed = false;
    await page.getByRole('button', { name: 'Consultar novamente' }).click();
    await expect(page.getByRole('heading', { name: base.nome })).toBeVisible();
    expect(state.posts).toHaveLength(1);
  });
});
