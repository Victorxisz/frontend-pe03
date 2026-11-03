export default function TrabalhadorFields({ dados, onChange, erros = {}, disabled }) {
  const fields = [
    ['nome', 'Nome completo', 'text', 'name'], ['cargo', 'Cargo', 'text', 'organization-title'],
    ['email', 'E-mail', 'email', 'email'], ['telefone', 'Telefone com DDD', 'tel', 'tel-national'],
  ];
  return <div className="form-grid">{fields.map(([campo, label, type, autoComplete]) => <div className="field" key={campo}>
    <label htmlFor={`trabalhador-${campo}`}>{label}</label>
    <input id={`trabalhador-${campo}`} name={campo} type={type} autoComplete={autoComplete} required value={dados[campo]}
      disabled={disabled} onChange={e => onChange(campo, e.target.value)} aria-invalid={!!erros[campo]}
      aria-describedby={[campo === 'telefone' && 'ajuda-telefone', erros[campo] && `erro-${campo}`].filter(Boolean).join(' ') || undefined} />
    {campo === 'telefone' && <small id="ajuda-telefone" className="form-hint">Ex.: (11) 99999-9999. Sem o código do país (+55).</small>}
    {erros[campo] && <small id={`erro-${campo}`} className="trabalhador-field-error">{erros[campo]}</small>}
  </div>)}</div>;
}
