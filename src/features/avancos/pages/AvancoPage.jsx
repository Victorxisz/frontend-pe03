import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../../publicacoes/api';
import useConsulta from '../../publicacoes/useConsulta';
import AtualizacaoCard from '../../publicacoes/components/AtualizacaoCard';
import ConsultaFeedback from '../../publicacoes/components/ConsultaFeedback';
export default function AvancoPage() {
  const { obraId, avancoId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  const state = useConsulta(async signal => {
    const api = publicacoesApi(request); const detail = await api.detail(obraId, avancoId, signal);
    const publications = await api.publications(avancoId, signal);
    return { detail, publications };
  }, [request, obraId, avancoId]);
  const base = `/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(avancoId)}`;
  return <section><h2>Detalhe do avanço</h2><ConsultaFeedback state={state} />{state.data && <>
    <p>{state.data.detail.estado === 'rascunho' ? 'Rascunho · ainda não publicado' : 'Publicado'}</p>
    <AtualizacaoCard item={state.data.publications[0] || state.data.detail} obraId={obraId} links={false} />
    {state.data.detail.estado === 'rascunho' ? <nav><Link to={`${base}/editar${search}`}>Editar rascunho</Link> · <Link to={`${base}/publicar${search}`}>Revisar e publicar</Link></nav>
      : <nav><Link to={`${base}/corrigir${search}`}>Corrigir publicação</Link> · <Link to={`${base}/versoes${search}`}>Consultar versões</Link></nav>}
    <p><Link to={`/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(state.data.detail.marco_id)}/avancos${search}`}>Avanços do marco</Link> · <Link to={`/obras/${encodeURIComponent(obraId)}/publicacoes${search}`}>Linha do tempo</Link></p>
  </>}</section>;
}
