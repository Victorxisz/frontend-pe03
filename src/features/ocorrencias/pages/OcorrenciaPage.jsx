import FeaturePage from '../../../shared/ui/FeaturePage';

export default function OcorrenciaPage() {
  return <FeaturePage title="Detalhe da ocorrência" description="Consulte evidências, alterações de estado e aceitações." actions={[["editar","Atualizar"],["aceitacoes","Aceitações"]]} />;
}
