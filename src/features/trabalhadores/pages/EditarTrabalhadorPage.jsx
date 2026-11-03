import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { obrasApi } from '../../obras/api';
import { Button } from '../../../shared/ui/UI';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import TrabalhadorFields from '../components/TrabalhadorFields';
import VinculosObrasFields from '../components/VinculosObrasFields';
import { validarTrabalhador } from '../cadastro';
import { trabalhadoresApi } from '../api';
import '../trabalhadores.css';
const campos = ['nome', 'email', 'telefone', 'cargo'];
const iguais = (a, b) => a.length === b.length && a.every(id => b.includes(id));
const deItem = item => ({ ...Object.fromEntries(campos.map(c => [c, item[c] || ''])), obras: [...item.obras] });
export default function EditarTrabalhadorPage() {
  const { obraId, trabalhadorId } = useParams();
  return <Editor key={`${obraId}:${trabalhadorId}`} obraId={obraId} trabalhadorId={trabalhadorId} />;
}
function Editor({ obraId, trabalhadorId }) {
  const { search } = useLocation(); const { request } = useAuth(); const navigate = useNavigate();
  const basePath = `/obras/${encodeURIComponent(obraId)}/trabalhadores/${encodeURIComponent(trabalhadorId)}`;
  const [base, setBase] = useState(null); const [draft, setDraft] = useState(null); const [obras, setObras] = useState(null); const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(''); const [erros, setErros] = useState({}); const [busy, setBusy] = useState(false); const [review, setReview] = useState(false); const [confirmed, setConfirmed] = useState(null); const [comparison, setComparison] = useState(null); const [needsReload, setNeedsReload] = useState(false);
  const lock = useRef(false); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; const c = new AbortController(); setBase(null); setDraft(null); setObras(null); setError('');
    Promise.all([trabalhadoresApi(request).detail(trabalhadorId, c.signal), obrasApi(request).list(c.signal)]).then(([item, result]) => {
      if (!Array.isArray(result?.obras) || !result.obras.every(o => typeof o.id === 'string' && typeof o.nome === 'string')) throw new Error('Não foi possível interpretar as obras disponíveis.');
      if (!c.signal.aborted) { setBase(item); setDraft(deItem(item)); setObras(result.obras); }
    }).catch(cause => { if (!c.signal.aborted) setError(cause.message || 'Não foi possível carregar o cadastro.'); });
    return () => { mounted.current = false; c.abort(); };
  }, [request, trabalhadorId, attempt]);
  const removidas = base && draft ? base.obras.filter(id => !draft.obras.includes(id)) : [];
  function payload() {
    const dados = Object.fromEntries(campos.filter(c => draft[c].trim() !== (base[c] || '')).map(c => [c, draft[c].trim()]));
    if (!iguais(base.obras, draft.obras)) dados.obras = draft.obras;
    return dados;
  }
  function validarEdicao() { const alterados = payload(); return Object.fromEntries(Object.entries(validarTrabalhador(draft)).filter(([campo]) => Object.hasOwn(alterados, campo))); }
  function handleChange(campo, value) { setDraft(d => ({ ...d, [campo]: value })); setError(''); setErros(e => ({ ...e, [campo]: undefined })); }
  async function reconsultar(confirmacao) {
    const c = new AbortController(); const timer = setTimeout(() => c.abort(), 20000);
    try {
      const item = await trabalhadoresApi(request).detail(trabalhadorId, c.signal);
      const refreshed = await trabalhadoresApi(request).refreshAffected(confirmacao.obras, c.signal, { removidas: confirmacao.removidas, trabalhadorId });
      if (!refreshed.ok) throw new Error('Algumas equipes ou ocorrências não puderam ser atualizadas.');
      if (refreshed.pendentes.length) throw new Error(`Ocorrências ainda apontam para este trabalhador nas obras: ${refreshed.pendentes.join(', ')}. Verifique se o backend atualizado foi implantado.`);
      if (mounted.current) navigate(`${basePath}${search}`, { replace: true, state: { trabalhadorAtualizado: item.id } });
    } catch (cause) { if (mounted.current) setError(`Atualização confirmada, mas a releitura falhou. ${cause.message || 'Consulte novamente.'}`); }
    finally { clearTimeout(timer); }
  }
  async function salvar() {
    if (lock.current || confirmed || needsReload) return;
    const validation = validarEdicao(); setErros(validation);
    if (Object.keys(validation).length) { setReview(false); setError('Revise os campos indicados.'); return; }
    const dados = payload(); if (!Object.keys(dados).length) { setReview(false); setError('Nenhuma alteração para salvar.'); return; }
    lock.current = true; setBusy(true); setError(''); let sent = false; const c = new AbortController(); const timer = setTimeout(() => c.abort(), 20000);
    try {
      const atual = await trabalhadoresApi(request).detail(trabalhadorId, c.signal);
      if (campos.some(campo => (atual[campo] || '') !== (base[campo] || '')) || !iguais(atual.obras, base.obras)) { setComparison(atual); setNeedsReload(true); setReview(false); setError('O cadastro mudou desde a abertura. Compare os dados antes de continuar.'); return; }
      sent = true; await trabalhadoresApi(request).update(trabalhadorId, dados, c.signal);
      const info = { obras: [...new Set([...base.obras, ...draft.obras])], removidas: [...removidas] }; setConfirmed(info); setReview(false); await reconsultar(info);
    } catch (cause) {
      if (!mounted.current) return;
      const uncertain = sent && (cause.name === 'AbortError' || !cause.status || cause.status >= 500);
      if (uncertain || cause.status === 409) setNeedsReload(true);
      const ausentes = Array.isArray(cause.data?.obras) ? ` Obras não encontradas: ${cause.data.obras.join(', ')}.` : '';
      setError(uncertain ? 'Não foi possível confirmar a atualização. Consulte o cadastro antes de repetir.' : (cause.message || 'Não foi possível atualizar o cadastro.') + ausentes);
      setReview(false);
    } finally { clearTimeout(timer); lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function comparar() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const atual = await trabalhadoresApi(request).detail(trabalhadorId); if (mounted.current) setComparison(atual); }
    catch (cause) { if (mounted.current) setError(cause.message || 'Não foi possível consultar o cadastro.'); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  function adotar() {
    const alteracoes = payload(); const proximo = deItem(comparison);
    for (const campo of Object.keys(alteracoes)) proximo[campo] = alteracoes[campo];
    setBase(comparison); setDraft(proximo); setComparison(null); setNeedsReload(false); setError('');
  }
  function revisar(e) { e.preventDefault(); if (lock.current || confirmed || needsReload) return; const validation = validarEdicao(); setErros(validation); if (Object.keys(validation).length) { setError('Revise os campos indicados.'); return; } if (removidas.length) setReview(true); else void salvar(); }
  return <section className="feature-page"><h2>Editar trabalhador</h2><p>Atualize os dados ou substitua os vínculos do cadastro.</p><p>A API ainda não aceita uma versão do cadastro enviada pelo formulário; revise os vínculos antes de salvar.</p>
    {!base && !error && <p role="status">Carregando cadastro e obras…</p>}
    {error && <div role="alert" className="form-error"><p>{error}</p>{!base && <Button onClick={() => setAttempt(n => n + 1)}>Consultar novamente</Button>}{needsReload && !comparison && <Button loading={busy} onClick={comparar}>Consultar cadastro atual</Button>}{confirmed && <Button loading={busy} onClick={() => reconsultar(confirmed)}>Repetir consultas</Button>}</div>}
    {comparison && <div className="feature-card" aria-label="Comparação do cadastro"><h3>Cadastro consultado agora</h3>{[...campos, 'obras'].map(c => <div key={c}><strong>{c}</strong><p>Anterior: {Array.isArray(base[c]) ? base[c].join(', ') || 'Nenhuma' : base[c] || 'Não informado'}</p><p>Atual: {Array.isArray(comparison[c]) ? comparison[c].join(', ') || 'Nenhuma' : comparison[c] || 'Não informado'}</p><p>Sua intenção: {Array.isArray(draft[c]) ? draft[c].join(', ') || 'Nenhuma' : draft[c] || 'Não informado'}</p></div>)}<Button onClick={adotar}>Revisar com dados atuais</Button></div>}
    {draft && obras && <form className="feature-card trabalhador-form" onSubmit={revisar} noValidate>
      <TrabalhadorFields dados={draft} onChange={handleChange} erros={erros} disabled={busy || Boolean(confirmed) || needsReload} />
      <VinculosObrasFields obras={obras} selecionadas={draft.obras} onChange={value => handleChange('obras', value)} disabled={busy || Boolean(confirmed) || needsReload} />
      <div className="page-actions"><Button type="submit" loading={busy} disabled={Boolean(confirmed) || needsReload}>Salvar alterações</Button><Link className="button button-secondary" to={`${basePath}${search}`} onClick={e => busy && e.preventDefault()}>Cancelar</Link></div>
    </form>}
    {review && <ConfirmDialog title="Revisar vínculos retirados" confirmLabel="Salvar vínculos" busy={busy} onConfirm={salvar} onCancel={() => setReview(false)}><p>As seguintes obras serão retiradas: {removidas.map(id => obras.find(o => o.id === id)?.nome || id).join(', ')}.</p><p>Ao salvar, as atribuições nas ocorrências dessas obras serão limpas, preservando o responsável anterior e o histórico. Isso exige a versão atualizada do backend de UC-20.</p></ConfirmDialog>}
  </section>;
}
