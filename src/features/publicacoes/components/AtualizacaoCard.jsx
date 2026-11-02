import { Link, useLocation } from 'react-router-dom';
import { formatDate } from '../../../shared/ui/UI';
import { Origem } from './ComparacaoVersoes';
import MidiaEvidencia from './MidiaEvidencia';
export default function AtualizacaoCard({ item, obraId, links = true }) {
  const { search } = useLocation();
  const base = `/obras/${encodeURIComponent(obraId)}/avancos/${encodeURIComponent(item.avanco_id || item.id)}`;
  return <article className="feature-card">
    <h3>{item.marco?.nome || 'Avanço da obra'}</h3>
    <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{item.descricao}</p>
    <p>Data do trabalho: {formatDate(item.data)}</p>
    {item.instante && <p>Publicado em: <time dateTime={item.instante}>{new Date(item.instante).toLocaleString('pt-BR')}</time> · Autor: {item.autor}</p>}
    {item.editado && <p>Conteúdo editado · publicação original preservada</p>}
    <Origem origem={item.origem_simulada || item.simulado} />
    {item.autor_original && <p>Autor original: {item.autor_original}</p>}
    {item.editado_pela_construtora && <p>Editado pela construtora</p>}
    {item.ultima_correcao && <p>Texto anterior: {item.ultima_correcao.texto_anterior} · Campos: {item.ultima_correcao.campos?.join(', ')} · Última correção: {item.ultima_correcao.motivo} · {item.ultima_correcao.autor} · {item.ultima_correcao.instante}</p>}
    {item.midias.map(midia => <MidiaEvidencia key={midia.id} midia={midia} />)}
    {links && <nav className="form-actions"><Link to={`${base}${search}`}>Ver detalhe</Link> <Link to={`${base}/corrigir${search}`}>Corrigir publicação</Link> <Link to={`${base}/versoes${search}`}>Consultar versões</Link></nav>}
  </article>;
}
