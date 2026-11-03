const collections = { avanco: 'avancos', ocorrencia: 'ocorrencias' };
export function endpointRegistro(tipo, id) {
  if (!collections[tipo] || typeof id !== 'string' || !id.trim()) throw new Error('Registro inválido.');
  return `/${collections[tipo]}/${encodeURIComponent(id)}`;
}

export function conferirImpacto(value, expected) {
  const { alvo, perda } = value || {};
  if (typeof expected.obraId !== 'string' || !expected.obraId.trim()
    || !Object.hasOwn(collections, expected.tipo) || !alvo || alvo.tipo !== expected.tipo || alvo.id !== expected.id || alvo.obra_id !== expected.obraId
    || typeof alvo.nome !== 'string' || !alvo.nome.trim()
    || (alvo.marco_id != null && (typeof alvo.marco_id !== 'string' || !alvo.marco_id.trim()))
    || (expected.marcoId && alvo.marco_id !== expected.marcoId)
    || (alvo.tipo === 'avanco' && !alvo.marco_id)) {
    throw new Error('O alvo da exclusão não corresponde ao registro desta obra. Consulte novamente.');
  }
  const principal = alvo.tipo === 'avanco' ? 'avancos' : 'ocorrencias';
  const required = alvo.tipo === 'ocorrencia' ? ['midias', 'historico', 'aceitacoes']
    : expected.modo === 'rascunho' ? ['midias'] : ['midias', 'publicacoes', 'versoes', 'historico', 'exemplos_simulados'];
  if (!perda || Array.isArray(perda) || perda[principal] !== 1 || !required.every(key => Object.hasOwn(perda, key))
    || !Object.values(perda).every(n => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error('Não foi possível interpretar o impacto da exclusão. Consulte novamente.');
  }
  if (expected.modo === 'rascunho' && perda.publicacoes > 0) {
    throw new Error('Este avanço foi publicado. Reabra o detalhe para revisar a exclusão da publicação.');
  }
  return { tipo: alvo.tipo, id: alvo.id, obraId: alvo.obra_id, marcoId: alvo.marco_id || null,
    nome: alvo.nome, perda: { ...perda }, modo: expected.modo === 'rascunho' ? 'rascunho' : 'registro' };
}

export const exclusaoRegistrosApi = request => ({
  preview: async (expected, signal) => {
    const query = new URLSearchParams({ obra_id: expected.obraId });
    if (expected.marcoId) query.set('marco_id', expected.marcoId);
    return conferirImpacto(await request(`${endpointRegistro(expected.tipo, expected.id)}/exclusao?${query}`, { signal, expectedStatus: 200 }), expected);
  },
  remove: (alvo, signal) => request(endpointRegistro(alvo.tipo, alvo.id), {
    method: 'DELETE', signal, expectedStatus: 204,
    body: { confirmar: true, obra_id: alvo.obraId, ...(alvo.marcoId ? { marco_id: alvo.marcoId } : {}) },
  }),
});

export function retryDeadline(value, now = Date.now()) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) && seconds <= (Number.MAX_SAFE_INTEGER - now) / 1000 ? now + seconds * 1000 : 0;
  }
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(now, date) : 0;
}
