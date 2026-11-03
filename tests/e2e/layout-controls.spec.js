import { test, expect } from '@playwright/test';

async function setup(page) {
  const obra = { id: 'obra', nome: 'Casa', tipo: 'casa', cliente: 'Cliente', localizacao: 'SP', descricao: 'Residência', inicio: '2026-01-01', entrega: { modalidade: 'data_exata', data: '2026-12-01' }, estado: 'planejada', alertas: [], versao: 1 };
  const marco = { id: 'marco', obra_id: 'obra', nome: 'Fundação', descricao: 'Entrega', estado: 'a iniciar', inicio_previsto: '2026-01-01', fim_previsto: '2026-02-01', versao: 1 };
  await page.addInitScript(() => sessionStorage.setItem('pe03:access-token', 'teste-layout'));
  await page.route(`${process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'}/api/**`, route => {
    const path = new URL(route.request().url()).pathname.replace('/api', '');
    const responses = {
      '/sessoes/atual': { construtora: { id: 'conta', nome: 'Construtora' } },
      '/obras/obra': obra,
      '/obras/obra/marcos': [marco],
      '/obras/obra/marcos/marco': marco,
      '/marcos/marco/dependencias': [],
      '/obras/obra/mudancas': { mudancas: [] },
      '/trabalhadores/obra/obra/': [],
      '/ocorrencias/oc': { id: 'oc', obra_id: 'obra', titulo: 'Chuva', descricao: 'Chuva forte', estado: 'aberta', versao: 1, episodio: 1, autor: 'conta', data_registro: '2026-11-02T12:00:00Z', midias: [], historico_estados: [], aceitacoes: [], aceitacoes_do_estado_atual: [] },
    };
    return route.fulfill({ status: path in responses ? 200 : 404, json: responses[path] || { mensagem: 'Não encontrado' } });
  });
}

async function checkControls(page) {
  // O foco rola a página; medir no topo evita confundir o cabeçalho fixo
  // que encobre o conteúdo rolado com uma colisão no fluxo do formulário.
  await page.evaluate(() => window.scrollTo(0, 0));
  const issues = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('button, a.button, input:not([type="hidden"]), select, textarea')]
      .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    const issues = [];
    for (const [i, el] of controls.entries()) {
      const a = el.getBoundingClientRect();
      const name = el.textContent.trim() || el.getAttribute('aria-label') || el.type;
      if (a.left < -1 || a.right > innerWidth + 1) issues.push(`Fora da tela: ${name}`);
      for (const other of controls.slice(i + 1)) {
        if (el.contains(other) || other.contains(el)) continue;
        const b = other.getBoundingClientRect();
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) issues.push(`Colisão: ${name} / ${other.textContent.trim() || other.type}`);
      }
    }
    for (const actions of document.querySelectorAll('form > .page-actions')) {
      const fields = actions.parentElement.querySelectorAll('input, select, textarea');
      if (!fields.length) continue;
      const bottom = Math.max(...[...fields].map(el => el.getBoundingClientRect().bottom));
      if (actions.getBoundingClientRect().top - bottom < 12) issues.push('Ações sem espaço para o foco do último campo');
    }
    return issues;
  });
  expect(issues).toEqual([]);
}

for (const width of [320, 375, 768, 1280]) {
  test(`formulários sem colisões em ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    for (const [path, submit] of [
      ['/obras/nova', 'Revisar cadastro'],
      ['/obras/obra/editar', 'Salvar alterações'],
      ['/obras/obra/marcos/novo', 'Salvar marco'],
      ['/obras/obra/ocorrencias/nova', 'Registrar ocorrência'],
      ['/obras/obra/ocorrencias/oc/editar', 'Salvar alterações'],
      ['/obras/obra/marcos/marco/avancos/novo', 'Salvar rascunho'],
    ]) {
      await test.step(path, async () => {
        await page.goto(path);
        await expect(page.getByRole('button', { name: submit, exact: true })).toBeVisible();
        await checkControls(page);
        if (path.endsWith('/oc/editar')) {
          await page.getByLabel('Novo estado').focus();
          await checkControls(page);
          await page.getByLabel('Novo estado').selectOption('resolvida');
          await expect(page.getByLabel('Motivo da mudança')).toBeVisible();
          await checkControls(page);
        }
      });
    }
  });
}
