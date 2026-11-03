export const authApi = (request) => ({
  login: (credentials) => request('/construtora/login/', { method: 'POST', body: credentials, authenticated: false }),
  register: (body) => request('/construtora/', { method: 'POST', body, authenticated: false, expectedStatus: 201 }),
  update: (id, body) => request(`/construtora/${encodeURIComponent(id)}`, { method: 'PATCH', body, expectedStatus: 200 }),
  remove: (id) => request(`/construtora/${encodeURIComponent(id)}`, { method: 'DELETE', expectedStatus: 200 }),
  current: (signal) => request('/sessoes/atual', { signal }),
  logout: () => request('/construtora/logout/', { method: 'POST' }),
});
