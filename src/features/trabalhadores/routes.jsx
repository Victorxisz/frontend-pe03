import { lazy } from 'react';
const TrabalhadoresPage = lazy(() => import('./pages/TrabalhadoresPage'));
const NovoTrabalhadorPage = lazy(() => import('./pages/NovoTrabalhadorPage'));
const TrabalhadorPage = lazy(() => import('./pages/TrabalhadorPage'));
const EditarTrabalhadorPage = lazy(() => import('./pages/EditarTrabalhadorPage'));

export const routes = [
  { path: 'trabalhadores', element: <TrabalhadoresPage /> },
  { path: 'trabalhadores/novo', element: <NovoTrabalhadorPage /> },
  { path: 'trabalhadores/:trabalhadorId', element: <TrabalhadorPage /> },
  { path: 'trabalhadores/:trabalhadorId/editar', element: <EditarTrabalhadorPage /> },
];
