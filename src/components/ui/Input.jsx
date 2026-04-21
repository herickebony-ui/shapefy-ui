// Props: value, onChange(string), placeholder, type, icon, error, disabled, onClear, className
// Legacy: label (use FormGroup instead), multiline, rows
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

  const baseClass = `
    w-full h-10 bg-[#1a1a1a] border rounded-lg text-white text-sm
    placeholder-gray-600 outline-none transition-colors
    focus:border-[#2563eb]/60 focus:ring-1 focus:ring-[#2563eb]/30
    disabled:opacity-40 disabled:cursor-not-allowed
    ${Icon ? 'pl-10' : 'pl-3'} ${hasClear ? 'pr-9' : 'pr-3'}
    ${error ? 'border-red-500/60' : 'border-[#323238]'}
    ${className}
  `

  const field = (
    <div className="relative w-full">
      {Icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          <Icon size={14} />
        </span>
      )}
      {multiline ? (
        <textarea
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`${baseClass} h-auto py-2.5 resize-none`}
          {...rest}
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={baseClass}
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
  )

  if (!label) return field

  return (
    <div className="w-full flex flex-col gap-1.5">
      <label className="text-gray-400 text-xs font-bold uppercase tracking-wider">{label}</label>
      {field}
      {error && <p className="text-[#f87171] text-[11px]">{error}</p>}
    </div>
  )
}
