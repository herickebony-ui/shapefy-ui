import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fmtDateBR } from './utils'

/**
 * Menu de contexto (botão direito) sobre uma linha/data do cronograma.
 * Ações:
 *   - Definir/Remover Marco Zero (toggle)
 *   - Abrir detalhes (formulário, dias_aviso, nota)
 *   - Remover linha
 */
export default function MarcoZeroMenu({
  menu, itemAtual, onClose, onSet, onAbrirDetalhes, onRemover,
}) {
  useEffect(() => {
    const fecharKey = (e) => { if (e.key === 'Escape') onClose() }
    const fecharClick = () => onClose()
    document.addEventListener('keydown', fecharKey)
    document.addEventListener('click', fecharClick)
    return () => {
      document.removeEventListener('keydown', fecharKey)
      document.removeEventListener('click', fecharClick)
    }
  }, [onClose])

  if (typeof document === 'undefined') return null
  const left = Math.min(menu.x, window.innerWidth - 220)
  const top = Math.min(menu.y, window.innerHeight - 220)

  return createPortal(
    <div
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[200] w-56 bg-[#1a1a1a] border border-[#323238] rounded-lg shadow-2xl overflow-hidden">
      <div className="px-3 py-2 border-b border-[#323238] text-[10px] uppercase tracking-widest text-gray-500 font-bold">
        {fmtDateBR(menu.date)}
      </div>
      {!itemAtual?.is_start && (
        <button onClick={() => onSet(true)}
          className="w-full text-left px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-[#29292e] transition-colors">
          Definir como Marco Zero
        </button>
      )}
      {itemAtual?.is_start && (
        <button onClick={() => onSet(false)}
          className="w-full text-left px-3 py-2 text-sm font-semibold text-yellow-300 hover:bg-[#29292e] transition-colors">
          Remover Marco Zero
        </button>
      )}
      {itemAtual && onAbrirDetalhes && (
        <button onClick={() => { onAbrirDetalhes(itemAtual); onClose() }}
          className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-[#29292e] transition-colors">
          Abrir detalhes
        </button>
      )}
      {itemAtual && onRemover && (
        <button onClick={() => { onRemover(itemAtual); onClose() }}
          className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
          Remover linha
        </button>
      )}
      <button onClick={onClose}
        className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-[#29292e] transition-colors border-t border-[#323238]">
        Fechar
      </button>
    </div>,
    document.body,
  )
}
