import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { marcosApi } from './api';
export function useMarcos(obraId, marcoId, enabled = true) {
  const { request } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({});
  const key = JSON.stringify([obraId, marcoId, attempt, enabled]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const api = marcosApi(request);
    const pending = marcoId ? api.detail(obraId, marcoId, controller.signal) : api.list(obraId, controller.signal);
    pending.then((data) => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ key, error }); });
    return () => controller.abort();
  }, [request, obraId, marcoId, enabled, key]);
  const current = state.key === key ? state : {};
  return { ...current, loading: enabled && !current.data && !current.error, retry: () => setAttempt((value) => value + 1) };
}
