// Props: label, value, unit, color (default/success/warning/danger/muted), size (sm/md/lg)
const COLORS = {
  default: 'text-white',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger:  'text-red-400',
  muted:   'text-gray-500',
}

const SIZES = {
  sm: { value: 'text-[18px]', pad: 'p-[10px_12px]' },
  md: { value: 'text-[22px]',  pad: 'p-[14px_16px]' },
  lg: { value: 'text-[28px]',  pad: 'p-[18px_20px]' },
}

export default function StatCard({ label, value, unit, color = 'default', size = 'md' }) {
  const s = SIZES[size] || SIZES.md
  const c = COLORS[color] || COLORS.default

  return (
    <div className={`bg-[#29292e] border border-[#323238] rounded-lg ${s.pad}`}>
      <div className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold mb-1.5">
        {label}
      </div>
      <div className={`font-bold leading-none ${s.value} ${c}`}>
        {value}
        {unit && <span className="text-gray-500 text-[11px] font-normal ml-1">{unit}</span>}
      </div>
    </div>
  )
}
