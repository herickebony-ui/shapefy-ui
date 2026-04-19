// Props: category (key de MUSCLE_COLORS), children, size (sm/md)
// Estilo: só borda e texto coloridos, sem fundo preenchido

export const MUSCLE_COLORS = {
  quads:    '#c084fc',
  isquios:  '#2dd4bf',
  gmax:     '#fb7185',
  gmed:     '#a78bfa',
  adutor:   '#94a3b8',
  pantur:   '#fb923c',
  costas:   '#f472b6',
  trapezio: '#60a5fa',
  peitoral: '#fbbf24',
  deltant:  '#22d3ee',
  biceps:   '#a3e635',
  triceps:  '#e879f9',
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export default function CategoricalBadge({ category, children, size = 'md' }) {
  const color = MUSCLE_COLORS[category?.toLowerCase()] || '#94a3b8'
  const sizeClass = size === 'sm'
    ? 'px-[7px] py-[2px] text-[9px]'
    : 'px-[9px] py-[3px] text-[10px]'

  return (
    <span
      className={`inline-block border rounded-md font-bold uppercase tracking-[0.08em] ${sizeClass}`}
      style={{ color, borderColor: hexToRgba(color, 0.35) }}
    >
      {children}
    </span>
  )
}
