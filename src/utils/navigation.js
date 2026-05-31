// Abre href em nova aba quando há Cmd/Ctrl ou clique do botão do meio.
// Retorna true se abriu (o chamador deve interromper o fluxo normal).
export function maybeOpenNewTab(e, href) {
  if (!href) return false
  if (e.metaKey || e.ctrlKey || e.button === 1) {
    e.preventDefault()
    window.open(href, '_blank', 'noopener')
    return true
  }
  return false
}

// Abre em nova aba se Cmd/Ctrl/botão-do-meio; senão navega na mesma aba.
export function openOrNavigate(e, href, navigate) {
  if (!href) return
  if (maybeOpenNewTab(e, href)) return
  navigate(href)
}
