import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './features/theme/ThemeProvider';
import { AuthProvider } from './features/auth/AuthProvider';
import { router } from './app/router';
import './shared/styles/global.css';
import './app/app.css';
import './shared/styles/design.css';
import './shared/styles/theme.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></ThemeProvider>
  </StrictMode>,
);

