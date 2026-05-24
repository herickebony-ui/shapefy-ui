// Dropdown de seleção única.
export default function CampoSelect({ value, onChange, opcoes = [] }) {
  return (
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full h-11 bg-[#0d0d0f] border border-[#1f1f24] focus:border-[#2563eb]/60 focus:shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white text-sm rounded-xl px-3.5 outline-none transition-all appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8' fill='none'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2360a5fa' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 14px center',
        paddingRight: '36px',
      }}
    >
      <option value="">Selecione...</option>
      {opcoes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  )
}
