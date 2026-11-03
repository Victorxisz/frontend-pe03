import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../../shared/ui/UI';
import TrabalhadorFields from '../components/TrabalhadorFields';
import { trabalhadoresApi } from '../api';
import { cadastroPendente, chaveCadastro, validarTrabalhador } from '../cadastro';
import '../trabalhadores.css';

export default function NovoTrabalhadorPage() {
  const { obraId } = useParams();
  return <Formulario key={obraId} obraId={obraId} />;
}
function Formulario({ obraId }) {
  const { request } = useAuth(); const navigate = useNavigate(); const { search } = useLocation();
  const base = `/obras/${encodeURIComponent(obraId)}/trabalhadores`;
  const [dados, setDados] = useState({ nome: '', email: '', telefone: '', cargo: '' });
  const [erros, setErros] = useState({}); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(() => cadastroPendente(obraId));
  const lock = useRef(false); const mounted = useRef(true); const form = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  function change(campo, value) { setDados(prev => ({ ...prev, [campo]: value })); setErros(prev => ({ ...prev, [campo]: undefined })); setError(''); }
  async function submit(event) {
    event.preventDefault(); if (lock.current || uncertain) return;
    const validation = validarTrabalhador(dados); setErros(validation);
    if (Object.keys(validation).length) {
      setError('Revise os campos indicados antes de cadastrar.');
      form.current?.querySelector(`[name="${Object.keys(validation)[0]}"]`)?.focus(); return;
    }
    // Registrar antes de enviar também protege recargas durante a gravação.
    try { sessionStorage.setItem(chaveCadastro(obraId), '1'); }
    catch { setError('Não foi possível preparar o cadastro neste navegador. Verifique o armazenamento e tente novamente.'); return; }
    lock.current = true; setSaving(true); setError('');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const result = await trabalhadoresApi(request).create(obraId, dados, controller.signal);
      try { sessionStorage.removeItem(chaveCadastro(obraId)); } catch { /* O ID confirmado permite consultar o resultado. */ }
      if (mounted.current) navigate(`${base}/${encodeURIComponent(result.id)}${search}`, { replace: true, state: { trabalhadorCriado: result.id } });
    } catch (cause) {
      const unknown = cause.name === 'AbortError' || !cause.status || cause.status >= 500;
      if (!unknown) { try { sessionStorage.removeItem(chaveCadastro(obraId)); } catch { /* Mantém proteção se o armazenamento falhar. */ } }
      if (mounted.current) { setUncertain(unknown); setError(unknown ? 'Não foi possível confirmar o cadastro. Consulte a equipe antes de tentar novamente: o trabalhador pode ter sido salvo.' : cause.message || 'Não foi possível cadastrar o trabalhador.'); }
    } finally { clearTimeout(timer); lock.current = false; if (mounted.current) setSaving(false); }
  }
  return <section className="feature-page"><header className="trabalhadores-heading"><div><h2>Cadastrar trabalhador</h2><p>Adicione uma pessoa à equipe desta obra.</p></div></header>
    <form ref={form} className="feature-card trabalhador-form" onSubmit={submit} noValidate>
      <h3>Dados do trabalhador</h3><p>Todos os campos são obrigatórios. Este cadastro registra o vínculo com a obra e não cria senha ou acesso ao sistema.</p>
      <TrabalhadorFields dados={dados} onChange={change} erros={erros} disabled={saving || uncertain} />
      {error && <p className="form-error" role="alert">{error}</p>}
      {uncertain && <div className="form-error"><p>Consulte a equipe para verificar o resultado antes de iniciar outro cadastro.</p><Link className="button button-secondary" to={`${base}${search}`}>Consultar equipe</Link></div>}
      <div className="page-actions action-toolbar"><Button type="submit" loading={saving} disabled={uncertain}>Cadastrar trabalhador</Button><Link className="button button-secondary" to={`${base}${search}`} aria-disabled={saving || undefined} onClick={e => saving && e.preventDefault()}>Cancelar</Link></div>
    </form>
  </section>;
}
