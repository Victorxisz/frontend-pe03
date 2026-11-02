import { test, expect } from '@playwright/test';

const obra = 'obra';
const instante = '2030-01-01T12:00:00Z';
const evento = (id, alvo, campos, antes, depois, motivo, comparacao = null) => ({ id, obra_id: obra, tipo: 'mudanca', alvo, campos, antes, depois, motivo, autor: `Autor ${motivo}`, instante, consulta: `/mudancas/${id}`, comparacao });
const eventos = [
  evento('obra:opaco:0', { tipo: 'obra', id: obra }, ['entrega'], { modalidade: 'intervalo_estimado', inicio: '2030-01-01', fim: '2030-02-01', observacao: 'valor preservado' }, { modalidade: 'data_exata', data: '2030-03-01' }, 'Prazo'),
  evento('marco-opaco', { tipo: 'marco', id: 'marco' }, ['estado'], 'a iniciar', 'em andamento', 'Marco'),
  ...[2, 3].map(n => evento(`publicacao:avanco:${n}`, { tipo: 'avanco', id: 'avanco' }, ['descricao'], { descricao: `Antes ${n}` }, { descricao: `Depois ${n}` }, `Correção ${n}`, '/avancos/avanco/versoes')),
];
async function setup(page) {
  const state = { eventos: structuredClone(eventos), status: 200, writes: [], wrong: false, missingTarget: false, offline: false };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'token'));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = decodeURIComponent(new URL(req.url()).pathname.replace('/api', ''));
    if (req.method() !== 'GET') state.writes.push(`${req.method()} ${path}`);
    if (path === '/sessoes/atual') return route.fulfill({ json: { construtora: { id: 'conta', nome: 'Construtora' } } });
    if (path === '/obras/obra') return route.fulfill({ json: { id: obra, nome: 'Casa', localizacao: 'SP', entrega: {}, alertas: [] } });
    if (path === '/obras/obra/mudancas' && state.offline) return route.abort();
    if (path === '/obras/obra/mudancas') return state.status === 200 ? route.fulfill({ json: { mudancas: state.eventos } }) : route.fulfill({ status: state.status, json: { codigo: 'HISTORICO_INDISPONIVEL', mensagem: 'Falha na consulta' } });
    if (path.startsWith('/mudancas/')) {
      const found = state.eventos.find(e => e.id === path.slice('/mudancas/'.length));
      return found ? route.fulfill({ json: state.wrong ? { ...found, obra_id: 'outra' } : found }) : route.fulfill({ status: 404, json: { mensagem: 'Mudança ausente' } });
    }
    if (path === '/avancos/avanco' && state.missingTarget) return route.fulfill({ status: 404, json: { mensagem: 'Avanço ausente' } });
    if (path === '/avancos/avanco') return route.fulfill({ json: { id: 'avanco', marco_id: 'marco', descricao: 'Atual', data: '2030-01-01', midias: [] } });
    if (path === '/obras/obra/marcos/marco') return route.fulfill({ json: { id: 'marco', obra_id: obra, nome: 'Fundação' } });
    if (path === '/avancos/avanco/publicacoes') return route.fulfill({ json: { publicacoes: [] } });
    if (path === '/avancos/avanco/versoes') return route.fulfill({ json: { avanco_id: 'avanco', versoes: [1, 2, 3].map(n => ({ numero: n, atual: n === 3, autor_original: 'Autor original', conteudo: { descricao: `Versão ${n}`, data: '2030-01-01', midias: [] }, correcao: n === 1 ? null : { autor: `Autor Correção ${n}`, instante, motivo: `Correção ${n}`, campos: ['descricao'], antes: { descricao: `Antes ${n}`, data: '2030-01-01', midias: [] }, depois: { descricao: `Depois ${n}`, data: '2030-01-01', midias: [] }, diferencas_texto: [] } })) } });
    return route.fulfill({ status: 404, json: { mensagem: 'Ausente' } });
  });
  return state;
}
test('ordem da API, valores completos, IDs opacos e comparação de duas correções', async ({ page }) => {
  const state = await setup(page); await page.goto('/obras/obra/historico');
  const cards = page.locator('.historico-evento'); await expect(cards).toHaveCount(4);
  await expect(cards.nth(0)).toContainText('01/01/2030'); await expect(cards.nth(0)).toContainText('valor preservado');
  await expect(cards.nth(1)).toContainText('Marco'); await expect(cards.nth(2)).toContainText('Correção 2'); await expect(cards.nth(3)).toContainText('Correção 3');
  await cards.nth(0).getByRole('link', { name: 'Ver detalhe' }).click(); await expect(page.getByRole('heading', { name: 'Detalhe da mudança' })).toBeVisible(); await expect(page.locator('.historico-evento')).toContainText('Autor Prazo');
  await page.getByRole('link', { name: 'Voltar ao histórico' }).click(); await page.locator('.historico-evento').nth(2).getByRole('link', { name: 'Comparar versões' }).click();
  await expect(page.getByRole('article', { name: 'Versão 2' })).toContainText('Autor Correção 2'); await expect(page.getByRole('article', { name: 'Versão 3' })).toContainText('Autor Correção 3');
  expect(state.writes).toEqual([]);
});
test('vazio, erro e detalhe ausente ou de outra obra permanecem distintos', async ({ page }) => {
  const state = await setup(page); state.eventos = []; await page.goto('/obras/obra/historico'); await expect(page.getByText('Esta obra ainda não possui mudanças registradas.')).toBeVisible();
  state.status = 409; await page.reload(); await expect(page.getByText(/Histórico indisponível ou inconsistente/)).toBeVisible(); await expect(page.getByText('Esta obra ainda não possui mudanças registradas.')).toHaveCount(0);
  state.status = 200; state.eventos = structuredClone(eventos); await page.getByRole('button', { name: 'Consultar novamente' }).click(); await expect(page.locator('.historico-evento')).toHaveCount(4);
  await page.goto('/obras/obra/historico/nao-existe'); await expect(page.getByText(/Registro não encontrado/)).toBeVisible();
  state.wrong = true; await page.goto('/obras/obra/historico/marco-opaco'); await expect(page.getByText(/Registro não encontrado/)).toBeVisible(); await expect(page.locator('.historico-evento')).toHaveCount(0); expect(state.writes).toEqual([]);
});

test('falhas temporárias e alvo removido não são confundidos com histórico vazio', async ({ page }) => {
  const state = await setup(page); state.status = 503; await page.goto('/obras/obra/historico');
  await expect(page.getByText('Falha na consulta')).toBeVisible(); await expect(page.getByText('Esta obra ainda não possui mudanças registradas.')).toHaveCount(0);
  state.offline = true; await page.getByRole('button', { name: 'Consultar novamente' }).click(); await expect(page.getByText(/Não foi possível conectar/)).toBeVisible();
  state.offline = false; state.status = 200; await page.getByRole('button', { name: 'Consultar novamente' }).click();
  state.missingTarget = true; await page.locator('.historico-evento').nth(2).getByRole('link', { name: 'Consultar avanco atual' }).click();
  await expect(page.getByText('Avanço ausente')).toBeVisible(); await expect(page.getByText('Atual', { exact: true })).toHaveCount(0); expect(state.writes).toEqual([]);
});
