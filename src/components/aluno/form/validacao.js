const isSecao = (t) => t === 'Quebra de Seção' || t === 'Quebra de Sessão' || t === 'Section Break'
const isHTML = (t) => t === 'Bloco HTML' || t === 'HTML'

function respostaPreenchida(r) {
  if (r === null || r === undefined) return false
  if (typeof r === 'string') return r.trim().length > 0
  if (typeof r === 'number') return true
  if (Array.isArray(r)) return r.length > 0
  if (typeof r === 'object') return Object.keys(r).length > 0
  return false
}

// Dado um array de perguntas (formato child table), retorna as obrigatórias
// que ainda não têm resposta preenchida — cada item: { p, idx }.
export function listarFaltantesObrigatorias(perguntas) {
  return perguntas
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => !isSecao(p.tipo) && !isHTML(p.tipo))
    .filter(({ p }) => Number(p.reqd) === 1 && !respostaPreenchida(p.resposta))
}
