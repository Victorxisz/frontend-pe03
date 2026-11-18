import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import AuthAside from '../auth/AuthAside';
import { Button } from '../../shared/ui/UI';
import '../auth/login.css';

export default function LoginComprador({ email, setEmail, senha, setSenha, entrar, erro }) {
  const [visivel, setVisivel] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setVisivel(false);
    try { await entrar(event); } finally { setBusy(false); }
  }
  return <main className="auth-page"><AuthAside /><div className="auth-content"><div className="login-shell">
    <section className="login-card" aria-labelledby="comprador-login-title"><header className="login-heading">
      <p className="login-section-label">BEM-VINDO DE VOLTA</p><h1 id="comprador-login-title">Portal do comprador</h1><p>Use os dados fornecidos pela construtora para acompanhar suas obras.</p>
    </header><form onSubmit={submit} aria-busy={busy}>
      <label className="login-field"><span>E-mail</span><div><input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com.br" /></div></label>
      <div className="login-field"><label htmlFor="comprador-senha-login">Senha</label><div className="login-input-group"><input id="comprador-senha-login" required type={visivel ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" disabled={busy} /><button type="button" className="password-toggle" aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'} aria-controls="comprador-senha-login" aria-pressed={visivel} disabled={busy} onClick={() => setVisivel(v => !v)}>{visivel ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div></div>
      {erro && <p role="alert" className="form-error">{erro}</p>}<Button type="submit" className="login-submit" loading={busy}>{busy ? 'Entrando…' : 'Entrar'} {!busy && <ArrowRight size={17} aria-hidden="true" />}</Button>
    </form><p className="login-footnote">É construtora? <Link to="/login">Acesse sua conta <ArrowRight size={14} aria-hidden="true" /></Link></p></section>
    </div><p className="auth-bottom">Sua obra, acompanhada de perto.</p></div></main>;
}
