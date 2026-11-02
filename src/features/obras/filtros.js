import { diaValido, formatarDia } from '../../shared/lib/datas.js';

export const estadosObra = ['planejada', 'em andamento', 'concluída', 'suspensa'];
export const nomesFiltros = {
  nome: 'Nome da obra', cliente: 'Cliente de referência', estado: 'Estado da obra', alerta: 'Alerta',
  entregaDe: 'Entrega a partir de', entregaAte: 'Entrega até', registroDe: 'Registro a partir de', registroAte: 'Registro até',
};

export function lerFiltros(params) {
  const filtros = {};
  const repetidos = [];
  for (const campo of Object.keys(nomesFiltros)) {
    if (params.getAll(campo).length > 1) repetidos.push(campo);
    filtros[campo] = (params.get(campo) || '').trim();
  }
  return { filtros, repetidos };
}

export function parametrosFiltros(filtros = {}) {
  const params = new URLSearchParams();
  for (const campo of Object.keys(nomesFiltros)) {
    const valor = filtros[campo]?.trim();
    if (valor) params.set(campo, valor);
  }
  return params;
}

export function validarFiltros(filtros) {
  const errors = {};
  if (filtros.estado && !estadosObra.includes(filtros.estado)) errors.estado = 'Escolha um estado válido.';
  if (filtros.alerta && filtros.alerta !== 'atrasada') errors.alerta = 'O alerta disponível é atrasada.';
  for (const [de, ate] of [['entregaDe', 'entregaAte'], ['registroDe', 'registroAte']]) {
    for (const campo of [de, ate]) {
      if (filtros[campo] && !diaValido(filtros[campo])) errors[campo] = 'Informe um dia existente.';
    }
    if (diaValido(filtros[de]) && diaValido(filtros[ate]) && filtros[ate] < filtros[de]) errors[ate] = 'O fim do período deve ser maior ou igual ao início.';
  }
  return errors;
}

export function textoFiltro(campo, valor) {
  if (/^(entrega|registro)(De|Ate)$/.test(campo)) return formatarDia(valor);
  if (campo === 'alerta') return 'Atrasada';
  return valor;
}
