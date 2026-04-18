import { Loader } from 'lucide-react'

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
}) {
  const variants = {
    primary: 'bg-[#850000] hover:bg-red-700 text-white border-transparent',
    secondary: 'bg-[#29292e] hover:bg-[#323238] text-gray-300 border-[#323238]',
    ghost: 'bg-transparent hover:bg-[#323238] text-gray-400 hover:text-white border-transparent',
    danger: 'bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-500/30',
    success: 'bg-green-900/20 hover:bg-green-900/40 text-green-400 border-green-500/30',
  }

  const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-sm gap-2',
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg border
        transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {loading
        ? <Loader size={14} className="animate-spin" />
        : Icon && <Icon size={14} />
      }
      {children}
    </button>
  )
}