// Utilitários de string — usados em buscas de exercícios e grupos musculares

export const normalizar = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '')

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
