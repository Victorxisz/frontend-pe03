import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { Button, Field } from '../../shared/ui/UI';
import ConfirmDialog from '../../shared/ui/ConfirmDialog';

export default function ContaPage() {
  const { user, updateAccount, deleteAccount } = useAuth();
  const [dados, setDados] = useState({ nome: user.nome || '', email: user.email || '', telefone: user.telefone || '', senha: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [confirm, setConfirm] = useState(false);
  async function save(event) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('');
    const body = {}; for (const campo of ['nome', 'email', 'telefone']) if (dados[campo].trim() && dados[campo].trim() !== (user[campo] || '')) body[campo] = dados[campo].trim();
    if (dados.senha) body.senha = dados.senha;
    if (!Object.keys(body).length) { setMessage('Nenhuma alteração para salvar.'); setBusy(false); return; }
    try { await updateAccount(body); setDados(current => ({ ...current, senha: '' })); setMessage('Dados atualizados.'); }
    catch (failure) { setError((failure.status === 0 || failure.status >= 500) ? 'Não foi possível confirmar a alteração. Recarregue os dados antes de tentar novamente.' : failure.message); }
    finally { setBusy(false); }
  }
  async function remove() { setBusy(true); setError(''); try { await deleteAccount(); } catch (failure) { setError((failure.status === 0 || failure.status >= 500) ? 'Não foi possível confirmar a exclusão. Tente entrar novamente para verificar a conta.' : failure.message); } finally { setBusy(false); } }
  return <section className="feature-page"><header><h1>Configurações</h1><p>Gerencie a conta da construtora.</p></header><section className="feature-card"><h2>Dados da conta</h2><form onSubmit={save}>
    {[['nome', 'Nome', 'text'], ['email', 'E-mail', 'email'], ['telefone', 'Telefone com DDD', 'tel'], ['senha', 'Nova senha (opcional)', 'password']].map(([campo, label, tipo]) => <Field key={campo} label={label}><input type={tipo} required={campo === 'nome' || campo === 'email'} value={dados[campo]} autoComplete={campo === 'senha' ? 'new-password' : undefined} onChange={e => setDados({ ...dados, [campo]: e.target.value })} /></Field>)}
    {error && !confirm && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}<Button type="submit" loading={busy}>Salvar alterações</Button>
  </form></section><section className="feature-card"><h2>Excluir conta</h2><p>Após a exclusão, não será possível entrar com esta conta.</p><Button variant="danger" onClick={() => { setError(''); setConfirm(true); }}>Excluir conta</Button></section>
  {confirm && <ConfirmDialog title="Excluir conta da construtora?" confirmLabel="Excluir conta" busy={busy} error={error} onCancel={() => { setConfirm(false); setError(''); }} onConfirm={remove}><p>Esta ação exclui a conta e encerra seu acesso. Obras e outros registros não são excluídos por esta operação e podem ficar inacessíveis. Em ambientes com conta única configurada, será necessário reconfigurar o servidor para usar outra conta.</p></ConfirmDialog>}</section>;
}
