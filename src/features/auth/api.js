export const authApi = (request) => ({
  login: (credentials) => request('/construtora/login/', { method: 'POST', body: credentials, authenticated: false }),
  current: (signal) => request('/sessoes/atual', { signal }),
  logout: () => request('/construtora/logout/', { method: 'POST' }),
});
