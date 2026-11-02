import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { EmptyState, StatusBadge } from '../../../shared/ui/UI';
import { formatarDia } from '../../../shared/lib/datas';
import { avancosApi } from '../api';

export default function AvancosPage() {
  const { marcoId, obraId } = useParams();
  const { request } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    avancosApi(request).list(marcoId, controller.signal).then((result) => setItems(Array.isArray(result) ? result : result?.avancos || result?.data || [])).catch((cause) => { if (!controller.signal.aborted) setError(cause.message || 'Não foi possível carregar os avanços.'); });
    return () => controller.abort();
  }, [marcoId, request, retry]);
  return <section className="feature-page">
    <header className="section-heading"><span className="eyebrow">Evidências</span><h2>Avanços do marco</h2><p>Registros do trabalho com fotos, vídeos ou documentos.</p><div className="page-actions"><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(marcoId)}/avancos/novo`}>Registrar avanço</Link></div></header>
    {error && <div className="feature-card form-error" role="alert">{error} <button className="button button-secondary" onClick={() => { setError(''); setRetry((value) => value + 1); }}>Tentar novamente</button></div>}
    {!items ? <p role="status">Carregando avanços…</p> : items.length === 0 ? <div className="feature-card"><EmptyState title="Ainda não há avanços" description="Registre o trabalho realizado no marco com ao menos uma evidência." /></div> : <div className="avanco-list">{items.map((item) => { const id = item.id || item._id || item.avanco_id; return <article className="feature-card avanco-list-item" key={id}><div><StatusBadge status={item.estado || item.status}>{item.estado || item.status || 'Estado não informado'}</StatusBadge><h3><Link to={`/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(id)}`}>{formatarDia(item.data)} · {item.descricao || 'Avanço'}</Link></h3><p>{item.registro || item.registrado_em ? `Registro: ${item.registro || item.registrado_em}` : ''}</p><p>{item.autoria || item.autor || item.criado_por ? `Autoria: ${item.autoria || item.autor || item.criado_por}` : ''}</p><p>{(item.midias || item.midias_ids || []).length} mídia(s)</p></div></article>; })}</div>}
  </section>;
}
