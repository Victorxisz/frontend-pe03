import { createContext, useContext, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import { obrasApi } from '../../features/obras/api';
import { marcosApi } from '../../features/marcos/api';
import { Button } from './UI';
import ConfirmDialog from './ConfirmDialog';
import ImpactoExclusao from './ImpactoExclusao';

const Context = createContext(null);
const endpoint = (alvo) => `/${alvo.tipo === 'obra' ? 'obras' : 'marcos'}/${encodeURIComponent(alvo.id)}`;
function read(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter((a) => ['obra', 'marco'].includes(a.tipo) && ['id', 'obraId', 'nome'].every((k) => typeof a[k] === 'string' && a[k])) : [];
  } catch { return []; }
}

export function ExclusoesProvider({ children }) {
  const { user, request } = useAuth();
  const key = `pe03:exclusoes:${user.id}`;
  const [operations, setOperations] = useState(() => read(key));
  const records = useRef(operations);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [epoch, setEpoch] = useState(0);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  function save(next) {
    // Persistir antes de enviar: sem isso, uma recarga perderia a retomada.
    localStorage.setItem(key, JSON.stringify(next));
    records.current = next; setOperations(next);
  }
  async function execute(alvo) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const previous = records.current.filter((a) => endpoint(a) !== endpoint(alvo));
      save([...previous, { ...alvo, error: '' }]);
      setEpoch((n) => n + 1);
      await (alvo.tipo === 'obra' ? obrasApi(request).remove(alvo.id) : marcosApi(request).remove(alvo.id));
      save(records.current.filter((a) => endpoint(a) !== endpoint(alvo)));
      setMessage('Exclusão concluída. O servidor confirmou a remoção de todos os dependentes.');
      setEpoch((n) => n + 1);
      navigate(alvo.tipo === 'obra' ? '/obras' : `/obras/${encodeURIComponent(alvo.obraId)}/marcos`, { replace: true });
    } catch (error) {
      const pending = error.status === 503 || error.status === 0;
      const explanation = error.status === 404
        ? 'Alvo não encontrado. Isso não comprova que a limpeza terminou; a exclusão continua sem confirmação.'
        : `${pending ? 'Exclusão pendente de confirmação ou limpeza externa.' : 'Exclusão não concluída.'} ${error.message || 'Não foi possível salvar a pendência para retomada.'}`;
      if (!records.current.some((a) => endpoint(a) === endpoint(alvo))) setMessage(explanation);
      const next = records.current.map((a) => endpoint(a) === endpoint(alvo) ? { ...a, error: explanation } : a);
      try { save(next); } catch { setMessage(explanation); }
    } finally { lock.current = false; setBusy(false); }
  }
  const blocked = operations.some((a) => pathname === `/obras/${encodeURIComponent(a.obraId)}` || pathname.startsWith(`/obras/${encodeURIComponent(a.obraId)}/`));
  return <Context.Provider value={{ execute, operations }}>
    {message && <p role="status">{message}</p>}
    {operations.length > 0 && <section className="feature-card" aria-label="Exclusões sem confirmação"><h2>Exclusões sem confirmação</h2><p>Somente uma resposta 204 confirma a conclusão. Um alvo ausente na consulta não comprova o fim da limpeza.</p>{operations.map((a) => <article key={endpoint(a)}><h3>{a.tipo === 'obra' ? 'Obra' : 'Marco'}: {a.nome}</h3><p className="record-reference">Referência: {a.id}</p><p role="alert">{a.error || 'Exclusão pendente de confirmação.'}</p><Button variant="danger" loading={busy} onClick={() => void execute(a)}>Retomar exclusão</Button></article>)}</section>}
    {!blocked && <div key={epoch}>{children}</div>}
  </Context.Provider>;
}

export function useExclusoes() { return useContext(Context); }

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
