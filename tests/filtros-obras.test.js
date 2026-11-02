import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerFiltros, parametrosFiltros, validarFiltros } from '../src/features/obras/filtros.js';
import { obrasApi } from '../src/features/obras/api.js';

test('serializa cada filtro uma vez, omite vazios e preserva texto literal', async () => {
  const signal = new AbortController().signal;
  const api = obrasApi(async (path, options) => {
    const url = new URL(path, 'https://example.test');
    assert.equal(url.pathname, '/obras');
    assert.deepEqual(Object.fromEntries(url.searchParams), { nome: 'Aurora [A].*', estado: 'em andamento', alerta: 'atrasada' });
    for (const key of url.searchParams.keys()) assert.equal(url.searchParams.getAll(key).length, 1);
    assert.equal(options.signal, signal);
  });
  await api.list(signal, { nome: '  Aurora [A].* ', estado: 'em andamento', alerta: 'atrasada', cliente: '  ', entregaDe: '', registroDe: '', desconhecido: 'ignorar' });
  assert.equal(parametrosFiltros({ nome: '', alerta: '  ' }).toString(), '');
});

test('URL repetida é identificada antes de consultar e pode ser normalizada', () => {
  const { filtros, repetidos } = lerFiltros(new URLSearchParams('nome=A&nome=B&cliente=&alerta='));
  assert.deepEqual(repetidos, ['nome']);
  assert.equal(parametrosFiltros(filtros).toString(), 'nome=A');
});

test('datas aceitam limites iguais e rejeitam dias inexistentes e intervalos invertidos', () => {
  assert.deepEqual(validarFiltros({ entregaDe: '2030-01-01', entregaAte: '2030-01-01', registroDe: '0001-01-01' }), {});
  assert.deepEqual(Object.keys(validarFiltros({ entregaDe: '2030-02-30', registroDe: '2030-01-02', registroAte: '2030-01-01' })), ['entregaDe', 'registroAte']);
});
