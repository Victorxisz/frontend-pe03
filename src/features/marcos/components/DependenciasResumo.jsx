import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/UI';
import { useDependencias } from '../useDependencias';
import DependenciaRelacao from './DependenciaRelacao';

export default function DependenciasResumo({ marcoId, to }) {
  const { data, loading, error, retry } = useDependencias(marcoId);
  return <section className="feature-card dependencias-resumo" aria-busy={loading}><div className="cadastro-heading"><h3>Pré-requisitos deste marco</h3><Link className="button button-secondary" to={to}>Gerenciar dependências</Link></div>
    {loading && <p role="status">Carregando dependências…</p>}
    {error && <div role="alert"><p>{error.message}</p><Button variant="secondary" onClick={retry}>Consultar dependências novamente</Button></div>}
    {data?.length === 0 && <p className="form-hint">Este marco ainda não tem dependências definidas.</p>}
    {data?.map((item) => <DependenciaRelacao key={item.id} origem={item.marco_nome} destino={item.depende_de_nome} />)}
  </section>;
}
