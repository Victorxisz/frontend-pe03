import { formatarDataHora } from '../../../shared/lib/datas';
function texto(valor) { return valor == null || valor === '' ? 'Não informado' : String(valor); }
function Aceitacao({ item }) {
  return <li><p>Justificativa: {texto(item.justificativa)}</p>{item.medida_compensatoria && <p>Medida compensatória: {item.medida_compensatoria}</p>}<p>Autor: {texto(item.autor)} · <time dateTime={item.data || undefined}>{formatarDataHora(item.data)}</time></p><p>Episódio: {item.episodio ?? 0}</p></li>;
}
export default function HistoricoOcorrencia({ item }) {
  const historico = item.historico_estados;
  return <section className="ocorrencia-historico" aria-label="Histórico da ocorrência"><h3>Histórico de estados</h3>
    {!Array.isArray(historico) ? <p>Histórico não fornecido pelo servidor.</p> : historico.length === 0 ? <p>Nenhuma transição registrada.</p> : <ol>{historico.map((evento, i) => <li key={evento.id || i}><p>{texto(evento.estado_anterior)} → {texto(evento.novo_estado)}</p><p>Motivo: {texto(evento.motivo)}</p><p>Autor: {texto(evento.autor)} · <time dateTime={evento.instante || undefined}>{formatarDataHora(evento.instante)}</time></p></li>)}</ol>}
    <h3>Aceitações do estado atual</h3>{item.aceitacoes_do_estado_atual.length ? <ol>{item.aceitacoes_do_estado_atual.map((a, i) => <Aceitacao key={a.id || i} item={a} />)}</ol> : <p>Nenhuma aceitação no episódio atual.</p>}
    <h3>Todas as aceitações registradas</h3>{item.aceitacoes.length ? <ol>{item.aceitacoes.map((a, i) => <Aceitacao key={a.id || i} item={a} />)}</ol> : <p>Nenhuma aceitação histórica registrada.</p>}
  </section>;
}
