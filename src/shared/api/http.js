export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    const detail = data?.erro && typeof data.erro === 'object' ? data.erro : data?.error;
    this.code = data?.codigo ?? data?.code ?? detail?.codigo ?? detail?.code;
    this.fields = data?.campos ?? data?.fields ?? data?.errors ?? detail?.campos ?? detail?.fields;
  }
}

export function createHttpClient({ baseUrl = '/api', getToken = () => null, onUnauthorized = () => {}, fetcher = (...args) => fetch(...args) } = {}) {
  return async function request(path, { body, headers, authenticated = true, ...options } = {}) {
    const token = authenticated ? getToken() : null;
    const requestHeaders = new Headers(headers);
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
    const json = body !== undefined && !(body instanceof FormData);
    if (json) requestHeaders.set('Content-Type', 'application/json');
    let response;
    try {
      response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        cache: 'no-store', ...options, headers: requestHeaders, body: json ? JSON.stringify(body) : body,
      });
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      throw new ApiError('Não foi possível conectar ao servidor. Tente novamente.', 0);
    }
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token) onUnauthorized(token);
      const detail = data?.erro && typeof data.erro === 'object' ? data.erro : data?.error;
      const message = [data?.erro, data?.mensagem, data?.msg, data?.message, data?.error, detail?.mensagem, detail?.message, detail?.msg]
        .find((value) => typeof value === 'string' && value.trim());
      throw new ApiError(message || 'Não foi possível concluir a solicitação.', response.status, data);
    }
    return data;
  };
}
