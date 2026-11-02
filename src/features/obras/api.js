import { parametrosFiltros } from './filtros.js';

export const obrasApi = (request) => ({
  list: (signal, filtros = {}) => {
    const query = parametrosFiltros(filtros).toString();
    return request(`/obras${query ? `?${query}` : ''}`, { signal });
  },
  detail: (id, signal) => request(`/obras/${encodeURIComponent(id)}`, { signal }),
  create: (body) => request('/obras', { method: 'POST', body, expectedStatus: 201 }),
});
