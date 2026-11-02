import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { obrasApi } from '../api';
import { Button } from '../../../shared/ui/UI';

export default function ImagemProjeto({ obraId, imagem, nome, compact = false }) {
  const { request } = useAuth();
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);
  const id = imagem?.id;
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    let url;
    obrasApi(request).imageContent(obraId, id, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setState({ id, url });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ id, error: true }); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [request, obraId, id, attempt]);
  if (!id) return null;
  const current = state.id === id ? state : {};
  return <figure className={`imagem-projeto ${compact ? 'imagem-projeto-compact' : ''}`}>
    {current.url ? <img src={current.url} alt={`Perspectiva ilustrativa do projeto: ${nome}`} onError={() => setState({ id, error: true })} />
      : <div className="imagem-placeholder"><p>{current.error ? 'Imagem indisponível no momento.' : 'Carregando imagem do projeto…'}</p>{current.error && !compact && <Button variant="secondary" onClick={() => { setState({}); setAttempt((value) => value + 1); }}>Carregar imagem novamente</Button>}</div>}
    {!compact && <figcaption>Perspectiva ilustrativa do projeto</figcaption>}
  </figure>;
}
