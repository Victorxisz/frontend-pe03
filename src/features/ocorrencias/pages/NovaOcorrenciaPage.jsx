import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMarcos } from '../../marcos/useMarcos';
import { Button, Field } from '../../../shared/ui/UI';
import MediaPicker from '../../../shared/ui/MediaPicker';
import { ocorrenciasApi } from '../api';
import '../ocorrencias.css';

export default function NovaOcorrenciaPage() {
  const { obraId } = useParams(); const { search } = useLocation(); const navigate = useNavigate(); const { request } = useAuth();
  const base = `/obras/${encodeURIComponent(obraId)}/ocorrencias`;
  const marcos = useMarcos(obraId);
  const [workers, setWorkers] = useState({}); const [workersAttempt, setWorkersAttempt] = useState(0);
  const [dados, setDados] = useState({ titulo: '', descricao: '', estado: 'aberta', marco_id: '', responsavel_id: '' });
  const [files, setFiles] = useState([]); const [error, setError] = useState(''); const [uncertain, setUncertain] = useState(false); const [saving, setSaving] = useState(false);
  const lock = useRef(false); const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); setWorkers({});
    ocorrenciasApi(request).workers(obraId, controller.signal).then(data => { if (!controller.signal.aborted) setWorkers({ data }); }).catch(cause => { if (!controller.signal.aborted) setWorkers({ error: cause }); });
    return () => controller.abort();
  }, [request, obraId, workersAttempt]);
  const change = (key, value) => { setDados(previous => ({ ...previous, [key]: value })); setError(''); };
  async function submit(event) {
    event.preventDefault();
    if (lock.current || uncertain) return;
    if (!dados.titulo.trim() || !dados.descricao.trim() || !['aberta', 'sem solução'].includes(dados.estado)) { setError('Informe título, descrição e estado inicial.'); return; }
    if (files.length > 5) { setError('Selecione no máximo cinco arquivos.'); return; }
    if (dados.marco_id && !marcos.data?.some(item => item.id === dados.marco_id)) { setError('Selecione um marco disponível nesta obra.'); return; }
    if (dados.responsavel_id && !workers.data?.some(item => item.id === dados.responsavel_id)) { setError('Selecione um trabalhador vinculado a esta obra.'); return; }
    lock.current = true; setSaving(true); setError('');
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const item = await ocorrenciasApi(request).create(obraId, dados, files, controller.signal);
      if (active.current) navigate(`${base}/${encodeURIComponent(item.id)}${search}`, { replace: true, state: { ocorrenciaCriada: item.id } });
    } catch (cause) {
      if (!active.current) return;
      const unknown = cause.name === 'AbortError' || !cause.status || cause.status >= 500;
      setUncertain(unknown);
      setError(unknown ? 'Não foi possível confirmar o cadastro. Consulte a lista antes de tentar novamente: a ocorrência pode ter sido salva.' : cause.message || 'Não foi possível registrar a ocorrência.');
    } finally { clearTimeout(timeout); lock.current = false; if (active.current) setSaving(false); }
  }
  return <section className="feature-page"><h2>Registrar ocorrência</h2><p>Registre um problema da obra. Marco, responsável e evidências são opcionais.</p>
    <form className="feature-card ocorrencia-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        <Field label="Título"><input required value={dados.titulo} onChange={e => change('titulo', e.target.value)} disabled={saving || uncertain} /></Field>
        <Field label="Estado inicial"><select value={dados.estado} onChange={e => change('estado', e.target.value)} disabled={saving || uncertain}><option value="aberta">Aberta</option><option value="sem solução">Sem solução</option></select></Field>
        <Field label="Descrição" className="form-full"><textarea required rows="4" value={dados.descricao} onChange={e => change('descricao', e.target.value)} disabled={saving || uncertain} /></Field>
        <Field label="Marco (opcional)"><select value={dados.marco_id} onChange={e => change('marco_id', e.target.value)} disabled={saving || uncertain || !marcos.data}><option value="">Sem marco</option>{marcos.data?.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></Field>
        <Field label="Responsável (opcional)"><select value={dados.responsavel_id} onChange={e => change('responsavel_id', e.target.value)} disabled={saving || uncertain || !workers.data}><option value="">Sem responsável</option>{workers.data?.map(w => <option key={w.id} value={w.id}>{w.nome}</option>)}</select></Field>
        <div className="form-full"><MediaPicker required={false} files={files} onChange={setFiles} disabled={saving || uncertain} /></div>
      </div>
      {marcos.loading && <p role="status">Carregando marcos…</p>}{marcos.error && <p role="alert">Não foi possível carregar marcos. É possível continuar sem marco. <Button variant="secondary" onClick={marcos.retry}>Tentar novamente</Button></p>}
      {!workers.data && !workers.error && <p role="status">Carregando trabalhadores…</p>}{workers.error && <p role="alert">Não foi possível carregar trabalhadores. É possível continuar sem responsável. <Button variant="secondary" onClick={() => setWorkersAttempt(n => n + 1)}>Tentar novamente</Button></p>}
      {workers.data?.length === 0 && <p>Nenhum trabalhador vinculado. Você pode continuar sem responsável. O cadastro de trabalhador está em preparação; <Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/trabalhadores/novo${search}`}>abrir essa área</Link>.</p>}
      <p className="form-hint">A data de registro e a autoria serão informadas pelo servidor.</p>
      {error && <div className="form-error" role="alert"><p>{error}</p>{uncertain && <Link className="button button-secondary" to={`${base}${search}`}>Consultar lista de ocorrências</Link>}</div>}
      <div className="page-actions action-toolbar"><Button type="submit" loading={saving} disabled={uncertain}>Registrar ocorrência</Button><Link className="button button-secondary" aria-disabled={saving || undefined} onClick={e => saving && e.preventDefault()} to={`${base}${search}`}>Cancelar</Link></div>
    </form>
  </section>;
}
