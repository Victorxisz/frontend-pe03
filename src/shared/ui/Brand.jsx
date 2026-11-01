import { Link } from 'react-router-dom';
import { Ruler } from 'lucide-react';
export default function Brand() {
  return <Link className="brand" to="/obras" aria-label="Projeto Ágil — painel de obras"><span className="brand-icon"><Ruler size={20} /></span><span className="brand-name">Projeto Ágil</span><span className="eyebrow">Construtora</span></Link>;
}
