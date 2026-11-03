import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { obrasApi } from '../api';
import { Button, Field } from '../../../shared/ui/UI';
import { diaValido } from '../../../shared/lib/datas';
import PrazoEntregaFields from '../components/PrazoEntregaFields';
import ObraResumo from '../components/ObraResumo';
import ObraDescritivaFields from '../components/ObraDescritivaFields';
import { validarDescritiva } from '../descritiva';
import ImagemProjetoPicker, { PreviaImagemProjeto } from '../components/ImagemProjetoPicker';

const initial = { nome: '', tipo: '', cliente: '', localizacao: '', descricao: '', inicio: '', entrega: { modalidade: '' } };
const labels = { nome: 'Nome da obra', cliente: 'Cliente de referência', localizacao: 'Localização', descricao: 'Descrição', inicio: 'Início da obra' };

function validar(dados) {
  const errors = validarDescritiva(dados);
  if (!['casa', 'apartamentos'].includes(dados.tipo)) errors.tipo = 'Escolha casa ou apartamentos.';
  if (!diaValido(dados.inicio)) errors.inicio = 'Informe um dia existente.';
  const entrega = dados.entrega;
  if (!['data_exata', 'intervalo_estimado'].includes(entrega.modalidade)) errors['entrega.modalidade'] = 'Escolha a modalidade de entrega.';
  for (const campo of entrega.modalidade === 'data_exata' ? ['data'] : entrega.modalidade === 'intervalo_estimado' ? ['inicio', 'fim'] : []) {
    if (!diaValido(entrega[campo])) errors[`entrega.${campo}`] = 'Informe um dia existente.';
  }
  if (entrega.modalidade === 'intervalo_estimado' && diaValido(entrega.inicio) && diaValido(entrega.fim) && entrega.fim < entrega.inicio) errors['entrega.fim'] = 'O fim deve ser maior ou igual ao início do intervalo.';
  return errors;
}

export default function NovaObraPage() {
  const { request } = useAuth();
  const navigate = useNavigate();
  const [dados, setDados] = useState(initial);
  const [errors, setErrors] = useState({});
  const [review, setReview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState(null);
  const [imagem, setImagem] = useState(null);
  const locked = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const errorSummary = useRef(null);
  const reviewHeading = useRef(null);
  function focusErrors() { requestAnimationFrame(() => errorSummary.current?.focus()); }
  function change(campo, value) {
    setDados((previous) => ({ ...previous, [campo]: value }));
    setErrors((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== campo && !key.startsWith(`${campo}.`))));
    setFailure(null);
  }
  function revisar(event) {
    event.preventDefault();
    const nextErrors = validar(dados);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusErrors(); return; }
    setFailure(null);
    setReview(true);
    requestAnimationFrame(() => reviewHeading.current?.focus());
  }
  async function salvar() {
    if (locked.current) return;
    locked.current = true;
    setSaving(true);
    setFailure(null);
    // Lista explícita: nunca enviar estado, alertas nem auditoria.
    const payload = Object.fromEntries(['nome', 'tipo', 'cliente', 'localizacao', 'descricao', 'inicio'].map((campo) => [campo, dados[campo].trim()]));
    payload.entrega = dados.entrega.modalidade === 'data_exata'
      ? { modalidade: 'data_exata', data: dados.entrega.data }
      : { modalidade: 'intervalo_estimado', inicio: dados.entrega.inicio, fim: dados.entrega.fim };
    try {
      const obra = await obrasApi(request).create(payload, imagem);
      if (typeof obra?.id !== 'string' || !obra.id.trim()) throw new Error('Resposta de cadastro incompleta.');
      if (active.current) navigate(`/obras/${encodeURIComponent(obra.id)}/marcos`, { replace: true });
    } catch (error) {
      if (!active.current) return;
      const uncertain = !error.status || error.status >= 500;
      setFailure({ message: uncertain
        ? `${error.status === 500 ? 'Não foi possível salvar a obra.' : 'Não foi possível confirmar o cadastro.'} Consulte a lista de obras antes de repetir: a solicitação pode ter sido salva e um novo envio pode duplicá-la.`
        : error.message, uncertain });
      if (error.status === 422) {
        const campos = Array.isArray(error.fields) ? error.fields : Object.keys(error.fields || {});
        setErrors(Object.fromEntries(campos.map((campo) => [campo, error.message])));
        setReview(false);
      }
      focusErrors();
    } finally {
      if (active.current) setSaving(false);
      locked.current = false;
    }
  }
  function field(campo, type = 'text', full = false) {
    const props = { required: true, 'aria-label': labels[campo], value: dados[campo], onChange: (event) => change(campo, event.target.value), 'aria-invalid': Boolean(errors[campo]), 'aria-describedby': errors[campo] ? `${campo}-erro` : undefined };
    return <Field label={labels[campo]} className={full ? 'form-full' : ''}>{campo === 'descricao' ? <textarea {...props} rows={4} /> : <input type={type} {...props} />}{errors[campo] && <small id={`${campo}-erro`} className="field-error">{errors[campo]}</small>}</Field>;
  }
  return <>
    <Link className="back-link button button-secondary" to="/obras" onClick={(event) => saving && event.preventDefault()} aria-disabled={saving || undefined}>Painel das Obras</Link>
    <header className="page-heading"><span className="eyebrow">Cadastro</span><h1>Nova obra</h1><p>Cadastre uma casa ou apartamentos e defina o prazo de entrega. A imagem do projeto é opcional.</p></header>
    <section className="feature-card obra-form">
      {(failure || Object.keys(errors).length > 0) && <div ref={errorSummary} tabIndex={-1} role="alert" className="form-error"><p>{failure?.message || 'Revise os campos indicados antes de continuar.'}</p>{failure?.uncertain && <Link className="button button-secondary" to="/obras">Consultar lista de obras</Link>}</div>}
      {review ? <>
        <h2 ref={reviewHeading} tabIndex={-1}>Revisar obra</h2><p className="form-hint">Confira os dados e confirme o cadastro.</p>
        <ObraResumo obra={dados} />
        <PreviaImagemProjeto file={imagem} />
        <div className="page-actions"><Button loading={saving} disabled={failure?.uncertain} onClick={salvar}>{saving ? 'Salvando…' : 'Confirmar e salvar'}</Button><Button variant="secondary" disabled={saving || failure?.uncertain} onClick={() => { setReview(false); setFailure(null); }}>Voltar ao formulário</Button><Button variant="secondary" disabled={saving} onClick={() => navigate('/obras')}>Cancelar</Button></div>
        {saving && <p role="status">Salvando obra…</p>}
      </> : <form onSubmit={revisar} noValidate>
        <div className="form-grid">
          <ObraDescritivaFields value={dados} onChange={change} errors={errors} />
          <Field label="Tipo de obra"><select aria-label="Tipo de obra" aria-describedby={errors.tipo ? 'tipo-erro' : undefined} required value={dados.tipo} onChange={(event) => change('tipo', event.target.value)} aria-invalid={Boolean(errors.tipo)}><option value="">Selecione o tipo</option><option value="casa">Casa</option><option value="apartamentos">Apartamentos</option></select>{errors.tipo && <small id="tipo-erro" className="field-error">{errors.tipo}</small>}</Field>
          {field('inicio', 'date')}
          <PrazoEntregaFields value={dados.entrega} onChange={(value) => change('entrega', value)} errors={errors} />
          <ImagemProjetoPicker file={imagem} onChange={(file) => { setImagem(file); setErrors((previous) => ({ ...previous, imagem_projeto: '' })); }} error={errors.imagem_projeto} />
        </div>
        <div className="page-actions"><Button type="submit">Revisar cadastro</Button><Link className="button button-secondary" to="/obras">Cancelar</Link></div>
      </form>}
    </section>
  </>;
}
