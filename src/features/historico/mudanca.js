import { diaValido, formatarDia, formatarEntrega } from '../../shared/lib/datas.js';
export const estadosObra = ['planejada', 'em andamento', 'concluída', 'suspensa'];
export const estadosMarco = ['a iniciar', 'em andamento', 'concluído'];
export function valorAtual(target, campo) {
  return campo === 'periodo_previsto' ? { inicio_previsto: target.inicio_previsto, fim_previsto: target.fim_previsto } : target[campo];
}
export function descreverValor(value) {
  if (value == null) return 'Não informado';
  if (typeof value === 'string') return value;
  if (value.modalidade) return formatarEntrega(value);
  if ('inicio_previsto' in value) return `${formatarDia(value.inicio_previsto)} a ${formatarDia(value.fim_previsto)}`;
  if ('estado' in value) return `${value.estado} · Conclusão efetiva: ${value.data_conclusao ? formatarDia(value.data_conclusao) : 'não registrada'}`;
  return JSON.stringify(value);
}
export function novoValor(campo, value) {
  if (campo !== 'entrega') return value;
  return value.modalidade === 'data_exata' ? { modalidade: 'data_exata', data: value.data } : { modalidade: 'intervalo_estimado', inicio: value.inicio, fim: value.fim };
}
export function validarMudanca(tipo, campo, value, motivo) {
  const errors = {};
  if (!motivo.trim()) errors.motivo = 'Informe o motivo da mudança.';
  if (campo === 'estado') {
    if (!(tipo === 'obra' ? estadosObra : estadosMarco).includes(value)) errors.novo_valor = 'Selecione um estado válido.';
  } else if (campo === 'entrega') {
    if (!['data_exata', 'intervalo_estimado'].includes(value?.modalidade)) errors.entrega = 'Selecione a modalidade.';
    else {
      const keys = value.modalidade === 'data_exata' ? ['data'] : ['inicio', 'fim'];
      for (const key of keys) if (!diaValido(value[key])) errors[`entrega.${key}`] = 'Informe uma data válida.';
      if (value.modalidade === 'intervalo_estimado' && value.fim < value.inicio) errors['entrega.fim'] = 'O fim não pode anteceder o início.';
    }
  } else {
    for (const key of ['inicio_previsto', 'fim_previsto']) if (!diaValido(value?.[key])) errors[key] = 'Informe uma data válida.';
    if (value?.fim_previsto < value?.inicio_previsto) errors.fim_previsto = 'O fim não pode anteceder o início.';
  }
  return errors;
}

export function valoresIguais(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && valoresIguais(a[key], b[key]));
}
