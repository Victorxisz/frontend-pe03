import { ExclusoesProvider } from '../../shared/ui/Exclusoes';
import { useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Brand from '../../shared/ui/Brand';
import { Button } from '../../shared/ui/UI';
import { useAuth } from '../../features/auth/AuthProvider';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { pathname, state } = useLocation();
  const previousPath = useRef(null);
  useEffect(() => {
    const obraPath = state?.manterRolagemObra
      ? `/obras/${encodeURIComponent(state.manterRolagemObra)}/` : null;
    const sameObraTab = obraPath && previousPath.current?.startsWith(obraPath) && pathname.startsWith(obraPath);
    if (!sameObraTab) window.scrollTo(0, 0);
    previousPath.current = pathname;
  }, [pathname, state]);
  async function leave() {
    setBusy(true); setError('');
    try { await logout(); } catch (failure) { setError(`Não foi possível confirmar a saída. ${failure.message} Tente sair novamente.`); }
    finally { setBusy(false); }
  }
  return <><a className="skip-link" href="#content">Ir para o conteúdo</a><header className="topbar"><div className="topbar-inner"><Brand /><nav aria-label="Navegação principal"><NavLink to="/obras">Painel das Obras</NavLink></nav><div className="account"><span>{user.nome}</span><Button variant="secondary" aria-label="Sair" loading={busy} onClick={leave}>{busy ? 'Saindo…' : 'Sair'}</Button></div></div></header><main id="content" className="page">{error && <p role="alert" className="form-error">{error}</p>}<ExclusoesProvider key={user.id}><Outlet /></ExclusoesProvider></main></>;
}
