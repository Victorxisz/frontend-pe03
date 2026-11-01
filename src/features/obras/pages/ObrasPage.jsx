import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { obrasApi } from '../api';
import { Button, EmptyState } from '../../../shared/ui/UI';

export default function ObrasPage() {
  const { request } = useAuth();
  const [state, setState] = useState({ loading: true, obras: [], error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, obras: [], error: '' });
    obrasApi(request).list(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ loading: false, obras: data.obras, error: '' }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ loading: false, obras: [], error: error.message }); });
    return () => controller.abort();
  }, [request, attempt]);
  return <>
    <header className="page-heading"><span className="eyebrow">Painel</span><h1>Obras em acompanhamento</h1><p>Marcos, evidências e decisões de cada obra.</p><Link className="button button-primary" to="/obras/nova"><Plus size={16} />Nova obra</Link></header>
    {state.loading && <p role="status">Carregando obras…</p>}
    {state.error && <div className="feature-card"><p role="alert" className="form-error">{state.error}</p><Button onClick={() => setAttempt((value) => value + 1)}>Tentar novamente</Button></div>}
    {!state.loading && !state.error && !state.obras.length && <div className="feature-card"><EmptyState title="Nenhuma obra cadastrada" description="Suas obras aparecerão aqui após o cadastro." /></div>}
    <div className="works-grid">{state.obras.map((obra) => <Link className="feature-card work-card" key={obra.id} to={`/obras/${obra.id}/marcos`}><Building2 size={24} /><h2>{obra.nome}</h2><p>{obra.cliente}</p><span>Acompanhar obra <ArrowRight size={15} /></span></Link>)}</div>
  </>;
}
