import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../../shared/ui/UI';
import './login.css';

export default function LoginPage() {
  const { user, loading, login, sessionError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const from = location.state?.from;
  const destination = typeof from === 'string' && /^\/obras(?:[/?#]|$)/.test(from) ? from : '/obras';
  if (loading) return <p className="route-status" role="status">Verificando sessão…</p>;
  if (user) return <Navigate to={destination} replace />;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setSenhaVisivel(false);
    try { await login({ email, senha }); }
    catch (failure) { setError(failure.status === 401 ? 'E-mail ou senha incorretos.' : failure.message); }
    finally { setSenha(''); setSenhaVisivel(false); setBusy(false); }
  }
  return <main className="login-page">
    <div className="login-shell">
    <section className="login-card" aria-labelledby="login-title">
      <header className="login-heading">
      <p className="login-section-label">Área da construtora</p>
      <h1 id="login-title">Entrar na conta</h1>
      <p>Use seu e-mail e senha para acessar suas obras.</p>
      </header>
      <form onSubmit={submit} aria-busy={busy}>
        <label className="login-field"><span>E-mail</span><div><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@construtora.com.br" /></div></label>
        <div className="login-field"><label htmlFor="login-password">Senha</label><div className="login-input-group"><input id="login-password" required type={senhaVisivel ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Sua senha" disabled={busy} /><button type="button" className="password-toggle" aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'} title={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'} aria-controls="login-password" aria-pressed={senhaVisivel} disabled={busy} onClick={() => setSenhaVisivel((value) => !value)}>{senhaVisivel ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div></div>
        {(error || sessionError) && <p role="alert" className="form-error">{error || sessionError}</p>}
        <Button type="submit" className="login-submit" loading={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <p className="login-footnote">Acesso exclusivo à conta da construtora. <Link to="/cadastro">Cadastrar construtora</Link></p>
    </section>
    </div>
  </main>;
}
