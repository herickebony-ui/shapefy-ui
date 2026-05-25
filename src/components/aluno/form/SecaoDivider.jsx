// Divisor sutil de quebra de seção do formulário — separa blocos de perguntas
// sem competir visualmente com o conteúdo das próprias perguntas.
export default function SecaoDivider({ titulo }) {
  return (
    <div className="mt-6 mb-3 flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--sf-border)]" />
      <h3 className="text-[#60A5FA] text-[11px] font-bold uppercase tracking-widest shrink-0">
        {titulo}
      </h3>
      <span className="h-px flex-1 bg-[var(--sf-border)]" />
    </div>
  )
}
