import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { publicacoesApi } from '../api';
import useConsulta from '../useConsulta';
import AtualizacaoCard from '../components/AtualizacaoCard';
import ConsultaFeedback from '../components/ConsultaFeedback';
export default function PublicacoesPage() {
  const { obraId } = useParams(); const { request } = useAuth();
  const state = useConsulta(signal => publicacoesApi(request).preview(obraId, signal), [request, obraId]);
  return <section><h2>Publicações da obra</h2><p>Prévia da linha do tempo · acesso da construtora</p><ConsultaFeedback state={state} />
    {state.data?.length === 0 && <p>Nenhuma publicação nesta obra. Rascunhos não aparecem na linha do tempo.</p>}
    {state.data?.map(item => <AtualizacaoCard key={item.avanco_id || item.id} item={item} obraId={obraId} />)}
  </section>;
}
