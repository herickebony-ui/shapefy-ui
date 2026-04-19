// Props: value, onChange(string), options [{value, label} | string], placeholder, error, disabled, className
export default function Select({
  value,
  onChange,
  options = [],
  placeholder = 'Selecionar...',
  error,
  disabled = false,
  className = '',
}) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full h-10 pl-3 pr-10 bg-[#1a1a1a] border rounded-lg text-white text-sm
          outline-none transition-colors appearance-none
          focus:border-[#850000]/60 focus:ring-1 focus:ring-[#850000]/30
          disabled:opacity-40 disabled:cursor-not-allowed
          ${!value ? 'text-gray-600' : ''}
          ${error ? 'border-red-500/60' : 'border-[#323238]'}
          ${className}
        `}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => {
          const v = opt?.value ?? opt
          const l = opt?.label ?? opt
          return <option key={v} value={v}>{l}</option>
        })}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
        width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  )
}
