import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Field } from '../../../shared/ui/UI';
import MediaPicker from '../../../shared/ui/MediaPicker';
import { avancosApi } from '../api';

const unwrap = (value) => value?.avanco || value?.data || value;
const mediaList = (record) => record.midias?.length ? record.midias : record.midias_metadados?.length ? record.midias_metadados : record.evidencias?.length ? record.evidencias : record.midias_ids || record.midia_ids || [];

export default function EditarAvancoPage() {
  const { avancoId } = useParams();
  const { request } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [media, setMedia] = useState([]);
  const [keep, setKeep] = useState([]);
  const [files, setFiles] = useState([]);
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    avancosApi(request).detail(avancoId, controller.signal).then(async (result) => {
      const item = unwrap(result);
      if (controller.signal.aborted) return;
      setRecord(item);
      setData(String(item.data || '').slice(0, 10));
      setDescricao(item.descricao || '');
      let current = mediaList(item);
      if (!current.length || current.some((entry) => typeof entry !== 'object')) {
        const resultMedia = await avancosApi(request).listMedia(avancoId, controller.signal);
        current = resultMedia?.midias || resultMedia?.data || resultMedia || [];
      }
      if (!controller.signal.aborted) {
        const normalized = current.map((entry) => typeof entry === 'string' ? { id: entry } : entry);
        setMedia(normalized);
        setKeep(normalized.map((entry) => String(entry.id || entry._id || entry.midia_id)));
      }
    }).catch((cause) => { if (!controller.signal.aborted) setError(cause.message || 'Não foi possível consultar o avanço.'); });
    return () => controller.abort();
  }, [avancoId, request, retry]);

  if (error && !record) return <section className="feature-page"><div className="feature-card" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => { setError(''); setRetry((value) => value + 1); }}>Consultar novamente</Button></div></section>;
  if (!record) return <p className="route-status" role="status">Consultando avanço…</p>;
  if (record.estado !== 'rascunho') return <section className="feature-page"><h2>Este avanço já foi publicado</h2><p>Use o fluxo de correção para alterar uma publicação.</p><Link className="button button-primary" to={`/obras/${encodeURIComponent(record.obra_id || '')}/avancos/${encodeURIComponent(avancoId)}/corrigir`}>Abrir correção</Link></section>;

  async function submit(event) {
    event.preventDefault(); setError(''); setNotice('');
    if (keep.length + files.length < 1) { setError('Mantenha ao menos uma evidência.'); return; }
    if (keep.length + files.length > 5) { setError('Mantenha ou adicione no máximo cinco evidências.'); return; }
    setBusy(true);
    try {
      await avancosApi(request).update(avancoId, { data, descricao, midiasManter: keep, midias: files });
      setNotice('Rascunho atualizado.');
      const latest = unwrap(await avancosApi(request).detail(avancoId));
      setRecord(latest);
      setFiles([]);
      setData(String(latest.data || data).slice(0, 10));
      setDescricao(latest.descricao || descricao);
      const currentResult = await avancosApi(request).listMedia(avancoId);
      const current = (currentResult?.midias || currentResult?.data || currentResult || []).map((entry) => typeof entry === 'string' ? { id: entry } : entry);
      setMedia(current); setKeep(current.map((entry) => String(entry.id || entry._id || entry.midia_id)));
    } catch (cause) {
      if (cause.status === 409) {
        try {
          const latest = unwrap(await avancosApi(request).detail(avancoId)); setRecord(latest);
          if (latest.estado !== 'rascunho') { navigate(`/obras/${encodeURIComponent(latest.obra_id || record.obra_id || '')}/avancos/${encodeURIComponent(avancoId)}/corrigir`, { replace: true }); return; }
        } catch { /* preserve the original conflict message */ }
      }
      setError(cause.status === 413 ? 'O lote de arquivos excede o limite permitido.' : cause.status === 422 ? cause.message : cause.status === 503 || cause.status === 0 ? 'Não foi possível confirmar a edição. Consulte o avanço antes de reenviar os arquivos.' : cause.message || 'Não foi possível atualizar o rascunho.');
    } finally { setBusy(false); }
  }

  const ids = (entry) => String(entry.id || entry._id || entry.midia_id);
  return <section className="feature-page">
    <Link className="back-link" to={`/obras/${encodeURIComponent(record.obra_id || '')}/avancos/${encodeURIComponent(avancoId)}`}>← Voltar ao avanço</Link>
    <header className="section-heading"><span className="eyebrow">Rascunho</span><h2>Editar avanço</h2><p>O rascunho permanece fora da prévia até ser publicado.</p></header>
    <form className="feature-card avanco-form" onSubmit={submit}>
      <div className="form-grid"><Field label="Data do trabalho"><input type="date" required value={data} onChange={(event) => setData(event.target.value)} /></Field><Field label="Descrição"><textarea required rows="4" value={descricao} onChange={(event) => setDescricao(event.target.value)} /></Field>
        <div className="form-full"><fieldset><legend>Evidências atuais</legend>{media.map((item) => <label key={ids(item)}><input type="checkbox" checked={keep.includes(ids(item))} onChange={(event) => setKeep((current) => event.target.checked ? [...current, ids(item)] : current.filter((id) => id !== ids(item)))} /> {item.nome || item.filename || `Mídia ${ids(item)}`}</label>)}</fieldset><p className="form-hint">Mantenha ao menos uma mídia entre as atuais e as novas.</p><MediaPicker files={files} onChange={setFiles} disabled={busy} /></div>
      </div>
      {notice && <p role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
      <div className="page-actions"><Button type="submit" loading={busy}>Salvar alterações</Button><Link className="button button-secondary" to={`/obras/${encodeURIComponent(record.obra_id || '')}/avancos/${encodeURIComponent(avancoId)}`}>Cancelar</Link></div>
    </form>
  </section>;
}
