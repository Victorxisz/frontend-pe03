import { lazy } from 'react';
const ObrasPage = lazy(() => import('./pages/ObrasPage'));
const NovaObraPage = lazy(() => import('./pages/NovaObraPage'));
const EditarObraPage = lazy(() => import('./pages/EditarObraPage'));

export const routes = [
  { path: 'obras', element: <ObrasPage /> },
  { path: 'obras/nova', element: <NovaObraPage /> },
  { path: 'obras/:obraId/editar', element: <EditarObraPage /> },
];
