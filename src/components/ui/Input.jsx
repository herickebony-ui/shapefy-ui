import { X } from 'lucide-react'

export default function Input({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  icon: Icon,
  error,
  disabled = false,
  className = '',
  multiline = false,
  rows = 3,
  onClear,
  ...rest
}) {
  const hasClear = onClear && value

  const base = `
    w-full bg-[#1a1a1a] border border-[#323238] rounded-lg text-white text-sm
    placeholder-gray-600 outline-none transition-colors
    focus:border-[#850000]/60 focus:ring-1 focus:ring-[#850000]/30
    disabled:opacity-40 disabled:cursor-not-allowed
    ${Icon ? 'pl-10' : 'pl-4'} ${hasClear ? 'pr-9' : 'pr-4'} py-2.5
    ${error ? 'border-red-500/50' : ''}
    ${className}
  `

  return (
    <div className="w-full">
      {label && (
        <label className="block text-gray-400 text-xs font-medium mb-1.5">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <Icon size={15} />
          </span>
        )}
        {multiline ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={`${base} resize-none`}
            {...rest}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={base}
            {...rest}
          />
        )}
        {hasClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}
