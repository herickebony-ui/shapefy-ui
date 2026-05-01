import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fmtDateBR } from './utils'

export default function MarcoZeroMenu({ menu, itemAtual, onClose, onSet }) {
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
  const top = Math.min(menu.y, window.innerHeight - 150)

  return createPortal(
    <div
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[200] w-52 bg-[#1a1a1a] border border-[#323238] rounded-lg shadow-2xl overflow-hidden">
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
      <button onClick={onClose}
        className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-[#29292e] transition-colors">
        Cancelar
      </button>
    </div>,
    document.body,
  )
}
