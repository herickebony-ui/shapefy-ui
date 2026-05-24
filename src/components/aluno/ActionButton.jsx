// Botao principal da area do aluno — gradient + glow, min-height 52px (toque mobile).
// Variants:
//   - 'primary' → gradient azul (CTA padrao)
//   - 'success' → gradient verde (concluir, finalizar)
//   - 'danger'  → vermelho (excluir, cancelar critico)
//   - 'ghost'   → transparente com borda (acoes secundarias)
//
// Use SEMPRE este botao pras CTAs do aluno. Nada de <button> custom.

const VARIANTS = {
  primary: 'text-white bg-gradient-to-b from-[#3B82F6] to-[#2563EB] shadow-[0_0_28px_rgba(37,99,235,0.35)] hover:shadow-[0_0_36px_rgba(37,99,235,0.55)] active:scale-[0.98]',
  success: 'text-white bg-gradient-to-b from-[#22C55E] to-[#10B981] shadow-[0_0_28px_rgba(16,185,129,0.35)] hover:shadow-[0_0_36px_rgba(16,185,129,0.55)] active:scale-[0.98]',
  danger:  'text-white bg-gradient-to-b from-[#F87171] to-[#EF4444] shadow-[0_0_24px_rgba(239,68,68,0.30)] hover:shadow-[0_0_32px_rgba(239,68,68,0.45)] active:scale-[0.98]',
  ghost:   'text-[#93C5FD] bg-transparent border border-[rgba(59,130,246,0.30)] hover:border-[rgba(59,130,246,0.55)] hover:bg-[rgba(59,130,246,0.08)] hover:text-white',
}

export default function ActionButton({
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  className = '',
  children,
  ...props
}) {
  const v = VARIANTS[variant] || VARIANTS.primary
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`relative inline-flex items-center justify-center gap-2 min-h-[52px] px-5 rounded-2xl text-sm font-bold tracking-wide transition-all
        ${v}
        ${fullWidth ? 'w-full' : ''}
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed active:scale-100' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {Icon && <Icon size={16} />}
          <span>{children}</span>
          {IconRight && <IconRight size={16} />}
        </>
      )}
    </button>
  )
}
