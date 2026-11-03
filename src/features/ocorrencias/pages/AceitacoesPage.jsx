import { formatarDataHora } from '../../../shared/lib/datas';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button, EmptyState, Field } from '../../../shared/ui/UI';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { ocorrenciasApi, resumirErroAceitacao } from '../api';

const pendingKey = (id) => `pe03:ocorrencia-aceitacao:${id}`;
const makeKey = () => globalThis.crypto?.randomUUID?.().replaceAll('-', '') || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
const readPending = (id) => {
  try { const value = JSON.parse(localStorage.getItem(pendingKey(id))); return value?.body && value?.key ? value : null; }
  catch { return null; }
};
const formatDate = (value) => {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
};

export default function AceitacoesPage() {
  const { ocorrenciaId, obraId } = useParams();
  const { search } = useLocation();
  const { request } = useAuth();
  const api = useMemo(() => ocorrenciasApi(request), [request]);
  const [occurrence, setOccurrence] = useState(null);
  const [items, setItems] = useState(null);
  const [readError, setReadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [justification, setJustification] = useState('');
  const [measure, setMeasure] = useState('');
  const [dialog, setDialog] = useState(false);
  const [pending, setPending] = useState(() => readPending(ocorrenciaId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [refreshAttempt, setRefreshAttempt] = useState(0);
  const heading = useRef(null);
  const live = useRef(true);

  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => { setPending(readPending(ocorrenciaId)); setItems(null); setOccurrence(null); setReadError(null); }, [ocorrenciaId]);

  const refresh = useCallback(async (signal) => {
    setReadError(null);
    try {
      const [detail, history] = await Promise.all([
        api.detail(obraId, ocorrenciaId, signal), api.acceptances(ocorrenciaId, signal),
      ]);
      if (!signal?.aborted && live.current) {
        setOccurrence(detail);
        setItems(Array.isArray(history) ? history : null);
        if (!Array.isArray(history)) setReadError(new Error('O servidor não retornou o histórico no formato esperado.'));
      }
    } catch (cause) {
      if (!signal?.aborted && live.current) setReadError(cause);
    }
  }, [api, obraId, ocorrenciaId]);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh, attempt, refreshAttempt]);

  function savePending(command) {
    try { localStorage.setItem(pendingKey(ocorrenciaId), JSON.stringify(command)); } catch { /* A decisão segue disponível nesta sessão. */ }
    setPending(command);
  }
  function discardPending() {
    try { localStorage.removeItem(pendingKey(ocorrenciaId)); } catch { /* A decisão pendente também é removida da sessão. */ }
    setPending(null);
    setError(null);
  }
  async function submit(command = pending) {
    if (!command || saving) return;
    setSaving(true); setError(null); setSuccess('');
    try {
      const response = await api.accept(ocorrenciaId, command.body, command.key);
      if (!live.current) return;
      setDialog(false);
      setSuccess(response.status === 200
        ? 'Reenvio reconhecido pelo servidor: a decisão original foi recuperada.'
        : 'Nova decisão registrada pelo servidor.');
      try { localStorage.removeItem(pendingKey(ocorrenciaId)); } catch { /* */ }
      setPending(null);
      setJustification(''); setMeasure('');
      setRefreshAttempt((value) => value + 1);
    } catch (cause) {
      if (!live.current) return;
      setError(cause);
      if (cause.status === 409) setRefreshAttempt((value) => value + 1);
    } finally { if (live.current) setSaving(false); }
  }
  function confirmIntent() {
    if (pending) return void submit(pending);
    const body = { justificativa: justification.trim() };
    if (measure.trim()) body.medida_compensatoria = measure.trim();
    const command = { body, key: makeKey() };
    savePending(command);
    void submit(command);
  }
  const state = occurrence?.estado;
  const allowed = state === 'sem solução';
  const records = items || [];

  return <section className="feature-page">
    <header className="section-heading" ref={heading} tabIndex={-1}>
      <span className="eyebrow">Histórico da ocorrência</span><h2>Aceitações sem solução</h2>
      <p>Registrar uma aceitação documenta uma decisão justificada. Ela não resolve nem exclui a ocorrência.</p>
      <div className="page-actions"><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/ocorrencias/${encodeURIComponent(ocorrenciaId)}${search}`}>Voltar à ocorrência</Link></div>
    </header>

    {readError && <section className="feature-card" role="alert"><h3>Não foi possível consultar ocorrência e histórico</h3><p>{readError.message || 'A consulta não foi concluída.'}</p><p>Erro ou carregamento não significa histórico vazio. O formulário fica bloqueado até confirmar o estado.</p><Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Consultar novamente</Button></section>}
    {!readError && (!occurrence || !items) && <p role="status">Consultando estado da ocorrência e histórico de aceitações…</p>}
    {occurrence && <section className="feature-card" aria-label="Estado atual da ocorrência"><h3>{occurrence.titulo || occurrence.nome || 'Ocorrência'}</h3><p>Estado atual: <strong>{state || 'não informado'}</strong></p>{!allowed && <p role="status">Uma nova aceitação só pode ser registrada quando o estado for “sem solução”.</p>}</section>}

    {occurrence && items && (allowed || pending) && <section className="feature-card form-grid" aria-label="Nova aceitação">
      <h3>{pending ? 'Confirmar resultado da decisão pendente' : 'Registrar decisão'}</h3><p className="form-grid-wide">As decisões anteriores serão preservadas. Uma nova confirmação cria outra entrada no histórico.</p>
      <Field label="Justificativa"><textarea aria-label="Justificativa" required maxLength={4000} value={justification} disabled={Boolean(pending) || saving} onChange={(event) => setJustification(event.target.value)} /></Field>
      <Field label="Medida compensatória (opcional)"><textarea aria-label="Medida compensatória (opcional)" maxLength={4000} value={measure} disabled={Boolean(pending) || saving} onChange={(event) => setMeasure(event.target.value)} /></Field>
      {pending && <div className="form-grid-wide"><p role="alert">Há uma decisão ainda não confirmada. A repetição usa a mesma chave e o mesmo conteúdo.</p><p><strong>Justificativa:</strong> {pending.body.justificativa}</p>{pending.body.medida_compensatoria && <p><strong>Medida:</strong> {pending.body.medida_compensatoria}</p>}<Button loading={saving} onClick={() => void submit(pending)}>Reenviar para confirmar resultado</Button></div>}
      {!pending && <Button className="form-grid-wide" disabled={!justification.trim() || saving} onClick={() => { setError(null); setDialog(true); }}>Revisar aceitação</Button>}
      {error && <div className="form-grid-wide" role="alert"><p>{resumirErroAceitacao(error)}</p>{error.fields?.length > 0 && <p>Campos: {error.fields.join(', ')}</p>}{error.status === 409 ? <><Button variant="secondary" disabled={saving} onClick={() => setRefreshAttempt((value) => value + 1)}>Consultar estado e histórico</Button>{pending && !allowed && <Button variant="secondary" disabled={saving} onClick={discardPending}>Descartar decisão não registrada</Button>}</> : <Button variant="secondary" disabled={saving} onClick={() => void submit(pending)}>Reenviar mesma decisão</Button>}</div>}
      {success && <p className="form-grid-wide" role="status">{success}</p>}
    </section>}

    {items && <section className="feature-card" aria-label="Histórico de aceitações"><h3>Histórico ({records.length})</h3>{records.length === 0 ? <EmptyState title="Nenhuma aceitação registrada" description="Quando houver uma decisão, ela aparecerá aqui sem alterar o estado da ocorrência." /> : <div className="avanco-list">{records.map((item, index) => <article className="feature-card" key={item.id || item._id || item.chave_reenvio || `${item.data}-${index}`}><h4>Decisão registrada em {formatarDataHora(item.data)}</h4><p><strong>Justificativa:</strong> {item.justificativa}</p>{item.medida_compensatoria && <p><strong>Medida compensatória:</strong> {item.medida_compensatoria}</p>}<p><strong>Autor:</strong> {item.autor || 'Não informado pelo servidor'}</p>{item.aplicavel_ao_episodio_atual !== undefined && <p>{item.aplicavel_ao_episodio_atual ? 'Aplicável ao episódio atual' : 'Registro histórico de episódio anterior'}</p>}</article>)}</div>}</section>}

    {dialog && <ConfirmDialog title="Confirmar aceitação?" confirmLabel="Registrar decisão" confirmVariant="primary" busy={saving} onConfirm={confirmIntent} onCancel={() => setDialog(false)} returnFocusRef={heading}><p>A justificativa será registrada no histórico da ocorrência.</p><p>A aceitação não resolve nem exclui a ocorrência. Autor, data e vínculo com o episódio são controlados pelo servidor.</p><p><strong>Justificativa:</strong> {justification.trim()}</p>{measure.trim() && <p><strong>Medida compensatória:</strong> {measure.trim()}</p>}</ConfirmDialog>}
  </section>;
}
