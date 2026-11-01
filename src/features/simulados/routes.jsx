import { lazy } from 'react';
const SimuladosPage = lazy(() => import('./pages/SimuladosPage'));

export const routes = [
  { path: 'simulados', element: <SimuladosPage /> },
];
