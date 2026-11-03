import { formatarDataHora } from '../../../shared/lib/datas';
import { descreverValor } from '../mudanca';
export default function MudancasRegistradas({ events, tipo, targetId }) {
  const decisions = events.filter(e => e.alvo.tipo === tipo && e.alvo.id === targetId && e.campos.some(c => ['estado', 'entrega', 'periodo_previsto'].includes(c)));
  return <section className="feature-card" aria-label="Mudanças registradas"><h3>Mudanças registradas</h3>
    {!decisions.length && <p>Nenhuma mudança deste alvo foi retornada pelo histórico.</p>}
    {decisions.map(event => <article key={event.id} className="mudanca-evento"><h4>{event.campos.join(', ')}</h4><p>Antes: {descreverValor(event.antes)}</p><p>Depois: {descreverValor(event.depois)}</p><p>Motivo: {event.motivo}</p><p>Autor: {event.autor} · <time dateTime={event.instante}>{formatarDataHora(event.instante)}</time></p></article>)}
  </section>;
}
