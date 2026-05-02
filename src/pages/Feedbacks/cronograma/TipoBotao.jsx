import { Crosshair, Dumbbell, RefreshCw } from 'lucide-react'

/**
 * Toggle visual do tipo de agendamento.
 * - Marco Zero (is_start) → badge fixo, não clicável
 * - Troca (is_training) → click vira Feedback
 * - Feedback → click vira Troca
 */
export default function TipoBotao({ item, onToggle, size = 'md' }) {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  const iconSize = size === 'sm' ? 10 : 12

  if (item.is_start) {
    return (
      <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded
                       bg-[#2563eb]/10 text-[#2563eb] font-semibold border border-[#2563eb]/30`}>
        <Crosshair size={iconSize} />
        Marco Zero
      </span>
    )
  }

  if (item.is_training) {
    return (
      <button
        type="button"
        onClick={() => onToggle?.(item, false)}
        title="Clique para mudar para Feedback"
        className={`inline-flex items-center gap-1 ${sizeClasses} rounded
                   bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/30
                   hover:bg-purple-500/20 transition-colors`}
      >
        <Dumbbell size={iconSize} />
        Troca
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onToggle?.(item, true)}
      title="Clique para marcar como Troca de Treino"
      className={`inline-flex items-center gap-1 ${sizeClasses} rounded
                 bg-orange-500/10 text-orange-400 font-semibold border border-orange-500/30
                 hover:bg-orange-500/20 transition-colors`}
    >
      <RefreshCw size={iconSize} />
      Feedback
    </button>
  )
}
