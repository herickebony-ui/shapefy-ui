// Utilitários de string — busca normalizada e match com coringa.

/**
 * Normaliza para igualdade exata (sem acento, lower, sem espaços).
 * Útil pra comparar tokens curtos como nomes de grupo muscular.
 * Para busca de texto livre, prefira `normalizarTexto` ou `buscarSmart`.
 */
export const normalizar = (s = '') =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '')

/**
 * Normaliza preservando espaços — usado pelo `buscarSmart` para substring real.
 */
export const normalizarTexto = (s = '') =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Match canônico de busca: substring acent-insensitive com coringa `%`.
 *
 * - `textos`: string ou array de strings (matcha se ALGUM campo contiver).
 * - `query`: string digitada. Espaço é literal; `%` é coringa e as partes
 *   precisam aparecer NA ORDEM (mesma semântica do `LIKE` do banco).
 *
 * Ex: "%jo%luc%" casa "João Lucas" (jo…luc em ordem) mas não "João Silva".
 * Retorna `true` quando a query é vazia (não filtra nada).
 */
export const buscarSmart = (textos, query) => {
  const q = normalizarTexto(query || '').trim()
  if (!q) return true
  const lista = Array.isArray(textos) ? textos : [textos]
  const checa = (texto) => {
    const t = normalizarTexto(texto || '')
    if (!t) return false
    if (q.includes('%')) {
      const partes = q.split('%').map(p => p.trim()).filter(Boolean)
      let idx = 0
      for (const p of partes) {
        const f = t.indexOf(p, idx)
        if (f === -1) return false
        idx = f + p.length
      }
      return true
    }
    return t.includes(q)
  }
  return lista.some(checa)
}

/**
 * Monta o padrão `LIKE` do Frappe a partir da query do usuário.
 *
 * O coringa `%` é preservado como wildcard (partes em ordem) e o espaço é
 * literal. A query é sempre envolvida por `%...%` para casar substring.
 *
 *   padraoLike('joao')      → '%joao%'
 *   padraoLike('%jo%luc%')  → '%jo%luc%'   (jo…luc em ordem)
 *   padraoLike('joao lucas')→ '%joao lucas%' (espaço literal)
 *
 * Retorna `null` quando não há termo. Acento depende da collation do banco
 * (best-effort); listas pequenas filtram local com `buscarSmart`.
 */
export const padraoLike = (query) => {
  const partes = String(query || '').split('%').map(p => p.trim()).filter(Boolean)
  return partes.length ? `%${partes.join('%')}%` : null
}

/**
 * Açúcar pra montar a condição de filtro Frappe a partir da query.
 *
 * - `campo`: nome do campo OU prefixo `[doctype, campo]` (reportview.get).
 * - Retorna array (0 ou 1 condição) pronto pra spread no `filters`.
 *
 *   filtrosBusca('nome_completo', q)           → [['nome_completo','like','%a%']]
 *   filtrosBusca(['Modelo Ficha','titulo'], q) → [['Modelo Ficha','titulo','like','%a%']]
 */
export const filtrosBusca = (campo, query) => {
  const p = padraoLike(query)
  if (!p) return []
  const prefixo = Array.isArray(campo) ? campo : [campo]
  return [[...prefixo, 'like', p]]
}

/**
 * Extrai o primeiro nome de uma string "Nome Sobrenome ...".
 * Devolve string vazia se vier nada.
 */
export const primeiroNome = (nomeCompleto = '') =>
  String(nomeCompleto).trim().split(/\s+/)[0] || ''

/**
 * Mantido pra compat — versão antiga que removia espaços.
 * Novo código deve usar `buscarSmart`.
 */
export const buscarComCoringa = (texto, query) => {
  const partes = query.split('%').map(p => p.trim()).filter(Boolean)
  const norm = normalizar(texto)
  let idx = 0
  for (const p of partes) {
    const found = norm.indexOf(normalizar(p), idx)
    if (found === -1) return false
    idx = found + p.length
  }
  return true
}
