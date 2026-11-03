import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createHttpClient } from '../../shared/api/http';
import { authApi } from './api';
import { Button } from '../../shared/ui/UI';

const AuthContext = createContext(null);
const key = 'pe03:access-token';
const refreshKey = 'pe03:refresh-token';
const storage = {
  read(name = key) { try { return sessionStorage.getItem(name); } catch { return null; } },
  write(token, name = key) { try { token ? sessionStorage.setItem(name, token) : sessionStorage.removeItem(name); } catch { /* A sessão ainda funciona em memória. */ } },
};

export function AuthProvider({ children }) {
  const token = useRef(storage.read());
  const refreshToken = useRef(storage.read(refreshKey));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token.current));
  const [sessionError, setSessionError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const client = useMemo(() => {
    const clear = () => { token.current = null; refreshToken.current = null; storage.write(null); storage.write(null, refreshKey); setUser(null); setLoading(false); setRestoreError(''); };
    let renewing = null;
    let lastRenewal = null;
    const refreshAccess = async (rejected) => {
      if (token.current !== rejected) return lastRenewal?.old === rejected && lastRenewal.refresh === refreshToken.current && lastRenewal.access === token.current ? token.current : null;
      if (!refreshToken.current) return false;
      if (!renewing) {
        const currentRefresh = refreshToken.current;
        renewing = (async () => {
          try {
            const result = await createHttpClient({ baseUrl: import.meta.env.VITE_API_BASE_URL || '/api' })(
              '/construtora/refresh/', { method: 'POST', authenticated: false, headers: { Authorization: `Bearer ${currentRefresh}` } });
            if (typeof result?.access_token !== 'string' || !result.access_token.trim()) throw new Error('Resposta de renovação inválida.');
            if (refreshToken.current !== currentRefresh || token.current !== rejected) return false;
            token.current = result.access_token; storage.write(result.access_token);
            lastRenewal = { old: rejected, refresh: currentRefresh, access: result.access_token };
            return result.access_token;
          } catch (error) {
            if ([401, 403, 422].includes(error.status) && refreshToken.current === currentRefresh) { clear(); setSessionError('Sua sessão expirou ou foi encerrada. Entre novamente.'); }
            throw error;
          } finally { renewing = null; }
        })();
      }
      return renewing;
    };
    const request = createHttpClient({
      baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
      getToken: () => token.current,
      refreshAccess,
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
    let disposed = false;
    async function restore() {
      controller?.abort();
      const attemptController = new AbortController();
      controller = attemptController;
      const { signal } = attemptController;
      const restoringToken = token.current;
      const restoringRefresh = refreshToken.current;
      if (!restoringToken) { setLoading(false); return; }
      setLoading(true);
      setRestoreError('');
      let timedOut = false;
      // Limitar também a espera pelo corpo da resposta, sem encerrar o login.
      const timeout = window.setTimeout(() => {
        timedOut = true;
        attemptController.abort();
      }, 8_000);
      try {
        const data = await client.api.current(signal);
        if (!data?.construtora?.id) throw new Error('Resposta de sessão incompleta.');
        if (!disposed && controller === attemptController && !signal.aborted && (token.current === restoringToken || (restoringRefresh && refreshToken.current === restoringRefresh))) setUser(data.construtora);
      } catch (error) {
        if (disposed || controller !== attemptController || (signal.aborted && !timedOut)) return;
        if (token.current === restoringToken || (restoringRefresh && refreshToken.current === restoringRefresh)) {
          // GET /sessoes/atual não valida um formulário: 422 é a rejeição de JWT
          // inválido pelo Flask-JWT-Extended. Preservá-lo impediria novo login.
          if (error.status === 401 || error.status === 403 || error.status === 422) {
            client.clear();
            setSessionError('Sua sessão expirou ou foi encerrada. Entre novamente.');
          } else {
            setUser(null);
            setRestoreError(timedOut
              ? 'Não foi possível verificar sua sessão: o servidor demorou para responder. Tente novamente.'
              : 'Não foi possível verificar sua sessão. Confira a conexão e tente novamente.');
          }
        }
      } finally {
        window.clearTimeout(timeout);
        if (!disposed && controller === attemptController && (!signal.aborted || timedOut)) setLoading(false);
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
      disposed = true;
      controller?.abort();
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    };
  }, [client, restoreAttempt]);

  async function startSession(result) {
    if (typeof result?.access_token !== 'string' || !result.access_token.trim() || !result.construtora?.id) {
      throw new Error('Não foi possível confirmar sua sessão. Tente entrar novamente.');
    }
    refreshToken.current = typeof result.refresh_token === 'string' && result.refresh_token.trim() ? result.refresh_token : null;
    storage.write(refreshToken.current, refreshKey);
    token.current = result.access_token;
    storage.write(result.access_token);
    setSessionError('');
    setUser(result.construtora);
  }
  async function login(credentials) { await startSession(await client.api.login(credentials)); }
  async function register(dados) { await startSession(await client.api.register(dados)); }
  async function updateAccount(dados) { await client.api.update(user.id, dados); const result = await client.api.current(); if (!result?.construtora?.id) throw new Error('Alteração enviada, mas não foi possível confirmar os dados.'); setUser(result.construtora); }
  async function deleteAccount() { await client.api.remove(user.id); client.clear(); setSessionError('Conta excluída.'); }
  async function logout() {
    // Só abandonar a sessão após o servidor confirmar sua revogação.
    const leavingRefresh = refreshToken.current;
    const leavingToken = token.current;
    await client.api.logout();
    if ((leavingRefresh && refreshToken.current === leavingRefresh) || (!leavingRefresh && token.current === leavingToken)) { client.clear(); setSessionError(''); }
  }
  return <AuthContext.Provider value={{ user, loading, sessionError, login, register, updateAccount, deleteAccount, logout, request: client.request }}>{restoreError
    ? <main className="route-status"><p role="alert">{restoreError}</p><Button onClick={() => { setRestoreError(''); setLoading(true); setRestoreAttempt((value) => value + 1); }}>Tentar novamente</Button></main>
    : children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa de AuthProvider.');
  return context;
}
