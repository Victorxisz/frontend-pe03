import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../api';
import { historicoApi } from '../../historico/api';
import { Button, Field } from '../../../shared/ui/UI';
import { diaValido } from '../../../shared/lib/datas';
import ComparacaoVersoes, { Origem } from '../components/ComparacaoVersoes';
import '../publicacoes.css';
export default function CorrigirPage() {
  const { obraId, avancoId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  return <Editor key={`${obraId}:${avancoId}`} {...{ obraId, avancoId, search, request }} />;
}
function Editor({ obraId, avancoId, search, request }) {
  const [loaded, setLoaded] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  const [descricao, setDescricao] = useState(''), [data, setData] = useState(''), [motivo, setMotivo] = useState(''), [kept, setKept] = useState([]), [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false), [blocked, setBlocked] = useState(false), [confirmed, setConfirmed] = useState(false), [refreshError, setRefreshError] = useState(false);
  const lock = useRef(false), active = useRef(true), fileInput = useRef(null), operation = useRef(null);
  const api = publicacoesApi(request);
  async function read(signal) {
    const detail = await api.detail(obraId, avancoId, signal);
    const [chain, publications] = await Promise.all([api.versions(avancoId, signal), api.publications(avancoId, signal)]);
    if (detail.estado !== 'publicado' || !chain.versoes.length || !publications.length) throw new Error('Somente publicações podem ser corrigidas.');
    return { detail, chain, publication: publications[0] };
  }
  function install(value) {
    setLoaded(value); setDescricao(value.detail.descricao); setData(value.detail.data); setKept(value.detail.midias.map(m => m.id)); setFiles([]); setMotivo('');
    if (fileInput.current) fileInput.current.value = '';
  }
  useEffect(() => {
    active.current = true; const controller = new AbortController();
    read(controller.signal).then(value => { if (active.current && !controller.signal.aborted) install(value); }).catch(e => { if (!controller.signal.aborted) setError(e); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { active.current = false; controller.abort(); operation.current?.abort(); };
  }, [request, obraId, avancoId]);
  async function reload() {
    if (lock.current) return; lock.current = true; setLoading(true); setError(null);
    try { const value = await read(); if (active.current) { install(value); setBlocked(false); setConfirmed(false); } }
    catch(e) { if (active.current) setError(e); }
    finally { lock.current = false; if (active.current) setLoading(false); }
  }
  async function refresh() {
    setBusy(true); setRefreshError(false);
    try {
      const value = await read();
      await Promise.all([api.preview(obraId), historicoApi(request).list(obraId)]);
      if (active.current) install(value);
    } catch { if (active.current) setRefreshError(true); }
    finally { if (active.current) setBusy(false); }
  }
  const original = loaded?.detail;
  const changes = {};
  if (original && descricao.trim() !== original.descricao) changes.descricao = descricao.trim();
  if (original && data !== original.data) changes.data = data;
  if (original && (kept.length !== original.midias.length || original.midias.some(m => !kept.includes(m.id)))) changes.midias_manter = kept;
  const changed = Object.keys(changes).length > 0 || files.length > 0;
  const valid = changed && motivo.trim() && descricao.trim() && diaValido(data) && kept.length + files.length > 0;
  async function save(event) {
    event.preventDefault(); if (lock.current || !valid || blocked || confirmed) return;
    lock.current = true; setBusy(true); setError(null);
    const controller = new AbortController(); operation.current = controller;
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      await api.correct(avancoId, { ...changes, motivo: motivo.trim() }, files, controller.signal);
      clearTimeout(timeout);
      if (!active.current) return;
      setConfirmed(true); await refresh();
    } catch(e) {
      if (!active.current) return;
      setError(e.name === 'AbortError' ? new Error('Tempo de resposta excedido. Confira o estado real antes de reenviar.') : e);
      if (e.status !== 422) setBlocked(true);
    } finally { clearTimeout(timeout); lock.current = false; if (active.current) setBusy(false); }
  }
  const base = `/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(avancoId)}`;
  return <section><h2>Corrigir publicação</h2><p>Registre o motivo. O servidor preserva o conteúdo anterior e a autoria.</p>
    {loading && <p role="status">Carregando publicação e versões…</p>}
    {confirmed && <p role="status">Correção confirmada pelo servidor.</p>}
    {refreshError && <div role="alert"><p>A correção foi confirmada, mas a visualização não pôde ser atualizada.</p><Button disabled={busy} onClick={refresh}>Atualizar visualização</Button></div>}
    {error && <div role="alert"><p>{error.code === 'HISTORICO_INDISPONIVEL' ? 'Falha de integridade: histórico indisponível. ' : ''}{error.message}</p>{Array.isArray(error.fields) && <p>Campos: {error.fields.join(', ')}</p>}</div>}
    {(blocked || (!loaded && !loading)) && <><p>Consulte o estado real e revise novamente antes de outra correção. A nova consulta descarta o formulário.</p><Button disabled={busy || loading} onClick={reload}>Recarregar e revisar</Button></>}
    {loaded && !loading && <><p>Marco: {loaded.detail.marco.nome}</p><Origem origem={loaded.publication.origem_simulada} />
      <p>Autor original: {loaded.chain.versoes[0].autor_original}</p><p>Publicação original: {loaded.publication.instante} · Publicador: {loaded.publication.autor}</p>
      {!confirmed && <form className="feature-card correction-form" onSubmit={save}>
        <fieldset disabled={busy || blocked}><legend>Conteúdo atual</legend>
          <Field label="Descrição"><textarea required value={descricao} onChange={e => setDescricao(e.target.value)} /></Field>
          <Field label="Data do trabalho"><input type="date" required value={data} onChange={e => setData(e.target.value)} /></Field>
          <fieldset><legend>Mídias atuais que serão mantidas</legend>{original.midias.map(m => <label key={m.id} className="correction-media"><input type="checkbox" checked={kept.includes(m.id)} onChange={e => setKept(previous => e.target.checked ? [...previous, m.id] : previous.filter(id => id !== m.id))} />Manter {m.nome || m.id}</label>)}</fieldset>
          <p>Desmarcar retira a mídia do conteúdo atual. Arquivos de versões anteriores são retidos pelo servidor.</p>
          <Field label="Novos arquivos"><input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,video/mp4,application/pdf" onChange={e => setFiles([...e.target.files])} /></Field>
          {files.length > 0 && <p>Novos arquivos: {files.map(f => f.name).join(', ')}</p>}
          {!kept.length && !files.length && <p role="alert">Preserve ao menos uma mídia ou adicione um novo arquivo.</p>}
          <Field label="Motivo da correção"><textarea required value={motivo} onChange={e => setMotivo(e.target.value)} /></Field>
        </fieldset>
        {!changed && <p>Altere o conteúdo para registrar uma correção.</p>}
        <Button type="submit" loading={busy} disabled={!valid || blocked}>Salvar correção</Button>
      </form>}
      <h3>Histórico preservado</h3><ComparacaoVersoes versoes={loaded.chain.versoes} />
    </>}
    {!busy && <p><Link to={`${base}${search}`}>{confirmed ? 'Voltar ao detalhe' : 'Cancelar'}</Link> · <Link to={`${base}/versoes${search}`}>Consultar versões</Link></p>}
  </section>;
}
