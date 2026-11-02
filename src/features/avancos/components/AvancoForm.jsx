import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { Button, Field } from '../../../shared/ui/UI';
import MediaPicker from '../../../shared/ui/MediaPicker';
import { avancosApi, resumirErroAvanco } from '../api';

export default function AvancoForm({ marcoId, obraId, onCreate, onSuccess }) {
  const { request } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [data, setData] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
  const [descricao, setDescricao] = useState('');
  const [midias, setMidias] = useState([]);
  const [error, setError] = useState('');
  const [fileError, setFileError] = useState('');
  const [fileErrors, setFileErrors] = useState({});
  const [sending, setSending] = useState(false);
  const intent = useRef(null);
  function updateFiles(files) { setMidias(files); setFileError(''); setFileErrors({}); setError(''); intent.current = null; }
  async function submit(event) {
    event.preventDefault(); setError(''); setFileError(''); setFileErrors({});
    if (!midias.length) { setFileError('Adicione ao menos uma evidência. O rascunho não será salvo sem mídia.'); return; }
    if (midias.length > 5) { setFileError('Selecione no máximo cinco arquivos.'); return; }
    const signature = JSON.stringify([data, descricao, midias.map(({ name, size, lastModified, type }) => [name, size, lastModified, type])]);
    if (!intent.current || intent.current.signature !== signature) intent.current = { signature, key: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}` };
    setSending(true);
    try {
      const result = onCreate
        ? await onCreate({ marcoId, data, descricao, midias, idempotencyKey: intent.current.key })
        : await avancosApi(request).create(marcoId, { data, descricao, midias }, intent.current.key);
      if (onCreate) {
        intent.current = null;
        onSuccess?.();
        return;
      }
      const avanco = result?.avanco || result?.data || result;
      const id = avanco?.id || avanco?._id || avanco?.avanco_id || result?.id;
      if (!id) throw Object.assign(new Error('O servidor respondeu sem identificar o avanço. Verifique a lista antes de repetir o envio.'), { status: 0 });
      intent.current = null;
      navigate(`/obras/${encodeURIComponent(avanco.obra_id || obraId)}/avancos/${encodeURIComponent(id)}`, { replace: true });
    } catch (cause) {
      const reported = cause?.fields || cause?.data?.campos || cause?.data?.errors || {};
      const perFile = {};
      if (Array.isArray(reported)) reported.forEach((item, index) => { if (typeof item === 'string' && index < midias.length) perFile[index] = item; });
      else if (reported && typeof reported === 'object') midias.forEach((file, index) => {
        const message = reported[file.name] || reported[`midias.${index}`] || reported[`midias[${index}]`];
        if (typeof message === 'string') perFile[index] = message;
      });
      if ((cause.status === 415 || cause.status === 422) && Object.keys(perFile).length === 0) midias.forEach((_, index) => { perFile[index] = cause.message || 'O servidor recusou este arquivo; confira o formato e tente novamente.'; });
      setFileErrors({ ...perFile });
      setError(resumirErroAvanco(cause));
    }
    finally { setSending(false); }
  }
  return <form className="feature-card avanco-form" onSubmit={submit}>
    <p className="demo-note">O avanço será criado como rascunho. Ele não aparece na prévia de publicações até ser publicado.</p>
    <div className="form-grid">
      <Field label="Data do trabalho"><input type="date" required value={data} onChange={(event) => { setData(event.target.value); intent.current = null; }} /></Field>
      <Field label="Descrição"><textarea required value={descricao} onChange={(event) => { setDescricao(event.target.value); intent.current = null; }} rows="4" /></Field>
      <div className="form-full"><MediaPicker files={midias} onChange={updateFiles} disabled={sending} error={fileError} fileErrors={fileErrors} /></div>
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="page-actions"><Button type="submit" loading={sending}>Salvar rascunho</Button></div>
  </form>;
}
