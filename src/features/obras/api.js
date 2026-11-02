export const obrasApi = (request) => ({
  list: (signal) => request('/obras', { signal }),
  detail: (id, signal) => request(`/obras/${encodeURIComponent(id)}`, { signal }),
  create: (body) => request('/obras', { method: 'POST', body, expectedStatus: 201 }),
});
