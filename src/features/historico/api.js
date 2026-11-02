export const historicoApi = (request) => ({
  apply: (obraId, body) => request(`/obras/${encodeURIComponent(obraId)}/mudancas`, { method: 'POST', body, expectedStatus: 200 }),
  list: async (obraId, signal) => {
    const data = await request(`/obras/${encodeURIComponent(obraId)}/mudancas`, { signal, expectedStatus: 200 });
    if (!Array.isArray(data?.mudancas) || !data.mudancas.every((item) => item && typeof item.id === 'string' && item.obra_id === obraId && item.alvo && typeof item.alvo.id === 'string' && Array.isArray(item.campos) && typeof item.motivo === 'string' && typeof item.autor === 'string' && typeof item.instante === 'string'
      && (!(item.alvo.tipo === 'marco' && item.campos.includes('estado')) || (typeof item.antes === 'string' && typeof item.depois === 'string')))) {
      throw new Error('Não foi possível interpretar o histórico. Consulte novamente.');
    }
    return data.mudancas;
  },
});
