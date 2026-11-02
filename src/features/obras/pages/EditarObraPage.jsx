import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Pencil, Save } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../../shared/ui/UI';
import { formatarDia, formatarEntrega } from '../../../shared/lib/datas';
import { obrasApi } from '../api';
import { alteracoesDescritivas, camposDescritivos, labelsDescritivos, validarDescritiva } from '../descritiva';
import ObraDescritivaFields from '../components/ObraDescritivaFields';
import ObraSituacao from '../components/ObraSituacao';
import EditorImagemProjeto from '../components/EditorImagemProjeto';

function mensagemErro(error, leitura = false) {
  if (error.status === 400) return 'A referência da obra é inválida. Volte ao painel e selecione uma obra.';
  if (error.status === 404) return 'Obra não encontrada. Ela pode ter sido excluída ou não estar disponível.';
  if (error.status >= 500) return leitura ? 'Não foi possível carregar os dados da obra. Tente consultar novamente.' : 'Não foi possível confirmar a correção da obra. Seus dados digitados foram mantidos. Consulte a obra antes de tentar salvar novamente.';
  if (!error.status) return leitura ? 'Não foi possível consultar a obra. Confira a conexão e tente novamente.' : 'Não foi possível confirmar a alteração. Seus dados digitados foram mantidos. Consulte a obra antes de tentar salvar novamente.';
  return error.message;
}

function EditarObra({ obraId }) {
  const { request } = useAuth();
  const { search } = useLocation();
  const navigate = useNavigate();
  const detailTo = `/obras/${encodeURIComponent(obraId)}/marcos${search}`;
  const changeTo = `/obras/${encodeURIComponent(obraId)}/historico/nova-mudanca${search}`;
  const busca = new URLSearchParams(search).get('busca');
  const listTo = busca ? `/obras?${new URLSearchParams(busca)}` : '/obras';
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageSaving, setImageSaving] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);
  const summary = useRef(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setState({});
    obrasApi(request).detail(obraId, controller.signal)
      .then((obra) => {
        if (!obra?.id || camposDescritivos.some((campo) => typeof obra[campo] !== 'string')) throw new Error('Cadastro incompleto.');
        if (controller.signal.aborted) return;
        setDraft(Object.fromEntries(camposDescritivos.map((campo) => [campo, obra[campo]])));
        setState({ obra });
      })
      .catch((error) => { if (!controller.signal.aborted) setState({ error }); });
    return () => controller.abort();
  }, [request, obraId, attempt]);
  function change(campo, value) {
    setDraft((previous) => ({ ...previous, [campo]: value }));
    setErrors((previous) => ({ ...previous, [campo]: '' }));
    setFailure((previous) => previous?.uncertain ? previous : null);
  }
  function focusError() { requestAnimationFrame(() => summary.current?.focus()); }
  async function save(event) {
    event.preventDefault();
    if (locked.current || imageSaving || failure?.uncertain) return;
    const nextErrors = validarDescritiva(draft);
    setErrors(nextErrors);
    setFailure(null);
    if (Object.keys(nextErrors).length) { focusError(); return; }
    const changes = alteracoesDescritivas(state.obra, draft);
    if (!Object.keys(changes).length) return;
    locked.current = true;
    setSaving(true);
    try {
      const partial = await obrasApi(request).update(obraId, changes);
      if (partial?.id !== state.obra.id || camposDescritivos.some((campo) => typeof partial[campo] !== 'string')) throw new Error('Resposta incompleta.');
      // O PATCH não contém planejamento/alertas. Voltar remonta o layout e
      // consulta o cadastro completo; nunca substituir a obra pela resposta parcial.
      if (active.current) navigate(detailTo, { replace: true, state: { obraAtualizada: obraId } });
    } catch (error) {
      if (!active.current) return;
      setFailure({ message: mensagemErro(error), uncertain: !error.status || error.status >= 500 });
      if (error.status === 422) {
        const fields = Array.isArray(error.fields) ? error.fields : Object.keys(error.fields || {});
        setErrors(Object.fromEntries(fields.map((campo) => [campo, error.message])));
      }
      focusError();
    } finally {
      locked.current = false;
      if (active.current) setSaving(false);
    }
  }
  const dirty = state.obra && draft && Object.keys(alteracoesDescritivas(state.obra, draft)).length > 0;
  const hasErrors = Object.values(errors).some(Boolean);
  return <>
    <Link className="back-link button button-secondary obra-edit-back" to={detailTo} aria-disabled={saving || imageSaving || undefined} onClick={(event) => (saving || imageSaving) && event.preventDefault()}><ArrowLeft size={15} aria-hidden="true" />Voltar à obra</Link>
    <header className="page-heading"><span className="eyebrow">Cadastro da obra</span><h1>Editar obra</h1><p>Atualize os dados de identificação e descrição.</p></header>
    {!state.obra && !state.error && <p role="status">Carregando dados da obra…</p>}
    {state.error && <section className="feature-card busca-error"><h2>{state.error.status === 404 ? 'Obra não encontrada' : state.error.status === 400 ? 'Referência de obra inválida' : 'Cadastro indisponível'}</h2><p role="alert">{mensagemErro(state.error, true)}</p><div className="page-actions"><Button onClick={() => setAttempt((value) => value + 1)}>Consultar novamente</Button><Link className="button button-secondary" to={listTo}>Painel das Obras</Link></div></section>}
    {state.obra && draft && <div className="obra-edit-grid">
      <div className="obra-edit-main">
      <section className="feature-card obra-edit-form" aria-labelledby="titulo-edicao"><h2 id="titulo-edicao"><Pencil size={18} aria-hidden="true" />Dados descritivos</h2><p className="form-hint">Todos os campos são obrigatórios. Apenas os dados alterados serão salvos.</p>
        {(failure || hasErrors) && <div ref={summary} tabIndex={-1} role="alert" className="form-error"><p>{failure?.message || 'Revise os campos indicados antes de salvar.'}</p>{Object.entries(errors).filter(([, message]) => message).map(([campo, message]) => <p key={campo}>{labelsDescritivos[campo] ? <a href={`#descritiva-${campo}`}>{labelsDescritivos[campo]}: {message}</a> : message}</p>)}{failure?.uncertain && <Link to={detailTo}>Consultar obra</Link>}</div>}
        <form onSubmit={save} noValidate aria-busy={saving}><fieldset className="descritiva-edit-fields form-grid" disabled={saving || imageSaving}><legend className="sr-only">Dados descritivos da obra</legend><ObraDescritivaFields value={draft} onChange={change} errors={errors} /></fieldset>
          <div className="page-actions"><Button type="submit" icon={Save} loading={saving} disabled={!dirty || imageSaving || failure?.uncertain}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button><Button variant="secondary" disabled={saving || imageSaving} onClick={() => navigate(detailTo)}>Cancelar</Button></div>
          <p className="form-hint edit-save-hint" role="status">{saving ? 'Salvando alterações…' : !dirty ? 'Nenhuma alteração para salvar.' : 'As alterações serão aplicadas ao cadastro da obra.'}</p>
        </form>
      </section>
      <EditorImagemProjeto obra={state.obra} disabled={saving} onBusyChange={setImageSaving} onSaved={(imagem) => setState((previous) => ({ ...previous, obra: { ...previous.obra, imagem_projeto: imagem } }))} />
      </div>
      <aside className="feature-card obra-edit-planning" aria-label="Planejamento atual"><span className="eyebrow">Planejamento atual</span><h2>{state.obra.nome}</h2><ObraSituacao obra={state.obra} /><dl className="obra-resumo">
        <div><dt>Tipo de obra</dt><dd>{state.obra.tipo === 'apartamentos' ? 'Apartamentos' : 'Casa'}</dd></div><div><dt>Início da obra</dt><dd>{formatarDia(state.obra.inicio)}</dd></div><div><dt>Prazo de entrega</dt><dd>{formatarEntrega(state.obra.entrega)}</dd></div>{state.obra.data_conclusao && <div><dt>Conclusão efetiva</dt><dd>{formatarDia(state.obra.data_conclusao)}</dd></div>}
      </dl><div className="edit-planning-note"><h3>Precisa mudar prazo ou situação?</h3><p>Essas mudanças exigem motivo e registro no histórico.</p><Link className="button button-secondary" to={changeTo} aria-disabled={saving || undefined} onClick={(event) => saving && event.preventDefault()}>Registrar mudança<ArrowUpRight size={16} aria-hidden="true" /></Link><p className="form-hint">Altere entrega ou estado com controle de versão e motivo.</p></div></aside>
    </div>}
  </>;
}

export default function EditarObraPage() {
  const { obraId } = useParams();
  return <EditarObra key={obraId} obraId={obraId} />;
}
