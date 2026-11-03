export function validarTrabalhador(dados) {
  const erros = {};
  const labels = { nome: 'o nome', email: 'o e-mail', telefone: 'o telefone', cargo: 'o cargo' };
  Object.keys(labels).forEach(campo => {
    if (!dados[campo]?.trim()) erros[campo] = `Informe ${labels[campo]}.`;
  });
  if (!erros.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(dados.email.trim())) erros.email = 'Informe um e-mail válido, como nome@exemplo.com.';
  if (!erros.telefone && (!/^[0-9()\s-]+$/.test(dados.telefone.trim()) || ![10, 11].includes(dados.telefone.replace(/[^0-9]/g, '').length))) {
    erros.telefone = 'Informe um telefone com DDD, de 10 ou 11 dígitos, sem +55.';
  }
  return erros;
}
export function formatarTelefone(valor) {
  if (/^[0-9]{10,11}$/.test(valor || '')) return valor.replace(/^([0-9]{2})([0-9]{4,5})([0-9]{4})$/, '($1) $2-$3');
  return valor || 'Não informado';
}
// O POST não é idempotente: resposta perdida exige consulta antes de novo envio.
export const chaveCadastro = obraId => `pe03:trabalhador-pendente:${obraId}`;
export function cadastroPendente(obraId) {
  try { return sessionStorage.getItem(chaveCadastro(obraId)) === '1'; } catch { return false; }
}
