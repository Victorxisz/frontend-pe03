import { ExcluirAlvo } from '../../shared/ui/Exclusoes';
import { Link, NavLink, Outlet, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../features/auth/AuthProvider';
import { obrasApi } from '../../features/obras/api';
import ObraResumo from '../../features/obras/components/ObraResumo';
import { Button } from '../../shared/ui/UI';
import ObraSituacao from '../../features/obras/components/ObraSituacao';
import ImagemProjeto from '../../features/obras/components/ImagemProjeto';

const tabs = [['marcos', 'Marcos'], ['publicacoes', 'Publicações'], ['ocorrencias', 'Ocorrências'], ['trabalhadores', 'Trabalhadores'], ['historico', 'Histórico']];
export default function ObraLayout() {
  const { obraId } = useParams();
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
    {current.obra && <><header className="page-heading obra-detail-heading"><div><span className="eyebrow">Acompanhamento da obra</span><h1>{current.obra.nome}</h1><p>{current.obra.localizacao}</p><p className="record-reference">Referência: {obraId}</p></div><ObraSituacao obra={current.obra} /></header>
      {navigationState?.obraAtualizada === obraId && <p role="status" className="obra-save-success">Dados da obra atualizados.</p>}
      <ImagemProjeto obraId={obraId} imagem={current.obra.imagem_projeto} nome={current.obra.nome} />
      <section className="feature-card obra-cadastro" aria-label="Cadastro da obra"><div className="cadastro-heading"><h2>Dados da obra</h2><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/editar${search}`}><Pencil size={16} aria-hidden="true" />Editar obra</Link></div><ObraResumo obra={current.obra} /><ExcluirAlvo tipo="obra" id={obraId} obraId={obraId} /></section>
      <ObraSections key={obraId} obraId={obraId} obra={current.obra} search={search} onObraConsultada={onObraConsultada} /></>}
  </>;
}

function ObraSections({ obraId, obra, search, onObraConsultada }) {
  const content = useRef(null);
  const [minHeight, setMinHeight] = useState(0);
  function preserveSpace(event) {
    // Novas abas/janelas não alteram o espaço desta página.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const height = content.current?.getBoundingClientRect().height || 0;
    setMinHeight((previous) => Math.max(previous, Math.ceil(height)));
  }
  return <><nav className="obra-tabs" aria-label="Seções da obra">{tabs.map(([path, label]) => <NavLink key={path} onClick={preserveSpace} state={{ manterRolagemObra: obraId }} to={`/obras/${encodeURIComponent(obraId)}/${path}${search}`}>{label}</NavLink>)}</nav>
    <div ref={content} className="obra-tab-content" style={{ minHeight }}>
      <Suspense fallback={<p role="status">Carregando seção da obra…</p>}><Outlet context={{ obra, onObraConsultada }} /></Suspense>
    </div>
  </>;
}
