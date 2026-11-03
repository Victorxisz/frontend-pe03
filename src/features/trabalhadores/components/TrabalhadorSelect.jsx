import { Field } from '../../../shared/ui/UI';
export default function TrabalhadorSelect({ trabalhadores, obraId, value, onChange, disabled, label = 'Responsável (opcional)' }) {
  const equipe = trabalhadores?.filter(item => item.obras.includes(obraId));
  return <Field label={label}><select value={value} onChange={e => onChange(e.target.value)} disabled={disabled || !equipe}>
    <option value="">Sem responsável</option>
    {value && !equipe?.some(item => item.id === value) && <option value={value}>Referência atual indisponível: {value}</option>}
    {equipe?.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
  </select></Field>;
}
