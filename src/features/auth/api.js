export const authApi = (request) => ({
  login: (credentials) => request('/construtora/login/', { method: 'POST', body: credentials }),
  current: () => request('/sessoes/atual'),
  logout: () => request('/construtora/logout/', { method: 'POST' }),
});
