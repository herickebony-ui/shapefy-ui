import { useMemo } from 'react'
import { dataEhFerias } from '../../../api/ferias'
import { MONTHS, WEEKDAYS, ehFeriado, isoFromYMD, todayISO, fmtDateBR } from './utils'

export default function MesGrid({
  year, month, schedule, feriasList, planStart, planEnd,
  onClickDate, onContextDate,
}) {
  const datesByISO = useMemo(() => {
    const m = {}
    schedule.dates.forEach(d => { m[d.date] = d })
    return m
  }, [schedule])

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const today = todayISO()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push({ blank: true, key: `b${i}` })
  for (let d = 1; d <= totalDays; d++) {
    const iso = isoFromYMD(year, month, d)
    cells.push({ key: iso, day: d, iso })
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-2">
      <div className="px-2 py-1 mb-1 flex items-center justify-between">
        <span className="text-xs font-bold tracking-tight text-white">{MONTHS[month]}</span>
        <span className="text-[10px] text-gray-600">{year}</span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className="text-[9px] uppercase tracking-widest text-gray-600 font-bold">{wd}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(c => {
          if (c.blank) return <div key={c.key} />
          const iso = c.iso
          const item = datesByISO[iso]
          const isVacation = dataEhFerias(iso, feriasList)
          const isHoliday = !!ehFeriado(iso)
          const dt = new Date(year, month, c.day)
          const isMonday = dt.getDay() === 1
          const inPlan = planStart && planEnd && iso >= planStart && iso <= planEnd
          const isHoje = iso === today

          let bg = 'bg-[#0a0a0a] text-gray-600'
          let ring = ''
          let extra = ''

          if (inPlan && isMonday) bg = 'bg-emerald-900/30 text-emerald-300'
          else if (inPlan) bg = 'bg-green-900/20 text-green-200/80'
          else if (isMonday) bg = 'bg-[#1f1f24] text-gray-400'

          if (isVacation) {
            bg = 'bg-[#0a0a0a] text-gray-500'
            ring = 'ring-1 ring-blue-500/40'
          }

          if (item) {
            const isTr = !!item.is_training
            const isDone = item.status === 'Respondido' || item.status === 'Concluido' || !!item.respondido_em
            const isAtrasado = !isDone && iso < today
            if (isDone) {
              bg = 'bg-emerald-700/40 text-emerald-100'
              ring = 'ring-1 ring-emerald-500/50'
            } else if (isAtrasado) {
              bg = 'bg-red-700/40 text-red-100'
              ring = 'ring-1 ring-red-500/60'
            } else if (item.is_start) {
              bg = 'bg-[#0a0a0a] text-blue-300'
              ring = 'ring-2 ring-[#2563eb]/60'
            } else if (isTr) {
              bg = 'bg-purple-600/40 text-white'
              ring = 'ring-1 ring-purple-500/60'
            } else {
              bg = 'bg-[#2563eb] text-white'
              extra = 'shadow-[0_0_12px_rgba(37,99,235,0.4)]'
            }
          }

          if (isHoje) extra += ' shadow-[inset_0_0_0_2px_rgba(252,211,77,0.9)]'

          return (
            <button
              key={c.key}
              onClick={() => onClickDate(iso)}
              onContextMenu={(e) => onContextDate(e, iso)}
              title={isHoliday || (item ? `${fmtDateBR(iso)} · ${item.is_start ? 'Ponto de partida' : ''}` : fmtDateBR(iso))}
              className={`aspect-square flex items-center justify-center text-xs font-semibold rounded relative transition-transform hover:scale-105 ${bg} ${ring} ${extra}`}
            >
              {c.day}
              {isHoliday && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-orange-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function Legenda({ cor, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {cor && <span className={`w-3 h-3 rounded ${cor}`} />}
      <span>{label}</span>
    </span>
  )
}
