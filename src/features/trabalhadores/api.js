import { ApiError } from '../../shared/api/http';
const enc = encodeURIComponent;
function conferir(item, id) {
  if (!item || typeof item.id !== 'string' || !item.id || (id && item.id !== id)
    || typeof item.nome !== 'string' || !Array.isArray(item.obras)
    || !item.obras.every(obra => typeof obra === 'string')) {
    throw new Error('Não foi possível interpretar o cadastro do trabalhador. Consulte novamente.');
  }
  return item;
}
export const trabalhadoresApi = request => ({
  list: async (obraId, signal) => {
    const data = await request(`/trabalhadores/obra/${enc(obraId)}/`, { signal, expectedStatus: 200 });
    if (!Array.isArray(data)) throw new Error('Não foi possível interpretar a equipe da obra.');
    return data.map(item => conferir(item)).filter(item => item.obras.includes(obraId));
  },
  detail: async (id, signal) => conferir(await request(`/trabalhadores/${enc(id)}/`, { signal, expectedStatus: 200 }), id),
  create: async (obraId, dados, signal) => {
    const body = Object.fromEntries(['nome', 'email', 'telefone', 'cargo'].map(campo => [campo, dados[campo].trim()]));
    const result = await request(`/trabalhadores/obra/${enc(obraId)}/`, { method: 'POST', body, signal, expectedStatus: 201 });
    if (!result || typeof result.id !== 'string' || !result.id || result.obra_id !== obraId) {
      throw new ApiError('O servidor não confirmou o cadastro. Consulte a equipe antes de tentar novamente.', 0);
    }
    return result;
  },
});
