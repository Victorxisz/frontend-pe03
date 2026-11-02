import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../../publicacoes/api';
import { avancosApi } from '../api';
import { Button, StatusBadge } from '../../../shared/ui/UI';
import MediaViewer from '../../../shared/ui/MediaViewer';
import { formatarDia } from '../../../shared/lib/datas';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';

export default function AvancoPage() {
  const { obraId: obraIdParam, avancoId } = useParams();
  const { search } = useLocation();
  const { request } = useAuth();
  const navigate = useNavigate();
  const [avanco, setAvanco] = useState(null);
  const [midias, setMidias] = useState([]);
  const [publicacoes, setPublicacoes] = useState([]);
  const [mediaError, setMediaError] = useState('');
  const [publicationError, setPublicationError] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deletePending, setDeletePending] = useState(() => localStorage.getItem(`avanco-delete:${avancoId}`) === 'pending');
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
          try {
            const mediaResult = await api.listMedia(avancoId, controller.signal);
            if (!controller.signal.aborted) setMidias(Array.isArray(mediaResult) ? mediaResult : mediaResult?.midias || mediaResult?.data || []);
          } catch (cause) {
            if (!controller.signal.aborted) setMediaError(cause.message || 'Não foi possível carregar as mídias.');
          }
        } else setMidias(embedded);

        const obraId = obraIdParam || record.obra_id || record.obra?.id;
        if (obraId) {
          try {
            const published = await publicacoesApi(request).detail(obraId, avancoId, controller.signal);
            setAvanco((current) => ({ ...current, ...published }));
            setPublicacoes(await publicacoesApi(request).publications(avancoId, controller.signal));
          } catch (cause) {
            if (cause?.name !== 'AbortError' && !controller.signal.aborted) setPublicationError(cause.message || 'Não foi possível carregar os dados de publicação.');
          }
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause.message || 'Não foi possível carregar o avanço.');
      }
    }
    void load();
    return () => controller.abort();
  }, [avancoId, obraIdParam, request, retry]);

  if (error) return <section className="feature-page"><div className="feature-card" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => { setError(''); setAvanco(null); setRetry((value) => value + 1); }}>Tentar novamente</Button></div></section>;
  if (!avanco) return <p className="route-status" role="status">Carregando avanço…</p>;
  const obraId = obraIdParam || avanco.obra_id || avanco.obra?.id;
  const marcoId = avanco.marco_id || avanco.marco?.id;
  const mediaObjects = midias.map((media) => typeof media === 'string' ? { id: media } : media);
  const base = `/obras/${encodeURIComponent(obraId || '')}/avancos/${encodeURIComponent(avancoId)}`;
  async function excluir() {
    setDeleting(true); setDeleteError('');
    try {
      const result = await avancosApi(request).deleteDraft(avancoId);
      if (result.status !== 204) throw new Error('O servidor não confirmou a exclusão.');
      localStorage.removeItem(`avanco-delete:${avancoId}`);
      navigate(`/obras/${encodeURIComponent(obraId || '')}/marcos/${encodeURIComponent(marcoId || '')}/avancos${search}`, { replace: true, state: { mensagem: 'Rascunho excluído.' } });
    } catch (cause) {
      if (cause.status === 503 && (cause.code === 'LIMPEZA_PENDENTE' || cause.data?.codigo === 'LIMPEZA_PENDENTE')) {
        localStorage.setItem(`avanco-delete:${avancoId}`, 'pending'); setDeletePending(true);
        const retryAfter = cause.headers?.get?.('Retry-After');
        setDeleteError(`A exclusão aguarda limpeza das mídias${retryAfter ? `. Tente retomar após ${retryAfter} segundos` : ''}. O rascunho permanece identificado nesta página.`);
      } else if (cause.status === 409) {
        setDeleteError('Há uma operação em curso. Aguarde e consulte novamente o avanço antes de tentar retomar.');
      } else setDeleteError(cause.message || 'Não foi possível excluir o rascunho.');
    } finally { setDeleting(false); }
  }
  return <section className="feature-page">
    <header className="section-heading"><span className="eyebrow">{avanco.tipo || 'Registro de trabalho'}</span><h2>{avanco.descricao || 'Detalhe do avanço'}</h2><p>Data do trabalho: {formatarDia(avanco.data)}</p><div className="page-actions"><StatusBadge status={avanco.estado || avanco.status}>{avanco.estado || avanco.status || 'Estado não informado'}</StatusBadge>{obraId && marcoId && <Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(marcoId)}/avancos${search}`}>Voltar à lista</Link>}</div></header>
    <dl className="avanco-facts"><div><dt>Registro</dt><dd>{avanco.registro || avanco.registrado_em || 'Não informado'}</dd></div><div><dt>Autoria</dt><dd>{avanco.autoria || avanco.autor || avanco.criado_por || 'Não informada'}</dd></div><div><dt>Marco</dt><dd>{avanco.marco_titulo || avanco.marco?.titulo || marcoId || 'Não informado'}</dd></div></dl>
    <section className="avanco-media-grid" aria-label="Mídias do avanço">{mediaObjects.map((media, index) => <MediaViewer key={media.id || media._id || index} media={media} loadContent={loadContent} />)}</section>
    {mediaError ? <p className="form-error" role="alert">{mediaError}</p> : mediaObjects.length === 0 && <p>Este avanço não retornou mídias.</p>}
    {obraId && <><h3>Publicação</h3>{publicationError ? <p className="form-error" role="alert">{publicationError}</p> : <p>{avanco.estado === 'rascunho' ? 'Rascunho · ainda não publicado' : 'Estado da publicação consultado'}</p>}{avanco.estado === 'rascunho' ? <nav><Link to={`${base}/editar${search}`}>Editar rascunho</Link> · <Link to={`${base}/publicar${search}`}>Revisar e publicar</Link> · <button className="button button-ghost" onClick={() => { setDeleteError(''); setDeleteDialog(true); }}>{deletePending ? 'Retomar exclusão' : 'Excluir rascunho'}</button></nav> : <nav><Link to={`${base}/corrigir${search}`}>Corrigir publicação</Link> · <Link to={`${base}/versoes${search}`}>Consultar versões</Link></nav>}
      {publicacoes.map((item) => <article className="feature-card" key={item.id}><p>{item.descricao}</p><p>{item.autor} · {item.instante}</p></article>)}
      <p><Link to={`/obras/${encodeURIComponent(obraId)}/publicacoes${search}`}>Linha do tempo</Link></p></>}
    {deleteDialog && <ConfirmDialog title={deletePending ? 'Retomar exclusão do rascunho?' : 'Excluir rascunho?'} confirmLabel={deletePending ? 'Retomar exclusão' : 'Excluir rascunho'} onCancel={() => setDeleteDialog(false)} onConfirm={excluir} busy={deleting} error={deleteError}><p>Esta ação remove o registro e suas mídias que não estejam compartilhadas. O avanço contém {mediaObjects.length} mídia(s){avanco.exemplos?.length ? ` e ${avanco.exemplos.length} exemplo(s) associado(s)` : ''}.</p><p>Somente uma resposta HTTP 204 concluirá a exclusão.</p></ConfirmDialog>}
  </section>;
}
