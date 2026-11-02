import { useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { useMarcos } from '../../marcos/useMarcos';
import useConsulta from '../../publicacoes/useConsulta';
import ConsultaFeedback from '../../publicacoes/components/ConsultaFeedback';
import MediaViewer from '../../../shared/ui/MediaViewer';
import { ocorrenciasApi } from '../api';
import '../ocorrencias.css';
export default function OcorrenciaPage() {
  const { obraId, ocorrenciaId } = useParams();
  return <OcorrenciaDetalhe key={`${obraId}:${ocorrenciaId}`} obraId={obraId} ocorrenciaId={ocorrenciaId} />;
}
function OcorrenciaDetalhe({ obraId, ocorrenciaId }) { const { search, state: navigation } = useLocation(); const { request } = useAuth();
  const base = `/obras/${encodeURIComponent(obraId)}/ocorrencias`;
  const state = useConsulta(signal => ocorrenciasApi(request).detail(obraId, ocorrenciaId, signal), [request, obraId, ocorrenciaId]);
  const workers = useConsulta(signal => ocorrenciasApi(request).workers(obraId, signal), [request, obraId]);
  const marcos = useMarcos(obraId); const loadMedia = useCallback((id, signal) => ocorrenciasApi(request).media(id, signal), [request]);
  const item = state.data;
  const nomeMarco = marcos.data?.find(m => m.id === item?.marco_id)?.nome;
  const nomeResponsavel = workers.data?.find(w => w.id === item?.responsavel_id)?.nome;
  const anterior = item?.responsavel_anterior;
  return <section className="feature-page"><h2>Detalhe da ocorrência</h2>{navigation?.ocorrenciaCriada === ocorrenciaId && <p role="status">Ocorrência registrada com sucesso.</p>}
    <ConsultaFeedback state={state} />{item && <article className="feature-card ocorrencia-card"><h3>{item.titulo}</h3><p>{item.descricao}</p><p>Estado: {item.estado}</p><p>Marco: {item.marco_id ? nomeMarco || `Referência ${item.marco_id}` : 'Não informado'}</p><p>Responsável atual: {item.responsavel_id ? nomeResponsavel || `Referência ${item.responsavel_id}` : 'Não atribuído'}</p>
      {anterior && <p>Responsável anterior (histórico): {typeof anterior === 'object' ? [anterior.nome, anterior.cargo, anterior.id].filter(Boolean).join(' · ') : String(anterior)}</p>}
      <p>Autoria: {item.autor || 'Não informada'}</p><p>Registrada em: <time dateTime={item.data_registro || undefined}>{item.data_registro || 'Não informado'}</time></p>
      {item.estado === 'sem solução' && <p>{item.aceitacoes_do_estado_atual?.length ? 'Há aceitação registrada para o estado atual.' : 'Sem aceitação registrada para o estado atual.'} <Link to={`${base}/${encodeURIComponent(item.id)}/aceitacoes${search}`}>Consultar aceitações</Link></p>}
      <section aria-label="Evidências"><h3>Evidências</h3>{item.midias.length ? item.midias.map((media, i) => <MediaViewer key={media.id || i} media={media} loadContent={loadMedia} />) : <p>Nenhuma evidência anexada.</p>}</section>
      <div className="page-actions"><Link to={`${base}/${encodeURIComponent(item.id)}/editar${search}`}>Atualizar ocorrência</Link><Link to={`${base}/${encodeURIComponent(item.id)}/aceitacoes${search}`}>Aceitações</Link></div>
    </article>}
    <p><Link to={`${base}${search}`}>Voltar às ocorrências</Link></p>
  </section>;
}
