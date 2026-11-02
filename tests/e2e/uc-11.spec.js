import { test, expect } from '@playwright/test';
const base = '/obras/obra/avancos/avanco';
const media = { id: 'foto', nome: 'original.png', mime: 'image/png', retida: false, conteudo: null };
async function setup(page, options = {}) {
  const initial = { descricao: 'Parede branca', data: '2030-01-01', midias: [media] };
  const state = { content: structuredClone(initial), patches: [], versions: [{ numero: 1, atual: true, conteudo: structuredClone(initial), autor_original: 'engenheiro-original', origem_simulada: { perfil: 'engenheiro', nome: 'Exemplo' }, correcao: null }], ...options };
  const chain = () => ({ avanco_id: 'avanco', versoes: state.versions });
  const publication = () => ({ id: 'avanco', avanco_id: 'avanco', estado: 'publicado', ...state.content, autor: 'publicador', autor_original: 'engenheiro-original', instante: '2030-01-02T12:00:00Z', origem_simulada: { perfil: 'engenheiro', nome: 'Exemplo' }, editado: state.versions.length > 1, editado_pela_construtora: state.versions.length > 1 });
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api', '');
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa', localizacao: 'SP', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/marcos/marco') return route.fulfill({ json: { id: 'marco', obra_id: 'obra', nome: 'Fundação' } });
    if (path === '/avancos/avanco/versoes') {
      if (state.integrity) return route.fulfill({ status: 409, json: { codigo: 'HISTORICO_INDISPONIVEL', mensagem: 'Cadeia inconsistente' } });
      return route.fulfill({ json: chain() });
    }
    if (path === '/avancos/avanco/publicacoes') return route.fulfill({ json: { publicacoes: [publication()] } });
    if (path === '/obras/obra/previa') return state.failPreview ? route.fulfill({ status: 503, json: { mensagem: 'Falha de leitura' } }) : route.fulfill({ json: { atualizacoes: [publication()] } });
    if (path === '/obras/obra/mudancas') return route.fulfill({ json: { mudancas: [] } });
    if (path === '/avancos/avanco') {
      if (req.method() !== 'PATCH') return route.fulfill({ json: { id: 'avanco', marco_id: 'marco', estado: 'publicado', ...state.content } });
      const body = req.headers()['content-type'].includes('application/json') ? req.postDataJSON() : req.postData(); state.patches.push(body);
      if (state.status) return route.fulfill({ status: state.status, json: { mensagem: 'Correção recusada', campos: ['descricao'] } });
      if (typeof body !== 'object') return route.fulfill({ json: chain() });
      const before = structuredClone(state.content);
      for (const field of ['descricao', 'data']) if (field in body) state.content[field] = body[field];
      if (body.midias_manter) state.content.midias = state.content.midias.filter(m => body.midias_manter.includes(m.id));
      state.versions.forEach(v => v.atual = false);
      state.versions.push({ numero: state.versions.length + 1, atual: true, conteudo: structuredClone(state.content), autor_original: 'engenheiro-original', origem_simulada: { perfil: 'engenheiro' }, correcao: { antes: before, depois: structuredClone(state.content), autor: 'construtora-servidor', instante: '2030-02-01T10:00:00Z', motivo: body.motivo, campos: Object.keys(body).filter(k => k !== 'motivo').map(k => k === 'midias_manter' ? 'midias' : k), diferencas_texto: [{ tipo: 'substituido', antes: before.descricao, depois: state.content.descricao }] } });
      if (state.lost) return route.abort();
      return route.fulfill({ json: chain() });
    }
    throw Error(`Endpoint inesperado: ${path}`);
  });
  return state;
}
async function edit(page, description = 'Parede azul') {
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill(description);
  await page.getByLabel('Motivo da correção').fill('Revisão conferida');
}
test('duas correções, restauração original, HTML seguro e cadeia persistida na recarga', async ({ page }, testInfo) => {
  const state = await setup(page); await page.goto(`${base}/corrigir`);
  await expect(page.getByRole('textbox', { name: 'Descrição', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('editor-desktop.png'), fullPage: true });
  await edit(page, '<img src=x onerror=alert(1)>'); await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByText('Correção confirmada pelo servidor.', { exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Versão 2', exact: true })).toContainText('<img src=x onerror=alert(1)>');
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(state.patches[0]).toEqual({ descricao: '<img src=x onerror=alert(1)>', motivo: 'Revisão conferida' });
  await page.reload(); await edit(page, 'Parede branca'); await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByRole('article', { name: 'Versão 3', exact: true })).toContainText('construtora-servidor');
  await page.goto(`${base}/versoes`); await expect(page.getByRole('article')).toHaveCount(3);
  await expect(page.getByRole('article', { name: 'Versão 3', exact: true })).toContainText('Editado pela construtora');
  await expect(page.getByRole('article', { name: 'Versão 1', exact: true })).toContainText('engenheiro-original');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('versoes-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/obras/obra/publicacoes'); await expect(page.getByText('Conteúdo editado · publicação original preservada')).toBeVisible();
  expect(state.patches).toHaveLength(2);
});
test('sem mudança, motivo vazio e remoção da última mídia bloqueiam; cancelar não grava', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/corrigir`);
  const save = page.getByRole('button', { name: 'Salvar correção' }); await expect(save).toBeDisabled();
  await page.getByLabel('Motivo da correção').fill('Motivo'); await expect(save).toBeDisabled();
  await edit(page); await page.getByLabel('Motivo da correção').fill('   '); await expect(save).toBeDisabled();
  await edit(page); await page.getByLabel('Manter original.png').uncheck(); await expect(save).toBeDisabled();
  await page.getByRole('link', { name: 'Cancelar', exact: true }).click(); expect(state.patches).toHaveLength(0);
});
test('mídia não retida não faz requisição nem cria link; conflito é falha de integridade', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/versoes`);
  await expect(page.getByText(/Arquivo histórico indisponível/)).toBeVisible(); await expect(page.getByRole('link', { name: /Baixar/ })).toHaveCount(0);
  state.integrity = true; await page.reload(); await expect(page.getByText(/Falha de integridade/)).toBeVisible();
  await expect(page.getByText('Nenhuma versão publicada disponível.')).toHaveCount(0);
});
for (const status of [409, 422, 503]) test(`falha ${status} preserva conteúdo e exige revisão quando necessário`, async ({ page }) => {
  const state = await setup(page, { status }); await page.goto(`${base}/corrigir`); await edit(page); await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByText('Correção recusada', { exact: true })).toBeVisible(); expect(state.versions).toHaveLength(1);
  if (status === 422) await expect(page.getByRole('textbox', { name: 'Descrição', exact: true })).toHaveValue('Parede azul');
  else { await expect(page.getByRole('button', { name: 'Salvar correção' })).toBeDisabled(); state.status = null; await page.getByRole('button', { name: 'Recarregar e revisar' }).click(); await expect(page.getByRole('textbox', { name: 'Descrição', exact: true })).toHaveValue('Parede branca'); }
});
test('resposta perdida consulta estado sem repetir PATCH', async ({ page }) => {
  const state = await setup(page, { lost: true }); await page.goto(`${base}/corrigir`); await edit(page); await page.getByRole('button', { name: 'Salvar correção' }).click();
  await page.getByRole('button', { name: 'Recarregar e revisar' }).click(); await expect(page.getByRole('textbox', { name: 'Descrição', exact: true })).toHaveValue('Parede azul'); expect(state.patches).toHaveLength(1);
});
test('falha de prévia após 200 repete apenas leitura', async ({ page }) => {
  const state = await setup(page, { failPreview: true }); await page.goto(`${base}/corrigir`); await edit(page); await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByText('A correção foi confirmada, mas a visualização não pôde ser atualizada.')).toBeVisible(); state.failPreview = false;
  await page.getByRole('button', { name: 'Atualizar visualização' }).click(); await expect(page.getByRole('article')).toHaveCount(2); expect(state.patches).toHaveLength(1);
});
test('novos arquivos usam multipart com IDs mantidos em JSON', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/corrigir`);
  await page.getByLabel('Novos arquivos').setInputFiles({ name: 'nova.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await page.getByLabel('Manter original.png').uncheck(); await page.getByLabel('Motivo da correção').fill('Substituição');
  await page.getByRole('button', { name: 'Salvar correção' }).evaluate(b => { b.click(); b.click(); });
  await expect(page.getByText('Correção confirmada pelo servidor.', { exact: true })).toBeVisible();
  expect(state.patches).toHaveLength(1); expect(state.patches[0]).toContain('name="midias_manter"'); expect(state.patches[0]).toContain('[]'); expect(state.patches[0]).toContain('name="midias"; filename="nova.png"');
});

test('diferenças retornadas e mídia retida com acesso remoto falhando', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/corrigir`); await edit(page); await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByText('Correção confirmada pelo servidor.', { exact: true })).toBeVisible();
  state.versions[1].correcao.diferencas_texto = [
    { tipo: 'igual', antes: 'Parede ', depois: 'Parede ' }, { tipo: 'removido', antes: 'branca', depois: '' },
    { tipo: 'inserido', antes: '', depois: 'azul' }, { tipo: 'substituido', antes: '<b>', depois: '<i>' },
  ];
  state.versions[0].conteudo.midias = [{ ...media, retida: true, conteudo: '/midias/foto/conteudo' }];
  await page.route('**/api/midias/foto/conteudo', route => route.fulfill({ status: 503, json: { mensagem: 'Provedor indisponível' } }));
  await page.goto(`${base}/versoes`);
  for (const tipo of ['igual', 'removido', 'inserido', 'substituido']) await expect(page.locator('.version-diffs strong').filter({ hasText: tipo })).toBeVisible();
  await expect(page.getByText(/Falha ao recuperar este arquivo/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Baixar/ })).toHaveCount(0);
});

test('alterar somente data envia apenas data e motivo', async ({ page }) => {
  const state = await setup(page); await page.goto(`${base}/corrigir`);
  await page.getByRole('textbox', { name: 'Data do trabalho', exact: true }).fill('2030-01-03');
  await page.getByLabel('Motivo da correção').fill('Data conferida');
  await page.getByRole('button', { name: 'Salvar correção' }).click();
  await expect(page.getByText('Correção confirmada pelo servidor.', { exact: true })).toBeVisible();
  expect(state.patches).toEqual([{ data: '2030-01-03', motivo: 'Data conferida' }]);
});
