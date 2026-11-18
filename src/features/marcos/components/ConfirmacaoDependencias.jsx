import ConfirmDialog from '../../../shared/ui/ConfirmDialog';
import { MarcoEstado } from './MarcoFeedback';
export function dependenciasPendentes(error, command) {
  const dependencies = error.data?.dependencias;
  return error.status === 409 && error.code === 'DEPENDENCIAS_PENDENTES' && command.alvo.tipo === 'marco' && command.campo === 'estado' && ['concluído', 'em andamento'].includes(command.novo_valor) && Array.isArray(dependencies) && dependencies.length > 0 && dependencies.every(item => typeof item?.id === 'string' && typeof item.nome === 'string' && typeof item.estado === 'string') ? dependencies : null;
}
export default function ConfirmacaoDependencias({ warning, nome, busy, heading, onCancel, onConfirm }) {
  const iniciando = warning.command.novo_valor === 'em andamento';
  return <ConfirmDialog title={iniciando ? 'Iniciar com pré-requisitos pendentes?' : 'Concluir com pré-requisitos pendentes?'} confirmLabel={iniciando ? 'Iniciar mesmo assim' : 'Concluir mesmo assim'} confirmVariant="primary" returnFocusRef={heading} busy={busy} onCancel={onCancel} onConfirm={() => onConfirm({ ...warning.command, confirmar_dependencias: true })}>
    <p><strong>{nome}</strong> depende de entregas que ainda não foram concluídas:</p>
    <ul className="estado-pendencias">{warning.dependencies.map(item => <li key={item.id}><strong>{item.nome}</strong><MarcoEstado estado={item.estado} /></li>)}</ul>
    <p>Você pode {iniciando ? 'iniciar' : 'concluir'} este marco mesmo assim. Essa decisão e o motivo serão registrados.</p><p><strong>Motivo:</strong> {warning.command.motivo}</p>
  </ConfirmDialog>;
}
