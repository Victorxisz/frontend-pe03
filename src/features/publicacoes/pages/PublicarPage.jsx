import { useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../api';
import useConsulta from '../useConsulta';
import AtualizacaoCard from '../components/AtualizacaoCard';
import ConsultaFeedback from '../components/ConsultaFeedback';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { Button } from '../../../shared/ui/UI';
export default function PublicarPage() {
  const { obraId, avancoId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  return <Revisao key={`${obraId}:${avancoId}`} {...{ obraId, avancoId, search, request }} />;
}
function Revisao({ obraId, avancoId, search, request }) {
  const api = publicacoesApi(request);
  const state = useConsulta(signal => api.detail(obraId, avancoId, signal), [request, obraId, avancoId]);
  const [dialog, setDialog] = useState(false), [busy, setBusy] = useState(false), [confirmed, setConfirmed] = useState(null), [error, setError] = useState(null), [refreshError, setRefreshError] = useState(false);
  const lock = useRef(false), title = useRef(null);
  async function refresh() {
    setBusy(true); setRefreshError(false);
    try {
      const detail = await api.detail(obraId, avancoId);
      const [publications] = await Promise.all([api.publications(avancoId), api.list(detail.marco_id), api.preview(obraId)]);
      if (!publications.length) throw new Error('Publicação indisponível na consulta atual.');
      setConfirmed(publications[0]);
    } catch { setRefreshError(true); } finally { setBusy(false); }
  }
  async function publish() {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null);
    try {
      const item = await api.publish(avancoId); setConfirmed(item); setDialog(false);
      await refresh();
    } catch (failure) {
      setError(failure); setDialog(false); setBusy(false);
      // Exigir nova consulta antes de oferecer outra decisão, inclusive resposta perdida.
    }
  }
  function reviewAgain() { setError(null); lock.current = false; state.retry(); }
  const base = `/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(avancoId)}`;
  return <section><h2 ref={title} tabIndex={-1}>Revisar publicação</h2><p>Confira o conteúdo e os anexos antes de confirmar.</p>
    {confirmed && <p role="status">Publicação confirmada pelo servidor.</p>}
    {refreshError && <div role="alert"><p>A publicação foi confirmada, mas a visualização não pôde ser atualizada.</p><Button disabled={busy} onClick={refresh}>Atualizar visualização</Button></div>}
    <ConsultaFeedback state={state} />
    {(confirmed || state.data) && <AtualizacaoCard item={confirmed || state.data} obraId={obraId} links={Boolean(confirmed)} />}
    {error && <div role="alert"><p>{error.message}</p>{error.status === 422 && <p>Revise o conteúdo e as mídias antes de publicar.</p>}{error.fields?.length > 0 && <p>Campos: {error.fields.join(', ')}</p>}<p>Consulte o estado atual antes de tentar novamente; a resposta pode ter sido perdida.</p><Button onClick={reviewAgain}>Revisar estado atual</Button></div>}
    <div className="page-actions action-toolbar">
      {state.data && !confirmed && !error && state.data.estado === 'rascunho' && <Button disabled={busy} onClick={() => setDialog(true)}>Publicar avanço</Button>}
      {!busy && <Link className="button button-secondary" to={`${base}${search}`}>{confirmed ? 'Voltar ao detalhe' : 'Cancelar e voltar ao detalhe'}</Link>}
    </div>
    {state.data?.estado === 'publicado' && !confirmed && <p>Este avanço já está publicado. <Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/publicacoes${search}`}>Consultar linha do tempo</Link></p>}
    {dialog && <ConfirmDialog title="Confirmar publicação?" confirmLabel="Confirmar publicação" confirmVariant="primary" busy={busy} onConfirm={publish} onCancel={() => setDialog(false)} returnFocusRef={title}><p>O conteúdo revisado ficará na linha do tempo da obra. Autor e instante serão registrados pelo servidor.</p></ConfirmDialog>}
  </section>;
}
