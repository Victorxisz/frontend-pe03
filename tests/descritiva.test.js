import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alteracoesDescritivas, validarDescritiva } from '../src/features/obras/descritiva.js';

test('edição envia somente diferenças descritivas e exclui planejamento e auditoria', () => {
  const original = { nome: 'Aurora', cliente: 'Marina', localizacao: 'Campinas', descricao: 'Casa' };
  assert.deepEqual(alteracoesDescritivas(original, { ...original, nome: ' Nova Aurora ', entrega: {}, estado: 'concluída', tipo: 'apartamentos', inicio: '2030-01-01', autor: 'outro', data_conclusao: '2030-01-01' }), { nome: 'Nova Aurora' });
  assert.deepEqual(alteracoesDescritivas(original, { ...original, nome: ' Aurora ' }), {});
  assert.deepEqual(Object.keys(validarDescritiva({ nome: '', cliente: '  ', localizacao: null, descricao: 'Descrição' })), ['nome', 'cliente', 'localizacao']);
});
