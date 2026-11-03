import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diaValido, formatarDia, formatarDataHora } from '../src/shared/lib/datas.js';

test('dias existentes respeitam anos bissextos e limites do contrato Python', () => {
  for (const value of ['2028-02-29', '2000-02-29', '0001-01-01', '9999-12-31']) assert.equal(diaValido(value), true, value);
  for (const value of ['2030-02-29', '1900-02-29', '2030-04-31', '0000-01-01', '2030-00-01', '2030-13-01', '2030-01-00', '2030-1-1', '', null]) assert.equal(diaValido(value), false, value);
  assert.equal(formatarDia('2030-01-15'), '15/01/2030');
});

test('instantes exibem data e hora legíveis, convertendo o fuso e a virada do dia', () => {
  assert.equal(formatarDataHora('2026-11-03T00:17:51.068000+00:00', 'America/Sao_Paulo'), '02/11/2026 : 21:17');
  assert.equal(formatarDataHora('2026-11-03T00:17:51.068000+00:00', 'UTC'), '03/11/2026 : 00:17');
  assert.equal(formatarDataHora('2026-11-02T21:17:51-03:00', 'America/Sao_Paulo'), '02/11/2026 : 21:17');
  assert.equal(formatarDataHora(null), 'Não informado');
  assert.equal(formatarDataHora('inválida'), 'Data inválida');
});
