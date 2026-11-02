import { useEffect, useState } from 'react';
import { Button } from './UI';

export default function MediaViewer({ media, loadContent }) {
  const id = media?.id ?? media?._id ?? media?.midia_id;
  const [resource, setResource] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    let url;
    setResource(null); setError(''); setLoading(true);
    loadContent(id, controller.signal).then((blob) => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob); setResource({ url, type: blob.type || media.mime_type || media.content_type || '' });
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause.status === 502 ? 'O conteúdo está ausente ou o provedor de mídia está indisponível. Tente recuperar novamente.' : cause.status === 401 ? 'Sua sessão não permite abrir esta mídia.' : cause.message || 'Não foi possível recuperar a mídia.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [id, loadContent, media?.mime_type, media?.content_type, retry]);
  if (!media) return null;
  const type = resource?.type || media.mime_type || media.content_type || '';
  const name = media.nome_original || media.nome || media.filename || 'Arquivo de evidência';
  return <article className="avanco-media">
    <h3>{name}</h3>
    {loading && <p role="status">Recuperando arquivo…</p>}
    {error && <div role="alert" className="form-error"><p>{error}</p><Button variant="secondary" onClick={() => setRetry((value) => value + 1)}>Tentar recuperar</Button></div>}
    {resource && type.startsWith('image/') && <img src={resource.url} alt={media.descricao || name} />}
    {resource && type.startsWith('video/') && <video src={resource.url} controls preload="metadata">Seu navegador não reproduz este vídeo.</video>}
    {resource && !type.startsWith('image/') && !type.startsWith('video/') && <a className="button button-secondary" href={resource.url} download={name}>Baixar arquivo</a>}
  </article>;
}
