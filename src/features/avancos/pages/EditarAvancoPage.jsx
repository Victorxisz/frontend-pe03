import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../../shared/ui/UI';
import MediaPicker from '../../../shared/ui/MediaPicker';
import MediaViewer from '../../../shared/ui/MediaViewer';
import { formatarDia } from '../../../shared/lib/datas';
import { ApiError } from '../../../shared/api/http';
import { avancosApi } from '../api';
import { mesmoRascunho, prepararEdicaoRascunho } from '../rascunhos';
import AvancoFields from '../components/AvancoFields';

export default function EditarAvancoPage() {
  const { obraId, avancoId } = useParams();
  return <Editor key={`${obraId}:${avancoId}`} obraId={obraId} avancoId={avancoId} />;
}

function Editor({ obraId, avancoId }) {
  const { request } = useAuth();
  const { search } = useLocation();
  const [base, setBase] = useState(null);
  const [draft, setDraft] = useState({ data: '', descricao: '' });
  const [kept, setKept] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [errors, setErrors] = useState({});
  const [blocked, setBlocked] = useState(false);
  const [latest, setLatest] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const controller = useRef(null);
  const lock = useRef(false);
  const active = useRef(true);
  const summary = useRef(null);
  const baseUrl = `/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(avancoId)}`;
  const listUrl = base && `/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(base.marco_id)}/avancos${search}`;
  const loadContent = useCallback((id, signal) => avancosApi(request).mediaContent(id, signal), [request]);

  function adopt(item) {
    setBase(item); setDraft({ data: item.data, descricao: item.descricao });
    setKept(item.midias.map(m => m.id)); setFiles([]); setFileKey(n => n + 1);
    setLatest(null); setBlocked(false); setFailure(''); setErrors({});
  }
  useEffect(() => {
    active.current = true;
    const current = new AbortController(); controller.current = current;
    const timer = setTimeout(() => current.abort(), 15000);
    avancosApi(request).editorDetail(obraId, avancoId, current.signal)
      .then(item => { if (active.current && controller.current === current && !current.signal.aborted) adopt(item); })
      .catch(error => { if (active.current && controller.current === current) setFailure(error.name === 'AbortError' ? 'A consulta demorou demais. Tente novamente.' : error.message); })
      .finally(() => { clearTimeout(timer); if (active.current && controller.current === current) setLoading(false); });
    return () => { active.current = false; clearTimeout(timer); controller.current?.abort(); };
  }, [request, obraId, avancoId]);

  async function refreshConfirmed(signal) {
    const api = avancosApi(request);
    const item = await api.editorDetail(obraId, avancoId, signal);
    const list = await api.list(item.marco_id, signal);
    if (!Array.isArray(list) || !list.some(row => row.id === avancoId && row.data === item.data && row.descricao === item.descricao && row.estado === item.estado)) {
      throw new Error('A lista ainda não confirmou os dados consultados. Atualize as consultas.');
    }
    if (active.current && !signal.aborted) { adopt(item); setRefreshError(''); }
  }

  async function consult() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    const current = new AbortController(); controller.current = current;
    const timer = setTimeout(() => current.abort(), 15000);
    try {
      if (confirmed) await refreshConfirmed(current.signal);
      else {
        const item = await avancosApi(request).editorDetail(obraId, avancoId, current.signal);
        if (active.current && !current.signal.aborted) {
          if (base) { setLatest(item); setFailure(''); }
          else adopt(item);
        }
      }
    } catch (error) {
      if (active.current) (confirmed ? setRefreshError : setFailure)(error.name === 'AbortError' ? 'A consulta demorou demais. Tente novamente.' : error.message);
    } finally {
      clearTimeout(timer); lock.current = false;
      if (active.current) { setBusy(false); setLoading(false); }
    }
  }

  const prepared = base ? prepararEdicaoRascunho(base, draft, kept, files) : { changes: {}, errors: {}, dirty: false };
  const frozen = busy || blocked || confirmed;
  function change(name, value) { setDraft(previous => ({ ...previous, [name]: value })); setErrors({}); setFailure(''); }

  async function submit(event) {
    event.preventDefault();
    if (lock.current || frozen || !base || base.estado !== 'rascunho') return;
    setErrors(prepared.errors); setFailure('');
    if (Object.keys(prepared.errors).length || !prepared.dirty) {
      setFailure(Object.keys(prepared.errors).length ? 'Revise os campos indicados antes de salvar.' : 'Nenhuma alteração para salvar.');
      requestAnimationFrame(() => summary.current?.focus()); return;
    }
    lock.current = true; setBusy(true); setLatest(null);
    const current = new AbortController(); controller.current = current;
    const timer = setTimeout(() => current.abort(), 60000);
    let patchSent = false, saved = false;
    try {
      const api = avancosApi(request);
      const fresh = await api.editorDetail(obraId, avancoId, current.signal);
      if (fresh.estado !== 'rascunho' || !mesmoRascunho(base, fresh)) {
        if (active.current) setLatest(fresh);
        throw new ApiError('O avanço foi alterado ou publicado em outra sessão. Consulte e revise os dados atuais antes de editar.', 409);
      }
      patchSent = true;
      await api.editDraft(avancoId, prepared.changes, files, current.signal);
      saved = true;
      if (active.current) { setConfirmed(true); setFiles([]); setFileKey(n => n + 1); }
      await refreshConfirmed(current.signal);
    } catch (error) {
      if (!active.current) return;
      if (saved) setRefreshError('A edição foi confirmada, mas não foi possível atualizar o detalhe e a lista. Atualize as consultas.');
      else {
        const uncertain = patchSent && (error.name === 'AbortError' || !error.status || error.status >= 500);
        if (uncertain || [400, 404, 409].includes(error.status) || error.name === 'AbortError') setBlocked(true);
        setFailure(uncertain ? 'Não foi possível confirmar a edição. Consulte o estado atual antes de repetir o envio de arquivos.'
          : error.name === 'AbortError' ? 'A consulta demorou demais. Consulte novamente antes de salvar.' : error.message || 'Não foi possível atualizar o rascunho.');
        if ([413, 415, 422].includes(error.status)) {
          const fields = Array.isArray(error.fields) ? error.fields : Object.keys(error.fields || {});
          setErrors(Object.fromEntries(fields.filter(field => typeof field === 'string').map(field => [field.startsWith('midias') ? 'midias' : field, error.message])));
        }
      }
      requestAnimationFrame(() => summary.current?.focus());
    } finally { clearTimeout(timer); lock.current = false; if (active.current) setBusy(false); }
  }

  const published = base?.estado === 'publicado';
  return <section className="feature-page">
    <Link className="back-link button button-secondary" to={`${baseUrl}${search}`} aria-disabled={busy || undefined} onClick={event => busy && event.preventDefault()}>Voltar ao avanço</Link>
    <header className="section-heading"><span className="eyebrow">Rascunho</span><h2>Editar rascunho</h2><p>Revise a data, a descrição e as evidências antes de publicar.</p></header>
    {loading && <p role="status">Carregando rascunho e evidências…</p>}
    {failure && <div className="form-error" role="alert" ref={summary} tabIndex={-1}><p>{failure}</p></div>}
    {!loading && !base && <Button variant="secondary" loading={busy} onClick={consult}>Consultar novamente</Button>}
    {base && base.estado !== 'rascunho' && <section className="feature-card"><p>{published ? 'Este avanço já está publicado. Use a correção com motivo para preservar suas versões.' : 'Este avanço não está disponível para edição como rascunho.'}</p>
      {published && <div className="page-actions action-toolbar"><Link className="button button-primary" to={`${baseUrl}/corrigir${search}`}>Corrigir publicação</Link></div>}
    </section>}
    {confirmed && <p className="obra-save-success" role="status">Rascunho atualizado.</p>}
    {refreshError && <div className="form-error" role="alert"><p>{refreshError}</p><Button variant="secondary" loading={busy} onClick={consult}>Atualizar consultas</Button></div>}
    {base?.estado === 'rascunho' && <form className="feature-card avanco-form" onSubmit={submit} noValidate>
      <p className="demo-note">Marco: {base.marco.nome}. Salvar mantém este avanço como rascunho, fora da linha do tempo de publicações.</p>
      <div className="form-grid"><AvancoFields {...draft} onChange={change} disabled={frozen} errors={errors} /></div>
      <fieldset className="draft-media-fieldset" disabled={frozen}><legend>Evidências atuais</legend>
        <p className="form-hint">Desmarque as evidências que deseja retirar. A alteração só será aplicada ao salvar. Mantenha ao menos uma evidência ou adicione um novo arquivo.</p>
        <div className="avanco-media-grid">{base.midias.map(media => <div className="draft-media-item" key={media.id}>
          <label className="draft-media-choice"><input type="checkbox" checked={kept.includes(media.id)} onChange={event => { setKept(ids => event.target.checked ? [...ids, media.id] : ids.filter(id => id !== media.id)); setErrors({}); setFailure(''); }} />Manter {media.nome || 'evidência'}</label>
          <MediaViewer media={media} loadContent={loadContent} />
        </div>)}</div>
      </fieldset>
      <section aria-label="Novas evidências"><h3>Novas evidências</h3><MediaPicker key={fileKey} files={files} required={false} disabled={frozen} error={errors.midias}
        onChange={value => { setFiles(value); setErrors({}); setFailure(''); }} /></section>
      <div className="page-actions"><Button type="submit" loading={busy} disabled={blocked || confirmed || !prepared.dirty}>Salvar alterações</Button>
        <Link className="button button-secondary" to={`${baseUrl}${search}`} aria-disabled={busy || undefined} onClick={event => busy && event.preventDefault()}>{confirmed ? 'Ver rascunho' : 'Cancelar'}</Link>
        {listUrl && <Link className="button button-secondary" to={listUrl} aria-disabled={busy || undefined} onClick={event => busy && event.preventDefault()}>Voltar aos avanços</Link>}
      </div>
    </form>}
    {blocked && <section className="feature-card draft-review" aria-label="Revisão do estado atual"><h3>Revise antes de continuar</h3><p>Suas alterações locais foram preservadas. A consulta não reenvia arquivos nem altera o avanço.</p>
      <div className="page-actions"><Button variant="secondary" loading={busy} onClick={consult}>Consultar estado atual</Button></div>
      {latest && <><p>Estado consultado: {latest.estado} · Data: {formatarDia(latest.data)}</p><p className="draft-description">{latest.descricao}</p><p>{latest.midias.length} evidência(s) no servidor.</p>
        {latest.estado === 'rascunho' ? <><p className="form-hint">Usar os dados atuais descarta os textos, seleções e arquivos locais para começar uma nova revisão.</p><Button disabled={busy} onClick={() => adopt(latest)}>Usar dados atuais e continuar</Button></>
          : latest.estado === 'publicado' && <Link className="button button-primary" to={`${baseUrl}/corrigir${search}`}>Corrigir publicação</Link>}
      </>}
    </section>}
  </section>;
}
