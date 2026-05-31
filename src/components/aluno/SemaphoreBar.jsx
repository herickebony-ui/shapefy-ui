// Barra-semáforo de indicador de saúde (IMC / WHR / WHtR).
// Consome o objeto `indicator` que o backend já entrega pronto:
//   { label, value, value_fmt, zone, status, ref_label, segments:[{zone,start,width}], marker_pct }
// Os `segments` são faixas coloridas (% da largura) e `marker_pct` é a posição do pino.
// O NÚMERO (value_fmt) fica em destaque; o status fica discreto (sem realce de cor).

const ZONE_COLORS = {
  low:     '#64748B', // abaixo — cinza/azulado
  good:    '#22C55E', // saudável — verde
  warn:    '#F59E0B', // atenção — âmbar
  bad:     '#EF4444', // alterado — vermelho
  neutral: '#64748B',
}

export default function SemaphoreBar({ indicator }) {
  const { label, value, value_fmt, status, ref_label, segments = [], marker_pct = 0 } = indicator || {}
  // whr/whtr não preenchidos vêm como 0.
  const vazio = !value || value === 0

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[var(--sf-text-muted)] text-xs font-semibold">{label}</span>
        <span className="text-white text-base font-bold">{value_fmt}</span>
      </div>

      <div className="relative h-2.5 rounded-full overflow-hidden bg-white/5">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="absolute top-0 h-full"
            style={{
              left: `${seg.start}%`,
              width: `${seg.width}%`,
              backgroundColor: ZONE_COLORS[seg.zone] || ZONE_COLORS.neutral,
              opacity: 0.85,
            }}
          />
        ))}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${Math.max(0, Math.min(100, marker_pct))}%` }}
        >
          <div className="h-4 w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[var(--sf-text-soft)] text-[10px]">{ref_label}</span>
        <span className="text-[var(--sf-text-soft)] text-[10px] font-semibold">
          {vazio ? 'Não informado' : status}
        </span>
      </div>
    </div>
  )
}
