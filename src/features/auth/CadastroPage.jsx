import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Button, Field } from '../../shared/ui/UI';
import './login.css';

export default function CadastroPage() {
  const { user, loading, register } = useAuth();
  const [dados, setDados] = useState({ nome: '', email: '', telefone: '', senha: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (loading) return <p className="route-status">Verificando sessão…</p>;
  if (user) return <Navigate to="/obras" replace />;
  async function submit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const body = { ...dados }; if (!body.telefone.trim()) delete body.telefone; await register(body); }
    catch (failure) { setError(failure.status === 403 ? 'O cadastro público está indisponível neste ambiente. Entre com a conta fornecida.' : failure.status === 0 ? 'Não foi possível confirmar o cadastro. Tente entrar antes de enviar novamente.' : failure.message); }
    finally { setBusy(false); setDados(current => ({ ...current, senha: '' })); }
  }
  return <main className="login-page"><div className="login-shell"><section className="login-card"><h1>Cadastrar construtora</h1><p>Crie uma conta para acessar suas obras.</p><form onSubmit={submit}>
    {[['nome', 'Nome', 'text'], ['email', 'E-mail', 'email'], ['telefone', 'Telefone com DDD (opcional)', 'tel'], ['senha', 'Senha', 'password']].map(([campo, label, tipo]) => <Field key={campo} label={label}><input type={tipo} required={campo !== 'telefone'} value={dados[campo]} autoComplete={campo === 'senha' ? 'new-password' : undefined} onChange={e => setDados({ ...dados, [campo]: e.target.value })} /></Field>)}
    {error && <p role="alert" className="form-error">{error}</p>}<Button type="submit" loading={busy}>Cadastrar</Button>
  </form><p><Link to="/login">Voltar para entrar</Link></p></section></div></main>;
}
