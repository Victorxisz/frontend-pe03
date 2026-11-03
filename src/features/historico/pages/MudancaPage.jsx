import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import useConsulta from '../../publicacoes/useConsulta';
import ConsultaFeedback from '../../publicacoes/components/ConsultaFeedback';
import { historicoApi } from '../api';
import EventoHistorico from '../components/EventoHistorico';
import '../mudancas.css';

export default function MudancaPage() {
  const { obraId, mudancaId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  const state = useConsulta(signal => historicoApi(request).detail(obraId, mudancaId, signal), [request, obraId, mudancaId]);
  return <section className="feature-page"><h2>Detalhe da mudança</h2>
    {state.error?.code === 'HISTORICO_INDISPONIVEL' && <p role="alert">Histórico indisponível ou inconsistente. Consulte novamente.</p>}
    <ConsultaFeedback state={state} />
    {state.data && <EventoHistorico evento={state.data} obraId={obraId} search={search} detalhe />}
    <p><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/historico${search}`}>Voltar ao histórico</Link></p>
  </section>;
}
