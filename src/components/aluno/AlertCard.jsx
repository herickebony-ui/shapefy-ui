import { AlertCircle as AlertCircleIcon, ChevronRight } from 'lucide-react'
import GlassCard from './GlassCard'

// Callout de aviso/pendencia/alerta — sempre acima de uma secao com acao.
// variant:
//   - 'info'    → azul (pendencia padrao, "voce tem X pendente")
//   - 'warning' → cinza-amarelo (atencao mas nao urgente)
//   - 'danger'  → vermelho (erro/bloqueio critico)
//
// Wrap o conteudo num GlassCard com tipo correspondente.

const VARIANT_MAP = {
  info: { card: 'default', accent: '#60A5FA', glow: 'rgba(37,99,235,0.35)' },
  warning: { card: 'default', accent: '#FBBF24', glow: 'rgba(251,191,36,0.35)' },
  danger: { card: 'danger', accent: '#F87171', glow: 'rgba(239,68,68,0.35)' },
}

// icon: aceita elemento JSX pronto (ex: <Calendar size={18} />). Default = AlertCircle.
export default function AlertCard({ variant = 'info', titulo, descricao, onClick, icon }) {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.info
  const iconNode = icon || <AlertCircleIcon size={18} />
  return (
    <GlassCard
      as={onClick ? 'button' : 'div'}
      variant={v.card}
      onClick={onClick}
      className="px-4 py-4 flex items-center gap-4"
    >
      <div
        className="w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0"
        style={{ borderColor: v.accent, boxShadow: `0 0 12px ${v.glow}`, color: v.accent }}
      >
        {iconNode}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold leading-snug">{titulo}</p>
        {descricao && (
          <p className="text-[#94A3B8] text-xs mt-0.5">{descricao}</p>
        )}
      </div>
      {onClick && <ChevronRight size={18} className="text-[#64748B] shrink-0" />}
    </GlassCard>
  )
}
