import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../../shared/ui/UI';
export default function MidiaEvidencia({ midia }) {
  const { request } = useAuth();
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (midia.retida === false || midia.conteudo === null) return;
    const controller = new AbortController(); let url;
    setState({});
    request(`/midias/${encodeURIComponent(midia.id)}/conteudo`, { signal: controller.signal, responseType: 'blob', expectedStatus: 200 })
      .then(blob => { if (!controller.signal.aborted) { url = URL.createObjectURL(blob); setState({ url }); } })
      .catch(() => { if (!controller.signal.aborted) setState({ error: true }); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [request, midia.id, midia.retida, midia.conteudo, attempt]);
  return <figure><figcaption>{midia.nome || 'Evidência'}</figcaption>
    {midia.retida === false || midia.conteudo === null ? <p>Arquivo histórico indisponível · {midia.mime || midia.tipo} · {midia.tamanho ?? '—'} bytes</p> : state.error ? <div role="alert">Falha ao recuperar este arquivo. A publicação permanece registrada. <Button variant="secondary" onClick={() => setAttempt(n => n + 1)}>Tentar arquivo novamente</Button></div>
      : !state.url ? <p role="status">Carregando arquivo…</p>
      : <>{midia.mime?.startsWith('image/') ? <img style={{ maxWidth: '100%', maxHeight: 420 }} src={state.url} alt={midia.nome || 'Evidência da obra'} onError={() => setState({ error: true })} />
        : midia.mime?.startsWith('video/') ? <video style={{ maxWidth: '100%' }} src={state.url} controls onError={() => setState({ error: true })} /> : null}
        <p><a href={state.url} download={midia.nome}>Baixar {midia.nome || 'arquivo'}</a></p></>}
  </figure>;
}
