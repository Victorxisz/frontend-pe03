import { ExcluirAlvo } from '../../shared/ui/Exclusoes';
import { Link, Outlet, useLocation, useMatch, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../features/auth/AuthProvider';
import { obrasApi } from '../../features/obras/api';
import ObraResumo from '../../features/obras/components/ObraResumo';
import { Button } from '../../shared/ui/UI';
import ObraSituacao from '../../features/obras/components/ObraSituacao';
import ImagemProjeto from '../../features/obras/components/ImagemProjeto';
import { formatarEntrega } from '../../shared/lib/datas';

const tabs = [['marcos', 'Marcos'], ['publicacoes', 'Publicações'], ['ocorrencias', 'Ocorrências'], ['trabalhadores', 'Trabalhadores'], ['historico', 'Histórico']];
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
  return <><Link className="back-link button button-secondary" to={backTo}><ArrowLeft size={15} />Painel das Obras</Link>
    {!current.obra && !current.error && <p role="status">Carregando obra…</p>}
    {current.error && <section className="feature-card"><h1>{current.error.status === 404 ? 'Obra não encontrada' : current.error.status === 400 ? 'Referência de obra inválida' : 'Não foi possível consultar a obra'}</h1><p role="alert" className="form-error">{current.error.message}</p><Button onClick={() => setAttempt((value) => value + 1)}>Consultar novamente</Button></section>}
    {current.obra && <><header className="page-heading obra-detail-heading"><div><span className="eyebrow">Acompanhamento da obra</span><h1>{current.obra.nome}</h1><p>{current.obra.localizacao}</p>{!overview && <Link className="obra-details-link" to={`/obras/${encodeURIComponent(obraId)}${search}`}>← Voltar à obra</Link>}</div><ObraSituacao obra={current.obra} /></header>
      {navigationState?.obraAtualizada === obraId && <p role="status" className="obra-save-success">Dados da obra atualizados.</p>}
      {overview ? <><div className="obra-visao-imagem"><ImagemProjeto obraId={obraId} imagem={current.obra.imagem_projeto} nome={current.obra.nome} /></div>
      <div className="obra-prazo"><span>Prazo de entrega</span><strong>{formatarEntrega(current.obra.entrega) || 'Não informado'}</strong></div>
      <nav className="obra-opcoes" aria-label="Seções da obra"><h2>Acompanhar a obra</h2><p>Escolha o que deseja consultar.</p><div>{tabs.map(([path, label]) => <Link className={`feature-card obra-opcao ${['marcos', 'ocorrencias'].includes(path) ? 'obra-opcao-destaque' : ''}`} key={path} to={`/obras/${encodeURIComponent(obraId)}/${path}${search}`}><span>{label}</span><span aria-hidden="true">→</span></Link>)}</div></nav>
      <details className="obra-detalhes" id="dados-da-obra"><summary>Ver dados completos da obra</summary><div className="obra-detalhes-conteudo"><div className="cadastro-heading"><div><h2>Dados da obra</h2><p>Informações gerais do projeto.</p></div><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/editar${search}`}><Pencil size={16} aria-hidden="true" />Editar obra</Link></div>
        <div className="feature-card obra-cadastro"><ObraResumo obra={current.obra} /><p className="record-reference">Referência: {obraId}</p><ExcluirAlvo tipo="obra" id={obraId} obraId={obraId} /></div></div>
      </details></> : <div className="obra-tab-content"><Suspense fallback={<p role="status">Carregando seção da obra…</p>}><Outlet context={{ obra: current.obra, onObraConsultada }} /></Suspense></div>}</>}
  </>;
}
