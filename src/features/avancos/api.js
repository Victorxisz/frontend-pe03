import { marcosApi } from '../marcos/api';
import { conferirAvancoEdicao, corpoEdicaoRascunho, conferirEdicaoConfirmada } from './rascunhos';

export const avancosApi = (request) => ({
  editorDetail: async (obraId, id, signal) => {
    const avanco = conferirAvancoEdicao(await request(`/avancos/${encodeURIComponent(id)}`, { signal, expectedStatus: 200 }), id);
    const marco = await marcosApi(request).detail(obraId, avanco.marco_id, signal);
    return { ...avanco, marco };
  },
  editDraft: async (id, changes, files, signal) => conferirEdicaoConfirmada(await request(`/avancos/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: corpoEdicaoRascunho(changes, files), signal, expectedStatus: 200,
  }), id, changes),
  // UC-09: sem corpo. Se o rascunho tiver sido publicado, o servidor recusa
  // a exclusão e exige uma nova revisão do impacto como publicação.
  removeDraft: (id, signal) => request(`/avancos/${encodeURIComponent(id)}`, { method: 'DELETE', signal, expectedStatus: 204 }),
  list: (marcoId, signal) => request(`/marcos/${encodeURIComponent(marcoId)}/avancos`, { signal }),
  detail: (id, signal) => request(`/avancos/${encodeURIComponent(id)}`, { signal }),
  listMedia: (id, signal) => request(`/avancos/${encodeURIComponent(id)}/midias`, { signal }),
  create: (marcoId, { data, descricao, midias }, key) => {
    const body = new FormData();
    body.append('data', data);
    body.append('descricao', descricao);
    midias.forEach((file) => body.append('midias', file, file.name));
    return request(`/marcos/${encodeURIComponent(marcoId)}/avancos`, {
      method: 'POST', body, headers: { 'Idempotency-Key': key }, expectedStatus: 201,
    });
  },
  mediaContent: (id, signal) => request(`/midias/${encodeURIComponent(id)}/conteudo`, { signal, responseType: 'blob', expectedStatus: 200 }),
});

export function resumirErroAvanco(error) {
  if (error?.status === 409) return 'A operação está pendente ou sua chave já representa outro conteúdo. Confira a lista antes de tentar uma nova intenção; não gere outra chave para contornar a incerteza.';
  if (error?.status === 411) return 'O servidor não recebeu o tamanho do envio. Tente novamente; o navegador controla o multipart.';
  if (error?.status === 413) return 'O servidor recusou o envio por exceder o limite configurado para um arquivo ou para o conjunto.';
  if (error?.status === 415) return 'Um dos arquivos não tem um formato aceito. Use JPEG, PNG, MP4 ou PDF.';
  if (error?.status === 422) return error.message || 'Os dados ou o conteúdo de um arquivo foram recusados pelo servidor.';
  if (error?.status === 503 || error?.status === 0) return 'Não foi possível confirmar a gravação. Mantenha os arquivos selecionados e tente novamente com a mesma chave.';
  return error?.message || 'Não foi possível registrar o avanço.';
}
