import { useState, useCallback } from 'react'

/**
 * useSelection — seleção de linhas (Set de keys) para ações em lote em listagens.
 *
 * const sel = useSelection()
 * sel.selected      // Set de keys selecionadas
 * sel.toggle(key)   // marca/desmarca uma linha
 * sel.togglePage(keys) // marca/desmarca todas as keys passadas (header "selecionar tudo")
 * sel.clear()       // limpa a seleção (chamar após a ação em lote)
 * sel.count         // quantidade selecionada
 */
export default function useSelection() {
  const [selected, setSelected] = useState(() => new Set())

  const toggle = useCallback((key) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }, [])

  const togglePage = useCallback((keys) => {
    setSelected((prev) => {
      const next = new Set(prev)
      const todasMarcadas = keys.length > 0 && keys.every((k) => next.has(k))
      if (todasMarcadas) keys.forEach((k) => next.delete(k))
      else keys.forEach((k) => next.add(k))
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  return { selected, toggle, togglePage, clear, count: selected.size }
}
