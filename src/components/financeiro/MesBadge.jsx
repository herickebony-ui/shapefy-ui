import { getMonthBadge } from '../../pages/Financeiro/utils'

export default function MesBadge({ data }) {
  const badge = getMonthBadge(data)
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl font-bold text-gray-500/60 w-6 text-center leading-none">
        {badge.day}
      </span>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.className}`}>
        {badge.name}
      </span>
    </div>
  )
}
