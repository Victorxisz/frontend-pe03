import { parametrosFiltros } from './filtros.js';

export const obrasApi = (request) => ({
  list: (signal, filtros = {}) => {
    const query = parametrosFiltros(filtros).toString();
    return request(`/obras${query ? `?${query}` : ''}`, { signal });
  },
  detail: (id, signal) => request(`/obras/${encodeURIComponent(id)}`, { signal }),
  create: (body, imagem) => {
    if (!imagem) return request('/obras', { method: 'POST', body, expectedStatus: 201 });
    const form = new FormData();
    form.append('cadastro', JSON.stringify(body));
    form.append('imagem_projeto', imagem);
    return request('/obras', { method: 'POST', body: form, expectedStatus: 201 });
  },
  update: (id, body) => request(`/obras/${encodeURIComponent(id)}`, { method: 'PATCH', body, expectedStatus: 200 }),
  imageContent: (id, imagemId, signal) => request(`/obras/${encodeURIComponent(id)}/imagem-projeto/${encodeURIComponent(imagemId)}/conteudo`, { signal, responseType: 'blob', expectedStatus: 200 }),
  saveImage: (id, file, atual = '') => {
    const body = new FormData();
    body.append('imagem_atual', atual);
    body.append('imagem_projeto', file);
    return request(`/obras/${encodeURIComponent(id)}/imagem-projeto`, { method: 'PUT', body, expectedStatus: 200 });
  },
  removeImage: (id, atual) => request(`/obras/${encodeURIComponent(id)}/imagem-projeto`, { method: 'DELETE', body: { imagem_atual: atual }, expectedStatus: 200 }),
});
