import { Link, useParams } from 'react-router-dom';
import { EmptyState } from './UI';

export default function FeaturePage({ title, description, actions = [] }) {
  const { marcoId, avancoId, ocorrenciaId, mudancaId, trabalhadorId } = useParams();
  const record = avancoId || ocorrenciaId || mudancaId || trabalhadorId || marcoId;
  return <section className="feature-page">
    <header className="section-heading"><span className="eyebrow">Em preparação</span><h2>{title}</h2><p>{description}</p><div className="page-actions">{actions.map(([to, label]) => <Link key={to} className="button button-secondary" to={to}>{label}</Link>)}</div></header>
    <div className="feature-card"><EmptyState title="Esta área está em preparação" description="A navegação já está organizada. Os formulários e as consultas desta área serão disponibilizados nas próximas entregas." />{record && <p className="record-reference">Referência: {record}</p>}</div>
  </section>;
}
