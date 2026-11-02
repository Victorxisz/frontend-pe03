import { ApiError } from '../../shared/api/http';
const enc = encodeURIComponent;
function conferir(item, obraId, ocorrenciaId) {
  if (!item || typeof item.id !== 'string' || !item.id || item.obra_id !== obraId || (ocorrenciaId && item.id !== ocorrenciaId)) throw new ApiError('Ocorrência não encontrada nesta obra.', 404);
  if (typeof item.titulo !== 'string' || typeof item.descricao !== 'string' || typeof item.estado !== 'string' || !Array.isArray(item.midias) || !Array.isArray(item.aceitacoes) || !Array.isArray(item.aceitacoes_do_estado_atual) || typeof item.autor !== 'string' || typeof item.data_registro !== 'string' || !Number.isInteger(item.versao) || !Number.isInteger(item.episodio)) throw new Error('Resposta de ocorrência incompleta. Consulte novamente.');
  return item;
}
export const ocorrenciasApi = request => ({
  list: async (obraId, signal) => {
    const data = await request(`/obras/${enc(obraId)}/ocorrencias`, { signal, expectedStatus: 200 });
    if (!Array.isArray(data?.ocorrencias)) throw new Error('Não foi possível interpretar a lista de ocorrências.');
    return data.ocorrencias.map(item => conferir(item, obraId));
  },
  detail: async (obraId, id, signal) => conferir(await request(`/ocorrencias/${enc(id)}`, { signal, expectedStatus: 200 }), obraId, id),
  workers: async (obraId, signal) => {
    const data = await request(`/trabalhadores/obra/${enc(obraId)}/`, { signal, expectedStatus: 200 });
    if (!Array.isArray(data) || !data.every(item => typeof item.id === 'string' && typeof item.nome === 'string' && Array.isArray(item.obras))) throw new Error('Não foi possível interpretar os trabalhadores.');
    return data.filter(item => item.obras.includes(obraId));
  },
  create: async (obraId, dados, arquivos, signal) => {
    const campos = { titulo: dados.titulo.trim(), descricao: dados.descricao.trim(), estado: dados.estado };
    if (dados.marco_id) campos.marco_id = dados.marco_id;
    if (dados.responsavel_id) campos.responsavel_id = dados.responsavel_id;
    let body = campos;
    if (arquivos.length) {
      body = new FormData();
      Object.entries(campos).forEach(([key, value]) => body.append(key, value));
      arquivos.forEach(file => body.append('midias', file, file.name));
    }
    const result = await request(`/obras/${enc(obraId)}/ocorrencias`, { method: 'POST', body, signal, expectedStatus: 201 });
    try { return conferir(result, obraId); } catch { throw new ApiError('Confirmação incompleta. Consulte a lista antes de reenviar.', 0); }
  },
  media: (id, signal) => request(`/midias/${enc(id)}/conteudo`, { signal, responseType: 'blob', expectedStatus: 200 }),
});
