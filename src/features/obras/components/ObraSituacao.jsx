import { AlertTriangle } from 'lucide-react';
import { StatusBadge } from '../../../shared/ui/UI';

const estados = {
  planejada: ['planejada', 'Planejada'], 'em andamento': ['em-andamento', 'Em andamento'],
  'concluída': ['concluida-obra', 'Concluída'], suspensa: ['suspensa', 'Suspensa'],
};

export default function ObraSituacao({ obra }) {
  const [classe, nome] = estados[obra.estado] || ['desconhecido', obra.estado || 'Estado não informado'];
  return <div className="obra-situacao" aria-label="Estado e alertas">
    <StatusBadge status={classe}>{nome}</StatusBadge>
    {obra.alertas?.map((alerta) => <span key={alerta} className="obra-alerta"><AlertTriangle size={14} aria-hidden="true" />{alerta === 'atrasada' ? 'Atrasada' : alerta}</span>)}
  </div>;
}
