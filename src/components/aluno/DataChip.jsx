// Chip de data destacado — usado nos cards de próximos feedbacks etc.
// Mostra o dia em fonte grande e o mês uppercase abaixo.
//
// tone (proximidade visual — discreto, do mais frio pro mais quente):
//   default  → > 7 dias  (azul tranquilo, sem glow extra)
//   soon     → 3-7 dias  (azul aceso, glow leve)
//   imminent → 1-2 dias  (amber suave)
//   today    → 0 dias    (amber forte)
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

const TONES = {
  default: {
    box: 'bg-[#0a0a0c] border-[#2563eb]/40 shadow-[inset_0_0_12px_rgba(37,99,235,0.12)]',
    txt: 'text-[#60a5fa]',
    sub: 'text-[#60a5fa]/80',
  },
  soon: {
    box: 'bg-[#0a0a0c] border-[#3b82f6]/70 shadow-[inset_0_0_14px_rgba(37,99,235,0.18),0_0_10px_rgba(59,130,246,0.18)]',
    txt: 'text-[#93c5fd]',
    sub: 'text-[#93c5fd]/85',
  },
  imminent: {
    box: 'bg-[#0a0a0c] border-[#FBBF24]/55 shadow-[inset_0_0_14px_rgba(251,191,36,0.14)]',
    txt: 'text-[#FBBF24]',
    sub: 'text-[#FBBF24]/85',
  },
  today: {
    box: 'bg-[#0a0a0c] border-[#FBBF24] shadow-[inset_0_0_16px_rgba(251,191,36,0.22),0_0_12px_rgba(251,191,36,0.25)]',
    txt: 'text-[#FCD34D]',
    sub: 'text-[#FCD34D]/90',
  },
}

export default function DataChip({ data, size = 'md', tone = 'default' }) {
  if (!data) return null
  const partes = String(data).split(/[T ]/)[0].split('-')
  const mes = Number(partes[1])
  const dia = partes[2]

  const sizes = {
    sm: { box: 'px-2.5 py-1.5', dia: 'text-lg', mes: 'text-[9px]' },
    md: { box: 'px-3 py-2',     dia: 'text-2xl', mes: 'text-[10px]' },
    lg: { box: 'px-4 py-3',     dia: 'text-3xl', mes: 'text-xs' },
  }
  const s = sizes[size] || sizes.md
  const t = TONES[tone] || TONES.default

  return (
    <div className={`border rounded-lg text-center ${t.box} ${s.box}`}>
      <p className={`font-bold leading-none ${t.txt} ${s.dia}`}>{dia}</p>
      <p className={`font-bold uppercase tracking-widest mt-0.5 ${t.sub} ${s.mes}`}>
        {MESES[mes - 1] || ''}
      </p>
    </div>
  )
}
