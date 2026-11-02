import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../../publicacoes/api';
import { marcosApi } from '../../marcos/api';
import useConsulta from '../../publicacoes/useConsulta';
import ConsultaFeedback from '../../publicacoes/components/ConsultaFeedback';
import { formatDate } from '../../../shared/ui/UI';
export default function AvancosPage() {
  const { obraId, marcoId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  const state = useConsulta(async signal => { await marcosApi(request).detail(obraId, marcoId, signal); return publicacoesApi(request).list(marcoId, signal); }, [request, obraId, marcoId]);
  return <section><h2>Avanços do marco</h2><Link to={`novo${search}`}>Registrar avanço</Link><ConsultaFeedback state={state} />
    {state.data?.length === 0 && <p>Nenhum avanço registrado.</p>}
    {state.data?.map(item => <article className="feature-card" key={item.id}><p>{item.descricao}</p><p>Data do trabalho: {formatDate(item.data)} · {item.estado === 'publicado' ? 'Publicado' : 'Rascunho'}</p><Link to={`/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(item.id)}${search}`}>Ver avanço</Link></article>)}
  </section>;
}
