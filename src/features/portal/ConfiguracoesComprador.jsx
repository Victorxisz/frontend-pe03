import { useState } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Button, Field } from '../../shared/ui/UI';

export default function ConfiguracoesComprador({ request }) {
  const { theme, setTheme } = useTheme();
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [busy, setBusy] = useState(false);
  async function salvar(event) {
    event.preventDefault();
    if (busy) return;
    setErro(''); setMensagem('');
    if (nova !== confirmacao) { setErro('A confirmação não corresponde à nova senha.'); return; }
    if (new TextEncoder().encode(nova).length > 72) { setErro('A nova senha deve ter no máximo 72 bytes.'); return; }
    setBusy(true);
    try {
      await request('/portal/senha', { method: 'PATCH', body: { senha_atual: atual, nova_senha: nova } });
      setAtual(''); setNova(''); setConfirmacao(''); setMensagem('Senha alterada com sucesso.');
    } catch (failure) {
      setErro((failure.status === 0 || failure.status >= 500) ? 'Não foi possível confirmar a alteração. Tente entrar com a nova senha antes de repetir.' : failure.message);
    } finally { setBusy(false); }
  }
  return <div className="feature-page conta-page portal-settings"><header><h1>Configurações</h1><p>Personalize a aparência e gerencie sua senha.</p></header>
    <section className="feature-card theme-settings"><h2>Aparência</h2><p>Escolha como deseja visualizar o sistema neste navegador.</p><fieldset><legend>Modo de exibição</legend>
      <label><input type="radio" name="portal-theme" checked={theme === 'light'} onChange={() => setTheme('light')} /> Claro</label>
      <label><input type="radio" name="portal-theme" checked={theme === 'dark'} onChange={() => setTheme('dark')} /> Escuro</label>
    </fieldset></section>
    <section className="feature-card"><h2>Alterar senha</h2><p>Informe sua senha atual e escolha uma nova com pelo menos 8 caracteres.</p><form onSubmit={salvar}>
      <Field label="Senha atual"><input type="password" autoComplete="current-password" required value={atual} onChange={e => setAtual(e.target.value)} /></Field>
      <Field label="Nova senha"><input type="password" autoComplete="new-password" minLength={8} required value={nova} onChange={e => setNova(e.target.value)} /></Field>
      <Field label="Confirmar nova senha"><input type="password" autoComplete="new-password" minLength={8} required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></Field>
      {erro && <p role="alert" className="form-error">{erro}</p>}{mensagem && <p role="status">{mensagem}</p>}<Button type="submit" loading={busy}>Salvar senha</Button>
    </form></section>
  </div>;
}
