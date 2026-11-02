import { test, expect } from '@playwright/test';
const base = '/obras/obra/ocorrencias/oc';
const ace = { id: 'ace', justificativa: 'Decisão antiga', autor: 'autora', data: '2030-01-01T12:00:00Z', episodio: 1 };
async function setup(page) {
  const state = { item: { id: 'oc', obra_id: 'obra', titulo: 'Infiltração', descricao: 'Parede úmida', estado: 'sem solução', marco_id: 'marco', responsavel_id: 'ana', autor: 'autora', data_registro: '2030-01-01T12:00:00Z', midias: [], versao: 1, episodio: 1, historico_estados: [], aceitacoes: [ace], aceitacoes_do_estado_atual: [ace] }, workers: [{ id: 'ana', nome: 'Ana', obras: ['obra'] }, { id: 'bia', nome: 'Bia', obras: ['obra'] }], patches: [], status: null, lost: false };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = decodeURIComponent(new URL(req.url()).pathname.replace('/api', ''));
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa', localizacao: 'SP', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/marcos') return route.fulfill({ json: [{ id: 'marco', nome: 'Fundação', obra_id: 'obra' }] });
    if (path === '/trabalhadores/obra/obra/') return route.fulfill({ json: state.workers });
    if (path === '/obras/obra/ocorrencias') return route.fulfill({ json: { ocorrencias: [state.item] } });
    if (path === '/ocorrencias/oc') {
      if (req.method() === 'GET') return route.fulfill({ json: state.item });
      if (req.method() === 'PATCH') {
        const body = req.postDataJSON(); state.patches.push(body);
        if (state.status) return route.fulfill({ status: state.status, json: { mensagem: 'Falha controlada' } });
        if (body.versao !== state.item.versao) return route.fulfill({ status: 409, json: { mensagem: 'Versão antiga' } });
        const item = structuredClone(state.item); Object.assign(item, body.alteracoes || {});
        if (body.transicao && body.transicao.estado !== item.estado) {
          item.historico_estados.push({ id: `e${item.episodio}`, estado_anterior: item.estado, novo_estado: body.transicao.estado, motivo: body.transicao.motivo, autor: 'outra-autora', instante: '2030-02-01T12:00:00Z', episodio: item.episodio + 1 });
          item.estado = body.transicao.estado; item.episodio++; item.aceitacoes_do_estado_atual = [];
        }
        item.versao++; state.item = item;
        if (state.lost) return route.abort();
        return route.fulfill({ json: item });
      }
    }
    return route.fulfill({ status: 404, json: { mensagem: 'Não encontrado' } });
  });
  return state;
}
test('resolve e reabre sem transferir aceitação antiga; preserva histórico', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/editar`);
  await page.getByLabel('Novo estado').selectOption('resolvida'); await page.getByLabel('Motivo da mudança').fill('Reparo concluído');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Ocorrência atualizada com sucesso.')).toBeVisible();
  expect(state.patches[0]).toEqual({ versao: 1, transicao: { estado: 'resolvida', motivo: 'Reparo concluído' } });
  await page.getByRole('link', { name: 'Atualizar ocorrência' }).click(); await page.getByLabel('Novo estado').selectOption('sem solução'); await page.getByLabel('Motivo da mudança').fill('Problema retornou');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Nenhuma aceitação no episódio atual.')).toBeVisible(); await expect(page.getByText('Justificativa: Decisão antiga')).toHaveCount(1);
  await expect(page.getByText('Motivo: Reparo concluído')).toBeVisible(); await expect(page.getByText('Motivo: Problema retornou')).toBeVisible();
  await page.reload(); await expect(page.getByText('Motivo: Reparo concluído')).toBeVisible(); expect(state.patches).toHaveLength(2);
});
test('edição descritiva não envia estado ou responsável inalterado', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/editar`); await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Causa confirmada');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Ocorrência atualizada com sucesso.')).toBeVisible();
  expect(state.patches).toEqual([{ versao: 1, alteracoes: { descricao: 'Causa confirmada' } }]); expect(state.item.estado).toBe('sem solução');
});
test('retirar vínculos envia null, sem inventar transição', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/editar`); await page.getByRole('combobox', { name: 'Marco', exact: true }).selectOption(''); await page.getByRole('combobox', { name: 'Responsável', exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Ocorrência atualizada com sucesso.')).toBeVisible();
  expect(state.patches).toEqual([{ versao: 1, alteracoes: { marco_id: null, responsavel_id: null } }]);
});
test('conflito em outra aba exige comparar e revisar antes de reenviar', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/editar`); await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Minha descrição');
  state.item = { ...state.item, versao: 2, titulo: 'Alterado em outra aba', responsavel_id: null, responsavel_anterior: { nome: 'Ana' } };
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText(/mudou em outra sessão/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled(); await page.getByRole('button', { name: 'Consultar estado atual' }).click();
  await expect(page.getByRole('region', { name: 'Comparação com estado atual' })).toContainText('Alterado em outra aba');
  await page.getByRole('button', { name: 'Revisar com dados atuais' }).click(); await expect(page.getByRole('textbox', { name: 'Título', exact: true })).toHaveValue('Alterado em outra aba');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Ocorrência atualizada com sucesso.')).toBeVisible();
  expect(state.patches[1]).toEqual({ versao: 2, alteracoes: { descricao: 'Minha descrição' } }); await expect(page.getByText(/Responsável anterior \(histórico\): Ana/)).toBeVisible();
});
test('resposta perdida exige releitura sem repetir escrita', async ({ page }) => {
  const state = await setup(page); state.lost = true; await page.goto(`${base}/editar`); await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Descrição salva');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText(/Não foi possível confirmar a atualização/)).toBeVisible();
  await page.getByRole('button', { name: 'Consultar estado atual' }).click(); await expect(page.getByRole('region', { name: 'Comparação com estado atual' })).toContainText('Descrição salva');
  await page.getByRole('button', { name: 'Revisar com dados atuais' }).click(); expect(state.patches).toHaveLength(1);
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Nenhuma alteração para salvar.')).toBeVisible(); expect(state.patches).toHaveLength(1);
});
test('responsável desvinculado é revalidado antes de enviar; cancelar não grava', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/editar`); await page.getByRole('link', { name: 'Cancelar' }).click(); expect(state.patches).toHaveLength(0);
  await page.goto(`${base}/editar`); await page.getByRole('combobox', { name: 'Responsável', exact: true }).selectOption('bia'); state.workers = state.workers.filter(w => w.id !== 'bia');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText(/não está mais vinculado/)).toBeVisible(); expect(state.patches).toHaveLength(0);
});
for (const status of [400, 404, 415, 422, 503]) test(`falha ${status} não cria sucesso nem transição`, async ({ page }) => {
  const state = await setup(page); state.status = status; await page.goto(`${base}/editar`); await page.getByLabel('Novo estado').selectOption('aberta'); await page.getByLabel('Motivo da mudança').fill('Motivo');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  if (status === 503) await expect(page.getByText(/Não foi possível confirmar a atualização/)).toBeVisible(); else await expect(page.getByText('Falha controlada')).toBeVisible();
  expect(state.item.estado).toBe('sem solução'); expect(state.patches).toHaveLength(1);
});
test('correção de texto e transição podem ser enviadas juntas', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/editar`);
  await page.getByRole('textbox', { name: 'Título', exact: true }).fill('Fachada reparada');
  await page.getByLabel('Novo estado').selectOption('resolvida'); await page.getByLabel('Motivo da mudança').fill('Inspeção concluída');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Ocorrência atualizada com sucesso.')).toBeVisible();
  expect(state.patches).toEqual([{ versao: 1, alteracoes: { titulo: 'Fachada reparada' }, transicao: { estado: 'resolvida', motivo: 'Inspeção concluída' } }]);
});
