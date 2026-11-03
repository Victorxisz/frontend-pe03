import { lazy, Suspense } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import RequireAuth from '../features/auth/RequireAuth';
import AppLayout from './layouts/AppLayout';
import ObraLayout from './layouts/ObraLayout';
import NotFoundPage from './NotFoundPage';
import RouteErrorPage from './RouteErrorPage';
import { routes as obras } from '../features/obras/routes';
import { routes as marcos } from '../features/marcos/routes';
import { routes as avancos } from '../features/avancos/routes';
import { routes as publicacoes } from '../features/publicacoes/routes';
import { routes as ocorrencias } from '../features/ocorrencias/routes';
import { routes as trabalhadores } from '../features/trabalhadores/routes';
import { routes as historico } from '../features/historico/routes';

const LoginPage = lazy(() => import('../features/auth/LoginPage'));
function ObraIndexRedirect() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: 'marcos', search, hash }} replace />;
}
export const routes = [
  {
    element: <Suspense fallback={<p className="route-status" role="status">Carregando página…</p>}><Outlet /></Suspense>,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to="/obras" replace /> },
      { path: 'login', element: <LoginPage /> },
      { element: <RequireAuth />, children: [
        { element: <AppLayout />, children: [
          ...obras,
          { path: 'obras/:obraId', element: <ObraLayout />, children: [
            { index: true, element: <ObraIndexRedirect /> },
            ...marcos, ...avancos, ...publicacoes, ...ocorrencias,
            ...trabalhadores, ...historico,
          ] },
        ] },
      ] },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
