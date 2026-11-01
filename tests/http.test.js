import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient, ApiError } from '../src/shared/api/http.js';

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
