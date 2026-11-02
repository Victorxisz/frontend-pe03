import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../../publicacoes/api';
import { EmptyState, StatusBadge } from '../../../shared/ui/UI';
import { formatarDia } from '../../../shared/lib/datas';

export default function AvancosPage() {
  const { marcoId, obraId } = useParams();
  const { search } = useLocation();
  const { request } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    publicacoesApi(request).list(marcoId, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setItems(result); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message || 'Não foi possível carregar os avanços.'); });
    return () => controller.abort();
  }, [marcoId, request, retry]);
  return <section className="feature-page">
    <header className="section-heading"><span className="eyebrow">Evidências</span><h2>Avanços do marco</h2><p>Registros do trabalho com fotos, vídeos ou documentos.</p><div className="page-actions"><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(marcoId)}/avancos/novo${search}`}>Registrar avanço</Link></div></header>
    {error && <div className="feature-card form-error" role="alert">{error} <button className="button button-secondary" onClick={() => { setError(''); setItems(null); setRetry((value) => value + 1); }}>Tentar novamente</button></div>}
    {!items ? <p role="status">Carregando avanços…</p> : items.length === 0 ? <div className="feature-card"><EmptyState title="Ainda não há avanços" description="Registre o trabalho realizado no marco com ao menos uma evidência." /></div> : <div className="avanco-list">{items.map((item) => { const id = item.id || item._id || item.avanco_id; const status = item.estado || item.status; const media = item.midias || item.midias_ids || item.evidencias || []; return <article className="feature-card avanco-list-item" key={id}><div><StatusBadge status={status}>{status || 'Estado não informado'}</StatusBadge><h3><Link to={`/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(id)}${search}`}>{formatarDia(item.data)} · {item.descricao || 'Avanço'}</Link></h3><p>{item.registro || item.registrado_em ? `Registro: ${item.registro || item.registrado_em}` : ''}</p><p>{item.autoria || item.autor || item.criado_por ? `Autoria: ${item.autoria || item.autor || item.criado_por}` : ''}</p><p>{media.length} mídia(s) · {status === 'publicado' ? 'Publicado' : 'Rascunho'}</p></div></article>; })}</div>}
  </section>;
}
