import { formatarDataHora } from '../../../shared/lib/datas';
import { formatDate } from '../../../shared/ui/UI';
import MidiaEvidencia from './MidiaEvidencia';
import '../publicacoes.css';
export function Origem({ origem }) {
  if (!origem) return null;
  return <p className="version-origin">Simulado · {typeof origem === 'object' ? [origem.perfil, origem.nome].filter(Boolean).join(' · ') : typeof origem === 'string' ? origem : 'Origem simulada'}</p>;
}
export default function ComparacaoVersoes({ versoes }) {
  if (!versoes.length) return <p>Nenhuma versão publicada disponível.</p>;
  return <div className="version-list">{versoes.map(v => <article className="feature-card version-card" key={v.numero} aria-label={`Versão ${v.numero}`}>
    <h3>Versão {v.numero} · {v.atual ? 'Atual' : v.numero === 1 ? 'Publicação inicial' : 'Anterior'}</h3>
    <Origem origem={v.origem_simulada} /><p>Autor original: {v.autor_original || 'Não informado'}</p>
    <p>Data do trabalho: {formatDate(v.conteudo.data)}</p><p className="version-text">{v.conteudo.descricao}</p>
    {v.conteudo.midias.map((m, i) => <MidiaEvidencia key={m.id || i} midia={m} />)}
    {v.correcao && <section aria-label="Correção registrada">
      {v.origem_simulada && <p><strong>Editado pela construtora</strong></p>}
      <p>Autor da correção: {v.correcao.autor}</p><p>Instante da correção: <time dateTime={v.correcao.instante}>{formatarDataHora(v.correcao.instante)}</time></p>
      <p>Motivo: {v.correcao.motivo}</p><p>Campos alterados: {v.correcao.campos.join(', ')}</p>
      <div className="version-comparison"><div><h4>Antes</h4><p>Data: {formatDate(v.correcao.antes.data)}</p><p className="version-text">{v.correcao.antes.descricao}</p><p>Mídias: {v.correcao.antes.midias.map(m => m.nome || m.id).join(', ') || 'Nenhuma'}</p></div>
      <div><h4>Depois</h4><p>Data: {formatDate(v.correcao.depois.data)}</p><p className="version-text">{v.correcao.depois.descricao}</p><p>Mídias: {v.correcao.depois.midias.map(m => m.nome || m.id).join(', ') || 'Nenhuma'}</p></div></div>
      <h4>Diferenças do texto</h4><ul className="version-diffs">{v.correcao.diferencas_texto.map((d, i) => <li key={i}><strong>{d.tipo}</strong> {d.tipo === 'igual' ? <span>{d.depois}</span> : <><del>{d.antes}</del> <ins>{d.depois}</ins></>}</li>)}</ul>
    </section>}
  </article>)}</div>;
}
