import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createHttpClient } from '../../shared/api/http';
import { authApi } from './api';
import { Button } from '../../shared/ui/UI';

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
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const client = useMemo(() => {
    const clear = () => { token.current = null; storage.write(null); setUser(null); setLoading(false); setRestoreError(''); };
    const request = createHttpClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
      getToken: () => token.current,
      onUnauthorized: (rejectedToken) => {
        // Uma resposta atrasada de uma sessão antiga não encerra um novo login.
        if (token.current !== rejectedToken) return;
        clear();
        setSessionError('Sua sessão expirou ou foi encerrada. Entre novamente.');
      },
    });
    return { request, api: authApi(request), clear };
  }, []);

  useEffect(() => {
    let controller;
    async function restore() {
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;
      const restoringToken = token.current;
      if (!restoringToken) { setLoading(false); return; }
      setLoading(true);
      setRestoreError('');
      try {
        const data = await client.api.current(signal);
        if (!data?.construtora?.id) throw new Error('Resposta de sessão incompleta.');
        if (!signal.aborted && token.current === restoringToken) setUser(data.construtora);
      } catch (error) {
        if (signal.aborted) return;
        if (token.current === restoringToken) {
          if (error.status === 401 || error.status === 403) {
            client.clear();
            setSessionError('Sua sessão expirou ou foi encerrada. Entre novamente.');
          } else {
            setUser(null);
            setRestoreError('Não foi possível verificar sua sessão. Confira a conexão e tente novamente.');
          }
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    // Retirar dados do snapshot do histórico e validar antes de reexibi-los.
    const hide = () => {
      controller?.abort();
      flushSync(() => { setUser(null); setLoading(true); });
    };
    const show = (event) => { if (event.persisted) void restore(); };
    void restore();
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    return () => {
      controller?.abort();
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    };
  }, [client, restoreAttempt]);

  async function login(credentials) {
    const result = await client.api.login(credentials);
    token.current = result.access_token;
    storage.write(result.access_token);
    setSessionError('');
    setUser(result.construtora);
  }
  async function logout() {
    // Só abandonar a sessão após o servidor confirmar sua revogação.
    const leavingToken = token.current;
    await client.api.logout();
    if (token.current === leavingToken) { client.clear(); setSessionError(''); }
  }
  return <AuthContext.Provider value={{ user, loading, sessionError, login, logout, request: client.request }}>{restoreError
    ? <main className="route-status"><p role="alert">{restoreError}</p><Button onClick={() => { setRestoreError(''); setLoading(true); setRestoreAttempt((value) => value + 1); }}>Tentar novamente</Button></main>
    : children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa de AuthProvider.');
  return context;
}
