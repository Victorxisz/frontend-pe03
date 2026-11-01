import FeaturePage from '../../../shared/ui/FeaturePage';

export default function AvancoPage() {
  return <FeaturePage title="Detalhe do avanço" description="Revise conteúdo e mídias antes de publicar." actions={[["editar","Editar rascunho"],["publicar","Publicar"],["corrigir","Corrigir publicação"],["versoes","Comparar versões"]]} />;
}
