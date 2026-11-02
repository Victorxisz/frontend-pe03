import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient, ApiError } from '../src/shared/api/http.js';

test('recupera imagem com Bearer em blob e preserva erros JSON', async () => {
  const request = createHttpClient({ getToken: () => 'token', fetcher: async (_, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer token');
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'Content-Type': 'image/png' } });
  } });
  const blob = await request('/obras/123/imagem-projeto/456/conteudo', { responseType: 'blob' });
  assert.equal(blob.type, 'image/png');
  assert.equal(blob.size, 3);
  const failure = createHttpClient({ fetcher: async () => new Response('{"mensagem":"Imagem indisponível"}', { status: 503 }) });
  await assert.rejects(failure('/imagem', { responseType: 'blob' }), { status: 503, message: 'Imagem indisponível' });
});

test('envia JSON com Bearer token e preserva resposta 204', async () => {
  const request = createHttpClient({ baseUrl: '/api/', getToken: () => 'token', fetcher: async (url, options) => {
    assert.equal(url, '/api/obras/123');
    assert.equal(options.headers.get('Authorization'), 'Bearer token');
    assert.equal(options.headers.get('Content-Type'), 'application/json');
    assert.equal(options.body, '{"confirmar":true}');
    return new Response(null, { status: 204 });
  } });
  assert.equal(await request('/obras/123', { method: 'DELETE', body: { confirmar: true } }), null);
});

test('preserva erro de limpeza pendente sem indicar sucesso', async () => {
  const data = { codigo: 'LIMPEZA_PENDENTE', mensagem: 'Limpeza pendente', pendencia_id: '123' };
  const request = createHttpClient({ fetcher: async () => new Response(JSON.stringify(data), { status: 503 }) });
  await assert.rejects(request('/avancos/123', { method: 'DELETE' }), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 503);
    assert.deepEqual(error.data, data);
    return true;
  });
});

test('invalida sessão em 401 autenticado e não ao errar senha sem sessão', async () => {
  let invalidations = 0;
  let token = 'expired';
  const request = createHttpClient({ getToken: () => token, onUnauthorized: () => { invalidations++; }, fetcher: async () => new Response('{"erro":"Entre novamente"}', { status: 401 }) });
  await assert.rejects(request('/obras'), { message: 'Entre novamente' });
  assert.equal(invalidations, 1);
  token = null;
  await assert.rejects(request('/construtora/login/', { method: 'POST', body: {} }));
  assert.equal(invalidations, 1);
});

test('não define Content-Type ao enviar FormData', async () => {
  const form = new FormData();
  form.append('descricao', 'Evidência');
  const request = createHttpClient({ fetcher: async (_, options) => {
    assert.equal(options.body, form);
    assert.equal(options.headers.has('Content-Type'), false);
    return new Response('{}');
  } });
  await request('/marcos/123/avancos', { method: 'POST', body: form });
});

test('preserva envelopes e normaliza campos/códigos sem converter objetos em mensagem', async () => {
  for (const data of [
    { erro: { message: 'Campos inválidos', code: 'VALIDACAO', fields: { email: 'Inválido' } } },
    { error: { message: 'Campos inválidos', code: 'VALIDACAO', fields: { email: 'Inválido' } } },
    { mensagem: 'Campos inválidos', codigo: 'VALIDACAO', campos: { email: 'Inválido' } },
  ]) {
    const request = createHttpClient({ fetcher: async () => new Response(JSON.stringify(data), { status: 422 }) });
    await assert.rejects(request('/construtora/login/'), (error) => {
      assert.equal(error.message, 'Campos inválidos');
      assert.equal(error.status, 422);
      assert.deepEqual(error.data, data);
      assert.equal(error.code, 'VALIDACAO');
      assert.deepEqual(error.fields, { email: 'Inválido' });
      return true;
    });
  }
});

test('não envia token em login público e informa o token rejeitado no 401 autenticado', async () => {
  let rejected;
  const request = createHttpClient({ getToken: () => 'antigo', onUnauthorized: (token) => { rejected = token; }, fetcher: async (_, options) => {
    assert.equal(options.cache, 'no-store');
    return new Response('{}', { status: 401 });
  } });
  await assert.rejects(request('/obras'));
  assert.equal(rejected, 'antigo');
  const publicRequest = createHttpClient({ getToken: () => 'antigo', onUnauthorized: () => assert.fail('Login não invalida sessão'), fetcher: async (_, options) => {
    assert.equal(options.headers.has('Authorization'), false);
    return new Response('{}', { status: 401 });
  } });
  await assert.rejects(publicRequest('/construtora/login/', { method: 'POST', authenticated: false, body: {} }));
});

test('distingue falha de rede, cancelamento e erro HTTP sem JSON', async () => {
  const offline = createHttpClient({ fetcher: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(offline('/obras'), (error) => error instanceof ApiError && error.status === 0);
  const aborted = new DOMException('Cancelado', 'AbortError');
  const cancelled = createHttpClient({ fetcher: async () => { throw aborted; } });
  await assert.rejects(cancelled('/obras'), (error) => error === aborted);
  const unavailable = createHttpClient({ fetcher: async () => new Response('<html>502</html>', { status: 502 }) });
  await assert.rejects(unavailable('/obras'), (error) => error.status === 502 && error.data === null);
});
