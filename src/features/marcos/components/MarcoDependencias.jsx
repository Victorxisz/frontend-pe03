import { GitBranch } from 'lucide-react';
import { Button } from '../../../shared/ui/UI';
import { useDependencias } from '../useDependencias';

export default function MarcoDependencias({ marcoId }) {
  const { data, loading, error, retry } = useDependencias(marcoId);
  return <div className="marco-card-dependencies" aria-busy={loading}>
    <GitBranch size={18} aria-hidden="true" />
    <div><span className="marco-dependencies-label">Depende de:</span>
      {loading && <p className="form-hint">Carregando dependências…</p>}
      {error && <div role="alert"><p className="field-error">{error.message}</p><Button variant="secondary" onClick={retry}>Consultar novamente</Button></div>}
      {data?.length === 0 && <p>Sem dependências</p>}
      {data?.length > 0 && <ul>{data.map((item) => <li key={item.id}>{item.depende_de_nome}</li>)}</ul>}
    </div>
  </div>;
}
