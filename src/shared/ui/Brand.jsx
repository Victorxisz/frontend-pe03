import { Link } from 'react-router-dom';
export default function Brand() {
  return <Link className="brand" to="/obras" aria-label="Projeto Ágil — painel de obras"><span className="brand-name">Projeto <strong>Ágil</strong></span><span className="brand-description">Gestão de obras</span></Link>;
}
