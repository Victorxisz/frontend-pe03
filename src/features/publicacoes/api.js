import { ApiError } from '../../shared/api/http';
const id = encodeURIComponent;
function record(value) {
  if (!value || typeof value.id !== 'string' || typeof value.descricao !== 'string' || !Array.isArray(value.midias)) throw new Error('Resposta inválida. Consulte novamente.');
  return value;
}
function publications(value, key) {
  if (!Array.isArray(value?.[key])) throw new Error('Não foi possível interpretar as publicações.');
  const seen = new Set();
  return value[key].map(record).filter(item => item.estado === 'publicado' && !seen.has(item.avanco_id || item.id) && seen.add(item.avanco_id || item.id));
}
export const publicacoesApi = request => ({
  detail: async (obraId, avancoId, signal) => {
    const value = record(await request(`/avancos/${id(avancoId)}`, { signal, expectedStatus: 200 }));
    if (value.id !== avancoId) throw new ApiError('Avanço não encontrado.', 404);
    const marco = await request(`/obras/${id(obraId)}/marcos/${id(value.marco_id)}`, { signal, expectedStatus: 200 });
    if (marco.id !== value.marco_id || marco.obra_id !== obraId) throw new ApiError('Avanço não encontrado nesta obra.', 404);
    return { ...value, marco };
  },
  list: async (marcoId, signal) => {
    const value = await request(`/marcos/${id(marcoId)}/avancos`, { signal, expectedStatus: 200 });
    if (!Array.isArray(value)) throw new Error('Lista de avanços inválida.');
    return value.map(record);
  },
  publications: async (avancoId, signal) => publications(await request(`/avancos/${id(avancoId)}/publicacoes`, { signal, expectedStatus: 200 }), 'publicacoes'),
  preview: async (obraId, signal) => publications(await request(`/obras/${id(obraId)}/previa`, { signal, expectedStatus: 200 }), 'atualizacoes'),
  publish: async avancoId => {
    const value = record(await request(`/avancos/${id(avancoId)}/publicacoes`, { method: 'POST', body: {}, expectedStatus: [200, 201] }));
    if (value.avanco_id !== avancoId || value.estado !== 'publicado' || !value.autor || !value.instante) throw new Error('Confirmação incompleta. Consulte a publicação antes de tentar novamente.');
    return value;
  },
});
