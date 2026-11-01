import { lazy } from 'react';
const AvancosPage = lazy(() => import('./pages/AvancosPage'));
const NovoAvancoPage = lazy(() => import('./pages/NovoAvancoPage'));
const AvancoPage = lazy(() => import('./pages/AvancoPage'));
const EditarAvancoPage = lazy(() => import('./pages/EditarAvancoPage'));

export const routes = [
  { path: 'marcos/:marcoId/avancos', element: <AvancosPage /> },
  { path: 'marcos/:marcoId/avancos/novo', element: <NovoAvancoPage /> },
  { path: 'avancos/:avancoId', element: <AvancoPage /> },
  { path: 'avancos/:avancoId/editar', element: <EditarAvancoPage /> },
];
