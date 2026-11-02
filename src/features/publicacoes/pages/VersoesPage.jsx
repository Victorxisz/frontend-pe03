import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../api';
import useConsulta from '../useConsulta';
import ConsultaFeedback from '../components/ConsultaFeedback';
import ComparacaoVersoes from '../components/ComparacaoVersoes';
export default function VersoesPage() {
  const { obraId, avancoId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  const state = useConsulta(async signal => { const api = publicacoesApi(request); const detail = await api.detail(obraId, avancoId, signal); const [chain, publications] = await Promise.all([api.versions(avancoId, signal), api.publications(avancoId, signal)]); return { detail, publication: publications[0], ...chain }; }, [request, obraId, avancoId]);
  return <section><h2>Versões da publicação</h2><p>Conteúdo e correções preservados pelo servidor.</p>
    {state.error?.code === 'HISTORICO_INDISPONIVEL' && <p role="alert">Falha de integridade: histórico indisponível. Não é um histórico vazio.</p>}
    <ConsultaFeedback state={state} />{state.data && <><p>Marco: {state.data.detail.marco.nome}</p>{state.data.publication && <p>Publicação original: {state.data.publication.instante} · Publicador: {state.data.publication.autor}</p>}<ComparacaoVersoes versoes={state.data.versoes} /></>}
    <p><Link to={`/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(avancoId)}${search}`}>Voltar ao detalhe</Link></p>
  </section>;
}
