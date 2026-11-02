import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import useConsulta from '../../publicacoes/useConsulta';
import ConsultaFeedback from '../../publicacoes/components/ConsultaFeedback';
import { ocorrenciasApi } from '../api';
import '../ocorrencias.css';
export default function OcorrenciasPage() {
  const { obraId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  const base = `/obras/${encodeURIComponent(obraId)}/ocorrencias`;
  const state = useConsulta(signal => ocorrenciasApi(request).list(obraId, signal), [request, obraId]);
  return <section className="feature-page"><header className="section-heading"><div><h2>Ocorrências da obra</h2><p>Problemas e evidências registrados para esta obra.</p></div><Link className="button button-primary" to={`${base}/nova${search}`}>Registrar ocorrência</Link></header>
    <ConsultaFeedback state={state} />{state.data?.length === 0 && <p className="feature-card">Nenhuma ocorrência registrada nesta obra.</p>}
    {state.data?.map(item => <article className="feature-card ocorrencia-card" key={item.id}><h3><Link to={`${base}/${encodeURIComponent(item.id)}${search}`}>{item.titulo}</Link></h3><p>Estado: {item.estado}</p><p>{item.descricao}</p><p>Registro: {item.data_registro || 'Não informado'}</p></article>)}
  </section>;
}
