import { lazy } from 'react';
const OcorrenciasPage = lazy(() => import('./pages/OcorrenciasPage'));
const NovaOcorrenciaPage = lazy(() => import('./pages/NovaOcorrenciaPage'));
const OcorrenciaPage = lazy(() => import('./pages/OcorrenciaPage'));
const EditarOcorrenciaPage = lazy(() => import('./pages/EditarOcorrenciaPage'));
const AceitacoesPage = lazy(() => import('./pages/AceitacoesPage'));

export const routes = [
  { path: 'ocorrencias', element: <OcorrenciasPage /> },
  { path: 'ocorrencias/nova', element: <NovaOcorrenciaPage /> },
  { path: 'ocorrencias/:ocorrenciaId', element: <OcorrenciaPage /> },
  { path: 'ocorrencias/:ocorrenciaId/editar', element: <EditarOcorrenciaPage /> },
  { path: 'ocorrencias/:ocorrenciaId/aceitacoes', element: <AceitacoesPage /> },
];
