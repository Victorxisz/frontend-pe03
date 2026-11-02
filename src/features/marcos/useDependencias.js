import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { marcosApi } from './api';

export function useDependencias(marcoId, enabled = true) {
  const { request } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({});
  const key = JSON.stringify([marcoId, enabled, attempt]);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    marcosApi(request).dependencies(marcoId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ key, data }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ key, error }); });
    return () => controller.abort();
  }, [request, marcoId, enabled, key]);
  const current = state.key === key ? state : {};
  return { ...current, loading: enabled && !current.data && !current.error, retry: () => setAttempt((value) => value + 1) };
}
