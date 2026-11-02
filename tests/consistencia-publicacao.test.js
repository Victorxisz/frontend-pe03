import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conferirLeitura, mesmoConteudo } from '../src/features/publicacoes/consistencia.js';

test('retenção e disponibilidade não são alteração de conteúdo publicado', () => {
  const detail = { descricao: 'Texto', data: '2030-01-01', midias: [{ id: 'foto', conteudo: '/midias/foto/conteudo' }] };
  const historic = { ...detail, midias: [{ id: 'foto', retida: false, conteudo: null }] };
  assert.equal(mesmoConteudo(detail, historic), true);
  assert.doesNotThrow(() => conferirLeitura(detail, { versoes: [{ numero: 1, atual: true, conteudo: historic }] }, detail));
});
test('leitura mista de conteúdo e versões ou marcador atual inválido bloqueia edição', () => {
  const current = { descricao: 'Texto atual', data: '2030-01-01', midias: [{ id: 'foto' }] };
  const chain = { versoes: [{ numero: 1, atual: true, conteudo: current }] };
  assert.throws(() => conferirLeitura({ ...current, descricao: 'Texto antigo' }, chain, current), { status: 409 });
  assert.throws(() => conferirLeitura(current, chain, { ...current, midias: [{ id: 'outra-foto' }] }), { status: 409 });
  assert.throws(() => conferirLeitura(current, { versoes: [{ numero: 1, atual: false, conteudo: current }] }, current), { status: 409 });
});
