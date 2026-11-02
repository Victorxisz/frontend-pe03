import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Field } from '../../../shared/ui/UI';
import { estadosObra, nomesFiltros, validarFiltros } from '../filtros';

export default function FiltrosObras({ filtros, onApply, onClear, serverErrors = {} }) {
  const [draft, setDraft] = useState(filtros);
  const [errors, setErrors] = useState({});
  const [changed, setChanged] = useState({});
  const dates = ['entregaDe', 'entregaAte', 'registroDe', 'registroAte'];
  const [expanded, setExpanded] = useState(dates.some((campo) => filtros[campo]));
  const summary = useRef(null);
  useEffect(() => {
    if (dates.some((campo) => serverErrors[campo])) setExpanded(true);
  }, [serverErrors.entregaDe, serverErrors.entregaAte, serverErrors.registroDe, serverErrors.registroAte]);
  const visibleErrors = { ...Object.fromEntries(Object.entries(serverErrors).filter(([campo]) => !changed[campo])), ...errors };
  function change(campo, value) {
    setDraft((previous) => ({ ...previous, [campo]: value }));
    setChanged((previous) => ({ ...previous, [campo]: true }));
    setErrors((previous) => ({ ...previous, [campo]: '' }));
  }
  function props(campo) {
    return { id: `filtro-${campo}`, 'aria-label': nomesFiltros[campo], value: draft[campo], onChange: (event) => change(campo, event.target.value), 'aria-invalid': Boolean(visibleErrors[campo]), 'aria-describedby': visibleErrors[campo] ? `erro-filtro-${campo}` : undefined };
  }
  function error(campo) { return visibleErrors[campo] && <small id={`erro-filtro-${campo}`} className="field-error">{visibleErrors[campo]}</small>; }
  function date(campo) { return <Field label={nomesFiltros[campo]}><input type="date" {...props(campo)} />{error(campo)}</Field>; }
  function submit(event) {
    event.preventDefault();
    const next = validarFiltros(draft);
    setErrors(next);
    if (Object.keys(next).length) {
      if (dates.some((campo) => next[campo])) setExpanded(true);
      requestAnimationFrame(() => summary.current?.focus());
    } else onApply(draft);
  }
  return <section className="feature-card filtros-obras" aria-labelledby="titulo-filtros">
    <div className="filter-heading"><h2 id="titulo-filtros"><SlidersHorizontal size={18} aria-hidden="true" />Encontre uma obra</h2><p>Combine os critérios para refinar sua busca.</p></div>
    <form onSubmit={submit} noValidate>
      {Object.values(errors).some(Boolean) && <div ref={summary} tabIndex={-1} className="form-error" role="alert"><p>Revise os filtros indicados.</p>{Object.entries(errors).filter(([, mensagem]) => mensagem).map(([campo, mensagem]) => <p key={campo}><a href={`#filtro-${campo}`}>{nomesFiltros[campo]}: {mensagem}</a></p>)}</div>}
      <div className="filter-primary">
        <Field label="Nome da obra"><input type="search" placeholder="Buscar pelo nome…" {...props('nome')} />{error('nome')}</Field>
        <Field label="Cliente de referência"><input type="search" placeholder="Buscar pelo cliente…" {...props('cliente')} />{error('cliente')}</Field>
        <Field label="Estado da obra"><select {...props('estado')}><option value="">Todos os estados</option>{estadosObra.map((estado) => <option key={estado} value={estado}>{estado[0].toUpperCase() + estado.slice(1)}</option>)}</select>{error('estado')}</Field>
      </div>
      <div className="filter-secondary"><label className="filter-checkbox"><input id="filtro-alerta" type="checkbox" checked={draft.alerta === 'atrasada'} onChange={(event) => change('alerta', event.target.checked ? 'atrasada' : '')} aria-invalid={Boolean(visibleErrors.alerta)} aria-describedby="hint-alerta" /><span>Somente obras atrasadas</span></label><p id="hint-alerta" className="form-hint">O atraso é um alerta separado do estado da obra.</p>{error('alerta')}</div>
      <details className="filter-dates" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}><summary>Filtrar por datas{dates.some((campo) => filtros[campo]) ? ' · em uso' : ''}</summary>
        <div className="filter-date-grid"><fieldset><legend>Prazo de entrega</legend><p className="form-hint">Para prazo estimado, considera o fim do intervalo.</p><div className="form-grid">{date('entregaDe')}{date('entregaAte')}</div></fieldset><fieldset><legend>Data de registro</legend><p className="form-hint">Inclui os dias selecionados, usando a data em UTC.</p><div className="form-grid">{date('registroDe')}{date('registroAte')}</div></fieldset></div>
      </details>
      <div className="filter-actions"><Button type="submit" icon={Search}>Aplicar filtros</Button><Button variant="secondary" icon={X} onClick={onClear}>Limpar filtros</Button></div>
    </form>
  </section>;
}
