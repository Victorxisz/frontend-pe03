import { useId } from 'react';
import { useMarcos } from '../useMarcos';
import { Button, Field } from '../../../shared/ui/UI';
export default function MarcoSelect({ obraId, value = '', onChange, required = false, disabled = false, error, excludeIds = [], source, label = 'Marco', emptyDescription = 'Nenhum marco cadastrado nesta obra.' }) {
  const query = useMarcos(obraId, undefined, !source);
  const { data: records, loading, error: failure, retry } = source || query;
  const data = records?.filter((marco) => !excludeIds.includes(marco.id));
  const id = useId();
  const selected = data?.some((marco) => marco.id === value) ? value : '';
  return <div><Field label={label}><select aria-label={label} value={selected} required={required} disabled={disabled || loading || Boolean(failure) || !data?.length} aria-invalid={Boolean(error || (value && data && !selected))} aria-describedby={id} onChange={(event) => onChange(event.target.value)}><option value="">{loading ? 'Carregando marcos…' : 'Selecione um marco'}</option>{data?.map((marco) => <option key={marco.id} value={marco.id}>{marco.nome}</option>)}</select></Field><p id={id} className={error || failure ? 'field-error' : 'form-hint'} role={failure ? 'alert' : 'status'}>{failure ? failure.message : error || (loading ? 'Consultando marcos da obra…' : data?.length === 0 ? emptyDescription : value && !selected ? 'Selecione um marco desta obra.' : '')}</p>{failure && <Button variant="secondary" onClick={retry}>Tentar novamente</Button>}</div>;
}
