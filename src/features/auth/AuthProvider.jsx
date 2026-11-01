import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createHttpClient } from '../../shared/api/http';
import { authApi } from './api';

const AuthContext = createContext(null);
const key = 'pe03:access-token';
const storage = {
  read() { try { return sessionStorage.getItem(key); } catch { return null; } },
  write(token) { try { token ? sessionStorage.setItem(key, token) : sessionStorage.removeItem(key); } catch { /* A sessão ainda funciona em memória. */ } },
};

export function AuthProvider({ children }) {
  const token = useRef(storage.read());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token.current));
  const [sessionError, setSessionError] = useState('');
  const client = useMemo(() => {
    const clear = () => { token.current = null; storage.write(null); setUser(null); };
    const request = createHttpClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
      getToken: () => token.current,
      onUnauthorized: clear,
    });
    return { request, api: authApi(request), clear };
  }, []);

  useEffect(() => {
    let active = true;
    if (!token.current) return;
    client.api.current()
      .then((data) => { if (active) setUser(data.construtora); })
      .catch((error) => { if (active) { client.clear(); setSessionError(error.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client]);

  async function login(credentials) {
    const result = await client.api.login(credentials);
    token.current = result.access_token;
    storage.write(result.access_token);
    setSessionError('');
    setUser(result.construtora);
  }
  async function logout() {
    // Só abandonar a sessão após o servidor confirmar sua revogação.
    await client.api.logout();
    client.clear();
  }
  return <AuthContext.Provider value={{ user, loading, sessionError, login, logout, request: client.request }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa de AuthProvider.');
  return context;
}
