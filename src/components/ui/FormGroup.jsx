// Props: label, required, hint, error, success, counter {current, max}, className, children
export default function FormGroup({ label, required, hint, error, success, counter, className = '', children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-gray-400 text-xs font-medium">
            {label}
            {required && <span className="text-[#ef4444] ml-1">*</span>}
          </label>
          {counter && (
            <span className="text-gray-500 text-[10px]">{counter.current} / {counter.max}</span>
          )}
        </div>
      )}
      <div className={success ? '[&>*]:border-green-500/60' : error ? '[&>*]:!border-red-500/60' : ''}>
        {children}
      </div>
      {error && <p className="text-[#f87171] text-[11px]">{error}</p>}
      {hint && !error && <p className="text-gray-500 text-[11px]">{hint}</p>}
    </div>
  )
}
