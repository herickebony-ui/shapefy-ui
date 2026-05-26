import { Crosshair, Dumbbell, RefreshCw } from 'lucide-react'

/**
 * Toggle de tipo de agendamento (ciclo de 3 estados).
 *
 * Cycle: Feedback → Troca → Marco Zero → Feedback
 *
 * onCycle({ is_start, is_training }) — invocado com os novos valores.
 *
 * Variants:
 *   variant="label" (default) — ícone + texto colorido (Wizard, etc)
 *   variant="icon" — só ícone num quadrado clicável (tabela compacta)
 */
export default function TipoBotao({ item, onCycle, size = 'md', variant = 'label' }) {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
  const iconSize = size === 'sm' ? 12 : 14

  // Próximo estado no ciclo Feedback → Troca → Marco Zero → Feedback
  const proxEstado = item.is_start
    ? { is_start: false, is_training: false }       // Marco Zero → Feedback
    : item.is_training
      ? { is_start: true, is_training: false }      // Troca → Marco Zero
      : { is_start: false, is_training: true }      // Feedback → Troca

  // Modo "icon only" — botão quadrado pra tabelas compactas
  if (variant === 'icon') {
    if (item.is_start) {
      return (
        <button type="button"
          onClick={() => onCycle?.(item, proxEstado)}
          title="Marco Zero — clique para voltar a Feedback"
          className="h-7 w-7 inline-flex items-center justify-center rounded-lg
                     bg-[#2563eb]/15 text-[#2563eb] border border-[#2563eb]/40
                     hover:bg-[#2563eb]/25 transition-colors">
          <Crosshair size={iconSize} />
        </button>
      )
    }
    if (item.is_training) {
      return (
        <button type="button"
          onClick={() => onCycle?.(item, proxEstado)}
          title="Troca de Treino — clique para marcar como Marco Zero"
          className="h-7 w-7 inline-flex items-center justify-center rounded-lg
                     bg-purple-500/15 text-purple-300 border border-purple-500/40
                     hover:bg-purple-500/25 transition-colors">
          <Dumbbell size={iconSize} />
        </button>
      )
    }
    return (
      <button type="button"
        onClick={() => onCycle?.(item, proxEstado)}
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
      <button
        type="button"
        onClick={() => onCycle?.(item, proxEstado)}
        title="Clique para voltar a Feedback"
        className={`inline-flex items-center gap-1 ${sizeClasses} rounded
                   bg-[#2563eb]/10 text-[#2563eb] font-semibold border border-[#2563eb]/30
                   hover:bg-[#2563eb]/20 transition-colors`}>
        <Crosshair size={size === 'sm' ? 10 : 12} />
        Ponto de partida
      </button>
    )
  }

  if (item.is_training) {
    return (
      <button
        type="button"
        onClick={() => onCycle?.(item, proxEstado)}
        title="Clique para marcar como Marco Zero"
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
      onClick={() => onCycle?.(item, proxEstado)}
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
