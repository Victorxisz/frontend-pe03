import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ArrowRightToLine, LockKeyhole, Mail } from 'lucide-react';
import { useAuth } from './AuthProvider';
import Brand from '../../shared/ui/Brand';
import { Button } from '../../shared/ui/UI';
import './login.css';

export default function LoginPage() {
  const { user, loading, login, sessionError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const from = location.state?.from;
  const destination = typeof from === 'string' && from.startsWith('/obras') ? from : '/obras';
  if (loading) return <p className="route-status" role="status">Verificando sessão…</p>;
  if (user) return <Navigate to={destination} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await login({ email, senha }); } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <main className="login-page">
    <div className="login-brand"><Brand /></div>
    <section className="login-card" aria-labelledby="login-title">
      <span className="login-symbol"><ArrowRightToLine size={21} /></span>
      <h1 id="login-title">Bem-vindo de volta</h1>
      <p>Acesse o painel das obras da construtora</p>
      <form onSubmit={submit} aria-busy={busy}>
        <label className="login-field"><span>E-mail</span><div><Mail size={16} /><input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@construtora.com.br" /></div></label>
        <label className="login-field"><span>Senha</span><div><LockKeyhole size={16} /><input required type="password" autoComplete="current-password" value={senha} onChange={(event) => setSenha(event.target.value)} placeholder="Sua senha" /></div></label>
        {(error || sessionError) && <p role="alert" className="form-error">{error || sessionError}</p>}
        <Button type="submit" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
      </form>
      <p className="login-footnote">Use a conta da construtora configurada para o projeto.</p>
    </section>
  </main>;
}
