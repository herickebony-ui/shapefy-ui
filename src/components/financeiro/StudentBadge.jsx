/**
 * Bolinha colorida de status financeiro do aluno.
 * Calcula tudo no client a partir do objeto aluno (zero requisições).
 *
 * Lê do Frappe: aluno.plan_end (campo espelho atualizado pelo backend).
 *
 * Props:
 *   - aluno: objeto Aluno do Frappe (com plan_end, plan_start no payload)
 *   - showText: boolean — mostra label ao lado da bolinha
 *   - showDate: boolean — mostra data de vencimento abaixo
 */
export default function StudentBadge({ aluno, showText = false, showDate = false }) {
  if (!aluno) {
    return (
      <div className="flex items-center gap-2 opacity-50">
        <div className="w-2.5 h-2.5 rounded-full bg-gray-700 border border-gray-600/30" />
        {showText && <span className="text-[10px] text-gray-500 uppercase">—</span>}
      </div>
    )
  }

  const hasPlan = !!aluno.plan_end || !!aluno.plan_start

  const rawDue = aluno.plan_end || null
  const dueDateISO = typeof rawDue === 'string'
    ? rawDue.slice(0, 10)
    : null

  const formattedDate = dueDateISO
    ? dueDateISO.split('-').reverse().join('/')
    : null

  // Cálculo de status em tempo real
  const computeStatus = () => {
    if (!hasPlan) return 'Sem_plano'
    if (!dueDateISO) return 'Sem_plano'

    const today = new Date()
    const z = (n) => ('0' + n).slice(-2)
    const todayISO = `${today.getFullYear()}-${z(today.getMonth() + 1)}-${z(today.getDate())}`

    if (dueDateISO < todayISO) {
      // Vencido — checa se passou de 30 dias
      const [y, m, d] = dueDateISO.split('-').map(Number)
      const limit = new Date(y, m - 1, d)
      limit.setDate(limit.getDate() + 30)
      const limitISO = `${limit.getFullYear()}-${z(limit.getMonth() + 1)}-${z(limit.getDate())}`
      return todayISO > limitISO ? 'Nao_renovou' : 'Vencido'
    }

    // Vence no futuro — checa se ≤ 7 dias
    const [y, m, d] = dueDateISO.split('-').map(Number)
    const due = new Date(y, m - 1, d)
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24))
    return diffDays <= 7 ? 'Renova_em_breve' : 'Ativo'
  }

  const status = computeStatus()

  // Mapeamento de cores e labels
  const STYLES = {
    Sem_plano:       { color: 'bg-gray-700 border border-gray-600/30',       label: 'Sem plano' },
    Pausado:         { color: 'bg-gray-500 border border-gray-400/30',       label: 'Pausado' },
    Nao_renovou:     { color: 'bg-red-900 border border-red-500/30',         label: 'Não renovou' },
    Vencido:         { color: 'bg-[#850000] border border-red-500/50',       label: 'Vencido' },
    Renova_em_breve: { color: 'bg-amber-500 border border-amber-400/30',     label: 'Renova' },
    Ativo:           { color: 'bg-emerald-500 border border-emerald-400/30', label: 'Ativo' },
  }

  const { color, label } = STYLES[status] || STYLES.Sem_plano
  const tooltip = formattedDate ? `Vence em: ${formattedDate}` : label

  return (
    <div className="flex flex-col justify-center">
      <div className="flex items-center gap-2" title={tooltip}>
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        {showText && (
          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
            {label}
          </span>
        )}
      </div>
      {showDate && formattedDate && (
        <span className="text-[10px] text-gray-500 mt-0.5 ml-0.5 font-mono">
          {formattedDate}
        </span>
      )}
    </div>
  )
}
