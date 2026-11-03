import { useId } from 'react';
import { Field } from './UI';

export default function MediaPicker({ files, onChange, disabled = false, error = '', fileErrors = {}, required = true }) {
  const id = useId();
  return <div className="media-picker">
    <Field label={required ? "Evidências (obrigatório)" : "Evidências (opcional)"}>
      <input id={id} type="file" accept="image/jpeg,image/png,video/mp4,application/pdf,.jpg,.jpeg,.png,.mp4,.pdf" multiple disabled={disabled} onChange={(event) => onChange([...event.target.files])} aria-invalid={Boolean(error)} />
    </Field>
    <p className="form-hint">{required ? "Selecione de 1 a 5 arquivos" : "Selecione até 5 arquivos, se desejar"}: JPEG, PNG, MP4 ou PDF. O servidor valida o conteúdo e os limites do ambiente.</p>
    {files.length > 0 && <ul className="media-file-list">{files.map((file, index) => <li key={`${file.name}-${file.size}-${index}`}><span>{file.name}</span><small>{file.type || 'Tipo a confirmar pelo servidor'} · {(file.size / 1048576).toFixed(1)} MiB</small>{fileErrors[index] && <span className="field-error" role="alert">{fileErrors[index]}</span>}<button className="button button-secondary" type="button" disabled={disabled} onClick={() => onChange(files.filter((_, itemIndex) => itemIndex !== index))}>Remover</button></li>)}</ul>}
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
