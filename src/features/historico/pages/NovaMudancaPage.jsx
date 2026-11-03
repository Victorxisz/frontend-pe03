import { useState } from 'react';
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom';
import { Field } from '../../../shared/ui/UI';
import MarcoSelect from '../../marcos/components/MarcoSelect';
import MudancaForm from '../components/MudancaForm';
export default function NovaMudancaPage() {
  const { obraId } = useParams(); const { search } = useLocation(); const context = useOutletContext();
  return <EscolherMudanca key={obraId} obraId={obraId} search={search} onObraConsultada={context?.onObraConsultada} />;
}
function EscolherMudanca({ obraId, search, onObraConsultada }) {
  const params = new URLSearchParams(search);
  const [tipo, setTipo] = useState(params.get('alvo') === 'marco' ? 'marco' : 'obra');
  const [marcoId, setMarcoId] = useState(params.get('marcoId') || '');
  const [campo, setCampo] = useState(params.get('campo') === 'estado' ? 'estado' : params.get('alvo') === 'marco' ? 'periodo_previsto' : 'entrega');
  const [busy, setBusy] = useState(false);
  const targetId = tipo === 'obra' ? obraId : marcoId;
  const backParams = new URLSearchParams(search); ['alvo', 'marcoId', 'campo'].forEach(key => backParams.delete(key));
  const backSearch = backParams.size ? `?${backParams}` : '';
  return <section className="feature-page"><h2>Registrar mudança</h2><p>Replaneje prazos ou altere a situação com motivo e histórico.</p>
    <div className="feature-card form-grid"><Field label="Tipo do alvo"><select aria-label="Tipo do alvo" disabled={busy} value={tipo} onChange={e => { const value = e.target.value; setTipo(value); setCampo(value === 'obra' ? 'entrega' : 'periodo_previsto'); }}><option value="obra">Obra</option><option value="marco">Marco</option></select></Field>
    {tipo === 'marco' && <MarcoSelect obraId={obraId} value={marcoId} onChange={setMarcoId} disabled={busy} required />}
    <Field label="Campo da mudança"><select aria-label="Campo da mudança" disabled={busy} value={campo} onChange={e => setCampo(e.target.value)}><option value={tipo === 'obra' ? 'entrega' : 'periodo_previsto'}>{tipo === 'obra' ? 'Entrega' : 'Período previsto'}</option><option value="estado">Estado</option></select></Field></div>
    {targetId && <MudancaForm key={`${tipo}:${targetId}:${campo}`} {...{ obraId, tipo, targetId, campo, onObraConsultada }} onBusy={setBusy} />}
    {!busy && <p><Link className="button button-secondary" to={`/obras/${encodeURIComponent(obraId)}/${tipo === 'marco' && marcoId ? `marcos/${encodeURIComponent(marcoId)}` : 'marcos'}${backSearch}`}>Cancelar e voltar</Link></p>}
  </section>;
}
