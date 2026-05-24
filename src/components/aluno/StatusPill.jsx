// Pill de status (badge) — Ativa, Pendente, Expirada, etc.
// variant:
//   - 'success' → verde (Ativa, Concluida, Salvo)
//   - 'danger'  → vermelho (Expirada, Bloqueada)
//   - 'info'    → azul (Pendente, Agendada)
//   - 'muted'   → cinza (estado neutro)

const VARIANTS = {
  success: 'bg-[rgba(16,185,129,0.15)] border-[rgba(16,185,129,0.40)] text-[#22C55E]',
  danger:  'bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.40)] text-[#F87171]',
  info:    'bg-[rgba(37,99,235,0.15)] border-[rgba(59,130,246,0.40)] text-[#60A5FA]',
  muted:   'bg-[rgba(100,116,139,0.15)] border-[rgba(100,116,139,0.40)] text-[#94A3B8]',
}

export default function StatusPill({ variant = 'info', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${VARIANTS[variant] || VARIANTS.info} ${className}`}
    >
      {children}
    </span>
  )
}
