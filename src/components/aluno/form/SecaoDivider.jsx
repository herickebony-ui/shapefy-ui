// Banner GRANDE de quebra de seção do formulário — destaca claramente
// a transição entre blocos de perguntas (estilo "capítulo").
export default function SecaoDivider({ titulo }) {
  return (
    <div className="relative mt-2 mb-4 -mx-px overflow-hidden rounded-2xl border border-[#2563eb]/40">
      <div
        className="px-5 py-6 relative"
        style={{
          backgroundImage: `
            radial-gradient(circle at 10% 50%, rgba(37, 99, 235, 0.35) 0px, transparent 60%),
            linear-gradient(135deg, #0a0a0c 0%, #0d1535 100%)
          `,
        }}
      >
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-1 h-8 bg-gradient-to-b from-[#60a5fa] to-[#2563eb] rounded-full shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
          <h3 className="text-white text-base font-bold uppercase tracking-widest leading-tight">
            {titulo}
          </h3>
        </div>
        <span className="absolute right-0 bottom-0 w-32 h-px bg-gradient-to-r from-transparent to-[#60a5fa]/40" />
      </div>
    </div>
  )
}
