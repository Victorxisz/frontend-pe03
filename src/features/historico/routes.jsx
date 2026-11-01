import { lazy } from 'react';
const HistoricoPage = lazy(() => import('./pages/HistoricoPage'));
const NovaMudancaPage = lazy(() => import('./pages/NovaMudancaPage'));
const MudancaPage = lazy(() => import('./pages/MudancaPage'));

export const routes = [
  { path: 'historico', element: <HistoricoPage /> },
  { path: 'historico/nova-mudanca', element: <NovaMudancaPage /> },
  { path: 'historico/:mudancaId', element: <MudancaPage /> },
];
