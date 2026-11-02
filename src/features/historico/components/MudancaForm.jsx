import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { obrasApi } from '../../obras/api';
import { marcosApi } from '../../marcos/api';
import { historicoApi } from '../api';
import { Button, Field } from '../../../shared/ui/UI';
import PrazoEntregaFields from '../../obras/components/PrazoEntregaFields';
import ObraSituacao from '../../obras/components/ObraSituacao';
import ConfirmacaoDependencias, { dependenciasPendentes } from '../../marcos/components/ConfirmacaoDependencias';
import MudancasRegistradas from './MudancasRegistradas';
import { descreverValor, estadosObra, estadosMarco, novoValor, validarMudanca, valorAtual, valoresIguais } from '../mudanca';
import '../mudancas.css';
export default function MudancaForm({ obraId, tipo, targetId, campo, onBusy, onObraConsultada }) {
  const { request } = useAuth();
  const [current, setCurrent] = useState(null), [intent, setIntent] = useState(null), [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [blocked, setBlocked] = useState(false);
  const [failure, setFailure] = useState(null), [errors, setErrors] = useState({}), [warning, setWarning] = useState(null);
  const [events, setEvents] = useState(null), [readError, setReadError] = useState(null), [confirmed, setConfirmed] = useState(false);
  const readEpoch = useRef(0);
  // A versão exibida pode avançar; somente uma revisão explícita muda a base da decisão.
  const reviewedVersion = useRef(null);
  const active = useRef(true), lock = useRef(false), controller = useRef(null), heading = useRef(null), summary = useRef(null);
  async function readTarget(signal) {
    const value = tipo === 'obra' ? await obrasApi(request).detail(obraId, signal) : await marcosApi(request).detail(obraId, targetId, signal);
    if (value?.id !== targetId || !Number.isInteger(value.versao) || value.versao < 0 || valorAtual(value, campo) == null) throw new Error('Dados ou versão do alvo indisponíveis. Consulte novamente.');
    return value;
  }
  function fail(error) { setFailure(error); requestAnimationFrame(() => summary.current?.focus()); }
  useEffect(() => {
    active.current = true; const attempt = new AbortController(); const epoch = readEpoch.current;
    setLoading(true);
    readTarget(attempt.signal).then(value => { if (!attempt.signal.aborted) { reviewedVersion.current = value.versao; setCurrent(value); setIntent(structuredClone(valorAtual(value, campo))); } }).catch(error => { if (!attempt.signal.aborted) fail(error); }).finally(() => { if (!attempt.signal.aborted) setLoading(false); });
    historicoApi(request).list(obraId, attempt.signal).then(value => { if (!attempt.signal.aborted && readEpoch.current === epoch) setEvents(value); }).catch(error => { if (!attempt.signal.aborted && readEpoch.current === epoch) setReadError(error); });
    return () => { active.current = false; attempt.abort(); controller.current?.abort(); };
  }, [request, obraId, tipo, targetId, campo]);
  useEffect(() => {
    let attempt;
    function check() {
      if (lock.current || !current || document.visibilityState === 'hidden') return;
      attempt?.abort(); attempt = new AbortController(); const signal = attempt.signal;
      readTarget(signal).then(value => {
        if (signal.aborted || lock.current) return;
        if (value.versao !== reviewedVersion.current) { setCurrent(value); setWarning(null); setBlocked(true); fail(new Error('O alvo foi atualizado em outra aba. Sua intenção foi preservada; revise o valor atual.')); }
      }).catch(error => { if (!signal.aborted && !lock.current) { setBlocked(true); setWarning(null); fail(error); } });
    }
    window.addEventListener('focus', check); document.addEventListener('visibilitychange', check);
    return () => { attempt?.abort(); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [request, current, obraId, tipo, targetId, campo]);
  async function refresh() {
    const epoch = ++readEpoch.current;
    const results = await Promise.allSettled([
      readTarget(), obrasApi(request).detail(obraId), obrasApi(request).list(), marcosApi(request).list(obraId), historicoApi(request).list(obraId),
    ]);
    if (!active.current || readEpoch.current !== epoch) return;
    if (results[0].status === 'fulfilled') {
      const latest = results[0].value;
      setCurrent(latest);
      if (latest.versao !== reviewedVersion.current) {
        setBlocked(true); setWarning(null);
        fail(new Error('O alvo foi atualizado. Sua intenção foi preservada; revise o valor atual antes de salvar.'));
      }
    }
    if (results[1].status === 'fulfilled') onObraConsultada?.(results[1].value);
    if (results[4].status === 'fulfilled') setEvents(results[4].value); else setEvents(null);
    const failures = results.filter(r => r.status === 'rejected');
    setReadError(failures.length ? new Error(failures.map(r => r.reason.message).join(' ')) : null);
  }
  async function reread() {
    if (lock.current) return; lock.current = true; setLoading(true); onBusy(true); setFailure(null); setWarning(null);
    try {
      const value = await readTarget();
      if (!active.current) return;
      reviewedVersion.current = value.versao;
      setCurrent(value); if (intent === null) setIntent(structuredClone(valorAtual(value, campo)));
      setBlocked(false); setConfirmed(false); setErrors({});
      await refresh();
    } catch(error) { if (active.current) { setBlocked(true); fail(error); } }
    finally { lock.current = false; if (active.current) { setLoading(false); onBusy(false); } }
  }
  async function send(command) {
    if (lock.current || blocked) return;
    lock.current = true; setSaving(true); onBusy(true); setFailure(null); setErrors({}); setConfirmed(false);
    const attempt = new AbortController(); controller.current = attempt; const timeout = setTimeout(() => attempt.abort(), 60000);
    try {
      const response = await historicoApi(request).apply(obraId, command, attempt.signal);
      const actual = valorAtual(response || {}, campo);
      if (response?.id !== targetId || (tipo === 'marco' && response.obra_id !== obraId) || !Number.isInteger(response.versao) || response.versao < command.versao || !valoresIguais(actual, command.novo_valor)) throw new Error('O servidor não confirmou o resultado. Confira o estado atual antes de reenviar.');
      clearTimeout(timeout); if (!active.current) return;
      reviewedVersion.current = response.versao;
      setWarning(null); setConfirmed(true); setMotivo(''); await refresh();
    } catch(error) {
      if (!active.current) return;
      const dependencies = dependenciasPendentes(error, command);
      if (dependencies) setWarning({ command, dependencies });
      else {
        setWarning(null); fail(error.name === 'AbortError' ? new Error('Tempo de resposta excedido. Consulte o estado real antes de reenviar.') : error);
        if (error.status === 422) { const fields = Array.isArray(error.fields) ? error.fields : Object.keys(error.fields || {}); setErrors(Object.fromEntries(fields.map(field => [field, error.message]))); }
        else {
          setBlocked(true);
          if (error.status === 409) {
            try { const latest = await readTarget(); if (active.current) setCurrent(latest); }
            catch { /* Preservar a intenção e a falha; nova consulta continua disponível. */ }
          }
        }
      }
    } finally { clearTimeout(timeout); lock.current = false; if (active.current) { setSaving(false); onBusy(false); } }
  }
  function submit(event) {
    event.preventDefault(); if (!current || blocked || lock.current) return;
    const next = validarMudanca(tipo, campo, intent, motivo); setErrors(next);
    if (Object.keys(next).length) { requestAnimationFrame(() => summary.current?.focus()); return; }
    void send({ alvo: { tipo, id: targetId }, campo, novo_valor: novoValor(campo, intent), motivo: motivo.trim(), versao: reviewedVersion.current });
  }
  const frozen = saving || loading || blocked || Boolean(warning);
  const same = current && valoresIguais(novoValor(campo, intent), valorAtual(current, campo));
  return <section aria-label="Decisão de mudança"><h3 ref={heading} tabIndex={-1}>{current?.nome || 'Consultar alvo'}</h3>
    {loading && <p role="status">Consultando alvo e versão…</p>}
    {(failure || Object.keys(errors).length > 0) && <div ref={summary} tabIndex={-1} role="alert" className="form-error"><p>{failure?.message || 'Revise os campos indicados.'}</p>{Object.entries(errors).map(([key, message]) => <p key={key}>{key}: {message}</p>)}</div>}
    {confirmed && <p role="status" className="obra-save-success">Decisão confirmada pelo servidor.</p>}
    {readError && <div role="alert"><p>{confirmed ? 'Decisão confirmada, mas a atualização da visualização ficou incompleta.' : 'Não foi possível consultar todos os dados.'} {readError.message}</p><Button disabled={saving || loading} onClick={async () => { setSaving(true); onBusy(true); try { await refresh(); } finally { if (active.current) { setSaving(false); onBusy(false); } } }}>Atualizar consultas</Button></div>}
    {current && <><div className="feature-card mudanca-current"><h4>Valor atual consultado</h4><p>{descreverValor(valorAtual(current, campo))}</p><p>Versão: {current.versao}</p>{tipo === 'obra' && <ObraSituacao obra={current} />}{current.data_conclusao && <p>Conclusão efetiva: {current.data_conclusao}</p>}</div>
      {blocked && <aside className="feature-card" aria-label="Intenção preservada"><h4>Intenção preservada</h4><p>{descreverValor(novoValor(campo, intent))}</p><p>Motivo digitado: {motivo}</p><p>Compare com o valor atual e revise antes de salvar. A consulta não reenvia a decisão.</p></aside>}
      <form onSubmit={submit} noValidate className="feature-card mudanca-form"><fieldset disabled={frozen}><legend>Novo valor</legend>
        {campo === 'entrega' ? <PrazoEntregaFields value={intent} onChange={setIntent} errors={errors} /> : campo === 'estado' ? <Field label="Novo estado"><select aria-label="Novo estado" value={intent} onChange={e => setIntent(e.target.value)} aria-invalid={Boolean(errors.novo_valor)}>{(tipo === 'obra' ? estadosObra : estadosMarco).map(value => <option key={value} value={value}>{value}</option>)}</select></Field> : <div className="form-grid">{['inicio_previsto', 'fim_previsto'].map((key, index) => <Field key={key} label={index ? 'Fim previsto' : 'Início previsto'}><input aria-label={index ? 'Fim previsto' : 'Início previsto'} type="date" value={intent[key]} onChange={e => setIntent({ ...intent, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} /></Field>)}</div>}
        <Field label="Motivo da mudança"><textarea aria-label="Motivo da mudança" required value={motivo} onChange={e => setMotivo(e.target.value)} aria-invalid={Boolean(errors.motivo)} /></Field>
      </fieldset>
      {campo === 'estado' && <p>A conclusão usa o dia UTC do servidor. Reabrir preserva a conclusão anterior no histórico e limpa a conclusão atual.</p>}
      {same && <p>O valor escolhido já é o atual. Confirmar novamente não acrescenta um registro ao histórico.</p>}
      <Button type="submit" disabled={frozen || !motivo.trim()} loading={saving}>Salvar mudança</Button>
      </form></>}
    {(blocked || (!current && !loading)) && <Button disabled={saving || loading} onClick={reread}>{current ? 'Revisar intenção com versão atual' : 'Consultar alvo novamente'}</Button>}
    {events && <MudancasRegistradas events={events} tipo={tipo} targetId={targetId} />}
    {warning && <ConfirmacaoDependencias warning={warning} nome={current.nome} busy={saving} heading={heading} onCancel={() => setWarning(null)} onConfirm={send} />}
  </section>;
}
