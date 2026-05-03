import useStatusAluno from '../../hooks/useStatusAluno'
import { STATUS_BADGE } from '../../pages/Financeiro/constants'

export default function StatusAlunoBadge({ alunoId, size = 'sm' }) {
  const { data, loading } = useStatusAluno(alunoId)

  if (!alunoId) return null

  if (loading && !data) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 px-2 py-0.5 rounded border border-[#323238]">
        ···
      </span>
    )
  }

  const status = data?.status || 'Sem_plano'
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.Sem_plano
  const px = size === 'md' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]'

  return (
    <span
      title={data?.dias_atraso ? `${data.dias_atraso} dias de atraso` : ''}
      className={`inline-flex items-center gap-1 ${px} rounded border font-bold uppercase tracking-wide ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}
