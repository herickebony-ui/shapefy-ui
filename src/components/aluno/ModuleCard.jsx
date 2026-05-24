import { ChevronRight } from 'lucide-react'
import GlassCard from './GlassCard'
import HexIcon from './HexIcon'

// Card de modulo da home — hex icon + label + badge + chevron.
// Substitui o ModuloCard inline da AlunoHome — padroniza o visual.
//
// Props:
//   icon: ReactNode (ja JSX, ex: <Dumbbell size={18} />)
//   label: string
//   badge?: string | number (mostra glow azul quando > 0)
//   onClick: () => void
//   disabled?: bool
//   hint?: string (title quando disabled)

export default function ModuleCard({ icon, label, badge, onClick, disabled, hint }) {
  return (
    <GlassCard
      as="button"
      disabled={disabled}
      onClick={onClick}
      title={disabled ? hint : undefined}
      className="px-3 py-4 flex items-center gap-2"
    >
      <HexIcon size={42}>{icon}</HexIcon>
      <span className="flex-1 min-w-0 text-white text-sm font-bold truncate">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        {badge !== undefined && badge !== null && Number(badge) > 0 && (
          <span className="h-5 min-w-5 px-1.5 rounded-md bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(37,99,235,0.45)]">
            {badge}
          </span>
        )}
        <ChevronRight size={14} className="text-[#64748B]" />
      </div>
    </GlassCard>
  )
}
