import { Button, StatusBadge } from '../../../shared/ui/UI';
export function MarcoEstado({ estado }) {
  const styles = { 'a iniciar': 'futuro', 'em andamento': 'andamento', 'concluído': 'concluido' };
  const labels = { 'a iniciar': 'A iniciar', 'em andamento': 'Em andamento', 'concluído': 'Concluído' };
  return <StatusBadge status={styles[estado] || 'futuro'}>{labels[estado] || estado || 'Estado não informado'}</StatusBadge>;
}
export function MarcoErro({ error, retry }) {
  return <section className="feature-card marco-error" role="alert"><h3>{error.status === 404 ? 'Obra ou marco não encontrado' : error.status === 400 ? 'Referência inválida' : 'Não foi possível consultar os marcos'}</h3><p>{error.message}</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></section>;
}
