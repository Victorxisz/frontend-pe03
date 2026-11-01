export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function createHttpClient({ baseUrl = '/api', getToken = () => null, onUnauthorized = () => {}, fetcher = (...args) => fetch(...args) } = {}) {
  return async function request(path, { body, headers, ...options } = {}) {
    const token = getToken();
    const requestHeaders = new Headers(headers);
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
    const json = body !== undefined && !(body instanceof FormData);
    if (json) requestHeaders.set('Content-Type', 'application/json');
    let response;
    try {
      response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        ...options, headers: requestHeaders, body: json ? JSON.stringify(body) : body,
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ApiError('Não foi possível conectar ao servidor. Tente novamente.', 0);
    }
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token) onUnauthorized();
      throw new ApiError(data?.erro || data?.mensagem || data?.msg || 'Não foi possível concluir a solicitação.', response.status, data);
    }
    return data;
  };
}
