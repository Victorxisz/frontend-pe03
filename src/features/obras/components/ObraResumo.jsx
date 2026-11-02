import { formatarDia, formatarEntrega } from '../../../shared/lib/datas';

export default function ObraResumo({ obra }) {
  const dados = [
    ['Nome', obra.nome], ['Tipo', obra.tipo === 'apartamentos' ? 'Apartamentos' : obra.tipo === 'casa' ? 'Casa' : '—'],
    ['Cliente de referência', obra.cliente], ['Localização', obra.localizacao],
    ['Descrição', obra.descricao], ['Início da obra', formatarDia(obra.inicio)], ['Entrega', formatarEntrega(obra.entrega)],
  ];
  return <dl className="obra-resumo">{dados.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>;
}
