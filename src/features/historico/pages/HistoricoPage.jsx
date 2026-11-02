import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import useConsulta from '../../publicacoes/useConsulta';
import ConsultaFeedback from '../../publicacoes/components/ConsultaFeedback';
import { historicoApi } from '../api';
import EventoHistorico from '../components/EventoHistorico';
import '../mudancas.css';

export default function HistoricoPage() {
  const { obraId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  const state = useConsulta(signal => historicoApi(request).list(obraId, signal), [request, obraId]);
  return <section className="feature-page"><header className="section-heading"><div><h2>Histórico da obra</h2><p>Decisões e correções registradas para esta obra.</p></div><Link className="button button-primary" to={`nova-mudanca${search}`}>Registrar mudança</Link></header>
    {state.error?.code === 'HISTORICO_INDISPONIVEL' && <p role="alert">Histórico indisponível ou inconsistente. Consulte novamente.</p>}
    <ConsultaFeedback state={state} />
    {state.data?.length === 0 && <p className="feature-card">Esta obra ainda não possui mudanças registradas.</p>}
    {state.data?.map(evento => <EventoHistorico key={evento.id} evento={evento} obraId={obraId} search={search} />)}
  </section>;
}
