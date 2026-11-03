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
  const base = `/obras/${encodeURIComponent(obraId)}/trabalhadores`;
  return <section className="feature-page">
    <header className="trabalhadores-heading"><div><h2>Detalhe do trabalhador</h2><p>Dados de contato e vínculos do cadastro da construtora.</p></div><Link className="button button-secondary" to={`${base}${search}`}>Voltar à equipe</Link></header>
    {!item && !consulta.error && <p role="status">Carregando cadastro…</p>}
    {consulta.error && <div className="feature-card"><h3>{consulta.error.status === 404 ? 'Trabalhador não encontrado' : 'Não foi possível consultar o cadastro'}</h3><p role="alert" className="form-error">{consulta.error.message}</p><Button onClick={consulta.retry}>Consultar novamente</Button></div>}
    {item && <article className="feature-card">
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
      <p className="form-hint">Cadastro de equipe, sem acesso próprio ao sistema.</p>
    </article>}
  </section>;
}
