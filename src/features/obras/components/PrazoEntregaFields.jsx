import { Field } from '../../../shared/ui/UI';

export default function PrazoEntregaFields({ value, onChange, errors = {} }) {
  function dateField(campo, label) {
    const error = errors[`entrega.${campo}`];
    return <Field label={label}><input aria-label={label} type="date" required value={value[campo] || ''} onChange={(event) => onChange({ ...value, [campo]: event.target.value })} aria-invalid={Boolean(error)} aria-describedby={error ? `entrega-${campo}-erro` : undefined} />{error && <small className="field-error" id={`entrega-${campo}-erro`}>{error}</small>}</Field>;
  }
  return <fieldset className="prazo-fields form-full">
    <legend>Prazo de entrega</legend>
    <div className="form-grid">
      <Field label="Modalidade de entrega" className="form-full"><select aria-label="Modalidade de entrega" aria-describedby={errors.entrega || errors['entrega.modalidade'] ? 'modalidade-erro' : undefined} required value={value.modalidade} onChange={(event) => {
        const modalidade = event.target.value;
        // Substituir o objeto descarta todos os campos da modalidade anterior.
        onChange(modalidade === 'data_exata' ? { modalidade, data: '' } : { modalidade, inicio: '', fim: '' });
      }} aria-invalid={Boolean(errors.entrega || errors['entrega.modalidade'])}>
        <option value="">Selecione a modalidade</option><option value="data_exata">Data exata</option><option value="intervalo_estimado">Intervalo estimado</option>
      </select>{(errors.entrega || errors['entrega.modalidade']) && <small id="modalidade-erro" className="field-error">{errors.entrega || errors['entrega.modalidade']}</small>}</Field>
      {value.modalidade === 'data_exata' && dateField('data', 'Data de entrega')}
      {value.modalidade === 'intervalo_estimado' && <>{dateField('inicio', 'Início do intervalo')}{dateField('fim', 'Fim do intervalo')}</>}
    </div>
  </fieldset>;
}
