import { test, expect } from '@playwright/test';
const base = '/obras/obra/trabalhadores';
async function setup(page) {
  const state = { item: { id: 'pessoa', nome: 'Ana Souza', cargo: 'Pedreira', email: 'ana@example.com', telefone: '11987654321', ativo: true, data_cadastro: '2030-01-01T00:00:00Z', obras: ['obra', 'outra'] }, patches: [], deletes: [], reads: [], status: 200, deleteStatus: 200, lost: false, refreshFail: false, retained: false };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = decodeURIComponent(new URL(req.url()).pathname.replace('/api', '')); state.reads.push(`${req.method()} ${path}`);
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa A', localizacao: 'SP', entrega: {}, alertas: [] } });
    if (path === '/obras') return route.fulfill({ json: { obras: [{ id: 'obra', nome: 'Casa A' }, { id: 'outra', nome: 'Casa B' }] } });
    if (path.startsWith('/obras/') && path.endsWith('/ocorrencias')) return state.refreshFail ? route.fulfill({ status: 503, json: { mensagem: 'Erro de leitura' } }) : route.fulfill({ json: { ocorrencias: state.retained && path === '/obras/obra/ocorrencias' ? [{ id: 'oc', responsavel_id: 'pessoa' }] : [] } });
    if (path.startsWith('/trabalhadores/obra/')) { const id = path.split('/')[3]; return route.fulfill({ json: state.item?.obras.includes(id) ? [state.item] : [] }); }
    if (path.startsWith('/trabalhadores/cargo/')) return route.fulfill({ json: state.item ? [state.item] : [] });
    if (path.startsWith('/trabalhadores/nome/')) return route.fulfill({ json: state.item ? [state.item] : [] });
    if (path === '/trabalhadores/pessoa/') {
      if (req.method() === 'GET') return state.item ? route.fulfill({ json: state.item }) : route.fulfill({ status: 404, json: { erro: 'Trabalhador não encontrado' } });
      if (req.method() === 'PATCH') { const data = req.postDataJSON(); state.patches.push(data);
        if (state.status !== 200) return route.fulfill({ status: state.status, json: { erro: 'Conjunto recusado', obras: ['outra'] } });
        Object.assign(state.item, data); if (state.lost) return route.abort();
        return route.fulfill({ json: { mensagem: 'Atualizado', id: 'pessoa' } }); }
      if (req.method() === 'DELETE') { state.deletes.push(req.postData());
        if (state.deleteStatus !== 200) return route.fulfill({ status: state.deleteStatus, json: { erro: 'Exclusão recusada' } });
        state.item = null; if (state.lost) return route.abort();
        return route.fulfill({ json: { mensagem: 'Trabalhador excluído com sucesso', id: 'pessoa', ocorrencias_sem_responsavel: 2 } }); }
    }
    return route.fulfill({ status: 404, json: { erro: 'Não encontrado' } });
  });
  return state;
}
test('corrige dados e relê detalhe, equipes e ocorrências envolvidas', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/pessoa/editar`); await page.getByLabel('Nome completo').fill('Ana Oliveira');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Cadastro atualizado e consultas refeitas.')).toBeVisible();
  expect(state.patches).toEqual([{ nome: 'Ana Oliveira' }]); for (const path of ['/trabalhadores/obra/obra/', '/trabalhadores/obra/outra/', '/obras/obra/ocorrencias', '/obras/outra/ocorrencias']) expect(state.reads).toContain(`GET ${path}`);
});
test('lista vazia exige revisão e explica limpeza das atribuições', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/pessoa/editar`);
  await page.getByRole('checkbox', { name: /Casa A/ }).uncheck(); await page.getByRole('checkbox', { name: /Casa B/ }).uncheck();
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('as atribuições nas ocorrências dessas obras serão limpas'); await expect(dialog).toContainText('Casa A, Casa B');
  await dialog.getByRole('button', { name: 'Salvar vínculos' }).click(); await expect(page.getByText('Nenhuma obra vinculada.')).toBeVisible(); expect(state.patches).toEqual([{ obras: [] }]);
  await page.getByRole('link', { name: 'Voltar à equipe' }).click(); await page.getByLabel('Nome na construtora').fill('Ana'); await page.getByRole('button', { name: 'Buscar na construtora' }).click();
  await expect(page.getByText('Sem vínculo com esta obra')).toBeVisible(); await page.getByRole('link', { name: 'Ana Souza' }).click(); await expect(page.getByText('Nenhuma obra vinculada.')).toBeVisible();
  await page.getByRole('link', { name: 'Editar cadastro e vínculos' }).click(); await page.getByRole('checkbox', { name: /Casa A/ }).check();
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText('Cadastro atualizado e consultas refeitas.')).toBeVisible();
  expect(state.patches[1]).toEqual({ obras: ['obra'] });
});
test('422 apresenta obras ausentes e não informa sucesso', async ({ page }) => {
  const state = await setup(page); state.status = 422; await page.goto(`${base}/pessoa/editar`); await page.getByLabel('Nome completo').fill('Ana Maria');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText(/Obras não encontradas: outra/)).toBeVisible(); await expect(page.getByText('Cadastro atualizado e consultas refeitas.')).toHaveCount(0);
});
test('cancelar e Escape não excluem; confirmação usa 200 e contagem', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/pessoa`);
  await page.getByRole('button', { name: 'Excluir trabalhador' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
  await page.getByRole('button', { name: 'Excluir trabalhador' }).click(); await page.keyboard.press('Escape'); expect(state.deletes).toEqual([]);
  await page.getByRole('button', { name: 'Excluir trabalhador' }).click(); await expect(page.getByRole('dialog')).toContainText('Ana Souza');
  await page.getByRole('dialog').getByRole('button', { name: 'Excluir trabalhador' }).click(); await expect(page.getByText('Ocorrências sem responsável: 2.')).toBeVisible();
  expect(state.deletes).toEqual([null]); expect(state.reads).toContain('GET /obras/obra/ocorrencias'); expect(state.reads).toContain('GET /obras/outra/ocorrencias');
});
test('resposta perdida bloqueia novo PATCH até consultar; nenhum sucesso é fabricado', async ({ page }) => {
  const state = await setup(page); state.lost = true; await page.goto(`${base}/pessoa/editar`); await page.getByLabel('Nome completo').fill('Ana Maria');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText(/Não foi possível confirmar a atualização/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled(); await page.getByRole('button', { name: 'Consultar cadastro atual' }).click();
  await expect(page.getByText('Atual: Ana Maria')).toBeVisible(); expect(state.patches).toHaveLength(1);
});
test('alteração concorrente exige revisão e não envia PATCH', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/pessoa/editar`); await page.getByLabel('Nome completo').fill('Ana Maria');
  state.item.cargo = 'Engenheira'; await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText(/cadastro mudou desde a abertura/)).toBeVisible(); await expect(page.getByText('Atual: Engenheira')).toBeVisible(); expect(state.patches).toHaveLength(0);
  await page.getByRole('button', { name: 'Revisar com dados atuais' }).click(); await expect(page.getByLabel('Cargo')).toHaveValue('Engenheira');
});
test('falha na releitura após sucesso não repete PATCH', async ({ page }) => {
  const state = await setup(page); state.refreshFail = true; await page.goto(`${base}/pessoa/editar`); await page.getByLabel('Nome completo').fill('Ana Maria');
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await expect(page.getByText(/Atualização confirmada, mas a releitura falhou/)).toBeVisible();
  expect(state.patches).toHaveLength(1); state.refreshFail = false; await page.getByRole('button', { name: 'Repetir consultas' }).click();
  await expect(page.getByText('Cadastro atualizado e consultas refeitas.')).toBeVisible(); expect(state.patches).toHaveLength(1);
});

test('exclusão não confirmada bloqueia repetição até nova consulta', async ({ page }) => {
  const state = await setup(page); state.deleteStatus = 503; await page.goto(`${base}/pessoa`);
  await page.getByRole('button', { name: 'Excluir trabalhador' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Excluir trabalhador' }).click();
  await expect(page.getByText(/Não foi possível confirmar a exclusão/)).toBeVisible(); await expect(page.getByRole('button', { name: 'Excluir trabalhador' })).toBeDisabled();
  await page.getByRole('button', { name: 'Consultar cadastro' }).click(); await expect(page.getByRole('heading', { name: 'Ana Souza' })).toBeVisible();
  expect(state.deletes).toHaveLength(1); await expect(page.getByText('Trabalhador excluído', { exact: true })).toHaveCount(0);
});
test('erro ao reler após exclusão confirmada informa pendência sem repetir DELETE', async ({ page }) => {
  const state = await setup(page); state.refreshFail = true; await page.goto(`${base}/pessoa`);
  await page.getByRole('button', { name: 'Excluir trabalhador' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Excluir trabalhador' }).click();
  await expect(page.getByText('Ocorrências sem responsável: 2.')).toBeVisible(); await expect(page.getByText(/Não foi possível atualizar todas as equipes/)).toBeVisible();
  state.refreshFail = false; await page.getByRole('button', { name: 'Repetir consultas' }).click(); await expect(page.getByText(/Não foi possível atualizar todas as equipes/)).toHaveCount(0); expect(state.deletes).toHaveLength(1);
});
test('remoção de uma obra não provoca PATCH de ocorrências', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/pessoa/editar`); await page.getByRole('checkbox', { name: /Casa A/ }).uncheck();
  await page.getByRole('button', { name: 'Salvar alterações' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Salvar vínculos' }).click();
  await expect(page.getByText('Cadastro atualizado e consultas refeitas.')).toBeVisible(); expect(state.patches).toEqual([{ obras: ['outra'] }]);
  expect(state.reads.filter(item => item.startsWith('PATCH '))).toEqual(['PATCH /trabalhadores/pessoa/']);
});

test('edição parcial não exige preencher campo legado não alterado', async ({ page }) => {
  const state = await setup(page); state.item.email = null;
  await page.goto(`${base}/pessoa/editar`); await page.getByLabel('Nome completo').fill('Ana Maria');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Cadastro atualizado e consultas refeitas.')).toBeVisible(); expect(state.patches).toEqual([{ nome: 'Ana Maria' }]);
});
for (const status of [400, 404, 409, 422]) test(`exclusão com erro ${status} não informa sucesso`, async ({ page }) => {
  const state = await setup(page); state.deleteStatus = status; await page.goto(`${base}/pessoa`);
  await page.getByRole('button', { name: 'Excluir trabalhador' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Excluir trabalhador' }).click();
  await expect(page.getByText('Exclusão recusada')).toBeVisible(); await expect(page.getByText('Trabalhador excluído', { exact: true })).toHaveCount(0); expect(state.deletes).toHaveLength(1);
});

test('servidor antigo com atribuição remanescente não é apresentado como integração concluída', async ({ page }) => {
  const state = await setup(page); state.retained = true; await page.goto(`${base}/pessoa/editar`);
  await page.getByRole('checkbox', { name: /Casa A/ }).uncheck(); await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar vínculos' }).click();
  await expect(page.getByText(/Ocorrências ainda apontam para este trabalhador/)).toBeVisible(); await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  expect(state.patches).toEqual([{ obras: ['outra'] }]);
});


test('busca trabalhadores pelo cargo usando a rota da construtora', async ({ page }) => {
  const state = await setup(page); await page.goto(base);
  await page.getByLabel('Pesquisar por').selectOption('cargo');
  await page.getByLabel('Cargo na construtora').fill('Pedreira');
  await page.getByRole('button', { name: 'Buscar na construtora' }).click();
  await expect(page.getByText('Vinculado a esta obra')).toBeVisible();
  expect(state.reads).toContain('GET /trabalhadores/cargo/Pedreira/');
});
