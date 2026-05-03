import { COLOR_BADGE } from '../../pages/Financeiro/constants'

export default function PlanoBadge({ nome, cor = 'slate', size = 'sm', className = '' }) {
  if (!nome) return <span className="text-gray-500 text-xs">—</span>
  const cls = COLOR_BADGE[cor] || COLOR_BADGE.slate
  const px = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]'
  return (
    <span className={`inline-flex items-center font-semibold rounded border ${px} ${cls} ${className}`}>
      {nome}
    </span>
  )
}
