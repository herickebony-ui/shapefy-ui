// Helper de proximidade pra agendamentos (feedbacks, treinos etc).
// Recebe data em ISO (YYYY-MM-DD ou ISO completo) e devolve:
//   dias: numero de dias ate o evento (negativo se ja passou)
//   label: 'Hoje' | 'Amanha' | null (null = mostrar a data normalmente)
//   tone: 'default' | 'soon' | 'imminent' | 'today'
//     - default: > 7 dias (azul tranquilo)
//     - soon:    3-7 dias (azul aceso, glow leve)
//     - imminent: 1-2 dias (amber suave)
//     - today:   0 dias (amber forte)
export function proximidadeFeedback(dataISO) {
  if (!dataISO) return { dias: null, label: null, tone: 'default' }

  const partes = String(dataISO).split(/[T ]/)[0].split('-')
  if (partes.length !== 3) return { dias: null, label: null, tone: 'default' }

  const evento = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
  evento.setHours(0, 0, 0, 0)

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const msPorDia = 24 * 60 * 60 * 1000
  const dias = Math.round((evento - hoje) / msPorDia)

  let label = null
  if (dias === 0) label = 'Hoje'
  else if (dias === 1) label = 'Amanhã'

  let tone = 'default'
  if (dias <= 0) tone = 'today'
  else if (dias <= 2) tone = 'imminent'
  else if (dias <= 7) tone = 'soon'

  return { dias, label, tone }
}
