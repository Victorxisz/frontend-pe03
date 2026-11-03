import { useRef, useState } from 'react';
import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import useConsulta from '../../publicacoes/useConsulta';
import { Button } from '../../../shared/ui/UI';
import { formatarDataHora } from '../../../shared/lib/datas';
import { trabalhadoresApi } from '../api';
import { formatarTelefone } from '../cadastro';
import '../trabalhadores.css';

export default function TrabalhadorPage() {
  const { obraId, trabalhadorId } = useParams(); const { search, state } = useLocation(); const { request } = useAuth();
  const { obra } = useOutletContext();
  const consulta = useConsulta(signal => trabalhadoresApi(request).detail(trabalhadorId, signal), [request, trabalhadorId, obraId]);
  const item = consulta.data;
  const [showDelete, setShowDelete] = useState(false); const [deleting, setDeleting] = useState(false); const [deleteError, setDeleteError] = useState(''); const [result, setResult] = useState(null); const [refreshFailed, setRefreshFailed] = useState(false); const [uncertain, setUncertain] = useState(false); const lock = useRef(false);
  async function refreshLists(ids) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
    try { const result = await trabalhadoresApi(request).refreshAffected(ids, controller.signal, { removidas: ids, trabalhadorId }); setRefreshFailed(!result.ok || result.pendentes.length > 0); }
    finally { clearTimeout(timer); }
  }
  async function excluir() {
    if (lock.current || uncertain) return;
    lock.current = true; setDeleting(true); setDeleteError(''); let sent = false;
    const c = new AbortController(); const timer = setTimeout(() => c.abort(), 20000);
    try {
      const atual = await trabalhadoresApi(request).detail(trabalhadorId, c.signal);
      const iguais = atual.obras.length === item.obras.length && atual.obras.every(id => item.obras.includes(id));
      if (!iguais || ['nome', 'cargo', 'email', 'telefone'].some(campo => atual[campo] !== item[campo])) { setShowDelete(false); setDeleteError('O cadastro mudou. Revise os dados atualizados antes de excluir.'); consulta.retry(); return; }
      sent = true; const resposta = await trabalhadoresApi(request).remove(trabalhadorId, c.signal);
      setShowDelete(false); setResult({ ...resposta, obras: atual.obras });
      await refreshLists(atual.obras);
    } catch (cause) {
      const unknown = sent && (cause.name === 'AbortError' || !cause.status || cause.status >= 500);
      if (unknown || cause.status === 409) { setUncertain(true); setShowDelete(false); }
      setDeleteError(unknown ? 'Não foi possível confirmar a exclusão. Consulte o cadastro antes de tentar novamente.' : cause.message || 'Não foi possível excluir o trabalhador.');
    } finally { clearTimeout(timer); lock.current = false; setDeleting(false); }
  }
  function consultarAposFalha() { window.location.reload(); }

  const base = `/obras/${encodeURIComponent(obraId)}/trabalhadores`;
  return <section className="feature-page">
    <header className="trabalhadores-heading"><div><h2>Detalhe do trabalhador</h2><p>Dados de contato e vínculos do cadastro da construtora.</p></div><Link className="button button-secondary" to={`${base}${search}`}>Voltar à equipe</Link></header>
    {result && <div className="feature-card" role="status"><h3>Trabalhador excluído</h3><p>{result.mensagem}</p><p>Ocorrências sem responsável: {result.ocorrencias_sem_responsavel}.</p>{refreshFailed && <div><p>Não foi possível atualizar todas as equipes e ocorrências consultadas.</p><Button onClick={() => refreshLists(result.obras)}>Repetir consultas</Button></div>}</div>}
    {!result && deleteError && !showDelete && <div className="form-error" role="alert"><p>{deleteError}</p>{uncertain && <Button onClick={consultarAposFalha}>Consultar cadastro</Button>}</div>}
    {!result && !item && !consulta.error && <p role="status">Carregando cadastro…</p>}
    {!result && consulta.error && <div className="feature-card"><h3>{consulta.error.status === 404 ? 'Trabalhador não encontrado' : 'Não foi possível consultar o cadastro'}</h3><p role="alert" className="form-error">{consulta.error.message}</p><Button onClick={consulta.retry}>Consultar novamente</Button></div>}
    {!result && item && <article className="feature-card">
      {state?.trabalhadorCriado === item.id && <p role="status">Trabalhador cadastrado. Dados confirmados pelo servidor.</p>}
      {!item.obras.includes(obraId) && <p role="status">Este trabalhador não está vinculado à obra atual. O cadastro pertence à construtora.</p>}
      <h3>{item.nome}</h3>
      <dl className="trabalhador-dados">
        <div><dt>Cargo</dt><dd>{item.cargo || 'Não informado'}</dd></div>
        <div><dt>Status</dt><dd>{item.ativo === true ? 'Ativo' : item.ativo === false ? 'Inativo' : 'Não informado'}</dd></div>
        <div><dt>E-mail</dt><dd>{item.email || 'Não informado'}</dd></div>
        <div><dt>Telefone com DDD</dt><dd>{formatarTelefone(item.telefone)}</dd></div>
        <div><dt>Data de cadastro (Brasília)</dt><dd>{formatarDataHora(item.data_cadastro, 'America/Sao_Paulo')}</dd></div>
        <div><dt>Referência do cadastro</dt><dd>{item.id}</dd></div>
      </dl>
      <h3>Obras vinculadas</h3>
      {item.obras.length === 0 ? <p>Nenhuma obra vinculada.</p> : <ul className="trabalhador-vinculos">{item.obras.map(id => <li key={id}><Link to={`/obras/${encodeURIComponent(id)}/trabalhadores${search}`}>{id === obraId ? `${obra.nome} (obra atual)` : `Consultar equipe da obra ${id}`}</Link></li>)}</ul>}
      {state?.trabalhadorAtualizado === item.id && <p role="status">Cadastro atualizado e consultas refeitas.</p>}
      <div className="page-actions"><Link className="button button-primary" to={`${base}/${encodeURIComponent(item.id)}/editar${search}`}>Editar cadastro e vínculos</Link><Button variant="danger" disabled={uncertain} onClick={() => { setDeleteError(''); setShowDelete(true); }}>Excluir trabalhador</Button></div>
      <p className="form-hint">Cadastro de equipe, sem acesso próprio ao sistema.</p>
    </article>}
    {showDelete && item && <ConfirmDialog title="Excluir trabalhador" confirmLabel="Excluir trabalhador" busy={deleting} error={deleteError} onConfirm={excluir} onCancel={() => { setShowDelete(false); setDeleteError(''); }}><p>Excluir {item.nome}, cargo {item.cargo || 'não informado'}, remove seu cadastro e os vínculos com {item.obras.length} {item.obras.length === 1 ? 'obra' : 'obras'}.</p><p>As ocorrências são preservadas; a atribuição atual será limpa e o responsável anterior, autoria e aceitações serão mantidos.</p></ConfirmDialog>}
  </section>;
}
