import { lazy } from 'react';
const PublicacoesPage = lazy(() => import('./pages/PublicacoesPage'));
const PublicarPage = lazy(() => import('./pages/PublicarPage'));
const CorrigirPage = lazy(() => import('./pages/CorrigirPage'));
const VersoesPage = lazy(() => import('./pages/VersoesPage'));

export const routes = [
  { path: 'publicacoes', element: <PublicacoesPage /> },
  { path: 'avancos/:avancoId/publicar', element: <PublicarPage /> },
  { path: 'avancos/:avancoId/corrigir', element: <CorrigirPage /> },
  { path: 'avancos/:avancoId/versoes', element: <VersoesPage /> },
];
