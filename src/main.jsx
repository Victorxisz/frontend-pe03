import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { router } from './app/router';
import './shared/styles/global.css';
import './app/app.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider><RouterProvider router={router} /></AuthProvider>
  </StrictMode>,
);
