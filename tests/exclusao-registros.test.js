import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHttpClient } from '../src/shared/api/http.js';
import { conferirImpacto, exclusaoRegistrosApi, retryDeadline } from '../src/shared/api/exclusaoRegistros.js';

const expected = { tipo: 'avanco', id: 'a', obraId: 'o', marcoId: 'm', modo: 'registro' };
const preview = { alvo: { tipo: 'avanco', id: 'a', obra_id: 'o', marco_id: 'm', nome: 'Fundação' }, perda: { avancos: 1, midias: 3, versoes: 2, publicacoes: 1, historico: 0, exemplos_simulados: 0 } };

test('prévia rejeita contexto adulterado e impacto incompleto', () => {
  for (const patch of [{ id: 'outro' }, { tipo: 'ocorrencia' }, { obra_id: 'outra' }, { marco_id: 'outro' }, { marco_id: null }, { nome: '' }]) {
    assert.throws(() => conferirImpacto({ ...preview, alvo: { ...preview.alvo, ...patch } }, expected));
  }
  for (const perda of [null, {}, [], { avancos: 1 }, { avancos: 2, midias: 1 }, { avancos: 1, midias: -1 }, { avancos: 1, midias: '3' }, { avancos: 1, midias: 1.2 }]) {
    assert.throws(() => conferirImpacto({ ...preview, perda }, expected));
  }
  assert.throws(() => conferirImpacto(preview, { ...expected, modo: 'rascunho' }));
  assert.deepEqual(conferirImpacto(preview, expected).perda, preview.perda);
});

test('cliente JSON confirma contexto uma vez e somente 204 conclui', async () => {
  for (const status of [200, 202, 204]) {
    const request = createHttpClient({ fetcher: async (url, options) => {
      assert.equal(url, '/api/avancos/a');
      assert.equal(options.method, 'DELETE');
      assert.deepEqual(JSON.parse(options.body), { confirmar: true, obra_id: 'o', marco_id: 'm' });
      return new Response(null, { status });
    } });
    const action = exclusaoRegistrosApi(request).remove(conferirImpacto(preview, expected));
    if (status === 204) assert.equal(await action, null);
    else await assert.rejects(action, { status: 0 });
  }
});

test('ocorrência sem marco omite marco_id e mantém o contexto da obra', async () => {
  const request = async (url, options) => {
    assert.equal(url, '/ocorrencias/c');
    assert.deepEqual(options.body, { confirmar: true, obra_id: 'o' });
    assert.equal(options.expectedStatus, 204);
  };
  await exclusaoRegistrosApi(request).remove({ tipo: 'ocorrencia', id: 'c', obraId: 'o', marcoId: null });
});

test('preserva referência de limpeza e Retry-After, em segundos ou data HTTP', async () => {
  const request = createHttpClient({ fetcher: async () => new Response(JSON.stringify({ codigo: 'LIMPEZA_PENDENTE', pendencia: 'operacao-1' }), { status: 503, headers: { 'Retry-After': '30' } }) });
  await assert.rejects(exclusaoRegistrosApi(request).remove(conferirImpacto(preview, expected)), error => {
    assert.equal(error.retryAfter, '30');
    assert.equal(error.code, 'LIMPEZA_PENDENTE');
    assert.equal(error.data.pendencia, 'operacao-1');
    return true;
  });
  const now = Date.parse('2030-01-01T00:00:00Z');
  assert.equal(retryDeadline('30', now), now + 30000);
  assert.equal(retryDeadline('Tue, 01 Jan 2030 00:00:30 GMT', now), now + 30000);
  assert.equal(retryDeadline('indisponível', now), 0);
});
