import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { obrasApi } from '../api';
import { Button } from '../../../shared/ui/UI';
import ImagemProjeto from './ImagemProjeto';
import ImagemProjetoPicker from './ImagemProjetoPicker';

export default function EditorImagemProjeto({ obra, disabled, onBusyChange, onSaved }) {
  const { request } = useAuth();
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [failure, setFailure] = useState('');
  const [mustRefresh, setMustRefresh] = useState(false);
  const [message, setMessage] = useState('');
  const locked = useRef(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const api = obrasApi(request);
  async function execute(action) {
    if (locked.current || disabled) return;
    locked.current = true; setSaving(true); onBusyChange(true); setFailure(''); setMessage('');
    try {
      if (action === 'refresh') {
        const current = await api.detail(obra.id);
        if (!current?.id) throw new Error();
        if (active.current) { onSaved(current.imagem_projeto || null); setMustRefresh(false); setMessage('Imagem atual consultada. Confira antes de salvar novamente.'); }
      } else {
        const result = action === 'remove' ? await api.removeImage(obra.id, obra.imagem_projeto.id) : await api.saveImage(obra.id, file, obra.imagem_projeto?.id || '');
        if (!result || !Object.hasOwn(result, 'imagem_projeto') || (action !== 'remove' && !result.imagem_projeto?.id)) throw new Error();
        if (active.current) {
          onSaved(result.imagem_projeto); setFile(null); setConfirm(false);
          setMessage(`${action === 'remove' ? 'Imagem removida da obra.' : 'Imagem do projeto salva.'}${result.limpeza_pendente ? ' A limpeza do arquivo anterior está pendente.' : ''}`);
        }
      }
    } catch (error) {
      if (active.current) {
        setFailure(error.status === 409 ? 'A imagem foi alterada em outra operação. Consulte a imagem atual antes de continuar.' : error.status === 413 ? 'A imagem excede o tamanho permitido pelo servidor. Escolha um arquivo menor.' : error.message || 'Não foi possível confirmar a alteração da imagem. Consulte a obra.');
        setMustRefresh(!error.status || error.status === 409 || error.status >= 500);
      }
    } finally {
      locked.current = false;
      if (active.current) { setSaving(false); onBusyChange(false); }
    }
  }
  return <section className="feature-card editor-imagem" aria-labelledby="titulo-imagem"><h2 id="titulo-imagem">Imagem do projeto</h2><p className="form-hint">A imagem é salva separadamente dos textos. Ela ilustra o projeto e não representa uma foto da execução.</p>
    <ImagemProjeto obraId={obra.id} imagem={obra.imagem_projeto} nome={obra.nome} />
    {failure && <p role="alert" className="form-error">{failure}</p>}
    {mustRefresh && <Button variant="secondary" disabled={saving || disabled} onClick={() => execute('refresh')}>Consultar imagem atual</Button>}
    <ImagemProjetoPicker key={obra.imagem_projeto?.id || 'sem-imagem'} file={file} disabled={saving || disabled} onChange={(value) => { setFile(value); setFailure(''); setMessage(''); }} />
    <div className="page-actions"><Button disabled={!file || saving || disabled || mustRefresh} loading={saving} onClick={() => execute('save')}>Salvar imagem do projeto</Button>{obra.imagem_projeto && !confirm && <Button variant="secondary" disabled={saving || disabled || mustRefresh} onClick={() => setConfirm(true)}>Remover imagem do projeto</Button>}</div>
    {confirm && <div className="imagem-removal"><p>Remover a perspectiva ilustrativa desta obra?</p><div className="page-actions"><Button variant="danger" disabled={saving || disabled || mustRefresh} onClick={() => execute('remove')}>Confirmar remoção da imagem</Button><Button variant="secondary" disabled={saving || disabled} onClick={() => setConfirm(false)}>Manter imagem</Button></div></div>}
    {(message || saving) && <p role="status" className="form-hint">{saving ? 'Atualizando imagem do projeto…' : message}</p>}
  </section>;
}
