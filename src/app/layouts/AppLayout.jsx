import { ExclusoesProvider } from '../../shared/ui/Exclusoes';
import { useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Building2, Settings, LogOut, Users } from 'lucide-react';
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
  return <><a className="skip-link" href="#content">Ir para o conteúdo</a>
    <aside className="side-nav" aria-label="Menu lateral">
      <div className="side-nav-brand"><Building2 aria-hidden="true" /><span>Acompanhamento de obras</span></div>
      <nav aria-label="Navegação principal">
        <NavLink to="/obras"><Building2 aria-hidden="true" /><span>Painel das Obras</span></NavLink>
        <NavLink to="/compradores"><Users aria-hidden="true" /><span>Compradores</span></NavLink>
        <NavLink to="/configuracoes"><Settings aria-hidden="true" /><span>Configurações</span></NavLink>
      </nav>
      <div className="side-nav-account"><span className="side-nav-user" title={user.nome}>{user.nome}</span><button type="button" aria-label="Sair" disabled={busy} onClick={leave}><LogOut aria-hidden="true" /><span>{busy ? 'Saindo…' : 'Sair'}</span></button></div>
    </aside>
    <div className="app-content"><main id="content" className="page">{error && <p role="alert" className="form-error">{error}</p>}<ExclusoesProvider key={user.id}><Outlet /></ExclusoesProvider></main></div></>;
}

