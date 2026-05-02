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
 * Match canônico de busca: substring acent-insensitive com suporte a coringa `%`.
 *
 * - `textos`: string ou array de strings (matcha se ALGUM contiver a query)
 * - `query`: string digitada pelo usuário
 * - `opts.coringa`: se true (default), `%` separa partes que devem aparecer em ordem
 *
 * Retorna `true` quando query vazia (não filtra nada).
 */
export const buscarSmart = (textos, query, { coringa = true } = {}) => {
  const q = normalizarTexto(query || '').trim()
  if (!q) return true
  const lista = Array.isArray(textos) ? textos : [textos]
  const checa = (texto) => {
    const t = normalizarTexto(texto || '')
    if (!t) return false
    if (coringa && q.includes('%')) {
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
