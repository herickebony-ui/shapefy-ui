// Props: value, onChange(string), placeholder, rows, error, disabled, className
export default function Textarea({
  value,
  onChange,
  placeholder = '',
  rows = 3,
  error,
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <textarea
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`
        w-full p-3 bg-[#1a1a1a] border rounded-lg text-white text-sm
        placeholder-gray-600 outline-none transition-colors resize-none
        focus:border-[#2563eb]/60 focus:ring-1 focus:ring-[#2563eb]/30
        disabled:opacity-40 disabled:cursor-not-allowed
        ${error ? 'border-red-500/60' : 'border-[#323238]'}
        ${className}
      `}
      {...rest}
    />
  )
}
