import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Flag, Plus } from 'lucide-react';
import { EmptyState } from '../../../shared/ui/UI';
import { formatarDia } from '../../../shared/lib/datas';
import { useMarcos } from '../useMarcos';
import { MarcoErro, MarcoEstado } from '../components/MarcoFeedback';
import MarcoDependencias from '../components/MarcoDependencias';

export default function MarcosPage() {
  const { obraId } = useParams();
  const { obra } = useOutletContext();
  const { search } = useLocation();
  const { data, loading, error, retry } = useMarcos(obraId);
  const base = `/obras/${encodeURIComponent(obraId)}/marcos`;
  return <section className="feature-page" aria-busy={loading}>
    <header className="section-heading marcos-heading"><div><span className="eyebrow">Entregas da obra</span><h2>Marcos da obra</h2><p>Organize as entregas de {obra.nome} e acompanhe o estado de cada uma.</p></div><Link className="button button-primary" to={`${base}/novo${search}`}><Plus size={16} aria-hidden="true" />Adicionar marco</Link></header>
    {loading && <p className="feature-card" role="status">Carregando marcos…</p>}
    {error && <MarcoErro error={error} retry={retry} />}
    {data?.length === 0 && <div className="feature-card"><EmptyState title="Nenhum marco cadastrado" description="Qual é a próxima entrega da obra? Defina o que será realizado e o período previsto."><Flag size={30} className="marco-empty-icon" aria-hidden="true" /><Link className="button button-primary" to={`${base}/novo${search}`}>Criar primeiro marco</Link></EmptyState></div>}
    {data?.length > 0 && <><p className="marcos-count" role="status">{data.length} {data.length === 1 ? 'marco cadastrado' : 'marcos cadastrados'}</p><div className="marcos-grid">{data.map((marco) => <article className="feature-card marco-card" key={marco.id}><MarcoEstado estado={marco.estado} /><h3><Link to={`${base}/${encodeURIComponent(marco.id)}${search}`}>{marco.nome}<ArrowUpRight size={19} aria-hidden="true" /></Link></h3><p className="marco-card-description">{marco.descricao}</p><div className="marco-period"><CalendarDays size={18} aria-hidden="true" /><p><span>Período previsto</span>{formatarDia(marco.inicio_previsto)} a {formatarDia(marco.fim_previsto)}</p></div><MarcoDependencias marcoId={marco.id} /></article>)}</div></>}
  </section>;
}
