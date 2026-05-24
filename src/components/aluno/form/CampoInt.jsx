// Input numérico inteiro.
export default function CampoInt({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-40 h-11 bg-[#0d0d0f] border border-[#1f1f24] focus:border-[#2563eb]/60 focus:shadow-[0_0_12px_rgba(37,99,235,0.15)] text-white text-sm rounded-xl px-3.5 outline-none transition-all"
    />
  )
}
