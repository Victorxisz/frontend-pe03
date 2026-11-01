import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
export default function RouteErrorPage() {
  const error = useRouteError();
  return <main className="page"><h1>Não foi possível abrir esta página</h1><p>{isRouteErrorResponse(error) && error.status === 404 ? 'O endereço não foi encontrado.' : 'Tente recarregar a página.'}</p><a className="button button-primary" href="/obras">Voltar para obras</a></main>;
}
