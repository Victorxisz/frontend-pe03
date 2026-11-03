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
  searchCargo: async (cargo, signal) => {
    const data = await request(`/trabalhadores/cargo/${enc(cargo.trim())}/`, { signal, expectedStatus: 200 });
    if (!Array.isArray(data)) throw new Error('Não foi possível interpretar a busca por cargo.');
    return data.map(item => conferir(item));
  },
  search: async (termo, signal) => {
    const data = await request(`/trabalhadores/nome/${enc(termo.trim())}/`, { signal, expectedStatus: 200 });
    if (!Array.isArray(data)) throw new Error('Não foi possível interpretar a busca de trabalhadores.');
    return data.map(item => conferir(item));
  },
  update: async (id, body, signal) => {
    const data = await request(`/trabalhadores/${enc(id)}/`, { method: 'PATCH', body, signal, expectedStatus: 200 });
    if (!data || data.id !== id || typeof data.mensagem !== 'string' || !data.mensagem.trim()) throw new ApiError('Resposta incompleta. Consulte o cadastro antes de repetir.', 0);
    return data;
  },
  remove: async (id, signal) => {
    const data = await request(`/trabalhadores/${enc(id)}/`, { method: 'DELETE', signal, expectedStatus: 200 });
    if (!data || data.id !== id || typeof data.mensagem !== 'string' || !data.mensagem.trim() || !Number.isInteger(data.ocorrencias_sem_responsavel) || data.ocorrencias_sem_responsavel < 0) throw new ApiError('Resposta incompleta. Consulte o cadastro antes de repetir.', 0);
    return data;
  },
  refreshAffected: async (ids, signal, { removidas = [], trabalhadorId } = {}) => {
    const unique = [...new Set(ids)];
    const results = await Promise.allSettled(unique.map(async obraId => {
      const [equipe, dados] = await Promise.all([
        request(`/trabalhadores/obra/${enc(obraId)}/`, { signal, expectedStatus: 200 }),
        request(`/obras/${enc(obraId)}/ocorrencias`, { signal, expectedStatus: 200 }),
      ]);
      if (!Array.isArray(equipe) || !Array.isArray(dados?.ocorrencias)) throw new Error('Resposta de releitura inválida.');
      return removidas.includes(obraId) && trabalhadorId && dados.ocorrencias.some(item => item?.responsavel_id === trabalhadorId) ? obraId : null;
    }));
    return { ok: results.every(result => result.status === 'fulfilled'),
      pendentes: results.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []) };
  },
  create: async (obraId, dados, signal) => {
    const body = Object.fromEntries(['nome', 'email', 'telefone', 'cargo'].map(campo => [campo, dados[campo].trim()]));
    const result = await request(`/trabalhadores/obra/${enc(obraId)}/`, { method: 'POST', body, signal, expectedStatus: 201 });
    if (!result || typeof result.id !== 'string' || !result.id || result.obra_id !== obraId) {
      throw new ApiError('O servidor não confirmou o cadastro. Consulte a equipe antes de tentar novamente.', 0);
    }
    return result;
  },
});
