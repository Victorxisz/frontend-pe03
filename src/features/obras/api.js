export const obrasApi = (request) => ({
  list: (signal) => request('/obras', { signal }),
});
