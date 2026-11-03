import { test, expect } from '@playwright/test';

test.skip(process.env.E2E_REAL === '1', 'Contrato controlado; persistência do servidor é coberta pelo backend.');
const obra = { id: 'obra-a', nome: 'Casa Aurora', estado: 'planejada', entrega: { modalidade: 'data_exata', data: '2030-12-20' } };
const marco = { id: 'marco-a', obra_id: obra.id, nome: 'Estrutura', estado: 'a iniciar', versao: 1 };
const outroMarco = { ...marco, id: 'marco-b', nome: 'Cobertura' };
async function setup(page, responses = [204]) {
  const state = { deletes: [], reads: 0, removed: false };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api', '');
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (req.method() === 'DELETE') {
      state.deletes.push({ path, body: req.postDataJSON() });
      const status = responses[Math.min(state.deletes.length - 1, responses.length - 1)];
      if (status === 204 || status === 503) state.removed = true;
      return route.fulfill(status === 204 ? { status } : { status, json: { codigo: status === 503 ? 'LIMPEZA_PENDENTE' : 'REFERENCIA_EXTERNA', mensagem: 'Não concluída' } });
    }
    if (path === '/obras') return route.fulfill({ json: { obras: state.removed ? [] : [obra], situacao: state.removed ? 'lista_vazia' : 'com_resultados', filtros_aplicados: {} } });
    if (path === '/obras/obra-a') {
      state.reads++;
      return route.fulfill(state.removed && state.deletes.some((d) => d.path === '/obras/obra-a') ? { status: 404, json: { mensagem: 'Ausente' } } : { json: obra });
    }
    if (path === '/obras/obra-a/marcos') return route.fulfill({ json: state.removed ? [outroMarco] : [marco, outroMarco] });
    if (path === '/obras/obra-a/marcos/marco-a') return route.fulfill({ json: marco });
    if (path.endsWith('/dependencias')) return route.fulfill({ json: [] });
    if (path.endsWith('/mudancas')) return route.fulfill({ json: { mudancas: state.removed ? [] : [{ id: 'mudanca-a', obra_id: obra.id, alvo: { tipo: 'obra', id: obra.id }, campos: ['nome'], antes: { nome: 'Antigo' }, depois: { nome: obra.nome }, motivo: 'Histórico que será excluído', autor: 'Construtora', instante: '2030-01-01T12:00:00Z' }] } });
    if (path.endsWith('/historico')) return route.fulfill({ json: { eventos: [] } });
    throw new Error(`Rota inesperada: ${req.method()} ${path}`);
  });
  return state;
}

for (const tipo of ['obra', 'marco']) {
  const path = tipo === 'obra' ? '/obras/obra-a/marcos' : '/obras/obra-a/marcos/marco-a';
  test(`${tipo}: cancelar e Escape não enviam DELETE; confirmação envia somente confirmar`, async ({ page }) => {
    const state = await setup(page);
    await page.goto(path);
    const trigger = page.getByRole('button', { name: `Excluir ${tipo}`, exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(tipo === 'obra' ? obra.nome : marco.nome);
    await expect(dialog).toContainText('Ocorrências, seus históricos e aceitações');
    await expect(dialog).toContainText('Mudanças e histórico');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await trigger.click(); await expect(dialog).toBeVisible(); await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(state.deletes).toEqual([]);
    await trigger.click(); await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
    await expect(page.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
    expect(state.deletes).toEqual([{ path: tipo === 'obra' ? '/obras/obra-a' : '/marcos/marco-a', body: { confirmar: true } }]);
    await expect(page).toHaveURL(tipo === 'obra' ? '/obras' : '/obras/obra-a/marcos');
    if (tipo === 'marco') {
      await expect(page.getByRole('heading', { name: obra.nome, exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: outroMarco.nome, exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: marco.nome, exact: true })).toHaveCount(0);
    }
  });
}

test('pendência sobrevive à recarga e GET 404; retoma mesmo DELETE e só conclui em 204', async ({ page }) => {
  const state = await setup(page, [503, 404, 204]);
  await page.goto('/obras/obra-a/marcos');
  await page.getByRole('button', { name: 'Excluir obra', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
  await expect(page.getByText('Exclusão pendente de confirmação ou limpeza externa.', { exact: false })).toBeVisible();
  // O servidor já não encontra a obra; a operação precisa continuar acessível.
  expect(await page.evaluate(async () => (await fetch('/api/obras/obra-a')).status)).toBe(404);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Exclusões sem confirmação' })).toBeVisible();
  await expect(page.getByRole('heading', { name: obra.nome, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retomar exclusão' }).click();
  await expect(page.getByText('Isso não comprova', { exact: false })).toBeVisible();
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retomar exclusão' }).click();
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toBeVisible();
  expect(state.deletes).toEqual(Array(3).fill({ path: '/obras/obra-a', body: { confirmar: true } }));
});

test('histórico carregado é descartado durante a pendência e não reaparece ao voltar', async ({ page }) => {
  await setup(page, [503, 204]);
  await page.goto('/obras/obra-a/historico');
  await expect(page.getByText('Histórico que será excluído', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir obra', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retomar exclusão' })).toBeEnabled();
  await expect(page.getByText('Histórico que será excluído', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Retomar exclusão' }).click();
  await expect(page).toHaveURL('/obras');
  await page.goto('/obras/obra-a/historico');
  await expect(page.getByRole('heading', { name: 'Obra não encontrada' })).toBeVisible();
  await expect(page.getByText('Histórico que será excluído', { exact: false })).toHaveCount(0);
});

test('sem armazenamento durável não envia DELETE', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/obras/obra-a/marcos');
  await page.getByRole('button', { name: 'Excluir obra', exact: true }).click();
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Armazenamento indisponível'); }; });
  await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
  await expect(page.getByText('Armazenamento indisponível', { exact: false })).toBeVisible();
  expect(state.deletes).toEqual([]);
});

for (const status of [409, 422, 500, 200]) test(`resposta ${status} nunca anuncia sucesso`, async ({ page }) => {
  await setup(page, [status]);
  await page.goto('/obras/obra-a/marcos');
  await page.getByRole('button', { name: 'Excluir obra', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retomar exclusão' })).toBeEnabled();
  await expect(page.getByText('Exclusão concluída.', { exact: false })).toHaveCount(0);
});

test('aviso de sucesso termina ao navegar e não reaparece ao voltar', async ({ page }) => {
  await setup(page);
  await page.goto('/obras/obra-a/marcos/marco-a');
  await page.getByRole('button', { name: 'Excluir marco', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
  const notice = page.getByText('Exclusão concluída.', { exact: false });
  await expect(notice).toBeVisible();
  await expect(page).toHaveURL('/obras/obra-a/marcos');
  await page.getByRole('link', { name: 'Painel das Obras', exact: true }).first().click();
  await expect(page).toHaveURL('/obras');
  await expect(notice).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL('/obras/obra-a/marcos');
  await expect(page.getByRole('heading', { name: outroMarco.nome, exact: true })).toBeVisible();
  await expect(notice).toHaveCount(0);
});

test('navegação não esconde uma exclusão ainda pendente', async ({ page }) => {
  await setup(page, [503]);
  await page.goto('/obras/obra-a/marcos/marco-a');
  await page.getByRole('button', { name: 'Excluir marco', exact: true }).click();
  await page.getByRole('button', { name: 'Excluir definitivamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retomar exclusão' })).toBeVisible();
  await page.getByRole('link', { name: 'Painel das Obras', exact: true }).first().click();
  await expect(page).toHaveURL('/obras');
  await expect(page.getByRole('heading', { name: 'Exclusões sem confirmação' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retomar exclusão' })).toBeVisible();
});
