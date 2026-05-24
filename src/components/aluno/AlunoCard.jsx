// Card base da área do aluno: fundo escuro com gradient sutil, borda neon
// no hover, glow azul. Aceita variant 'default' | 'highlight' (outline azul).
export default function AlunoCard({
  as: Component = 'button',
  variant = 'default',
  disabled,
  className = '',
  children,
  ...props
}) {
  const isInteractive = Component === 'button' || Component === 'a'
  const base = 'relative overflow-hidden rounded-2xl border transition-all'
  const bg = 'bg-gradient-to-br from-[#0d0d0f] via-[#0a0a0c] to-[#0d0d12]'

  const borderClass = variant === 'highlight'
    ? 'border-[#2563eb]/60 shadow-[0_0_20px_rgba(37,99,235,0.18)]'
    : 'border-[#1c1c22]'

  const hoverClass = disabled
    ? 'opacity-40 cursor-not-allowed'
    : isInteractive
      ? 'hover:border-[#2563eb]/50 hover:shadow-[0_0_24px_rgba(37,99,235,0.18)] cursor-pointer'
      : ''

  return (
    <Component
      disabled={isInteractive ? disabled : undefined}
      className={`${base} ${bg} ${borderClass} ${hoverClass} ${className}`}
      {...props}
    >
      {/* linha decorativa diagonal sutil */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-12 -right-16 w-48 h-px bg-gradient-to-r from-transparent via-[#2563eb]/25 to-transparent rotate-[20deg]"
      />
      {children}
    </Component>
  )
}
