import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { obrasApi } from '../../features/obras/api';
import { marcosApi } from '../../features/marcos/api';
import { avancosApi } from '../../features/avancos/api';
import { conferirImpacto, endpointRegistro, exclusaoRegistrosApi, retryDeadline } from '../api/exclusaoRegistros';
import { Button } from './UI';
import ConfirmDialog from './ConfirmDialog';
import ImpactoExclusao from './ImpactoExclusao';

const Context = createContext(null);
const individual = (alvo) => ['avanco', 'ocorrencia'].includes(alvo.tipo);
const endpoint = (alvo) => individual(alvo) ? endpointRegistro(alvo.tipo, alvo.id) : `/${alvo.tipo === 'obra' ? 'obras' : 'marcos'}/${encodeURIComponent(alvo.id)}`;
const labels = { obra: 'Obra', marco: 'Marco', avanco: 'Avanço', ocorrencia: 'Ocorrência' };
function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((a) => {
      if (!a || !Object.hasOwn(labels, a.tipo) || !['id', 'obraId', 'nome'].every((k) => typeof a[k] === 'string' && a[k])) return false;
      if (!individual(a)) return true;
      try {
        if (!['registro', 'rascunho'].includes(a.modo) || (a.modo === 'rascunho' && a.tipo !== 'avanco')) return false;
        conferirImpacto({ alvo: { tipo: a.tipo, id: a.id, obra_id: a.obraId, marco_id: a.marcoId, nome: a.nome }, perda: a.perda }, a);
        return !a.retryAt || Number.isFinite(a.retryAt);
      } catch { return false; }
    }) : [];
  } catch { return []; }
}

function RetomarExclusao({ alvo, busy, execute }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!(alvo.retryAt > Date.now())) return;
    const timer = setInterval(() => {
      const current = Date.now(); setNow(current);
      if (current >= alvo.retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [alvo.retryAt]);
  const remaining = Math.max(0, Math.ceil(((alvo.retryAt || 0) - now) / 1000));
  return <>
    {alvo.pendencia && <p className="record-reference">Operação de limpeza: {alvo.pendencia}</p>}
    {remaining > 0 && <p className="form-hint">Aguarde {remaining} s antes de retomar, conforme orientação do servidor.</p>}
    <Button variant="danger" loading={busy} disabled={remaining > 0} onClick={() => void execute(alvo)}>Retomar exclusão</Button>
  </>;
}

export function ExclusoesProvider({ children }) {
  const { user, request } = useAuth();
  const key = `pe03:exclusoes:${user.id}`;
  const [operations, setOperations] = useState(() => read(key));
  const records = useRef(operations);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const messageDestination = useRef(null);
  const [epoch, setEpoch] = useState(0);
  const navigate = useNavigate();
  const { pathname, key: locationKey } = useLocation();
  useEffect(() => {
    // Manter o aviso na chegada após o DELETE; a próxima navegação o encerra.
    // As operações pendentes possuem seu próprio aviso persistente.
    const arrivingAfterDeletion = messageDestination.current === pathname;
    messageDestination.current = null;
    if (!arrivingAfterDeletion) setMessage('');
  }, [locationKey, pathname]);
  function save(next) {
    // Persistir antes de enviar: sem isso, uma recarga perderia a retomada.
    localStorage.setItem(key, JSON.stringify(next));
    records.current = next; setOperations(next);
  }
  async function execute(alvo) {
    if (lock.current || alvo.retryAt > Date.now()) return;
    const resuming = records.current.some((a) => endpoint(a) === endpoint(alvo));
    lock.current = true; setBusy(true); setMessage('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const previous = records.current.filter((a) => endpoint(a) !== endpoint(alvo));
      save([...previous, { ...alvo, error: '' }]);
      setEpoch((n) => n + 1);
      if (individual(alvo)) {
        if (alvo.modo === 'rascunho') await avancosApi(request).removeDraft(alvo.id, controller.signal);
        else await exclusaoRegistrosApi(request).remove(alvo, controller.signal);
      } else await (alvo.tipo === 'obra' ? obrasApi(request).remove(alvo.id) : marcosApi(request).remove(alvo.id));
      save(records.current.filter((a) => endpoint(a) !== endpoint(alvo)));
      setMessage('Exclusão concluída. O servidor confirmou a remoção de todos os dependentes.');
      setEpoch((n) => n + 1);
      const obra = `/obras/${encodeURIComponent(alvo.obraId)}`;
      const destination = alvo.tipo === 'obra' ? '/obras' : alvo.tipo === 'ocorrencia' ? `${obra}/ocorrencias`
        : alvo.tipo === 'avanco' ? alvo.modo === 'rascunho' ? `${obra}/marcos/${encodeURIComponent(alvo.marcoId)}/avancos` : `${obra}/publicacoes`
          : `${obra}/marcos`;
      messageDestination.current = destination;
      navigate(destination, { replace: true });
    } catch (error) {
      const pending = error.status === 503 || error.status === 0 || error.name === 'AbortError';
      const explanation = error.status === 404
        ? 'Alvo não encontrado. Isso não comprova que a limpeza terminou; a exclusão continua sem confirmação.'
        : `${pending ? 'Exclusão pendente de confirmação ou limpeza externa.' : 'Exclusão não concluída.'} ${error.name === 'AbortError' ? 'O servidor demorou para responder. Retome para verificar o resultado.' : error.message || 'Não foi possível salvar a pendência para retomada.'}`;
      if (individual(alvo) && !resuming && [400, 409, 422].includes(error.status)) {
        // Rejeição explícita: exigir nova prévia e confirmação, sem repetir
        // automaticamente um comando cujo contexto/impacto foi recusado.
        // Uma retomada já pendente deve manter seu diário até receber 204.
        try { save(records.current.filter((a) => endpoint(a) !== endpoint(alvo))); }
        catch { setMessage(`${explanation} Não foi possível atualizar o registro local da operação.`); return; }
        setEpoch((n) => n + 1);
        setMessage(`${explanation} Consulte o registro e revise o impacto antes de tentar novamente.`);
        return;
      }
      if (!records.current.some((a) => endpoint(a) === endpoint(alvo))) setMessage(explanation);
      const next = records.current.map((a) => endpoint(a) === endpoint(alvo) ? { ...a, error: explanation,
        pendencia: typeof error.data?.pendencia === 'string' ? error.data.pendencia : a.pendencia,
        retryAt: retryDeadline(error.retryAfter) || a.retryAt || 0 } : a);
      try { save(next); } catch { setMessage(explanation); }
    } finally { clearTimeout(timer); lock.current = false; setBusy(false); }
  }
  const blocked = operations.some((a) => pathname === `/obras/${encodeURIComponent(a.obraId)}` || pathname.startsWith(`/obras/${encodeURIComponent(a.obraId)}/`));
  return <Context.Provider value={{ execute, operations }}>
    {message && <p role="status">{message}</p>}
    {operations.length > 0 && <section className="feature-card exclusoes-pendentes" aria-label="Exclusões sem confirmação"><h2>Exclusões sem confirmação</h2><p>Somente uma resposta 204 confirma a conclusão. Um alvo ausente na consulta não comprova o fim da limpeza.</p>{operations.map((a) => <article key={endpoint(a)}><h3>{labels[a.tipo]}: {a.nome}</h3><p className="record-reference">Referência: {a.id}</p><p role="alert">{a.error || 'Exclusão pendente de confirmação.'}</p><RetomarExclusao alvo={a} busy={busy} execute={execute} /></article>)}</section>}
    {!blocked && <div key={epoch}>{children}</div>}
  </Context.Provider>;
}

export function useExclusoes() { return useContext(Context); }

export function ExcluirRegistro({ tipo, id, obraId, marcoId, estado }) {
  const { request } = useAuth();
  const { execute } = useExclusoes();
  const [alvo, setAlvo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  useEffect(() => {
    setAlvo(null); setError(''); setBusy(false);
    return () => { pending.current?.abort(); pending.current = null; };
  }, [tipo, id, obraId, marcoId, estado]);
  async function prepare() {
    if (pending.current) return;
    const controller = new AbortController(); pending.current = controller;
    const timer = setTimeout(() => controller.abort(), 15000);
    setBusy(true); setError('');
    try {
      const result = await exclusaoRegistrosApi(request).preview({ tipo, id, obraId, marcoId,
        modo: tipo === 'avanco' && estado === 'rascunho' ? 'rascunho' : 'registro' }, controller.signal);
      if (pending.current === controller && !controller.signal.aborted) setAlvo(result);
    } catch (cause) {
      if (pending.current === controller) setError(cause.name === 'AbortError'
        ? 'A consulta do impacto demorou demais. Tente novamente.' : cause.message);
    } finally {
      clearTimeout(timer);
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }
  const label = tipo === 'avanco' ? 'avanço' : 'ocorrência';
  return <section className="exclusao-registro" aria-label={`Excluir ${label}`}>
    <Button variant="danger" loading={busy} onClick={() => void prepare()}>Excluir {label}</Button>
    {error && <p role="alert" className="form-error">{error}</p>}
    {alvo && <ConfirmDialog title={`Excluir ${label} definitivamente?`} confirmLabel="Excluir definitivamente"
      onCancel={() => setAlvo(null)} onConfirm={() => { const selected = alvo; setAlvo(null); void execute(selected); }}>
      <ImpactoExclusao alvo={alvo} />
    </ConfirmDialog>}
  </section>;
}

export function ExcluirAlvo({ tipo, id, obraId }) {
  const { request } = useAuth();
  const { execute } = useExclusoes();
  const [alvo, setAlvo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  async function prepare() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const detail = await (tipo === 'obra' ? obrasApi(request).detail(id) : marcosApi(request).detail(obraId, id));
      if (detail?.id !== id || typeof detail.nome !== 'string' || !detail.nome.trim()) throw new Error('Não foi possível identificar o alvo. Consulte novamente.');
      setAlvo({ tipo, id, obraId, nome: detail.nome });
    } catch (cause) { setError(cause.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <><Button variant="danger" loading={busy} onClick={() => void prepare()}>Excluir {tipo}</Button>{error && <p role="alert" className="form-error">{error}</p>}
    {alvo && <ConfirmDialog title={`Excluir ${tipo} definitivamente?`} confirmLabel="Excluir definitivamente" onCancel={() => setAlvo(null)} onConfirm={() => { const selected = alvo; setAlvo(null); void execute(selected); }}><ImpactoExclusao alvo={alvo} /></ConfirmDialog>}
  </>;
}
