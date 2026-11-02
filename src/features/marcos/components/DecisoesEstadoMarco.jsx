import { ArrowRight, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { historicoApi } from '../../historico/api';
import { Button } from '../../../shared/ui/UI';
import { MarcoEstado } from './MarcoFeedback';

function instante(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
export default function DecisoesEstadoMarco({ events, obraId, marcoId }) {
  const { request } = useAuth();
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (events !== undefined) return;
    const controller = new AbortController();
    setState({});
    historicoApi(request).list(obraId, controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ data }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ error }); });
    return () => controller.abort();
  }, [request, obraId, events, attempt]);
  const data = events ?? state.data;
  const decisions = data?.filter((item) => item.alvo.tipo === 'marco' && item.alvo.id === marcoId && item.campos.includes('estado'));
  return <section className="feature-card decisoes-marco" aria-labelledby="decisoes-marco-title"><h3 id="decisoes-marco-title"><History size={20} aria-hidden="true" />Decisões registradas</h3>
    {!data && !state.error && <p role="status">Carregando decisões registradas…</p>}
    {state.error && <div role="alert"><p>{state.error.message}</p><Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Consultar decisões novamente</Button></div>}
    {decisions?.length === 0 && <p className="form-hint">Nenhuma decisão de estado deste marco foi retornada pelo histórico.</p>}
    {decisions?.slice().reverse().map((item) => <article key={item.id}><div className="estado-decisao-transicao"><MarcoEstado estado={item.antes} /><ArrowRight size={16} aria-hidden="true" /><MarcoEstado estado={item.depois} /></div><p className="estado-decisao-motivo">{item.motivo}</p><p className="form-hint">Registrado em <time dateTime={item.instante}>{instante(item.instante)}</time> · Autor: {item.autor}</p></article>)}
  </section>;
}
