// Dias de calendário não são instantes: não converter com Date/UTC.
export function diaValido(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [ano, mes, dia] = value.split('-').map(Number);
  const bissexto = ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0);
  const dias = [31, bissexto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return ano >= 1 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= dias[mes - 1];
}

export function formatarDia(value) {
  return diaValido(value) ? value.split('-').reverse().join('/') : value || '—';
}

export function formatarEntrega(entrega) {
  if (entrega?.modalidade === 'data_exata') return `Data exata: ${formatarDia(entrega.data)}`;
  if (entrega?.modalidade === 'intervalo_estimado') return `Intervalo estimado: ${formatarDia(entrega.inicio)} a ${formatarDia(entrega.fim)}`;
  return '—';
}
