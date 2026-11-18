import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../shared/ui/UI';
import AuthAside from './AuthAside';
import './login.css';

export default function CadastroPage() {
  const { user, loading, register } = useAuth();
  const [dados, setDados] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (loading) return <p className="route-status">Verificando sessão…</p>;
  if (user) return <Navigate to="/obras" replace />;
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const body = { ...dados }; if (!body.telefone.trim()) delete body.telefone; await register(body); }
    catch (failure) { setError(failure.status === 403 ? 'O cadastro público está indisponível neste ambiente. Entre com a conta fornecida.' : failure.status === 0 ? 'Não foi possível confirmar o cadastro. Tente entrar antes de enviar novamente.' : failure.message); }
    finally { setBusy(false); setSenhaVisivel(false); setDados(current => ({ ...current, senha: '' })); }
  }
  return <main className="auth-page">
    <AuthAside />
    <div className="auth-content auth-register">
      <div className="login-shell"><section className="login-card" aria-labelledby="cadastro-title">
        <header className="login-heading"><h1 id="cadastro-title">Cadastrar construtora</h1><p>Crie uma conta para acessar suas obras.</p></header>
        <form onSubmit={submit} aria-busy={busy}>
          {[['nome', 'Nome da construtora', 'text', 'organization', 'Nome da construtora'], ['email', 'E-mail', 'email', 'email', 'voce@construtora.com.br'], ['telefone', 'Telefone com DDD (opcional)', 'tel', 'tel', '(00) 00000-0000']].map(([campo, label, tipo, autocomplete, placeholder]) => <label className="login-field" key={campo}><span>{label}</span><div><input type={tipo} required={campo !== 'telefone'} value={dados[campo]} autoComplete={autocomplete} placeholder={placeholder} disabled={busy} onChange={e => setDados({ ...dados, [campo]: e.target.value })} /></div></label>)}
          <div className="login-field"><label htmlFor="cadastro-password">Senha</label><div className="login-input-group"><input id="cadastro-password" type={senhaVisivel ? 'text' : 'password'} required value={dados.senha} autoComplete="new-password" placeholder="Crie sua senha" disabled={busy} onChange={e => setDados({ ...dados, senha: e.target.value })} /><button type="button" className="password-toggle" aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'} aria-controls="cadastro-password" aria-pressed={senhaVisivel} disabled={busy} onClick={() => setSenhaVisivel(value => !value)}>{senhaVisivel ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></div></div>
          {error && <p role="alert" className="form-error">{error}</p>}
          <Button type="submit" className="login-submit" loading={busy}>{busy ? 'Cadastrando…' : 'Cadastrar'} {!busy && <ArrowRight size={17} aria-hidden="true" />}</Button>
        </form>
        <p className="login-footnote">Já tem uma conta? <Link to="/login">Entrar <ArrowRight size={14} aria-hidden="true" /></Link></p>
      </section></div>
    </div>
  </main>;
}
