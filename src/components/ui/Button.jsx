// Props: variant, size, icon, iconRight, fullWidth, loading, disabled, onClick, type, className
import { Loader } from 'lucide-react'

const VARIANTS = {
  primary:   'bg-[#2563eb] hover:bg-red-700 text-white border-transparent',
  secondary: 'bg-[#29292e] hover:bg-[#323238] text-gray-300 border-[#323238]',
  ghost:     'bg-transparent hover:bg-[#323238] text-gray-400 hover:text-white border-transparent',
  info:      'bg-[#0052cc] hover:bg-[#0043a8] text-white border-transparent',
  success:   'bg-green-900/20 hover:bg-green-900/40 text-green-400 border-green-500/30',
  danger:    'bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-500/30',
}

const SIZES = {
  xs: { btn: 'px-2.5 py-1 text-xs gap-1',   icon: 10 },
  sm: { btn: 'px-3 py-1.5 text-xs gap-1.5', icon: 12 },
  md: { btn: 'px-4 py-2.5 text-sm gap-2',   icon: 14 },
  lg: { btn: 'px-5 py-3 text-sm gap-2',     icon: 16 },
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconRight: IconRight,
  fullWidth = false,
  className = '',
  type = 'button',
}) {
  const s = SIZES[size] || SIZES.md

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg border
        transition-all duration-150
        disabled:opacity-40 disabled:cursor-not-allowed
        ${size === 'md' || size === 'lg' ? 'min-h-[40px]' : ''}
        ${fullWidth ? 'w-full' : ''}
        ${VARIANTS[variant] || VARIANTS.primary}
        ${s.btn}
        ${className}
      `}
    >
      {loading
        ? <Loader size={s.icon} className="animate-spin" />
        : Icon
          ? <Icon size={s.icon} />
          : null
      }
      {children}
      {!loading && IconRight && <IconRight size={s.icon} />}
    </button>
  )
}
