import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarMudanca, novoValor, valoresIguais } from '../src/features/historico/mudanca.js';

test('mudança valida dias reais, limites iguais e ordem dos períodos', () => {
  assert.deepEqual(validarMudanca('marco', 'periodo_previsto', { inicio_previsto: '2030-03-01', fim_previsto: '2030-03-01' }, 'Revisão'), {});
  assert.ok(validarMudanca('marco', 'periodo_previsto', { inicio_previsto: '2030-02-30', fim_previsto: '2030-03-01' }, 'Revisão').inicio_previsto);
  assert.ok(validarMudanca('obra', 'entrega', { modalidade: 'intervalo_estimado', inicio: '2030-03-02', fim: '2030-03-01' }, 'Revisão')['entrega.fim']);
  assert.ok(validarMudanca('obra', 'estado', 'atrasada', 'Revisão').novo_valor);
  assert.ok(validarMudanca('obra', 'estado', 'planejada', '  ').motivo);
});
test('mudança descarta campos de outra modalidade e compara objetos sem depender da ordem JSON', () => {
  assert.deepEqual(novoValor('entrega', { modalidade: 'data_exata', data: '2030-03-01', inicio: 'antigo', fim: 'antigo' }), { modalidade: 'data_exata', data: '2030-03-01' });
  assert.deepEqual(novoValor('entrega', { modalidade: 'intervalo_estimado', data: 'antigo', inicio: '2030-03-01', fim: '2030-04-01' }), { modalidade: 'intervalo_estimado', inicio: '2030-03-01', fim: '2030-04-01' });
  assert.equal(valoresIguais({ modalidade: 'data_exata', data: '2030-03-01' }, { data: '2030-03-01', modalidade: 'data_exata' }), true);
  assert.equal(valoresIguais({ versao: 1 }, { versao: 2 }), false);
});
