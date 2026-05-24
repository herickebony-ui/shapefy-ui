// Chip de data destacado — usado nos cards de próximos feedbacks etc.
// Mostra o dia em fonte grande e o mês uppercase abaixo.
const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

export default function DataChip({ data, size = 'md' }) {
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

  return (
    <div className={`bg-[#0a0a0c] border border-[#2563eb]/40 rounded-lg text-center shadow-[inset_0_0_12px_rgba(37,99,235,0.12)] ${s.box}`}>
      <p className={`text-[#60a5fa] font-bold leading-none ${s.dia}`}>{dia}</p>
      <p className={`text-[#60a5fa]/80 font-bold uppercase tracking-widest mt-0.5 ${s.mes}`}>
        {MESES[mes - 1] || ''}
      </p>
    </div>
  )
}
