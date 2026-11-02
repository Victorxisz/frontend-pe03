import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button, StatusBadge } from '../../../shared/ui/UI';
import MediaViewer from '../../../shared/ui/MediaViewer';
import { formatarDia } from '../../../shared/lib/datas';
import { avancosApi } from '../api';

export default function AvancoPage() {
  const { avancoId } = useParams();
  const { request } = useAuth();
  const [avanco, setAvanco] = useState(null);
  const [midias, setMidias] = useState([]);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const loadContent = useCallback((id, signal) => avancosApi(request).mediaContent(id, signal), [request]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const api = avancosApi(request);
        const result = await api.detail(avancoId, controller.signal);
        const record = result?.avanco || result?.data || result;
        if (controller.signal.aborted) return;
        setAvanco(record);
        const embedded = record.midias?.length ? record.midias : record.midias_metadados?.length ? record.midias_metadados : record.evidencias?.length ? record.evidencias : record.midias_ids || record.midia_ids || [];
        if (!embedded.length || embedded.some((media) => typeof media !== 'object')) {
          const mediaResult = await api.listMedia(avancoId, controller.signal);
          setMidias(Array.isArray(mediaResult) ? mediaResult : mediaResult?.midias || mediaResult?.data || []);
        } else setMidias(embedded);
      } catch (cause) { if (!controller.signal.aborted) setError(cause.message || 'Não foi possível carregar o avanço.'); }
    }
    void load();
    return () => controller.abort();
  }, [avancoId, request, retry]);
  if (error) return <section className="feature-page"><div className="feature-card" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => { setError(''); setAvanco(null); setRetry((value) => value + 1); }}>Tentar novamente</Button></div></section>;
  if (!avanco) return <p className="route-status" role="status">Carregando avanço…</p>;
  const obraId = avanco.obra_id || avanco.obra?.id;
  const marcoId = avanco.marco_id || avanco.marco?.id;
  const mediaObjects = midias.map((media) => typeof media === 'string' ? { id: media } : media);
  return <section className="feature-page">
    <header className="section-heading"><span className="eyebrow">{avanco.tipo || 'Registro de trabalho'}</span><h2>{avanco.descricao || 'Detalhe do avanço'}</h2><p>Data do trabalho: {formatarDia(avanco.data)}</p><div className="page-actions"><StatusBadge status={avanco.estado || avanco.status}>{avanco.estado || avanco.status || 'Estado não informado'}</StatusBadge>{obraId && marcoId && <Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(marcoId)}/avancos`}>Voltar à lista</Link>}</div></header>
    <dl className="avanco-facts"><div><dt>Registro</dt><dd>{avanco.registro || avanco.registrado_em || 'Não informado'}</dd></div><div><dt>Autoria</dt><dd>{avanco.autoria || avanco.autor || avanco.criado_por || 'Não informada'}</dd></div><div><dt>Marco</dt><dd>{avanco.marco_titulo || avanco.marco?.titulo || marcoId || 'Não informado'}</dd></div></dl>
    <section className="avanco-media-grid" aria-label="Mídias do avanço">{mediaObjects.map((media, index) => <MediaViewer key={media.id || media._id || index} media={media} loadContent={loadContent} />)}</section>
    {mediaObjects.length === 0 && <p className="form-error" role="alert">Este avanço não retornou mídias. Confira novamente; uma falha ao abrir arquivo não significa ausência de anexo.</p>}
  </section>;
}
