export const camposDescritivos = ['nome', 'cliente', 'localizacao', 'descricao'];
export const labelsDescritivos = { nome: 'Nome da obra', cliente: 'Cliente de referência', localizacao: 'Localização', descricao: 'Descrição' };

export function validarDescritiva(dados) {
  return Object.fromEntries(camposDescritivos.filter((campo) => typeof dados[campo] !== 'string' || !dados[campo].trim()).map((campo) => [campo, 'Preencha este campo.']));
}

export function alteracoesDescritivas(original, dados) {
  return Object.fromEntries(camposDescritivos
    .filter((campo) => dados[campo].trim() !== (original[campo] || '').trim())
    .map((campo) => [campo, dados[campo].trim()]));
}
