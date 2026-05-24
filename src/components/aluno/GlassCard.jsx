// Card base da area do aluno — glassmorphism com glow.
// Variants alteram a cor da borda, do glow e do gradiente radial superior.
// USE SEMPRE este wrapper, nunca crie card "chapado" com CSS solto.
//
// variant:
//   - 'default'  → borda + glow azul (acent padrao do app)
//   - 'success'  → borda + glow verde (acoes concluidas)
//   - 'danger'   → borda + glow vermelho (alertas criticos)
//
// as: tag HTML do raiz (default 'button' pra cards clicaveis; use 'div' pra estaticos)

const VARIANTS = {
  default: {
    border: 'border-[rgba(59,130,246,0.24)]',
    borderHover: 'hover:border-[rgba(59,130,246,0.42)]',
    glow: 'shadow-[0_0_34px_rgba(37,99,235,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]',
    glowHover: 'hover:shadow-[0_0_34px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
    gradient: 'radial-gradient(circle at 50% 0%, rgba(37,99,235,0.16), transparent 45%), rgba(8,22,42,0.86)',
  },
  success: {
    border: 'border-[rgba(34,197,94,0.30)]',
    borderHover: 'hover:border-[rgba(34,197,94,0.50)]',
    glow: 'shadow-[0_0_34px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]',
    glowHover: 'hover:shadow-[0_0_34px_rgba(16,185,129,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
    gradient: 'radial-gradient(circle at 50% 0%, rgba(16,185,129,0.16), transparent 45%), rgba(8,42,28,0.86)',
  },
  danger: {
    border: 'border-[rgba(239,68,68,0.32)]',
    borderHover: 'hover:border-[rgba(239,68,68,0.55)]',
    glow: 'shadow-[0_0_34px_rgba(239,68,68,0.18),inset_0_1px_0_rgba(255,255,255,0.06)]',
    glowHover: 'hover:shadow-[0_0_34px_rgba(239,68,68,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]',
    gradient: 'radial-gradient(circle at 50% 0%, rgba(239,68,68,0.16), transparent 45%), rgba(42,12,12,0.86)',
  },
}

export default function GlassCard({
  as: Component = 'button',
  variant = 'default',
  disabled,
  className = '',
  children,
  ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.default
  const isInteractive = (Component === 'button' || Component === 'a') && !disabled

  const base = 'relative overflow-hidden rounded-3xl border backdrop-blur-md transition-all text-left w-full'
  const hover = isInteractive ? `${v.borderHover} ${v.glowHover} cursor-pointer` : ''
  const dim = disabled ? 'opacity-40 cursor-not-allowed' : ''

  return (
    <Component
      disabled={Component === 'button' ? disabled : undefined}
      className={`${base} ${v.border} ${v.glow} ${hover} ${dim} ${className}`}
      style={{ background: v.gradient }}
      {...props}
    >
      {children}
    </Component>
  )
}
