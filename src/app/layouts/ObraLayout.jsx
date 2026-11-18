import { ExcluirAlvo } from '../../shared/ui/Exclusoes';
import { Link, Outlet, useLocation, useMatch, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Building2, CalendarDays, Clock, FileText, Flag, Pencil, TriangleAlert, Users } from 'lucide-react';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../features/auth/AuthProvider';
import { obrasApi } from '../../features/obras/api';
import ObraResumo from '../../features/obras/components/ObraResumo';
import { Button } from '../../shared/ui/UI';
import ObraSituacao from '../../features/obras/components/ObraSituacao';
import ImagemProjeto from '../../features/obras/components/ImagemProjeto';
import { formatarEntrega } from '../../shared/lib/datas';

const tabs = [['marcos', 'Marcos', Flag], ['publicacoes', 'Publicações', FileText], ['ocorrencias', 'Ocorrências', TriangleAlert], ['trabalhadores', 'Trabalhadores', Users], ['historico', 'Histórico', Clock]];
export default function ObraLayout() {
  const { obraId } = useParams();
  const overview = Boolean(useMatch('/obras/:obraId'));
  const { search, state: navigationState } = useLocation();
  const [params] = useSearchParams();
  const busca = params.get('busca');
  const backTo = busca ? `/obras?${new URLSearchParams(busca).toString()}` : '/obras';
  const { request } = useAuth();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({});
  const onObraConsultada = useCallback((obra) => {
    if (obra?.id === obraId && typeof obra.nome === 'string') setState({ id: obraId, obra });
  }, [obraId]);
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    obrasApi(request).detail(obraId, controller.signal)
      .then((obra) => {
        if (!obra?.id || typeof obra.nome !== 'string') throw new Error('Não foi possível interpretar o cadastro da obra. Consulte novamente.');
        if (!controller.signal.aborted) setState({ id: obraId, obra });
      })
      .catch((error) => { if (!controller.signal.aborted) setState({ id: obraId, error }); });
    return () => controller.abort();
  }, [request, obraId, attempt]);
  const current = state.id === obraId ? state : {};
  return <div className={overview ? 'obra-overview' : undefined}><Link className={overview ? 'obra-overview-back' : 'back-link button button-secondary'} to={backTo}><ArrowLeft size={18} aria-hidden="true" />Painel das Obras</Link>
    {!current.obra && !current.error && <p role="status">Carregando obra…</p>}
    {current.error && <section className="feature-card"><h1>{current.error.status === 404 ? 'Obra não encontrada' : current.error.status === 400 ? 'Referência de obra inválida' : 'Não foi possível consultar a obra'}</h1><p role="alert" className="form-error">{current.error.message}</p><Button onClick={() => setAttempt((value) => value + 1)}>Consultar novamente</Button></section>}
    {current.obra && <><header className="page-heading obra-detail-heading"><div>{!overview && <span className="eyebrow">Acompanhamento da obra</span>}<h1>{current.obra.nome}</h1><p>{current.obra.localizacao}</p>{!overview && <Link className="obra-details-link" to={`/obras/${encodeURIComponent(obraId)}${search}`}>← Voltar à obra</Link>}</div><ObraSituacao obra={current.obra} /></header>
      {navigationState?.obraAtualizada === obraId && <p role="status" className="obra-save-success">Dados da obra atualizados.</p>}
      {overview ? <><div className="obra-visao-imagem">{current.obra.imagem_projeto?.id ? <ImagemProjeto obraId={obraId} imagem={current.obra.imagem_projeto} nome={current.obra.nome} /> : <div className="obra-cover-placeholder"><Building2 aria-hidden="true" /></div>}</div>
      <div className="obra-overview-meta"><span>{current.obra.imagem_projeto?.id ? 'Perspectiva ilustrativa do projeto' : 'Imagem do projeto não cadastrada'}</span><div className="obra-prazo"><CalendarDays aria-hidden="true" /><span>Entrega prevista</span><strong>{formatarEntrega(current.obra.entrega) || 'Não informado'}</strong></div></div>
      <nav className="obra-opcoes" aria-label="Seções da obra"><h2>Acompanhar a obra</h2><div>{tabs.map(([path, label, Icon]) => <Link className="feature-card obra-opcao" key={path} to={`/obras/${encodeURIComponent(obraId)}/${path}${search}`}><Icon aria-hidden="true" /><span>{label}</span><ArrowRight aria-hidden="true" /></Link>)}</div></nav>
      <details className="obra-detalhes" id="dados-da-obra"><summary>Ver dados completos da obra</summary><div className="obra-detalhes-conteudo"><div className="cadastro-heading"><div><h2>Dados da obra</h2><p>Informações gerais do projeto.</p></div><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/editar${search}`}><Pencil size={16} aria-hidden="true" />Editar obra</Link></div>
        <div className="feature-card obra-cadastro"><ObraResumo obra={current.obra} /><p className="record-reference">Referência: {obraId}</p><ExcluirAlvo tipo="obra" id={obraId} obraId={obraId} /></div></div>
      </details></> : <div className="obra-tab-content"><Suspense fallback={<p role="status">Carregando seção da obra…</p>}><Outlet context={{ obra: current.obra, onObraConsultada }} /></Suspense></div>}</>}
  </div>;
}


