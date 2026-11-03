import { formatarDataHora } from '../../../shared/lib/datas';
import { Link } from 'react-router-dom';
import { formatarDia, diaValido } from '../../../shared/lib/datas';
import { idRecurso } from '../api';

function Valor({ value }) {
  if (value === null || value === undefined) return <span>Não informado</span>;
  if (Array.isArray(value)) return value.length ? <ol>{value.map((v, i) => <li key={i}><Valor value={v} /></li>)}</ol> : <span>Lista vazia</span>;
  if (typeof value === 'object') return Object.keys(value).length ? <dl>{Object.entries(value).map(([k, v]) => <div key={k}><dt>{k.replaceAll('_', ' ')}</dt><dd><Valor value={v} /></dd></div>)}</dl> : <span>Objeto vazio</span>;
  return <span>{typeof value === 'string' && diaValido(value) ? formatarDia(value) : String(value)}</span>;
}
export default function EventoHistorico({ evento, obraId, search = '', detalhe = false }) {
  const base = `/obras/${encodeURIComponent(obraId)}`;
  const consultaId = idRecurso(evento.consulta, '/mudancas/');
  const comparacaoId = idRecurso(evento.comparacao, '/avancos/', '/versoes');
  const alvo = evento.alvo;
  const destino = alvo.tipo === 'obra' && alvo.id === obraId ? `${base}/marcos` : alvo.tipo === 'marco' ? `${base}/marcos/${encodeURIComponent(alvo.id)}` : alvo.tipo === 'avanco' ? `${base}/avancos/${encodeURIComponent(alvo.id)}` : null;
  return <article className="feature-card historico-evento">
    <h3>{evento.campos.join(', ') || evento.tipo}</h3>
    <p>Alvo: {alvo.tipo} · {alvo.id}</p>
    <div className="historico-valores"><section><h4>Antes</h4><Valor value={evento.antes} /></section><section><h4>Depois</h4><Valor value={evento.depois} /></section></div>
    <p>Motivo: {evento.motivo}</p><p>Autor: {evento.autor}</p><p>Instante: <time dateTime={evento.instante}>{formatarDataHora(evento.instante)}</time></p>
    <div className="historico-links page-actions action-toolbar">{!detalhe && consultaId && <Link className="button button-secondary" to={`${base}/historico/${encodeURIComponent(consultaId)}${search}`}>Ver detalhe</Link>}
    {destino && <Link className="button button-secondary" to={`${destino}${search}`}>Consultar {alvo.tipo} atual</Link>}
    {alvo.tipo === 'avanco' && comparacaoId === alvo.id && <Link className="button button-secondary" to={`${base}/avancos/${encodeURIComponent(comparacaoId)}/versoes${search}`}>Comparar versões</Link>}</div>
  </article>;
}
