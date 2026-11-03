import { test, expect } from '@playwright/test';

const key = 'pe03:access-token';
const account = { id: 'conta-teste', nome: 'Construtora de teste' };
const destination = '/obras/obra-teste/marcos?origem=login#lista';
const isReal = process.env.E2E_REAL === '1';

async function fillLogin(page, email = 'conta@example.test', password = 'senha-ficticia') {
  await page.getByRole('textbox', { name: 'E-mail' }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

async function seedToken(page, value = 'token-teste') {
  await page.addInitScript(({ key, value }) => sessionStorage.setItem(key, value), { key, value });
}

async function mockApi(page, overrides = {}) {
  const state = { revoked: false, logins: 0, restores: 0, ...overrides };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, json: body });
    if (path === '/api/construtora/login/') {
      state.logins++;
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ email: 'conta@example.test', senha: 'senha-ficticia' });
      expect(route.request().headers().authorization).toBeUndefined();
      if (state.login) return state.login(route);
      return json({ access_token: 'token-teste', refresh_token: 'refresh-nao-persistido', construtora: account });
    }
    expect(route.request().headers().authorization).toBe('Bearer token-teste');
    if (path === '/api/sessoes/atual') {
      state.restores++;
      if (state.current) return state.current(route);
      return state.revoked ? json({ erro: 'Sessão revogada' }, 401) : json({ construtora: account });
    }
    if (path === '/api/construtora/logout/') {
      expect(route.request().method()).toBe('POST');
      if (state.logout) return state.logout(route);
      state.revoked = true;
      return json({ mensagem: 'Sessão encerrada' });
    }
    if (path === '/api/obras') {
      if (state.obras) return state.obras(route);
      return json({ obras: [{ id: 'obra-teste', nome: 'Obra protegida', cliente: 'Cliente de teste' }], situacao: 'com_resultados', filtros_aplicados: {} });
    }
    if (path === '/api/obras/obra-teste/marcos') return json([]);
    if (path === '/api/obras/obra-teste') return json({ id: 'obra-teste', nome: 'Obra protegida', cliente: 'Cliente de teste', estado: 'planejada' });
    throw new Error(`Endpoint inesperado: ${path}`);
  });
  return state;
}

test.describe('FE-UC-01 — navegador com API controlada', () => {
  test.skip(isReal, 'Executar separado da API real');

  test('olho mostra e oculta a senha sem enviar; submissão volta a ocultá-la', async ({ page }) => {
    let release;
    const response = new Promise((resolve) => { release = resolve; });
    const state = await mockApi(page, { login: async (route) => {
      await response;
      return route.fulfill({ status: 401, json: { erro: 'Credenciais inválidas' } });
    } });
    await page.goto('/login');
    const password = page.getByLabel('Senha', { exact: true });
    await password.fill('senha-ficticia');
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await expect(password).toHaveValue('senha-ficticia');
    const hide = page.getByRole('button', { name: 'Ocultar senha', exact: true });
    await expect(hide).toHaveAttribute('aria-pressed', 'true');
    await hide.focus(); await page.keyboard.press('Space');
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveValue('senha-ficticia');
    expect(state.logins).toBe(0);
    await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
    await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('conta@example.test');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(password).toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: 'Mostrar senha', exact: true })).toBeDisabled();
    release();
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
    await expect(password).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Mostrar senha', exact: true })).toHaveAttribute('aria-pressed', 'false');
    expect(state.logins).toBe(1);
  });

  test('acesso direto exige login, preserva destino completo e restaura rota aninhada', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto(destination);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Área da obra' })).toHaveCount(0);
    await fillLogin(page);
    await expect(page).toHaveURL(destination);
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
    expect(state.logins).toBe(1);
    expect(await page.evaluate(() => ({ session: { ...sessionStorage }, local: { ...localStorage } })))
      .toEqual({ session: { [key]: 'token-teste' }, local: {} });
  });

  test('envio visível e mensagem neutra para credenciais inválidas', async ({ page }) => {
    let release;
    await mockApi(page, { login: async (route) => {
      await new Promise((resolve) => { release = resolve; });
      return route.fulfill({ status: 401, json: { erro: 'Este e-mail não existe' } });
    } });
    await page.goto('/login');
    await fillLogin(page);
    await expect(page.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
    await expect.poll(() => typeof release).toBe('function');
    release();
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
    await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull();
  });

  test('falha de rede no login permite nova tentativa', async ({ page }) => {
    await mockApi(page, { login: (route) => route.abort('failed') });
    await page.goto('/login');
    await fillLogin(page);
    await expect(page.getByRole('alert')).toContainText('Não foi possível conectar ao servidor');
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
  });

  for (const body of [{ construtora: account }, { access_token: 'token-teste' }]) {
    test(`login incompleto não persiste sessão (${Object.keys(body)[0]})`, async ({ page }) => {
      await mockApi(page, { login: (route) => route.fulfill({ json: body }) });
      await page.goto('/login');
      await fillLogin(page);
      await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar sua sessão');
      expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull();
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('restauração em andamento oculta conteúdo de negócio', async ({ page }) => {
    let release;
    await seedToken(page);
    await mockApi(page, { current: async (route) => {
      await new Promise((resolve) => { release = resolve; });
      return route.fulfill({ json: { construtora: account } });
    } });
    await page.goto(destination);
    await expect(page.getByRole('status')).toHaveText('Verificando sessão…');
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toHaveCount(0);
    release();
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
  });

  test('consulta pendente para após 8 segundos, preserva login e permite nova tentativa', async ({ page }) => {
    await page.clock.install();
    await seedToken(page);
    let pending;
    const state = await mockApi(page, { current: (route) => { pending = route; } });
    await page.goto(destination);
    await expect(page.getByRole('status')).toHaveText('Verificando sessão…');
    await expect.poll(() => Boolean(pending)).toBe(true);
    await page.clock.fastForward(8_001);
    await expect(page.getByRole('alert')).toContainText('o servidor demorou para responder');
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toHaveCount(0);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe('token-teste');
    // A resposta antiga não deve liberar a área protegida após o timeout.
    await pending.fulfill({ json: { construtora: account } }).catch(() => {});
    await expect(page.getByRole('alert')).toBeVisible();
    state.current = null;
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
    expect(state.logins).toBe(0);
  });

  for (const failure of ['expirado']) {
    test(`falha na restauração: ${failure}`, async ({ page }) => {
      await seedToken(page);
      await mockApi(page, { current: (route) => failure === 'rede' ? route.abort('failed')
        : route.fulfill({ status: failure === 'expirado' ? 401 : 503, json: { erro: 'Serviço indisponível' } }) });
      await page.goto(destination);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('alert')).toContainText('Entre novamente');
      await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toHaveCount(0);
      expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull();
    });
  }

  test('recarga sem cache mantém sessão e destino sem refazer login', async ({ page, context }) => {
    const state = await mockApi(page);
    await page.goto(destination);
    await fillLogin(page);
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
    const cdp = await context.newCDPSession(page);
    for (let i = 0; i < 2; i++) {
      const restores = state.restores;
      await cdp.send('Page.reload', { ignoreCache: true });
      await expect.poll(() => state.restores).toBeGreaterThan(restores);
      await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
      await expect(page).toHaveURL(destination);
      expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe('token-teste');
    }
    expect(state.logins).toBe(1);
    expect(state.revoked).toBe(false);
    await cdp.detach();
  });

  test('JWT inválido na restauração permite novo login e preserva o destino', async ({ page }) => {
    await seedToken(page);
    const state = await mockApi(page, { current: route => route.fulfill({ status: 422, json: { msg: 'Not enough segments' } }) });
    await page.goto(destination);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toContainText('Entre novamente');
    expect(await page.evaluate(key => sessionStorage.getItem(key), key)).toBeNull();
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toHaveCount(0);
    state.current = null;
    await fillLogin(page);
    await expect(page).toHaveURL(destination);
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
    expect(state.logins).toBe(1);
  });

  for (const failure of ['rede', 'servidor', 'resposta-incompleta']) {
    test(`recarga com ${failure} preserva token, bloqueia dados e permite restaurar`, async ({ page }) => {
      const state = await mockApi(page);
      await page.goto('/login');
      await fillLogin(page);
      await expect(page.getByRole('heading', { name: 'Obra protegida' })).toBeVisible();
      state.current = (route) => failure === 'rede' ? route.abort('failed')
        : route.fulfill({ status: failure === 'servidor' ? 503 : 200, json: {} });
      await page.reload();
      await expect(page.getByRole('alert')).toContainText('Não foi possível verificar sua sessão');
      await expect(page).toHaveURL('/obras');
      await expect(page.getByRole('heading', { name: 'Obra protegida' })).toHaveCount(0);
      expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe('token-teste');
      // Outra recarga durante a falha também deve manter o token.
      await page.reload();
      await expect(page.getByRole('alert')).toBeVisible();
      expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe('token-teste');
      state.current = null;
      await page.getByRole('button', { name: 'Tentar novamente' }).click();
      await expect(page.getByRole('heading', { name: 'Obra protegida' })).toBeVisible();
      expect(state.logins).toBe(1);
    });
  }

  test('401 em consulta autenticada encerra sessão e orienta novo login', async ({ page }) => {
    await mockApi(page, { obras: (route) => route.fulfill({ status: 401, json: { msg: 'Token has expired' } }) });
    await page.goto('/login');
    await fillLogin(page);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toContainText('Sua sessão expirou ou foi encerrada. Entre novamente.');
    await expect(page.getByRole('heading', { name: 'Obras em acompanhamento' })).toHaveCount(0);
  });

  test('logout aguarda revogação, limpa dados e protege retorno pelo histórico', async ({ page }) => {
    let release;
    const state = await mockApi(page, { logout: async (route) => {
      await new Promise((resolve) => { release = resolve; });
      state.revoked = true;
      return route.fulfill({ json: { mensagem: 'Sessão encerrada' } });
    } });
    await page.goto('/login');
    await fillLogin(page);
    await page.getByRole('heading', { name: 'Obra protegida' }).click();
    await expect(page.getByRole('heading', { name: 'Marcos da obra' })).toBeVisible();
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeDisabled();
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe('token-teste');
    release();
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull();
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Obra protegida', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toHaveCount(0);
  });

  for (const failure of ['rede', 'servidor', 'expirado']) {
    test(`logout sem confirmação: ${failure}`, async ({ page }) => {
      await mockApi(page, { logout: (route) => failure === 'rede' ? route.abort('failed')
        : route.fulfill({ status: failure === 'expirado' ? 401 : 503, json: { erro: 'Falha ao sair' } }) });
      await page.goto('/login');
      await fillLogin(page);
      await expect(page.getByRole('heading', { name: 'Obra protegida' })).toBeVisible();
      await page.getByRole('button', { name: 'Sair', exact: true }).click();
      if (failure === 'expirado') {
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('alert')).toContainText('Entre novamente');
      } else {
        await expect(page.getByRole('alert')).toContainText('Não foi possível confirmar a saída');
        await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeEnabled();
        expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBe('token-teste');
      }
    });
  }

  test('retorno de página preservada pelo navegador exige revalidação', async ({ page }) => {
    const state = await mockApi(page);
    await page.goto('/login');
    await fillLogin(page);
    await expect(page.getByRole('heading', { name: 'Obra protegida' })).toBeVisible();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    await expect(page.getByRole('heading', { name: 'Obra protegida' })).toHaveCount(0);
    state.revoked = true;
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await expect(page.getByRole('alert')).toContainText('Entre novamente');
    await expect(page.getByRole('heading', { name: 'Obra protegida' })).toHaveCount(0);
  });
});

test.describe('UC-01 — integração real (CT-01/02/04 e parcela de CT-111)', () => {
  test.skip(!isReal, 'Requer E2E_REAL=1 e conta provisionada no servidor');
  test('entra, restaura e API recusa o token revogado após sair', async ({ page, request }) => {
    const email = process.env.E2E_EMAIL;
    const password = process.env.E2E_PASSWORD;
    expect(Boolean(email && password), 'Defina E2E_EMAIL e E2E_PASSWORD fora dos arquivos versionados').toBe(true);
    await page.goto(destination);
    await expect(page).toHaveURL(/\/login$/);
    await fillLogin(page, email, 'credencial-incorreta-uc01');
    await expect(page.getByRole('alert')).toHaveText('E-mail ou senha incorretos.');
    await fillLogin(page, email, password);
    await expect(page).toHaveURL(destination);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toBeVisible();
    const token = await page.evaluate((key) => sessionStorage.getItem(key), key);
    // Obter a URL efetiva evita supor o prefixo público do Flask.
    const logoutResponse = page.waitForResponse((response) => response.url().endsWith('/construtora/logout/'));
    await page.getByRole('button', { name: 'Sair', exact: true }).click();
    const response = await logoutResponse;
    expect(response.ok()).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
    const apiBase = response.url().replace(/\/construtora\/logout\/$/, '');
    const rejected = await request.get(`${apiBase}/sessoes/atual`, { headers: { Authorization: `Bearer ${token}` } });
    expect(rejected.status(), 'Servidor deve recusar o token antigo').toBe(401);
    const anonymous = await request.get(`${apiBase}/obras`);
    expect(anonymous.status()).toBe(401);
    await page.goBack();
    await expect(page.getByRole('button', { name: 'Sair', exact: true })).toHaveCount(0);
  });
});
