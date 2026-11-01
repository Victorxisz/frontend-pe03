import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const tabs = [['marcos', 'Marcos'], ['publicacoes', 'Publicações'], ['ocorrencias', 'Ocorrências'], ['trabalhadores', 'Trabalhadores'], ['historico', 'Histórico'], ['simulados', 'Exemplos simulados']];
export default function ObraLayout() {
  const { obraId } = useParams();
  return <><Link className="back-link" to="/obras"><ArrowLeft size={15} />Painel das Obras</Link><header className="page-heading"><span className="eyebrow">Acompanhamento da obra</span><h1>Área da obra</h1><p>Marcos, evidências e decisões em um só lugar.</p><p className="record-reference">Referência: {obraId}</p></header><nav className="obra-tabs" aria-label="Seções da obra">{tabs.map(([path, label]) => <NavLink key={path} to={`/obras/${obraId}/${path}`}>{label}</NavLink>)}</nav><Outlet /></>;
}
