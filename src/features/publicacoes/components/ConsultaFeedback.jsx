import { Button } from '../../../shared/ui/UI';
export default function ConsultaFeedback({ state }) {
  if (state.error) return <div role="alert"><p>{state.error.status === 404 ? 'Registro não encontrado. ' : ''}{state.error.message}</p><Button variant="secondary" onClick={state.retry}>Consultar novamente</Button></div>;
  if (!state.data) return <p role="status">Carregando…</p>;
  return null;
}
