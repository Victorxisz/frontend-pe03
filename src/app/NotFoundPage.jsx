import { Link } from 'react-router-dom';
import { EmptyState } from '../shared/ui/UI';
export default function NotFoundPage() {
  return <main className="page"><EmptyState title="Página não encontrada" description="Confira o endereço ou volte ao painel de obras."><Link className="button button-primary" to="/obras">Ir para obras</Link></EmptyState></main>;
}
