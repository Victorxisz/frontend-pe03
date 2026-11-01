import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useEffect } from 'react';
import Brand from '../../shared/ui/Brand';
import { useAuth } from '../../features/auth/AuthProvider';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  async function leave() {
    setBusy(true); setError('');
    try { await logout(); } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <><a className="skip-link" href="#content">Ir para o conteúdo</a><header className="topbar"><div className="topbar-inner"><Brand /><nav aria-label="Navegação principal"><NavLink to="/obras">Painel das Obras</NavLink></nav><div className="account"><span>{user.nome}</span><button className="icon-button" aria-label="Sair" disabled={busy} onClick={leave}><LogOut size={18} /></button></div></div></header><main id="content" className="page">{error && <p role="alert" className="form-error">{error}</p>}<Outlet /></main></>;
}
