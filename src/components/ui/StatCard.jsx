// Props: label, value, unit, subtext, icon, color (default/success/warning/danger/muted), size (sm/md/lg)
const COLORS = {
  default: 'text-white',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  danger:  'text-red-400',
  muted:   'text-gray-500',
}

export default function StatCard({ label, value, unit, subtext, icon: Icon, color = 'default', size = 'md' }) {
  const c = COLORS[color] || COLORS.default

  return (
    <div className="bg-[#29292e] border border-[#323238] rounded-xl p-5 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-1.5">
          {label}
        </div>
        <div className={`font-bold leading-none text-[22px] ${c}`}>
          {value}
          {unit && <span className="text-gray-500 text-[11px] font-medium ml-1">{unit}</span>}
        </div>
        {subtext && (
          <div className="text-gray-500 text-[10px] mt-1.5 leading-tight">{subtext}</div>
        )}
      </div>
      {Icon && (
        <div className="shrink-0 p-2.5 bg-[#1e1e22] rounded-lg border border-[#323238]/60">
          <Icon size={18} className={c} />
        </div>
      )}
    </div>
  )
}
