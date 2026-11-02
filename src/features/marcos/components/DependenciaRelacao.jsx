import { ArrowRight } from 'lucide-react';

export default function DependenciaRelacao({ origem, destino }) {
  return <p className="dependencia-relacao"><strong>{origem}</strong><span>depende de <ArrowRight size={16} aria-hidden="true" /></span><strong>{destino}</strong></p>;
}
