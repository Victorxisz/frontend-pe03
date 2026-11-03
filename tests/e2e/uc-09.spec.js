import { test, expect } from '@playwright/test';
test.skip(process.env.E2E_REAL === '1', 'API controlada; não alterar registros reais.');
const base = '/obras/obra/avancos/a';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const newFile = { name: 'nova.png', mimeType: 'image/png', buffer: png };

async function setup(page, options = {}) {
  const state = { draft: { id: 'a', marco_id: 'marco', estado: 'rascunho', data: '2030-10-19', descricao: 'Descrição anterior', autor: 'autora-original', data_registro: '2030-10-19T12:00:00Z',
    midias: [{ id: 'm1', nome: 'a.png', mime: 'image/png', tamanho: 68 }, { id: 'm2', nome: 'b.pdf', mime: 'application/pdf', tamanho: 10 }] },
    patches: [], writes: [], detailReads: 0, listReads: 0, revision: 3, patchStatus: 200, readStatus: 200, listFails: false, lost: false, wrongContext: false, malformedResponse: false, ...options };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token-uc09'));
  await page.route(`${process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'}/api/**`, async route => {
    const req = route.request(), path = new URL(req.url()).pathname.replace('/api', '');
    if (req.method() !== 'GET') state.writes.push(`${req.method()} ${path}`);
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: 'obra', nome: 'Casa', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/marcos/marco') return route.fulfill({ json: { id: 'marco', obra_id: state.wrongContext ? 'outra' : 'obra', nome: 'Fundação' } });
    if (path === '/avancos/a') {
      if (req.method() === 'GET') {
        state.detailReads++;
        return route.fulfill(state.readStatus === 200 ? { json: state.draft } : { status: state.readStatus, json: { mensagem: 'Consulta indisponível' } });
      }
      if (req.method() === 'PATCH') {
        const multipart = req.headers()['content-type'].startsWith('multipart/form-data');
        let changes, files = [];
        if (multipart) {
          const form = await new Request(req.url(), { method: 'PATCH', headers: { 'Content-Type': req.headers()['content-type'] }, body: req.postDataBuffer() }).formData();
          changes = Object.fromEntries([...form].filter(([key]) => key !== 'midias'));
          if ('midias_manter' in changes) changes.midias_manter = JSON.parse(changes.midias_manter);
          files = form.getAll('midias').map(file => ({ nome: file.name, mime: file.type, tamanho: file.size }));
        } else changes = req.postDataJSON();
        state.patches.push({ changes, files, multipart, headers: req.headers() });
        if (state.patchStatus !== 200) return route.fulfill({ status: state.patchStatus, json: { mensagem: 'Edição recusada pelo servidor', campos: state.patchStatus === 422 ? ['midias_manter'] : ['midias'] } });
        if (state.publishDuringPatch) {
          state.draft.estado = 'publicado';
          return route.fulfill({ json: { avanco_id: 'a', versoes: [] } });
        }
        if ('data' in changes) state.draft.data = changes.data;
        if ('descricao' in changes) state.draft.descricao = changes.descricao;
        if ('midias_manter' in changes) state.draft.midias = state.draft.midias.filter(m => changes.midias_manter.includes(m.id));
        state.draft.midias.push(...files.map((file, i) => ({ id: `nova-${state.patches.length}-${i}`, ...file })));
        state.revision++;
        if (state.lost) return route.abort();
        return route.fulfill({ json: state.malformedResponse ? {} : { id: 'a', data: state.draft.data, descricao: state.draft.descricao, estado: 'rascunho', revisao: state.revision } });
      }
    }
    if (path === '/marcos/marco/avancos') {
      state.listReads++;
      return route.fulfill(state.listFails ? { status: 503, json: { mensagem: 'Lista indisponível' } } : { json: [state.draft] });
    }
    if (path === '/avancos/a/publicacoes') return route.fulfill({ json: { publicacoes: [] } });
    if (path === '/obras/obra/previa') return route.fulfill({ json: { atualizacoes: [] } });
    if (path.startsWith('/midias/')) return route.fulfill({ contentType: path.includes('/m2/') ? 'application/pdf' : 'image/png', body: path.includes('/m2/') ? Buffer.from('%PDF-test') : png });
    return route.fulfill({ status: 404, json: { mensagem: 'Não encontrado' } });
  });
  return state;
}
async function open(page) {
  await page.goto(`${base}/editar`);
  await expect(page.getByLabel('Descrição', { exact: true })).toBeVisible();
}
const save = page => page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
const success = page => page.getByRole('status').filter({ hasText: 'Rascunho atualizado.' });

test('CT-37: edita só texto, relê detalhe/lista e mantém rascunho fora da prévia', async ({ page }) => {
  const state = await setup(page); await open(page);
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  await page.getByLabel('Descrição', { exact: true }).fill('  Concretagem revisada  '); await save(page);
  await expect(success(page)).toBeVisible();
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Concretagem revisada');
  expect(state.patches[0].changes).toEqual({ descricao: 'Concretagem revisada' });
  expect(state.patches[0].multipart).toBe(false);
  expect(state.patches[0].headers['idempotency-key']).toBeUndefined();
  expect(state.draft.autor).toBe('autora-original'); expect(state.draft.estado).toBe('rascunho');
  expect(state.draft.marco_id).toBe('marco'); expect(state.draft.midias).toHaveLength(2);
  expect(state.detailReads).toBeGreaterThanOrEqual(3); expect(state.listReads).toBe(1);
  expect(state.writes).toEqual(['PATCH /avancos/a']);
  await page.getByRole('link', { name: 'Voltar aos avanços' }).click();
  await expect(page.getByRole('link', { name: /Concretagem revisada/ })).toBeVisible();
  await page.reload(); await expect(page.getByRole('link', { name: /Concretagem revisada/ })).toBeVisible();
  await page.getByRole('link', { name: 'Publicações', exact: true }).click();
  await expect(page.getByText('Nenhuma publicação nesta obra.', { exact: false })).toBeVisible();
});

test('altera apenas a data sem enviar autoria, revisão ou estado', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByLabel('Data do trabalho').fill('2030-10-20'); await save(page);
  await expect(success(page)).toBeVisible();
  expect(state.patches[0].changes).toEqual({ data: '2030-10-20' });
});

test('CT-38: impede retirar todas as mídias sem substituição', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByRole('checkbox', { name: 'Manter a.png' }).uncheck();
  await page.getByRole('checkbox', { name: 'Manter b.pdf' }).uncheck(); await save(page);
  await expect(page.getByText('Mantenha ao menos uma evidência ou adicione um novo arquivo.', { exact: true }).last()).toBeVisible();
  expect(state.patches).toEqual([]);
});

test('remove uma mídia por JSON, preservando as demais e sem prometer limpeza externa', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByRole('checkbox', { name: 'Manter b.pdf' }).uncheck(); await save(page);
  await expect(success(page)).toBeVisible();
  expect(state.patches[0].changes).toEqual({ midias_manter: ['m1'] });
  expect(state.patches[0].multipart).toBe(false);
  await expect(page.getByRole('checkbox', { name: 'Manter b.pdf' })).toHaveCount(0);
  await expect(page.getByText(/Arquivos antigos removidos|Limpeza concluída/)).toHaveCount(0);
});

test('substitui todas as evidências com multipart e lista JSON vazia', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByRole('checkbox', { name: 'Manter a.png' }).uncheck();
  await page.getByRole('checkbox', { name: 'Manter b.pdf' }).uncheck();
  await page.locator('input[type=file]').setInputFiles(newFile); await save(page);
  await expect(success(page)).toBeVisible();
  expect(state.patches[0].multipart).toBe(true);
  expect(state.patches[0].changes).toEqual({ midias_manter: [] });
  expect(state.patches[0].files[0].nome).toBe('nova.png');
  expect(state.draft.midias).toHaveLength(1);
});

test('adição de arquivos omite midias_manter e preserva as existentes', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.locator('input[type=file]').setInputFiles(newFile); await save(page);
  await expect(success(page)).toBeVisible();
  expect(state.patches[0].changes).toEqual({}); expect(state.draft.midias).toHaveLength(3);
});

test('recusa descrição vazia e mais de cinco novos arquivos sem PATCH', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('   '); await save(page);
  await expect(page.getByText('Informe a descrição do trabalho.')).toBeVisible();
  await page.getByLabel('Descrição', { exact: true }).fill('Nova descrição');
  await page.locator('input[type=file]').setInputFiles(Array.from({ length: 6 }, (_, i) => ({ ...newFile, name: `${i}.png` }))); await save(page);
  await expect(page.getByText('Adicione no máximo cinco novos arquivos por envio.')).toBeVisible();
  expect(state.patches).toEqual([]);
});

test('Cancelar preserva texto, data e mídias no servidor', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('Não salvar');
  await page.getByRole('checkbox', { name: 'Manter b.pdf' }).uncheck();
  await page.getByRole('link', { name: 'Cancelar', exact: true }).click();
  await expect(page).toHaveURL(base);
  await expect(page.getByRole('heading', { name: 'Descrição anterior', exact: true })).toBeVisible();
  expect(state.writes).toEqual([]); expect(state.draft.midias).toHaveLength(2);
});

test('publicado não habilita edição simples e oferece UC-11', async ({ page }) => {
  const state = await setup(page); state.draft.estado = 'publicado';
  await page.goto(`${base}/editar`);
  await expect(page.getByText('Este avanço já está publicado.', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Corrigir publicação' })).toHaveAttribute('href', `${base}/corrigir`);
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveCount(0);
  expect(state.patches).toEqual([]);
});

for (const published of [false, true]) test(`reconsulta antes do PATCH detecta ${published ? 'publicação' : 'edição'} concorrente e preserva intenção`, async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('Minha intenção');
  if (published) state.draft.estado = 'publicado'; else state.draft.descricao = 'Alterado em outra sessão';
  await save(page);
  await expect(page.getByRole('region', { name: 'Revisão do estado atual' })).toBeVisible();
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Minha intenção');
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  expect(state.patches).toEqual([]);
  if (published) await expect(page.getByRole('link', { name: 'Corrigir publicação' })).toBeVisible();
  else {
    await page.getByRole('button', { name: 'Usar dados atuais e continuar' }).click();
    await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Alterado em outra sessão');
  }
});

test('resposta de publicação concorrente não é confundida com rascunho salvo', async ({ page }) => {
  const state = await setup(page, { publishDuringPatch: true }); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('Nova'); await save(page);
  await expect(page.getByText('Não foi possível confirmar a edição.', { exact: false })).toBeVisible();
  await expect(success(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar estado atual' }).click();
  await expect(page.getByRole('link', { name: 'Corrigir publicação' })).toBeVisible(); expect(state.patches).toHaveLength(1);
});

for (const status of [413, 415, 422, 409, 503]) test(`PATCH ${status} preserva dados e trata validação/conflito sem sucesso falso`, async ({ page }) => {
  const state = await setup(page, { patchStatus: status }); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('Intenção preservada');
  await page.locator('input[type=file]').setInputFiles(newFile); await save(page);
  await expect(page.getByRole('alert').filter({ hasText: status === 503 ? 'Não foi possível confirmar' : 'Edição recusada' }).first()).toBeVisible();
  await expect(success(page)).toHaveCount(0);
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveValue('Intenção preservada');
  await expect(page.getByText('nova.png', { exact: true })).toBeVisible();
  expect(state.patches).toHaveLength(1);
  if ([409, 503].includes(status)) await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
});

test('resposta perdida exige GET antes de nova intenção; não repete uploads automaticamente', async ({ page }) => {
  const state = await setup(page, { lost: true }); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('Salva mas resposta perdida');
  await page.locator('input[type=file]').setInputFiles(newFile); await save(page);
  await expect(page.getByRole('button', { name: 'Consultar estado atual' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  await page.getByRole('button', { name: 'Consultar estado atual' }).click();
  await expect(page.getByRole('region', { name: 'Revisão do estado atual' })).toContainText('Salva mas resposta perdida');
  await page.getByRole('button', { name: 'Usar dados atuais e continuar' }).click();
  await expect(page.getByRole('checkbox', { name: 'Manter nova.png' })).toBeChecked();
  expect(state.patches).toHaveLength(1); expect(state.draft.midias).toHaveLength(3);
});

test('falha de leitura depois de 200 repete somente consultas', async ({ page }) => {
  const state = await setup(page, { listFails: true }); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('Edição confirmada'); await save(page);
  await expect(success(page)).toBeVisible();
  await expect(page.getByText('A edição foi confirmada, mas não foi possível atualizar', { exact: false })).toBeVisible();
  state.listFails = false;
  await page.getByRole('button', { name: 'Atualizar consultas' }).click();
  await expect(page.getByRole('button', { name: 'Atualizar consultas' })).toHaveCount(0);
  expect(state.patches).toHaveLength(1); expect(state.listReads).toBe(2);
});

test('contexto de outra obra e GET 404 não habilitam o formulário', async ({ page }) => {
  const state = await setup(page, { wrongContext: true });
  await page.goto(`${base}/editar`); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Descrição', { exact: true })).toHaveCount(0);
  state.wrongContext = false; state.readStatus = 404;
  await page.getByRole('button', { name: 'Consultar novamente' }).click();
  await expect(page.getByRole('alert')).toContainText('Consulta indisponível'); expect(state.patches).toEqual([]);
});

test('duplo clique não duplica PATCH', async ({ page }) => {
  const state = await setup(page); await open(page);
  await page.getByLabel('Descrição', { exact: true }).fill('Uma edição');
  await page.getByRole('button', { name: 'Salvar alterações' }).evaluate(button => { button.click(); button.click(); });
  await expect(success(page)).toBeVisible(); expect(state.patches).toHaveLength(1);
});

for (const width of [320, 768, 1280]) test(`editor sem controles sobrepostos em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await setup(page); await open(page);
  const issues = await page.locator('form').evaluate(form => {
    const controls = [...form.querySelectorAll('input, textarea, button, a.button')].filter(el => el.getClientRects().length);
    const issues = [];
    for (const [i, el] of controls.entries()) {
      const a = el.getBoundingClientRect();
      if (a.left < 0 || a.right > innerWidth) issues.push('Controle fora da tela');
      for (const other of controls.slice(i + 1)) {
        const b = other.getBoundingClientRect();
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) issues.push('Controles sobrepostos');
      }
    }
    return issues;
  });
  expect(issues).toEqual([]);
  if (width !== 768) await page.locator('form').screenshot({ path: test.info().outputPath(`editor-${width}.png`) });
});
