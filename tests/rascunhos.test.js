import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conferirAvancoEdicao, mesmoRascunho, prepararEdicaoRascunho, corpoEdicaoRascunho, conferirEdicaoConfirmada } from '../src/features/avancos/rascunhos.js';

const base = { id: 'a', marco_id: 'm', estado: 'rascunho', autor: 'autora', data: '2030-10-19', descricao: 'Fundação', midias: [{ id: 'foto', nome: 'a.png' }, { id: 'pdf', nome: 'b.pdf' }] };
const draft = { data: base.data, descricao: base.descricao };

test('edição envia apenas diferenças e preserva campos omitidos', () => {
  assert.deepEqual(prepararEdicaoRascunho(base, draft, ['foto', 'pdf'], []).changes, {});
  assert.deepEqual(prepararEdicaoRascunho(base, { ...draft, descricao: '  Concretagem  ' }, ['foto', 'pdf'], []).changes, { descricao: 'Concretagem' });
  assert.deepEqual(prepararEdicaoRascunho(base, draft, ['foto'], []).changes, { midias_manter: ['foto'] });
  assert.deepEqual(prepararEdicaoRascunho(base, draft, [], [{}]).changes, { midias_manter: [] });
  assert.equal(prepararEdicaoRascunho(base, draft, ['pdf', 'foto'], []).dirty, false);
});

test('valida mídia mínima, IDs próprios, data real, texto e lote de novos arquivos', () => {
  assert.ok(prepararEdicaoRascunho(base, draft, [], []).errors.midias);
  assert.deepEqual(prepararEdicaoRascunho(base, draft, [], [{}]).errors, {});
  assert.ok(prepararEdicaoRascunho(base, draft, ['alheio'], []).errors.midias);
  assert.ok(prepararEdicaoRascunho(base, draft, ['foto', 'foto'], []).errors.midias);
  assert.ok(prepararEdicaoRascunho(base, { data: '2030-02-29', descricao: ' ' }, ['foto'], []).errors.data);
  assert.ok(prepararEdicaoRascunho(base, { ...draft, descricao: ' ' }, ['foto'], []).errors.descricao);
  assert.ok(prepararEdicaoRascunho(base, draft, ['foto'], Array(6).fill({})).errors.midias);
});

test('texto usa JSON, novos arquivos usam multipart com lista textual de IDs', () => {
  assert.deepEqual(corpoEdicaoRascunho({ descricao: 'Nova' }, []), { descricao: 'Nova' });
  const file = new File(['png'], 'nova.png', { type: 'image/png' });
  const body = corpoEdicaoRascunho({ midias_manter: [], data: '2030-10-20' }, [file]);
  assert.ok(body instanceof FormData);
  assert.equal(body.get('midias_manter'), '[]');
  assert.equal(body.getAll('midias').length, 1);
  assert.equal(body.get('midias').name, 'nova.png');
  assert.throws(() => corpoEdicaoRascunho({ estado: 'publicado' }, []));
  assert.throws(() => corpoEdicaoRascunho({ revisao: 3 }, []));
});

test('confirmação 200 deve identificar o rascunho e os dados alterados', () => {
  const response = { id: 'a', estado: 'rascunho', data: '2030-10-19', descricao: 'Nova', revisao: 4 };
  assert.equal(conferirEdicaoConfirmada(response, 'a', { descricao: 'Nova' }), response);
  for (const patch of [{ id: 'outro' }, { estado: 'publicado' }, { descricao: 'Antiga' }, { revisao: undefined }]) {
    assert.throws(() => conferirEdicaoConfirmada({ ...response, ...patch }, 'a', { descricao: 'Nova' }), { status: 0 });
  }
  assert.throws(() => conferirEdicaoConfirmada({ avanco_id: 'a', versoes: [] }, 'a', {}), { status: 0 });
});

test('reconsulta detecta alterações mas não confunde ordem ou links de mídia com mudança', () => {
  assert.equal(mesmoRascunho(base, { ...base, midias: [...base.midias].reverse().map(m => ({ ...m, conteudo: '/novo-link' })) }), true);
  assert.equal(mesmoRascunho(base, { ...base, descricao: 'Outra intenção' }), false);
  assert.equal(mesmoRascunho(base, { ...base, estado: 'publicado' }), false);
  assert.equal(mesmoRascunho(base, { ...base, midias: [{ id: 'outra' }] }), false);
});

test('leitura rejeita alvo e mídias incompatíveis antes de habilitar o editor', () => {
  assert.equal(conferirAvancoEdicao(base, 'a'), base);
  assert.throws(() => conferirAvancoEdicao(base, 'outro'));
  assert.throws(() => conferirAvancoEdicao({ ...base, midias: ['foto'] }, 'a'));
  assert.throws(() => conferirAvancoEdicao({ ...base, midias: [{ id: 'foto', avanco_id: 'outro' }] }, 'a'));
});
