import { useEffect, useState } from 'react';
export default function useConsulta(load, dependencies) {
  const [state, setState] = useState({}); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setState({});
    load(controller.signal).then(data => { if (!controller.signal.aborted) setState({ data }); }).catch(error => { if (!controller.signal.aborted) setState({ error }); });
    return () => controller.abort();
  }, [...dependencies, attempt]);
  return { ...state, retry: () => setAttempt(n => n + 1) };
}
