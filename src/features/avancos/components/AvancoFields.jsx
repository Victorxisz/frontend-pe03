import { useId } from 'react';
import { Field } from '../../../shared/ui/UI';

export default function AvancoFields({ data, descricao, onChange, disabled = false, errors = {} }) {
  const id = useId();
  return <>
    <Field label="Data do trabalho"><input aria-label="Data do trabalho" type="date" required value={data} disabled={disabled}
      aria-invalid={Boolean(errors.data)} aria-describedby={errors.data ? `${id}-data` : undefined}
      onChange={event => onChange('data', event.target.value)} />
      {errors.data && <span className="field-error" id={`${id}-data`}>{errors.data}</span>}
    </Field>
    <Field label="Descrição"><textarea aria-label="Descrição" required rows="4" value={descricao} disabled={disabled}
      aria-invalid={Boolean(errors.descricao)} aria-describedby={errors.descricao ? `${id}-descricao` : undefined}
      onChange={event => onChange('descricao', event.target.value)} />
      {errors.descricao && <span className="field-error" id={`${id}-descricao`}>{errors.descricao}</span>}
    </Field>
  </>;
}
