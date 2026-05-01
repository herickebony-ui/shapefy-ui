// Constantes e helpers puros do CronogramaFeedbacks.

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export const HOLIDAYS_FIXED = {
  '01-01': 'Confraternização Universal',
  '21-04': 'Tiradentes',
  '01-05': 'Dia do Trabalho',
  '07-09': 'Independência',
  '12-10': 'N. Sra. Aparecida',
  '02-11': 'Finados',
  '15-11': 'Proclamação',
  '25-12': 'Natal',
}

export const DEADLINE_KEY = 'shapefy_cronograma_deadline'
export const DEFAULT_DEADLINE = { feedbackDays: 3, trainingDays: 4 }
export const TEMPLATE_LS_KEY = 'shapefy_template_atual'

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const fmtDateBR = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = String(iso).split('T')[0].split(' ')[0].split('-')
  if (!y) return '—'
  return `${d}/${m}/${y}`
}

export const fmtDateTimeBR = (iso) => {
  if (!iso) return '—'
  try {
    const dt = new Date(String(iso).replace(' ', 'T'))
    return `${dt.toLocaleDateString('pt-BR')} · ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  } catch { return iso }
}

export const calcDiffDays = (iso) => {
  if (!iso) return 0
  const d = new Date(iso + 'T00:00:00'); d.setHours(0, 0, 0, 0)
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.floor((t - d) / 86400000)
}

export const ehFeriado = (iso) => {
  if (!iso) return null
  const [, m, d] = iso.split('-')
  return HOLIDAYS_FIXED[`${d}-${m}`] || null
}

export const calcPlanEnd = (start, durationMonths) => {
  if (!start || !durationMonths) return ''
  const d = new Date(start + 'T12:00:00')
  d.setMonth(d.getMonth() + Number(durationMonths))
  return d.toISOString().slice(0, 10)
}

export const isoFromYMD = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

export const computeStatusBadge = (ag) => {
  if (ag.status === 'Concluido') return { label: 'Concluído', cls: 'text-green-400 bg-green-500/10 border-green-500/30' }
  if (ag.status === 'Respondido') return { label: 'Respondido', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' }
  if (ag.status === 'Cancelado') return { label: 'Cancelado', cls: 'text-gray-400 bg-[#1a1a1a] border-[#323238]' }
  const diff = calcDiffDays(ag.data_agendada)
  if (diff > 7) return { label: 'Não enviado', cls: 'text-gray-300 bg-[#29292e] border-[#444]' }
  if (diff > 0) return { label: 'Atrasado', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  return { label: 'Aguardando', cls: 'text-gray-400 bg-[#1a1a1a] border-[#323238]' }
}

export const computePrazo = (ag, deadlineSettings) => {
  if (!ag.data_agendada) return '—'
  const d = new Date(ag.data_agendada + 'T12:00:00')
  const days = ag._isTraining ? deadlineSettings.trainingDays : deadlineSettings.feedbackDays
  d.setDate(d.getDate() + (Number(days) || 0))
  return fmtDateBR(d.toISOString().slice(0, 10))
}
