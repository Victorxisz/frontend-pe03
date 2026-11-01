import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="route-status" role="status">Verificando sessão…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return <Outlet />;
}
