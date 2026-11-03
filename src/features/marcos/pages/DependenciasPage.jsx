import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, GitBranch, Plus, Unlink } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Button, EmptyState } from '../../../shared/ui/UI';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import MarcoSelect from '../components/MarcoSelect';
import DependenciaRelacao from '../components/DependenciaRelacao';
import { MarcoErro, MarcoEstado } from '../components/MarcoFeedback';
import { useMarcos } from '../useMarcos';
import { useDependencias } from '../useDependencias';
import { marcosApi } from '../api';

export default function DependenciasPage() {
  const { obraId, marcoId } = useParams();
  const { search } = useLocation();
  const { data: marco, loading, error, retry } = useMarcos(obraId, marcoId);
  const back = `/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(marcoId)}${search}`;
  // Validar a cadeia obra/marco antes de acessar endpoints sem obraId.
  return <section className="feature-page"><Link className="back-link button button-secondary" to={back}><ArrowLeft size={15} aria-hidden="true" />Detalhe do marco</Link>
    {loading && <p className="feature-card" role="status">Carregando marco…</p>}
    {error && <MarcoErro error={error} retry={retry} />}
    {marco && <GerenciarDependencias key={`${obraId}:${marcoId}`} obraId={obraId} marco={marco} search={search} />}
  </section>;
}

function GerenciarDependencias({ obraId, marco, search }) {
  const { request } = useAuth();
  const deps = useDependencias(marco.id);
  const candidates = useMarcos(obraId);
  const [selected, setSelected] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [failure, setFailure] = useState(null);
  const [success, setSuccess] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);
  const heading = useRef(null);
  const errorSummary = useRef(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const excluded = [marco.id, ...(deps.data || []).map((item) => item.depende_de_id)];
  const ready = Boolean(deps.data && candidates.data && !busy && !failure && !deps.loading && !candidates.loading && !deps.error && !candidates.error);
  const chosen = candidates.data?.find((item) => item.id === selected && !excluded.includes(item.id));
  function refresh() {
    setTarget(null); setSelected(''); setFailure(null); setFieldError('');
    deps.retry(); candidates.retry();
  }
  async function execute(operation) {
    if (!ready || locked.current) return;
    locked.current = true;
    setBusy(true); setSuccess(''); setFieldError('');
    try {
      await operation();
      if (!active.current) return;
      setSuccess(target ? 'Dependência retirada. Os dois marcos foram preservados.' : 'Dependência adicionada.');
      refresh();
    } catch (error) {
      if (!active.current) return;
      setFailure(error); setTarget(null);
      if (error.status === 422) setFieldError(error.message);
      requestAnimationFrame(() => errorSummary.current?.focus());
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  }
  function add(event) {
    event.preventDefault();
    if (!chosen) { setFieldError('Escolha um pré-requisito disponível desta obra.'); return; }
    void execute(() => marcosApi(request).addDependency(marco.id, chosen.id));
  }
  return <>
    <header className="section-heading marcos-heading"><div><span className="eyebrow">Sequência das entregas</span><h2 ref={heading} tabIndex={-1}>Dependências do marco</h2><p>Defina quais entregas são pré-requisitos de <strong>{marco.nome}</strong>.</p></div><MarcoEstado estado={marco.estado} /></header>
    {success && <p className="obra-save-success" role="status">{success}</p>}
    {failure && <section className="feature-card dependencia-error" ref={errorSummary} tabIndex={-1} role="alert"><h3>{failure.status === 409 ? 'Revise a relação entre os marcos' : 'Não foi possível confirmar a alteração'}</h3><p>{failure.message}</p><p>Consulte os vínculos atuais antes de tentar outra alteração.</p><Button variant="secondary" onClick={refresh}>Reconsultar dependências</Button></section>}
    <div className="dependencias-layout">
      <section className="feature-card dependencias-list" aria-labelledby="dependencias-list-title" aria-busy={deps.loading}>
        <div className="cadastro-heading"><h3 id="dependencias-list-title"><GitBranch size={20} aria-hidden="true" />Pré-requisitos definidos</h3>{deps.data && <span className="dependencias-count">{deps.data.length} {deps.data.length === 1 ? 'vínculo' : 'vínculos'}</span>}</div>
        {deps.loading && <p className="dependencias-feedback" role="status">Carregando dependências…</p>}
        {deps.error && <div className="dependencias-feedback" role="alert"><p>{deps.error.message}</p><Button variant="secondary" onClick={refresh}>Consultar dependências novamente</Button></div>}
        {deps.data?.length === 0 && <EmptyState title="Nenhuma dependência definida" description="Este marco ainda não possui pré-requisitos. Escolha uma entrega da obra para definir a sequência." />}
        {deps.data?.map((item) => <article className="dependencia-item" key={item.id}><DependenciaRelacao origem={item.marco_nome} destino={item.depende_de_nome} /><Button icon={Unlink} variant="secondary" disabled={!ready} aria-label={`Retirar dependência de ${item.depende_de_nome}`} aria-haspopup="dialog" onClick={() => setTarget(item)}>Retirar vínculo</Button></article>)}
      </section>
      <section className="feature-card dependencia-form" aria-labelledby="adicionar-dependencia-title"><span className="eyebrow">Planejar a sequência</span><h3 id="adicionar-dependencia-title">Adicionar dependência</h3><p className="form-hint">Qual entrega deve vir antes de {marco.nome}?</p>
        <form onSubmit={add} noValidate><MarcoSelect obraId={obraId} source={candidates} label="Marco pré-requisito" value={selected} excludeIds={excluded} required disabled={!ready} error={fieldError}
          emptyDescription={candidates.data?.length < 2 ? 'Cadastre outro marco nesta obra para definir uma dependência.' : 'Todos os outros marcos já foram escolhidos como pré-requisitos.'}
          onChange={(value) => { setSelected(value); setFieldError(''); }} />
          {chosen && <div className="dependencia-preview"><span>Relação a adicionar</span><DependenciaRelacao origem={marco.nome} destino={chosen.nome} /></div>}
          <Button type="submit" icon={Plus} loading={busy && !target} disabled={!ready || !chosen}>Adicionar dependência</Button>
        </form>
        <div className="dependencia-note"><p>Escolha entre os marcos desta obra. O próprio marco e os pré-requisitos já definidos ficam fora da seleção.</p><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/marcos/novo${search}`}>Cadastrar outro marco →</Link></div>
      </section>
    </div>
    {target && <ConfirmDialog title="Retirar dependência?" confirmLabel="Retirar vínculo" busy={busy} returnFocusRef={heading} onCancel={() => setTarget(null)}
      onConfirm={() => void execute(() => marcosApi(request).removeDependency(marco.id, target.id))}>
      <DependenciaRelacao origem={target.marco_nome} destino={target.depende_de_nome} /><p>Somente esta relação será retirada. Os dois marcos e seus registros serão preservados.</p>
    </ConfirmDialog>}
  </>;
}
