import { Field } from '../../../shared/ui/UI';
import { camposDescritivos, labelsDescritivos } from '../descritiva';

export default function ObraDescritivaFields({ value, onChange, errors = {} }) {
  return camposDescritivos.map((campo) => {
    const props = {
      id: `descritiva-${campo}`, required: true, 'aria-label': labelsDescritivos[campo],
      value: value[campo], onChange: (event) => onChange(campo, event.target.value),
      'aria-invalid': Boolean(errors[campo]), 'aria-describedby': errors[campo] ? `descritiva-${campo}-erro` : undefined,
    };
    return <Field key={campo} label={labelsDescritivos[campo]} className={['descricao', 'localizacao'].includes(campo) ? 'form-full' : ''}>
      {campo === 'descricao' ? <textarea {...props} rows={4} /> : <input type="text" {...props} />}
      {errors[campo] && <small id={`descritiva-${campo}-erro`} className="field-error">{errors[campo]}</small>}
    </Field>;
  });
}
