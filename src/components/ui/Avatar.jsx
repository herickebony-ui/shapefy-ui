export default function Avatar({ nome, foto, size = 'md' }) {
  const sizes = {
    xs: 'h-7 w-7 text-xs',
    sm: 'h-9 w-9 text-sm',
    md: 'h-11 w-11 text-base',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-16 w-16 text-xl',
  }

  const initials = nome
    ?.split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase() || '?'

  if (foto) {
    return (
      <img
        src={foto}
        alt={nome}
        className={`${sizes[size]} rounded-full object-cover shrink-0 border-2 border-[#323238]`}
      />
    )
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-[#850000]/20 border border-[#850000]/30 flex items-center justify-center font-bold text-red-400 shrink-0`}>
      {initials}
    </div>
  )
}