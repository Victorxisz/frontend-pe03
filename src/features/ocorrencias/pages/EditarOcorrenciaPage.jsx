import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMarcos } from '../../marcos/useMarcos';
import { Button, Field } from '../../../shared/ui/UI';
import { ocorrenciasApi } from '../api';
import TrabalhadorSelect from '../../trabalhadores/components/TrabalhadorSelect';
import HistoricoOcorrencia from '../components/HistoricoOcorrencia';
import '../ocorrencias.css';

const campos = ['titulo', 'descricao', 'marco_id', 'responsavel_id'];
const rotulos = { titulo: 'Título', descricao: 'Descrição', marco_id: 'Marco', responsavel_id: 'Responsável' };
const normal = (valor) => valor == null ? '' : String(valor);
function valores(item) { return Object.fromEntries(campos.map(c => [c, normal(item[c])])); }
function diferencas(base, draft) {
  return Object.fromEntries(campos.filter(c => (c === 'titulo' || c === 'descricao' ? draft[c].trim() : draft[c]) !== normal(base[c]))
    .map(c => [c, c === 'titulo' || c === 'descricao' ? draft[c].trim() : draft[c] || null]));
}
export default function EditarOcorrenciaPage() {
  const { obraId, ocorrenciaId } = useParams();
  return <Editor key={`${obraId}:${ocorrenciaId}`} obraId={obraId} ocorrenciaId={ocorrenciaId} />;
}
function Editor({ obraId, ocorrenciaId }) {
  const { request } = useAuth(); const { search } = useLocation(); const navigate = useNavigate();
  const baseUrl = `/obras/${encodeURIComponent(obraId)}/ocorrencias/${encodeURIComponent(ocorrenciaId)}`;
  const [base, setBase] = useState(null); const [draft, setDraft] = useState(null); const [estado, setEstado] = useState(''); const [motivo, setMotivo] = useState('');
  const [workers, setWorkers] = useState({}); const [workerAttempt, setWorkerAttempt] = useState(0); const marcos = useMarcos(obraId);
  const [error, setError] = useState(null); const [pendingReview, setPendingReview] = useState(false); const [comparison, setComparison] = useState(null); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [reading, setReading] = useState(false);
  const locked = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; const controller = new AbortController();
    ocorrenciasApi(request).detail(obraId, ocorrenciaId, controller.signal).then(item => { if (!controller.signal.aborted) { setBase(item); setDraft(valores(item)); setEstado(item.estado); setLoading(false); } }).catch(cause => { if (!controller.signal.aborted) { setError({ message: cause.message }); setLoading(false); } });
    return () => { mounted.current = false; controller.abort(); };
  }, [request, obraId, ocorrenciaId]);
  useEffect(() => { const controller = new AbortController(); setWorkers({});
    ocorrenciasApi(request).workers(obraId, controller.signal).then(data => { if (!controller.signal.aborted) setWorkers({ data }); }).catch(cause => { if (!controller.signal.aborted) setWorkers({ error: cause }); });
    return () => controller.abort();
  }, [request, obraId, workerAttempt]);
  const change = (name, value) => { setDraft(current => ({ ...current, [name]: value })); setError(null); };
  const changes = base && draft ? diferencas(base, draft) : {};
  const mudouEstado = base && estado !== base.estado;
  async function consultarAtual() {
    if (locked.current) return;
    locked.current = true; setReading(true); setError(null);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const item = await ocorrenciasApi(request).detail(obraId, ocorrenciaId, controller.signal);
      if (mounted.current) { if (!base) { setBase(item); setDraft(valores(item)); setEstado(item.estado); setPendingReview(false); } else setComparison(item); }
    } catch (cause) { if (mounted.current) setError({ message: cause.name === 'AbortError' ? 'A consulta demorou demais. Tente novamente.' : cause.message || 'Não foi possível consultar a ocorrência.' }); }
    finally { clearTimeout(timer); locked.current = false; if (mounted.current) setReading(false); }
  }
  function adotarAtual() {
    const edited = diferencas(base, draft); const next = valores(comparison);
    for (const key of Object.keys(edited)) next[key] = normal(edited[key]);
    const desiredState = estado !== base.estado ? estado : comparison.estado;
    setBase(comparison); setDraft(next); setEstado(desiredState); setComparison(null); setPendingReview(false); setError(null); setWorkerAttempt(n => n + 1);
  }
  async function submit(event) {
    event.preventDefault();
    if (locked.current || pendingReview || !base) return;
    if (!draft.titulo.trim() || !draft.descricao.trim()) { setError({ message: 'Informe título e descrição.' }); return; }
    if (mudouEstado && !motivo.trim()) { setError({ message: 'Informe o motivo da mudança de estado.' }); return; }
    if (!Object.keys(changes).length && !mudouEstado) { setError({ message: 'Nenhuma alteração para salvar.' }); return; }
    if (changes.marco_id && !marcos.data?.some(m => m.id === changes.marco_id)) { setError({ message: 'Selecione um marco disponível nesta obra.' }); return; }
    locked.current = true; setSaving(true); setError(null);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
    let patchEnviado = false;
    try {
      if (changes.responsavel_id) {
        const atuais = await ocorrenciasApi(request).workers(obraId, controller.signal);
        if (!atuais.some(w => w.id === changes.responsavel_id)) { setWorkers({ data: atuais }); throw Object.assign(new Error('O trabalhador selecionado não está mais vinculado à obra. Escolha novamente.'), { status: 404 }); }
      }
      const body = { versao: base.versao };
      if (Object.keys(changes).length) body.alteracoes = changes;
      if (mudouEstado) body.transicao = { estado, motivo: motivo.trim() };
      patchEnviado = true;
      const item = await ocorrenciasApi(request).update(obraId, ocorrenciaId, body, controller.signal);
      if (mounted.current) navigate(`${baseUrl}${search}`, { replace: true, state: { ocorrenciaAtualizada: item.id } });
    } catch (cause) {
      if (!mounted.current) return;
      const uncertain = patchEnviado && (cause.name === 'AbortError' || !cause.status || cause.status >= 500);
      const conflict = cause.status === 409;
      if (uncertain || conflict) { setPendingReview(true); setComparison(null); }
      setError({ message: uncertain ? 'Não foi possível confirmar a atualização. Consulte o estado atual antes de reenviar.' : conflict ? 'A ocorrência mudou em outra sessão. Consulte e revise os dados antes de reenviar.' : cause.name === 'AbortError' ? 'A consulta de trabalhadores demorou demais. Tente novamente.' : cause.message || 'Não foi possível atualizar a ocorrência.' });
    } finally { clearTimeout(timer); locked.current = false; if (mounted.current) setSaving(false); }
  }
  return <section className="feature-page"><h2>Atualizar ocorrência</h2><p>Corrija os dados ou registre uma mudança de estado com motivo.</p>
    {loading && <p role="status">Carregando ocorrência…</p>}
    {error && <div className="form-error" role="alert"><p>{error.message}</p>{(!base || pendingReview) && <Button variant="secondary" loading={reading} onClick={consultarAtual}>Consultar estado atual</Button>}</div>}
    {comparison && <section className="feature-card" aria-label="Comparação com estado atual"><h3>Dados consultados agora</h3><p>Compare os dados anteriores, atuais e sua intenção antes de continuar.</p>
      {[...campos, 'estado'].map(c => <div key={c} className="ocorrencia-comparacao"><strong>{rotulos[c] || 'Estado'}</strong><p>Anterior: {normal(base[c]) || 'Não informado'}</p><p>Agora: {normal(comparison[c]) || 'Não informado'}</p><p>Sua intenção: {normal(c === 'estado' ? estado : draft[c]) || 'Não informado'}</p></div>)}
      <p>Versão anterior: {base.versao} · Versão atual: {comparison.versao}</p><Button onClick={adotarAtual}>Revisar com dados atuais</Button></section>}
    {base && draft && <><form className="feature-card ocorrencia-form" onSubmit={submit} noValidate>
      <div className="form-grid"><Field label="Título"><input value={draft.titulo} onChange={e => change('titulo', e.target.value)} disabled={saving || pendingReview} /></Field>
      <Field label="Descrição" className="form-full"><textarea rows="4" value={draft.descricao} onChange={e => change('descricao', e.target.value)} disabled={saving || pendingReview} /></Field>
      <Field label="Marco"><select value={draft.marco_id} onChange={e => change('marco_id', e.target.value)} disabled={saving || pendingReview || !marcos.data}><option value="">Sem marco</option>{draft.marco_id && !marcos.data?.some(m => m.id === draft.marco_id) && <option value={draft.marco_id}>Referência atual: {draft.marco_id}</option>}{marcos.data?.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></Field>
      <TrabalhadorSelect label="Responsável" trabalhadores={workers.data} obraId={obraId} value={draft.responsavel_id} onChange={value => change('responsavel_id', value)} disabled={saving || pendingReview} />
      <Field label="Novo estado"><select value={estado} onChange={e => { setEstado(e.target.value); setError(null); }} disabled={saving || pendingReview}><option value="aberta">Aberta</option><option value="resolvida">Resolvida</option><option value="sem solução">Sem solução</option></select></Field>
      {mudouEstado && <Field label="Motivo da mudança"><textarea rows="3" value={motivo} onChange={e => setMotivo(e.target.value)} disabled={saving || pendingReview} /></Field>}</div>
      {marcos.error && <p role="alert">Não foi possível consultar marcos. <Button variant="secondary" onClick={marcos.retry}>Consultar novamente</Button></p>}
      {workers.error && <p role="alert">Não foi possível consultar trabalhadores. <Button variant="secondary" onClick={() => setWorkerAttempt(n => n + 1)}>Consultar novamente</Button></p>}
      <div className="page-actions action-toolbar"><Button type="submit" loading={saving} disabled={pendingReview}>Salvar alterações</Button><Link className="button button-secondary" to={`${baseUrl}${search}`} onClick={e => saving && e.preventDefault()} aria-disabled={saving || undefined}>Cancelar</Link></div>
    </form><div className="feature-card ocorrencia-card"><HistoricoOcorrencia item={base} /></div></>}
  </section>;
}
