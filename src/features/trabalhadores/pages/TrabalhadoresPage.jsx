import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import useConsulta from '../../publicacoes/useConsulta';
import { Button, EmptyState, Field } from '../../../shared/ui/UI';
import { trabalhadoresApi } from '../api';
import { cadastroPendente, chaveCadastro, formatarTelefone } from '../cadastro';
import '../trabalhadores.css';

const normal = valor => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export default function TrabalhadoresPage() {
  const { obraId } = useParams(); const { search } = useLocation(); const { request } = useAuth();
  const consulta = useConsulta(signal => trabalhadoresApi(request).list(obraId, signal), [request, obraId]);
  const [termo, setTermo] = useState(''); const [pendente] = useState(() => cadastroPendente(obraId));
  const base = `/obras/${encodeURIComponent(obraId)}/trabalhadores`;
  useEffect(() => { if (consulta.data) { try { sessionStorage.removeItem(chaveCadastro(obraId)); } catch { /* A consulta continua disponível. */ } } }, [consulta.data, obraId]);
  const resultados = consulta.data?.filter(item => normal(`${item.nome} ${item.cargo || ''}`).includes(normal(termo.trim())));
  return <section className="feature-page">
    <header className="trabalhadores-heading"><div><h2>Trabalhadores da obra</h2><p>Consulte os contatos e os cargos da equipe. O cadastro não concede acesso ao sistema.</p></div>
      {consulta.data && <Link className="button button-primary" to={`${base}/novo${search}`}><Plus size={16} aria-hidden="true" />Cadastrar trabalhador</Link>}</header>
    {!consulta.data && !consulta.error && <p role="status">Carregando trabalhadores…</p>}
    {consulta.error && <div className="feature-card"><h3>{consulta.error.status === 404 ? 'Obra não encontrada' : 'Não foi possível consultar a equipe'}</h3><p role="alert" className="form-error">{consulta.error.message}</p><Button onClick={consulta.retry}>Consultar novamente</Button></div>}
    {consulta.data && <>
      {pendente && <p role="status" className="form-error">Confira a equipe abaixo: o cadastro anterior pode ter sido salvo. Abra o detalhe antes de cadastrar a mesma pessoa novamente.</p>}
      {consulta.data.length === 0 ? <EmptyState title="Nenhum trabalhador nesta obra" description="Cadastre o primeiro trabalhador para organizar a equipe e atribuir responsáveis às ocorrências." /> : <>
        <div className="feature-card trabalhadores-filtros"><Field label="Buscar por nome ou cargo nesta obra"><input type="search" value={termo} onChange={e => setTermo(e.target.value)} /></Field></div>
        <p role="status" className="trabalhadores-results">{resultados.length} de {consulta.data.length} trabalhadores</p>
        {resultados.length === 0 ? <EmptyState title="Nenhum resultado para esta busca" description="Tente outro nome ou cargo."><Button variant="secondary" onClick={() => setTermo('')}>Limpar busca</Button></EmptyState> : <div className="trabalhadores-grid">{resultados.map(item => <article key={item.id} className="feature-card trabalhador-card">
          <header><div><h3><Link to={`${base}/${encodeURIComponent(item.id)}${search}`}>{item.nome}</Link></h3><p>{item.cargo || 'Cargo não informado'}</p></div><span className="trabalhador-status">{item.ativo === true ? 'Ativo' : item.ativo === false ? 'Inativo' : 'Status não informado'}</span></header>
          <div><p>{formatarTelefone(item.telefone)}</p><p>{item.email || 'E-mail não informado'}</p></div>
          <p>{item.obras.length} {item.obras.length === 1 ? 'obra vinculada' : 'obras vinculadas'}</p>
          <Link className="button button-secondary" to={`${base}/${encodeURIComponent(item.id)}${search}`} aria-label={`Consultar cadastro de ${item.nome}`}>Consultar cadastro</Link>
        </article>)}</div>}
      </>}
    </>}
  </section>;
}
