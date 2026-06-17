/**
 * Retorna o email do profissional "dono" dos dados da sessão atual.
 * - Para profissionais: próprio email (frappe_user)
 * - Para funcionários: email do profissional que representam (frappe_professional),
 *   gravado no login quando o backend detecta um funcionário
 */
export const profissionalLogado = () =>
  localStorage.getItem('frappe_professional') || localStorage.getItem('frappe_user') || ''
