import { ApiError } from '../../shared/api/http';

export function idRecurso(path, prefix, suffix = '') {
  if (typeof path !== 'string' || !path.startsWith(prefix) || !path.endsWith(suffix)) return null;
  const part = path.slice(prefix.length, suffix ? -suffix.length : undefined);
  if (!part || part.includes('/') || part.includes('?') || part.includes('#')) return null;
  try { const id = decodeURIComponent(part); return id && !id.includes('/') ? id : null; } catch { return null; }
}
function validarEvento(item, obraId) {
  if (!item || typeof item.id !== 'string' || !item.id || item.obra_id !== obraId || !item.alvo || typeof item.alvo.id !== 'string' || !Array.isArray(item.campos) || typeof item.motivo !== 'string' || typeof item.autor !== 'string' || typeof item.instante !== 'string' || (item.consulta != null && idRecurso(item.consulta, '/mudancas/') !== item.id) || (item.alvo.tipo === 'marco' && item.campos.includes('estado') && (typeof item.antes !== 'string' || typeof item.depois !== 'string'))) throw new Error('Não foi possível interpretar o histórico. Consulte novamente.');
  return item;
}
export const historicoApi = (request) => ({
  apply: (obraId, body, signal) => request(`/obras/${encodeURIComponent(obraId)}/mudancas`, { method: 'POST', body, signal, expectedStatus: 200 }),
  list: async (obraId, signal) => {
    const data = await request(`/obras/${encodeURIComponent(obraId)}/mudancas`, { signal, expectedStatus: 200 });
    if (!Array.isArray(data?.mudancas)) throw new Error('Não foi possível interpretar o histórico. Consulte novamente.');
    return data.mudancas.map(item => validarEvento(item, obraId));
  },
  detail: async (obraId, mudancaId, signal) => {
    const item = await request(`/mudancas/${encodeURIComponent(mudancaId)}`, { signal, expectedStatus: 200 });
    if (item?.obra_id !== obraId || item?.id !== mudancaId) throw new ApiError('Mudança não encontrada nesta obra.', 404);
    return validarEvento(item, obraId);
  },
});
