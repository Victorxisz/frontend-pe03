import { ExcluirAlvo } from '../../../shared/ui/Exclusoes';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, GitBranch, Images } from 'lucide-react';
import { formatarDia } from '../../../shared/lib/datas';
import { useMarcos } from '../useMarcos';
import { MarcoErro, MarcoEstado } from '../components/MarcoFeedback';
import DependenciasResumo from '../components/DependenciasResumo';
import EstadoMarcoForm from '../components/EstadoMarcoForm';
import DecisoesEstadoMarco from '../components/DecisoesEstadoMarco';
import { useAuth } from '../../auth/AuthProvider';
import { historicoApi } from '../../historico/api';
import { marcosApi } from '../api';
import { Button } from '../../../shared/ui/UI';

export default function MarcoPage() {
  const { obraId, marcoId } = useParams();
  return <MarcoDetalhe key={`${obraId}:${marcoId}`} obraId={obraId} marcoId={marcoId} />;
}
function MarcoDetalhe({ obraId, marcoId }) {
  const { request } = useAuth();
  const { search, state } = useLocation();
  const { data, loading, error, retry } = useMarcos(obraId, marcoId);
  const [fresh, setFresh] = useState(null);
  const [readback, setReadback] = useState(null);
  const [epoch, setEpoch] = useState(0);
  const controller = useRef(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function reload(confirmed = false) {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setReadback((previous) => ({ loading: true, confirmed: confirmed || Boolean(previous?.confirmed) }));
    const results = await Promise.allSettled([
      marcosApi(request).detail(obraId, marcoId, current.signal),
      marcosApi(request).list(obraId, current.signal),
      historicoApi(request).list(obraId, current.signal),
    ]);
    if (current.signal.aborted) return;
    if (results[0].status === 'fulfilled') setFresh(results[0].value);
    const failures = results.filter((item) => item.status === 'rejected');
    if (!failures.length) setEpoch((value) => value + 1);
    setReadback((previous) => ({ confirmed: previous.confirmed, error: failures.map((item) => item.reason.message).join(' '), history: results[2].status === 'fulfilled' ? results[2].value : null }));
  }
  const marco = fresh || data;
  const created = state?.marcoCriado === marcoId && state?.obraId === obraId;
  const refreshed = useMarcos(obraId, undefined, created);
  const base = `/obras/${encodeURIComponent(obraId)}/marcos`;
  const changeParams = new URLSearchParams(search);
  changeParams.set('alvo', 'marco'); changeParams.set('marcoId', marcoId); changeParams.set('campo', 'periodo_previsto');
  return <section className="feature-page" aria-busy={loading}>
    <Link className="back-link" to={`${base}${search}`}><ArrowLeft size={15} aria-hidden="true" />Marcos da obra</Link>
    {created && <p className="obra-save-success" role="status">Marco criado com sucesso.</p>}
    {created && refreshed.loading && <p role="status">Atualizando lista de marcos…</p>}
    {refreshed.error && <MarcoErro error={refreshed.error} retry={refreshed.retry} />}
    {loading && <p className="feature-card" role="status">Carregando marco…</p>}
    {error && <MarcoErro error={error} retry={retry} />}
    {readback?.confirmed && <p role="status" className="obra-save-success">Alteração de estado confirmada pelo servidor.</p>}
    {readback?.loading && <p role="status">Atualizando marco, lista e histórico…</p>}
    {readback?.error && <section className="feature-card dependencia-error" role="alert"><h3>Consulta dos dados atuais incompleta</h3><p>{readback.error}</p><Button variant="secondary" onClick={() => void reload()}>Reconsultar marco e histórico</Button></section>}
    {marco && <><header className="section-heading marcos-heading"><div><span className="eyebrow">Entrega da obra</span><h2>{marco.nome}</h2></div><MarcoEstado estado={marco.estado} /></header><section className="feature-card"><h3>Planejamento da entrega</h3><dl className="obra-resumo"><div><dt>Início previsto</dt><dd>{formatarDia(marco.inicio_previsto)}</dd></div><div><dt>Fim previsto</dt><dd>{formatarDia(marco.fim_previsto)}</dd></div><div className="form-full"><dt>Descrição</dt><dd>{marco.descricao}</dd></div></dl><p className="record-reference">Referência: {marco.id}</p><ExcluirAlvo tipo="marco" id={marcoId} obraId={obraId} /></section>
      <p><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/historico/nova-mudanca?${changeParams}`}>Replanejar período do marco</Link></p>
      <EstadoMarcoForm key={`${marco.versao}:${epoch}`} obraId={obraId} marco={marco} disabled={Boolean(readback?.loading || readback?.error)} onStart={() => setReadback((previous) => previous ? { ...previous, confirmed: false } : null)} onApplied={() => reload(true)} onRefresh={() => void reload()} />
      {(!readback || readback.history) && <DecisoesEstadoMarco events={readback?.history} obraId={obraId} marcoId={marcoId} />}
      <DependenciasResumo key={`${marcoId}:${epoch}`} marcoId={marcoId} to={`${base}/${encodeURIComponent(marcoId)}/dependencias${search}`} />
      <nav className="marco-related" aria-label="Acompanhamento do marco"><Link className="feature-card" to={`${base}/${encodeURIComponent(marcoId)}/dependencias${search}`}><GitBranch size={22} aria-hidden="true" /><h3>Dependências</h3><p>Consulte a sequência das entregas relacionadas.</p><span>Abrir dependências →</span></Link><Link className="feature-card" to={`${base}/${encodeURIComponent(marcoId)}/avancos${search}`}><Images size={22} aria-hidden="true" /><h3>Avanços e evidências</h3><p>Acompanhe os registros de trabalho desta entrega.</p><span>Ver avanços →</span></Link></nav></>}
  </section>;
}
