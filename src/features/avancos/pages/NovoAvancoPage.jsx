import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../../shared/ui/UI';
import AvancoForm from '../components/AvancoForm';
import { marcosApi } from '../../marcos/api';

export default function NovoAvancoPage() {
  const { marcoId, obraId } = useParams();
  const { request } = useAuth();
  const [marco, setMarco] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setMarco(null);
    setError('');
    marcosApi(request).detail(obraId, marcoId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setMarco(result); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message || 'Não foi possível carregar o marco.'); });
    return () => controller.abort();
  }, [obraId, marcoId, request, retry]);
  return <section className="feature-page">
    <Link className="back-link button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(marcoId)}`}>← Voltar ao marco</Link>
    <header className="section-heading"><span className="eyebrow">Rascunho</span><h2>Registrar avanço</h2><p>Registre o trabalho realizado e suas evidências.</p></header>
    {error ? <div className="feature-card" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => { setError(''); setRetry((value) => value + 1); }}>Tentar novamente</Button></div> : !marco ? <p role="status">Carregando marco…</p> : <><p className="record-reference">Marco: {marco.titulo || marco.nome || marcoId}</p><AvancoForm marcoId={marcoId} obraId={obraId} /></>}
  </section>;
}
