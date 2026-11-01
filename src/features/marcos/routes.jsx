import { lazy } from 'react';
const MarcosPage = lazy(() => import('./pages/MarcosPage'));
const NovoMarcoPage = lazy(() => import('./pages/NovoMarcoPage'));
const MarcoPage = lazy(() => import('./pages/MarcoPage'));
const DependenciasPage = lazy(() => import('./pages/DependenciasPage'));

export const routes = [
  { path: 'marcos', element: <MarcosPage /> },
  { path: 'marcos/novo', element: <NovoMarcoPage /> },
  { path: 'marcos/:marcoId', element: <MarcoPage /> },
  { path: 'marcos/:marcoId/dependencias', element: <DependenciasPage /> },
];
