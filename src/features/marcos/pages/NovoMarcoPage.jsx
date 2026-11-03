import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft, Flag } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Field } from '../../../shared/ui/UI';
import { diaValido } from '../../../shared/lib/datas';
import { marcosApi } from '../api';

const labels = { nome: 'Nome do marco', descricao: 'Descrição', inicio_previsto: 'Início previsto', fim_previsto: 'Fim previsto' };
export default function NovoMarcoPage() {
  const { obraId } = useParams();
  return <CadastroMarco key={obraId} obraId={obraId} />;
}
function CadastroMarco({ obraId }) {
  const { obra } = useOutletContext();
  const { request } = useAuth();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [dados, setDados] = useState({ nome: '', descricao: '', inicio_previsto: '', fim_previsto: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const active = useRef(true);
  const summary = useRef();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const back = `/obras/${encodeURIComponent(obraId)}/marcos${search}`;
  function focusErrors() { requestAnimationFrame(() => summary.current?.focus()); }
  async function salvar(event) {
    event.preventDefault();
    if (locked.current) return;
    const next = {};
    for (const campo of ['nome', 'descricao']) if (!dados[campo].trim()) next[campo] = 'Preencha este campo.';
    for (const campo of ['inicio_previsto', 'fim_previsto']) if (!diaValido(dados[campo])) next[campo] = 'Informe uma data válida.';
    if (diaValido(dados.inicio_previsto) && diaValido(dados.fim_previsto) && dados.fim_previsto < dados.inicio_previsto) next.fim_previsto = 'O fim deve ser maior ou igual ao início previsto.';
    setErrors(next);
    if (Object.keys(next).length) { focusErrors(); return; }
    locked.current = true;
    setSaving(true);
    setFailure(null);
    try {
      const marco = await marcosApi(request).create(obraId, dados);
      if (active.current) navigate(`/obras/${encodeURIComponent(obraId)}/marcos/${encodeURIComponent(marco.id)}${search}`, { replace: true, state: { marcoCriado: marco.id, obraId } });
    } catch (error) {
      if (!active.current) return;
      setFailure(error);
      if (error.status === 422) {
        const fields = Array.isArray(error.fields) ? error.fields : Object.keys(error.fields || {});
        setErrors(Object.fromEntries(fields.filter((campo) => labels[campo]).map((campo) => [campo, error.message])));
      }
      focusErrors();
    } finally {
      locked.current = false;
      if (active.current) setSaving(false);
    }
  }
  function field(campo, type = 'text') {
    const props = { id: `marco-${campo}`, 'aria-label': labels[campo], required: true, value: dados[campo], disabled: saving, 'aria-invalid': Boolean(errors[campo]), 'aria-describedby': errors[campo] ? `${campo}-erro` : undefined,
      onChange: (event) => { setDados((prev) => ({ ...prev, [campo]: event.target.value })); setErrors((prev) => ({ ...prev, [campo]: '' })); } };
    return <Field label={labels[campo]} className={type === 'text' ? 'form-full' : ''}>{campo === 'descricao' ? <textarea {...props} rows={4} placeholder="Descreva o que deve estar pronto para considerar esta entrega realizada." /> : <input {...props} type={type} placeholder={campo === 'nome' ? 'Ex.: Fundação concluída' : undefined} />}{errors[campo] && <small className="field-error" id={`${campo}-erro`}>{errors[campo]}</small>}</Field>;
  }
  return <section className="feature-page"><Link className="back-link button button-secondary" to={back} onClick={(event) => saving && event.preventDefault()} aria-disabled={saving || undefined}><ArrowLeft size={15} aria-hidden="true" />Marcos da obra</Link>
    <header className="section-heading"><span className="eyebrow">Planejamento de entregas</span><h2>Novo marco</h2><p>Defina a próxima entrega de {obra.nome}. Todos os campos são obrigatórios.</p></header>
    <div className="feature-card obra-form"><div className="marco-form-note"><Flag size={22} aria-hidden="true" /><p>O marco começa <strong>a iniciar</strong>. Depois, seu estado acompanha o trabalho realizado.</p></div>
      {(failure || Object.values(errors).some(Boolean)) && <div className="form-error" role="alert" ref={summary} tabIndex={-1}><p>{failure?.message || 'Revise os campos indicados antes de salvar.'}</p>{failure && <Link className="button button-secondary" to={back}>Consultar marcos da obra</Link>}</div>}
      <form onSubmit={salvar} noValidate><div className="form-grid">{field('nome')}{field('descricao')}{field('inicio_previsto', 'date')}{field('fim_previsto', 'date')}</div><div className="page-actions"><Button type="submit" loading={saving}>{saving ? 'Salvando…' : 'Salvar marco'}</Button><Button variant="secondary" disabled={saving} onClick={() => navigate(back)}>Cancelar</Button></div></form>
    </div>
  </section>;
}
