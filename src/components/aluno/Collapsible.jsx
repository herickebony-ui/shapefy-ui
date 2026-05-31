import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import GlassCard from './GlassCard'

// Accordion/colapsável da área do aluno — usado p/ agrupar gráficos e tabelas
// na tela de comparação. Cabeçalho clicável + conteúdo expansível.
// Modo controlado opcional: passe `open` + `onOpenChange` para controlar de fora.
export default function Collapsible({ icon, title, subtitle, defaultOpen = false, open: openProp, onOpenChange, children }) {
  const [openState, setOpenState] = useState(defaultOpen)
  const controlado = openProp !== undefined
  const open = controlado ? openProp : openState
  const toggle = () => {
    const next = !open
    if (!controlado) setOpenState(next)
    onOpenChange?.(next)
  }
  return (
    <GlassCard as="div" className="overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {icon && <span className="text-[#60A5FA] shrink-0">{icon}</span>}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-bold leading-snug">{title}</p>
          {subtitle && <p className="text-[var(--sf-text-soft)] text-[11px] mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown
          size={18}
          className={`text-[var(--sf-text-soft)] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--sf-border)]">
          {children}
        </div>
      )}
    </GlassCard>
  )
}
