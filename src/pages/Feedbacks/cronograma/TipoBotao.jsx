import { Crosshair, Dumbbell, RefreshCw } from 'lucide-react'

/**
 * Toggle visual do tipo de agendamento.
 * - Marco Zero (is_start) → badge fixo, não clicável
 * - Troca (is_training) → click vira Feedback
 * - Feedback → click vira Troca
 *
 * Variants:
 *   variant="label" (default) — ícone + texto colorido (Wizard, etc)
 *   variant="icon" — só ícone num quadrado clicável (tabela compacta)
 */
export default function TipoBotao({ item, onToggle, size = 'md', variant = 'label' }) {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  const iconSize = size === 'sm' ? 12 : 14

  // Modo "icon only" — botão quadrado pra tabelas compactas
  if (variant === 'icon') {
    if (item.is_start) {
      return (
        <span title="Marco Zero"
          className="h-7 w-7 inline-flex items-center justify-center rounded-lg
                     bg-[#2563eb]/15 text-[#2563eb] border border-[#2563eb]/40">
          <Crosshair size={iconSize} />
        </span>
      )
    }
    if (item.is_training) {
      return (
        <button type="button"
          onClick={() => onToggle?.(item, false)}
          title="Troca de Treino — clique para voltar a Feedback"
          className="h-7 w-7 inline-flex items-center justify-center rounded-lg
                     bg-purple-500/15 text-purple-300 border border-purple-500/40
                     hover:bg-purple-500/25 transition-colors">
          <Dumbbell size={iconSize} />
        </button>
      )
    }
    return (
      <button type="button"
        onClick={() => onToggle?.(item, true)}
        title="Feedback — clique para marcar como Troca de Treino"
        className="h-7 w-7 inline-flex items-center justify-center rounded-lg
                   bg-[#1a1a1a] text-gray-300 border border-[#323238]
                   hover:bg-[#222226] hover:text-white transition-colors">
        <RefreshCw size={iconSize} />
      </button>
    )
  }

  // Modo "label" (padrão) — texto + cor
  if (item.is_start) {
    return (
      <span className={`inline-flex items-center gap-1 ${sizeClasses} rounded
                       bg-[#2563eb]/10 text-[#2563eb] font-semibold border border-[#2563eb]/30`}>
        <Crosshair size={size === 'sm' ? 10 : 12} />
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
        <Dumbbell size={size === 'sm' ? 10 : 12} />
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
      <RefreshCw size={size === 'sm' ? 10 : 12} />
      Feedback
    </button>
  )
}
