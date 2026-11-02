import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, GitBranch, Images } from 'lucide-react';
import { formatarDia } from '../../../shared/lib/datas';
import { useMarcos } from '../useMarcos';
import { MarcoErro, MarcoEstado } from '../components/MarcoFeedback';
import DependenciasResumo from '../components/DependenciasResumo';

export default function MarcoPage() {
  const { obraId, marcoId } = useParams();
  const { search, state } = useLocation();
  const { data: marco, loading, error, retry } = useMarcos(obraId, marcoId);
  const created = state?.marcoCriado === marcoId && state?.obraId === obraId;
  const refreshed = useMarcos(obraId, undefined, created);
  const base = `/obras/${encodeURIComponent(obraId)}/marcos`;
  return <section className="feature-page" aria-busy={loading}>
    <Link className="back-link" to={`${base}${search}`}><ArrowLeft size={15} aria-hidden="true" />Marcos da obra</Link>
    {created && <p className="obra-save-success" role="status">Marco criado com sucesso.</p>}
    {created && refreshed.loading && <p role="status">Atualizando lista de marcos…</p>}
    {refreshed.error && <MarcoErro error={refreshed.error} retry={refreshed.retry} />}
    {loading && <p className="feature-card" role="status">Carregando marco…</p>}
    {error && <MarcoErro error={error} retry={retry} />}
    {marco && <><header className="section-heading marcos-heading"><div><span className="eyebrow">Entrega da obra</span><h2>{marco.nome}</h2></div><MarcoEstado estado={marco.estado} /></header><section className="feature-card"><h3>Planejamento da entrega</h3><dl className="obra-resumo"><div><dt>Início previsto</dt><dd>{formatarDia(marco.inicio_previsto)}</dd></div><div><dt>Fim previsto</dt><dd>{formatarDia(marco.fim_previsto)}</dd></div><div className="form-full"><dt>Descrição</dt><dd>{marco.descricao}</dd></div></dl><p className="record-reference">Referência: {marco.id}</p></section>
      <DependenciasResumo key={marcoId} marcoId={marcoId} to={`${base}/${encodeURIComponent(marcoId)}/dependencias${search}`} />
      <nav className="marco-related" aria-label="Acompanhamento do marco"><Link className="feature-card" to={`${base}/${encodeURIComponent(marcoId)}/dependencias${search}`}><GitBranch size={22} aria-hidden="true" /><h3>Dependências</h3><p>Consulte a sequência das entregas relacionadas.</p><span>Abrir dependências →</span></Link><Link className="feature-card" to={`${base}/${encodeURIComponent(marcoId)}/avancos${search}`}><Images size={22} aria-hidden="true" /><h3>Avanços e evidências</h3><p>Acompanhe os registros de trabalho desta entrega.</p><span>Ver avanços →</span></Link></nav></>}
  </section>;
}
