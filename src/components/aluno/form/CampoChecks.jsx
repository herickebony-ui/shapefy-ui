import { Check } from 'lucide-react'

// Múltipla escolha — resposta serializada como string `\n`-joined.
export default function CampoChecks({ value, onChange, opcoes = [] }) {
  const marcadas = String(value || '').split(/\n|,/).map(s => s.trim()).filter(Boolean)
  const toggle = (opt) => {
    const nova = marcadas.includes(opt)
      ? marcadas.filter(v => v !== opt)
      : [...marcadas, opt]
    onChange(nova.join('\n'))
  }
  return (
    <div className="flex flex-col gap-1.5">
      {opcoes.map(opt => {
        const marcada = marcadas.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left text-sm transition-colors
              ${marcada
                ? 'bg-[#2563eb]/10 border-[#2563eb]/50 text-white shadow-[0_0_10px_rgba(37,99,235,0.15)]'
                : 'bg-[#0d0d0f] border-[#1f1f24] text-gray-300 hover:border-[#2563eb]/40 hover:text-white'
              }`}
          >
            <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0
              ${marcada ? 'bg-[#2563eb] border-[#2563eb]' : 'border-[#323238]'}`}>
              {marcada && <Check size={12} className="text-white" strokeWidth={3} />}
            </span>
            <span>{opt}</span>
          </button>
        )
      })}
    </div>
  )
}
