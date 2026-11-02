import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button, Field } from '../../../shared/ui/UI';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { useAuth } from '../../auth/AuthProvider';
import { historicoApi } from '../../historico/api';
import { marcosApi } from '../api';
import { MarcoEstado } from './MarcoFeedback';

const estados = [['a iniciar', 'A iniciar'], ['em andamento', 'Em andamento'], ['concluído', 'Concluído']];
export default function EstadoMarcoForm({ obraId, marco, disabled, onStart, onApplied, onRefresh }) {
  const { request } = useAuth();
  const [estado, setEstado] = useState(marco.estado);
  const [motivo, setMotivo] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);
  const locked = useRef(false);
  const active = useRef(true);
  const summary = useRef(null);
  const heading = useRef(null);
  const versionValid = Number.isInteger(marco.versao) && marco.versao >= 0;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let controller;
    function check() {
      if (locked.current || document.visibilityState === 'hidden') return;
      controller?.abort();
      const attempt = new AbortController();
      controller = attempt;
      setChecking(true);
      marcosApi(request).detail(obraId, marco.id, attempt.signal).then((current) => {
        if (attempt.signal.aborted) return;
        if (current.versao !== marco.versao || current.estado !== marco.estado) {
          setWarning(null); setBlocked(true);
          setFailure({ message: 'Este marco foi atualizado em outra aba. Consulte os dados atuais e revise sua decisão.' });
        }
      }).catch((error) => {
        if (!attempt.signal.aborted) { setWarning(null); setBlocked(true); setFailure(error); }
      }).finally(() => { if (!attempt.signal.aborted) setChecking(false); });
    }
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { controller?.abort(); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [request, obraId, marco.id, marco.versao, marco.estado]);
  function focusErrors() { requestAnimationFrame(() => summary.current?.focus()); }
  async function send(command) {
    if (locked.current || blocked || checking || disabled) return;
    locked.current = true; setSaving(true); setFailure(null); setErrors({});
    onStart?.();
    try {
      const response = await historicoApi(request).apply(obraId, command);
      if (response?.id !== marco.id || response.obra_id !== obraId || response.estado !== command.novo_valor || !Number.isInteger(response.versao) || response.versao < command.versao) {
        throw new Error('O servidor não confirmou os dados da alteração. Consulte o marco antes de tentar novamente.');
      }
      if (!active.current) return;
      setWarning(null);
      await onApplied();
    } catch (error) {
      if (!active.current) return;
      const dependencies = error.data?.dependencias;
      if (error.status === 409 && error.code === 'DEPENDENCIAS_PENDENTES' && command.novo_valor === 'concluído' && Array.isArray(dependencies) && dependencies.length && dependencies.every((item) => typeof item?.id === 'string' && typeof item.nome === 'string' && typeof item.estado === 'string')) {
        setWarning({ command, dependencies });
      } else {
        setWarning(null); setFailure(error);
        if (error.status === 422) {
          const fields = Array.isArray(error.fields) ? error.fields : Object.keys(error.fields || {});
          setErrors(Object.fromEntries(fields.map((campo) => [campo === 'novo_valor' ? 'estado' : campo, error.message])));
        } else setBlocked(true);
        focusErrors();
      }
    } finally { locked.current = false; if (active.current) setSaving(false); }
  }
  function submit(event) {
    event.preventDefault();
    const next = {};
    if (!motivo.trim()) next.motivo = 'Informe o motivo da mudança de estado.';
    if (!estados.some(([value]) => value === estado) || estado === marco.estado) next.estado = 'Escolha um estado diferente do atual.';
    if (!versionValid) { setBlocked(true); setFailure({ message: 'Não foi possível verificar a versão do marco. Consulte novamente.' }); focusErrors(); return; }
    setErrors(next);
    if (Object.keys(next).length) { focusErrors(); return; }
    void send({ alvo: { tipo: 'marco', id: marco.id }, campo: 'estado', novo_valor: estado, motivo: motivo.trim(), versao: marco.versao });
  }
  const frozen = disabled || saving || checking || blocked || Boolean(warning) || !versionValid;
  const reopening = marco.estado === 'concluído' && estado !== 'concluído';
  return <section className="feature-card estado-marco-form" aria-labelledby="estado-marco-title">
    <div className="cadastro-heading"><div><span className="eyebrow">Andamento da entrega</span><h3 id="estado-marco-title" ref={heading} tabIndex={-1}>Alterar estado do marco</h3></div><MarcoEstado estado={marco.estado} /></div>
    <p className="form-hint">Registre o andamento real de {marco.nome}. Toda alteração precisa de um motivo.</p>
    {(failure || Object.values(errors).some(Boolean)) && <div className="form-error" ref={summary} tabIndex={-1} role="alert"><p>{failure?.message || 'Revise os campos indicados.'}</p>{blocked && <p>Consulte novamente e revise o estado e o motivo antes de salvar.</p>}</div>}
    {!versionValid && <p className="form-error" role="alert">Versão do marco indisponível. Consulte novamente antes de alterar.</p>}
    {checking && <p role="status">Verificando se o marco foi atualizado…</p>}
    <form onSubmit={submit} noValidate><div className="form-grid">
      <Field label="Novo estado"><select aria-label="Novo estado" value={estado} disabled={frozen} required aria-invalid={Boolean(errors.estado)} aria-describedby={errors.estado ? 'estado-marco-erro' : undefined} onChange={(event) => { setEstado(event.target.value); setErrors((previous) => ({ ...previous, estado: '' })); setFailure(null); }}>{estados.map(([value, label]) => <option key={value} value={value}>{label}{value === marco.estado ? ' (atual)' : ''}</option>)}</select>{errors.estado && <small id="estado-marco-erro" className="field-error">{errors.estado}</small>}</Field>
      <Field label="Motivo da alteração" className="form-full"><textarea aria-label="Motivo da alteração" rows={3} value={motivo} disabled={frozen} required aria-invalid={Boolean(errors.motivo)} aria-describedby={errors.motivo ? 'motivo-marco-erro' : 'motivo-marco-hint'} placeholder="Explique o que mudou nesta entrega." onChange={(event) => { setMotivo(event.target.value); setErrors((previous) => ({ ...previous, motivo: '' })); setFailure(null); }} />{errors.motivo && <small id="motivo-marco-erro" className="field-error">{errors.motivo}</small>}</Field>
    </div><p id="motivo-marco-hint" className="form-hint">O motivo ficará registrado no histórico da obra.</p>
      {estado !== marco.estado && <div className="estado-marco-preview"><MarcoEstado estado={marco.estado} /><ArrowRight size={18} aria-hidden="true" /><MarcoEstado estado={estado} />{reopening && <p>Esta alteração reabre o marco e preserva a conclusão anterior no histórico.</p>}</div>}
      <div className="page-actions"><Button type="submit" loading={saving} disabled={frozen || estado === marco.estado}>{saving ? 'Salvando decisão…' : reopening ? 'Reabrir marco' : 'Salvar estado'}</Button>{(blocked || !versionValid) && <Button icon={RefreshCw} variant="secondary" disabled={saving || disabled} onClick={onRefresh}>Consultar marco atualizado</Button>}</div>
    </form>
    {warning && <ConfirmDialog title="Concluir com pré-requisitos pendentes?" confirmLabel="Concluir mesmo assim" confirmVariant="primary" returnFocusRef={heading} busy={saving} onCancel={() => setWarning(null)} onConfirm={() => void send({ ...warning.command, confirmar_dependencias: true })}>
      <div className="estado-dependencia-warning"><AlertTriangle size={24} aria-hidden="true" /><p><strong>{marco.nome}</strong> depende de entregas que ainda não foram concluídas:</p></div>
      <ul className="estado-pendencias">{warning.dependencies.map((item) => <li key={item.id}><strong>{item.nome}</strong><MarcoEstado estado={item.estado} /></li>)}</ul>
      <p>Você pode concluir este marco mesmo assim. Essa decisão e o motivo serão registrados.</p><p className="estado-warning-motivo"><strong>Motivo:</strong> {warning.command.motivo}</p>
    </ConfirmDialog>}
  </section>;
}
