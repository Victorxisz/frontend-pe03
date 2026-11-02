import { ApiError } from '../../shared/api/http';
const base = (obraId) => `/obras/${encodeURIComponent(obraId)}/marcos`;
function conferirMarco(marco) {
  if (!marco || typeof marco.id !== 'string' || !marco.id.trim() || typeof marco.nome !== 'string') throw new Error('Não foi possível interpretar os dados do marco. Tente novamente.');
  return marco;
}
const dependencias = (marcoId) => `/marcos/${encodeURIComponent(marcoId)}/dependencias`;
function conferirDependencia(data, marcoId) {
  if (!data || !['id', 'marco_id', 'depende_de_id', 'marco_nome', 'depende_de_nome'].every((campo) => typeof data[campo] === 'string' && data[campo].trim()) || data.marco_id !== marcoId) {
    throw new Error('Não foi possível interpretar a dependência. Consulte novamente.');
  }
  return data;
}
export const marcosApi = (request) => ({
  list: async (obraId, signal) => {
    const data = await request(base(obraId), { signal, expectedStatus: 200 });
    if (!Array.isArray(data)) throw new Error('Não foi possível interpretar a lista de marcos. Tente novamente.');
    return data.map(conferirMarco);
  },
  detail: async (obraId, marcoId, signal) => {
    const data = conferirMarco(await request(`${base(obraId)}/${encodeURIComponent(marcoId)}`, { signal, expectedStatus: 200 }));
    if (data.id !== marcoId || data.obra_id !== obraId) throw new ApiError('Marco não encontrado nesta obra.', 404);
    return data; // Preservar versao para os próximos comandos.
  },
  create: async (obraId, dados) => conferirMarco(await request(base(obraId), {
    method: 'POST', expectedStatus: 201,
    body: Object.fromEntries(['nome', 'descricao', 'inicio_previsto', 'fim_previsto'].map((campo) => [campo, dados[campo].trim()])),
  })),
  dependencies: async (marcoId, signal) => {
    const data = await request(dependencias(marcoId), { signal, expectedStatus: 200 });
    if (!Array.isArray(data)) throw new Error('Não foi possível interpretar a lista de dependências. Consulte novamente.');
    return data.map((item) => conferirDependencia(item, marcoId));
  },
  addDependency: async (marcoId, dependeDeId) => {
    const data = conferirDependencia(await request(dependencias(marcoId), {
      method: 'POST', body: { depende_de_id: dependeDeId }, expectedStatus: 201,
    }), marcoId);
    if (data.depende_de_id !== dependeDeId) throw new Error('O servidor não confirmou a dependência escolhida. Consulte novamente.');
    return data;
  },
  removeDependency: (marcoId, dependenciaId) => request(`${dependencias(marcoId)}/${encodeURIComponent(dependenciaId)}`, { method: 'DELETE', expectedStatus: 204 }),
});
