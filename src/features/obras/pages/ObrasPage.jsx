import { useExclusoes } from '../../../shared/ui/Exclusoes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Building2, CalendarDays, House, Plus, Search, X, MapPin } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { obrasApi } from '../api';
import { Button, EmptyState } from '../../../shared/ui/UI';
import { formatarEntrega } from '../../../shared/lib/datas';
import FiltrosObras from '../components/FiltrosObras';
import ObraSituacao from '../components/ObraSituacao';
import ImagemProjeto from '../components/ImagemProjeto';
import { lerFiltros, nomesFiltros, parametrosFiltros, textoFiltro } from '../filtros';

export default function ObrasPage() {
  const { request } = useAuth();
  const { operations } = useExclusoes();
  const [params, setParams] = useSearchParams();
  const search = params.toString();
  const { filtros, repetidos } = useMemo(() => lerFiltros(new URLSearchParams(search)), [search]);
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);
  const queryKey = `${search}:${attempt}`;
  const errorSummary = useRef(null);
  useEffect(() => {
    if (repetidos.length) return;
    const controller = new AbortController();
    obrasApi(request).list(controller.signal, filtros)
      .then((data) => {
        if (!Array.isArray(data?.obras) || !['com_resultados', 'lista_vazia', 'sem_resultados'].includes(data.situacao) || !data.filtros_aplicados || typeof data.filtros_aplicados !== 'object') throw new Error('Não foi possível interpretar a lista de obras. Tente novamente.');
        if (!controller.signal.aborted) setState({ key: queryKey, data });
      })
      .catch((error) => { if (!controller.signal.aborted) setState({ key: queryKey, error }); });
    return () => controller.abort();
  }, [request, queryKey, filtros, repetidos]);
  const repeatedError = useMemo(() => repetidos.length ? { message: 'Há filtros repetidos na URL. Revise os campos e aplique novamente ou limpe os filtros.', fields: repetidos, status: 422 } : null, [repetidos]);
  const current = repeatedError ? { error: repeatedError } : state.key === queryKey ? state : {};
  const { data: result, error } = current;
  const visible = result?.obras.filter((obra) => !operations.some((a) => a.tipo === 'obra' && a.id === obra.id));
  const data = result && { ...result, obras: visible, situacao: result.situacao === 'com_resultados' && !visible.length ? (Object.keys(result.filtros_aplicados).length ? 'sem_resultados' : 'lista_vazia') : result.situacao };
  const loading = !data && !error;
  const serverErrors = Object.fromEntries((Array.isArray(error?.fields) ? error.fields : Object.keys(error?.fields || {})).map((campo) => [campo, error.message]));
  useEffect(() => { if (error) errorSummary.current?.focus(); }, [error]);
  function apply(values) { setParams(parametrosFiltros(values)); setAttempt((value) => value + 1); }
  function remove(campo) { apply({ ...filtros, [campo]: '' }); }
  const entries = Object.entries(data?.filtros_aplicados || {});
  return <>
    <header className="page-heading obras-heading"><div><h1>Obras em acompanhamento</h1></div><Link className="button button-primary" to="/obras/nova"><Plus size={16} aria-hidden="true" />Nova obra</Link></header>
    {error && <section ref={errorSummary} tabIndex={-1} className="feature-card busca-error" role="alert"><h2>{error.status === 422 ? 'Revise os filtros' : 'Não foi possível carregar as obras'}</h2><p>{error.message}</p>{Object.keys(serverErrors).filter((campo) => nomesFiltros[campo]).map((campo) => <p key={campo}><a href={`#filtro-${campo}`}>{nomesFiltros[campo]}</a></p>)}{error.status !== 422 && <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button>}</section>}
    <FiltrosObras key={`${search}:${attempt}`} filtros={filtros} onApply={apply} onClear={() => apply({})} serverErrors={serverErrors} />
    <section className="obras-results" aria-labelledby="titulo-resultados" aria-busy={loading}>
      <div className="results-heading"><h2 id="titulo-resultados">{entries.length ? 'Resultados da busca' : 'Suas obras'}</h2><p role="status" aria-live="polite">{loading ? 'Carregando obras…' : error ? 'Busca não concluída' : `${data.obras.length} ${data.obras.length === 1 ? 'obra encontrada' : 'obras encontradas'}`}</p></div>
      {entries.length > 0 && <div className="applied-filters" aria-label="Filtros aplicados"><span>Filtros aplicados:</span>{entries.map(([campo, valor]) => <button type="button" className="filter-chip" key={campo} onClick={() => remove(campo)} aria-label={`Remover filtro ${nomesFiltros[campo] || campo}: ${textoFiltro(campo, valor)}`}>{nomesFiltros[campo] || campo}: {textoFiltro(campo, valor)}<X size={13} aria-hidden="true" /></button>)}</div>}
      {loading && <div className="obras-loading" aria-hidden="true"><Search size={24} /><p>Consultando suas obras</p></div>}
      {data?.situacao === 'lista_vazia' && <div className="feature-card"><EmptyState title="Nenhuma obra cadastrada" description="Comece cadastrando uma casa ou um empreendimento de apartamentos."><Link className="button button-primary" to="/obras/nova"><Plus size={16} aria-hidden="true" />Cadastrar primeira obra</Link></EmptyState></div>}
      {data?.situacao === 'sem_resultados' && <div className="feature-card"><EmptyState title="Nenhuma obra encontrada" description="Nenhuma obra corresponde aos filtros aplicados. Ajuste os critérios ou limpe a busca."><Button variant="secondary" onClick={() => apply({})}>Limpar filtros</Button></EmptyState></div>}
      {data && <div className="works-grid">{data.obras.map((obra) => <article className="feature-card work-card" key={obra.id}>
        <ImagemProjeto obraId={obra.id} imagem={obra.imagem_projeto} nome={obra.nome} compact />
        <div className="work-card-top"><span className="work-type">{obra.tipo === 'casa' ? <House size={17} aria-hidden="true" /> : <Building2 size={17} aria-hidden="true" />}{obra.tipo === 'casa' ? 'Casa' : obra.tipo === 'apartamentos' ? 'Apartamentos' : 'Obra residencial'}</span><ObraSituacao obra={obra} /></div>
        <div><h3><Link to={`/obras/${encodeURIComponent(obra.id)}/marcos${search ? `?busca=${encodeURIComponent(search)}` : ''}`}>{obra.nome}<ArrowUpRight size={20} aria-hidden="true" /></Link></h3>{obra.localizacao && <p className="work-location"><MapPin size={14} aria-hidden="true" />{obra.localizacao}</p>}<p className="work-client"><span>Cliente de referência</span>{obra.cliente}</p></div>
        <div className="work-deadline"><CalendarDays size={18} aria-hidden="true" /><p><span>Prazo de entrega</span>{formatarEntrega(obra.entrega)}</p></div>
        <span className="work-card-foot">Ver obra e acompanhamento <ArrowUpRight size={16} aria-hidden="true" /></span>
      </article>)}</div>}
    </section>
  </>;
}
