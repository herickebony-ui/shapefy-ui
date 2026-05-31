import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

// Gráfico de evolução da área do aluno. Consome o formato que o backend entrega:
//   { labels: [...], datasets: [{ name, values: [...] }], colors?: [...] }
// Renderiza uma linha por dataset. NÃO formata números — só plota os valores crus.

const PALETTE = ['#3B82F6', '#22C55E', '#38BDF8', '#F59E0B', '#F87171', '#A78BFA', '#FB7185', '#34D399']

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0B1C33] border border-[rgba(59,130,246,0.4)] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[var(--sf-text-muted)] mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function EvolutionChart({ chart, height = 200 }) {
  const datasets = chart?.datasets || []
  const labels = chart?.labels || []
  const colors = chart?.colors || []

  const data = useMemo(
    () => labels.map((label, i) => {
      const row = { label }
      datasets.forEach(ds => { row[ds.name] = ds.values?.[i] ?? null })
      return row
    }),
    [labels, datasets],
  )

  if (!datasets.length || !labels.length) {
    return (
      <p className="text-[var(--sf-text-soft)] text-xs text-center py-6">Sem dados para exibir.</p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.12)" />
        <XAxis dataKey="label" interval={0} tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={{ stroke: 'rgba(59,130,246,0.2)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} width={42} />
        <Tooltip content={<ChartTip />} />
        {datasets.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />}
        {datasets.map((ds, i) => (
          <Line
            key={ds.name}
            type="monotone"
            dataKey={ds.name}
            stroke={colors[i] || PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={{ r: 3, fill: colors[i] || PALETTE[i % PALETTE.length] }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
