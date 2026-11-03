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

// Instantes usam o fuso local do navegador; datas de calendário continuam sem conversão.
export function formatarDataHora(value, timeZone) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return 'Data inválida';
  const parts = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.day}/${p.month}/${p.year} : ${p.hour}:${p.minute}`;
}

export function formatarEntrega(entrega) {
  if (entrega?.modalidade === 'data_exata') return `Data exata: ${formatarDia(entrega.data)}`;
  if (entrega?.modalidade === 'intervalo_estimado') return `Intervalo estimado: ${formatarDia(entrega.inicio)} a ${formatarDia(entrega.fim)}`;
  return '—';
}
