import { ApiError } from '../../shared/api/http.js';
// Retenção e links de acesso são informações de leitura, não alterações de conteúdo.
export function mesmoConteudo(a, b) {
  return a?.descricao === b?.descricao && a?.data === b?.data
    && Array.isArray(a?.midias) && Array.isArray(b?.midias)
    && a.midias.length === b.midias.length
    && a.midias.every((midia, index) => midia.id === b.midias[index].id);
}
export function leituraDesatualizada() {
  return new ApiError('A publicação foi alterada durante a consulta. Recarregue e revise o conteúdo atual antes de corrigir.', 409);
}
export function conferirLeitura(detail, chain, publication) {
  const current = chain.versoes.filter(v => v.atual);
  if (current.length !== 1 || current[0] !== chain.versoes.at(-1)
      || !mesmoConteudo(detail, current[0].conteudo) || !mesmoConteudo(detail, publication)) throw leituraDesatualizada();
}
