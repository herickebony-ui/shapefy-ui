// Rating 1-5 com botões clicáveis (acumulativos — ao clicar em 4, 1-4 ficam ativos).
export default function CampoRating({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map(n => {
        const ativo = Number(value) >= n
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className={`h-12 w-12 flex items-center justify-center text-base font-bold border rounded-xl transition-all
              ${ativo
                ? 'bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] border-[#2563eb] text-white shadow-[0_0_12px_rgba(37,99,235,0.5)]'
                : 'bg-[#0d0d0f] border-[#1f1f24] text-gray-500 hover:border-[#2563eb]/60 hover:text-white'
              }`}
          >
            {n}
          </button>
        )
      })}
    </div>
  )
}
