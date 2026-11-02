import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '../../../shared/ui/UI';

export function PreviaImagemProjeto({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) { setUrl(''); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return file && url ? <figure className="imagem-projeto imagem-previa"><img src={url} alt="Prévia da imagem selecionada para o projeto" /><figcaption>Prévia da seleção · perspectiva ilustrativa</figcaption></figure> : null;
}

export default function ImagemProjetoPicker({ file, onChange, disabled = false, error }) {
  const input = useRef(null);
  const [validation, setValidation] = useState('');
  const message = validation || error;
  return <div className="imagem-picker form-full">
    <label className="field"><span><ImagePlus size={16} aria-hidden="true" />Imagem do projeto (opcional)</span><input ref={input} type="file" accept="image/jpeg,image/png" disabled={disabled} aria-label="Imagem do projeto (opcional)" aria-describedby="imagem-projeto-hint" aria-invalid={Boolean(message)} onChange={(event) => {
      const selected = event.target.files?.[0] || null;
      if (selected && (!['image/jpeg', 'image/png'].includes(selected.type) || !selected.size)) {
        onChange(null); setValidation('Selecione uma imagem JPEG ou PNG não vazia.'); event.target.value = ''; return;
      }
      setValidation(''); onChange(selected);
    }} /></label>
    <p id="imagem-projeto-hint" className="form-hint">Envie uma perspectiva de como a obra ficará pronta, em JPEG ou PNG. O tamanho permitido é validado ao enviar.</p>
    {message && <p className="field-error" role="alert">{message}</p>}
    <PreviaImagemProjeto file={file} />
    {file && <Button icon={X} variant="secondary" disabled={disabled} onClick={() => { onChange(null); setValidation(''); if (input.current) input.current.value = ''; }}>Retirar seleção</Button>}
  </div>;
}
