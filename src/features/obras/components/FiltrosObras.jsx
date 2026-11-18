import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Field } from '../../../shared/ui/UI';
import { estadosObra, nomesFiltros, validarFiltros } from '../filtros';

export default function FiltrosObras({ filtros, onApply, serverErrors = {}, busca, onBusca }) {
  const [draft, setDraft] = useState(filtros);
  const [errors, setErrors] = useState({});
  const [changed, setChanged] = useState({});
  const dates = ['entregaDe', 'entregaAte', 'registroDe', 'registroAte'];
  const [more, setMore] = useState(dates.some((campo) => filtros[campo] || serverErrors[campo]));
  const summary = useRef(null);
  useEffect(() => {
    if (dates.some((campo) => serverErrors[campo])) setMore(true);
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
      if (dates.some((campo) => next[campo])) setMore(true);
      requestAnimationFrame(() => summary.current?.focus());
    } else onApply(draft);
  }
  return <section className="filtros-obras" aria-label="Filtros de obras">
    <form onSubmit={submit} noValidate>
      <div className="quick-filters"><label className="quick-search"><Search aria-hidden="true" /><input type="search" placeholder="Buscar obra ou cliente..." aria-label="Buscar obra ou cliente" value={busca} onChange={(event) => onBusca(event.target.value)} /></label><select aria-label="Estado da obra" value={draft.estado} onChange={(event) => { const estado = event.target.value; change('estado', estado); onApply({ ...draft, estado }); }}><option value="">Todos os estados</option>{estadosObra.map((estado) => <option key={estado} value={estado}>{estado[0].toUpperCase() + estado.slice(1)}</option>)}</select><button type="button" className="more-filters" aria-expanded={more} onClick={() => setMore(!more)}><SlidersHorizontal aria-hidden="true" />Mais filtros</button></div>
      <div className="advanced-filters" hidden={!more}>
      {Object.values(errors).some(Boolean) && <div ref={summary} tabIndex={-1} className="form-error" role="alert"><p>Revise os filtros indicados.</p>{Object.entries(errors).filter(([, mensagem]) => mensagem).map(([campo, mensagem]) => <p key={campo}><a href={`#filtro-${campo}`}>{nomesFiltros[campo]}: {mensagem}</a></p>)}</div>}
      <h2 className="date-filter-title">Filtrar por datas</h2>
        <div className="filter-date-grid"><fieldset><legend>Prazo de entrega</legend><p className="form-hint">Para prazo estimado, considera o fim do intervalo.</p><div className="form-grid">{date('entregaDe')}{date('entregaAte')}</div></fieldset><fieldset><legend>Data de registro</legend><p className="form-hint">Inclui os dias selecionados, usando a data em UTC.</p><div className="form-grid">{date('registroDe')}{date('registroAte')}</div></fieldset></div>
      <div className="filter-actions"><Button type="submit" icon={Search}>Aplicar filtros</Button><Button variant="secondary" icon={X} onClick={() => onApply({ ...draft, ...Object.fromEntries(dates.map((campo) => [campo, ''])) })}>Limpar datas</Button></div>
      </div>
    </form>
  </section>;
}
