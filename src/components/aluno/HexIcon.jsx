// Hexágono outline azul com ícone dentro. Padrão visual de "módulo" da
// área do aluno — usado em cards de Treino/Dieta/etc e em qualquer lugar
// que precise de um wrapper de ícone com personalidade.
export default function HexIcon({ children, size = 56, glow = true }) {
  const id = `hex-${size}`
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {glow && (
        <div
          className="absolute inset-1 rounded-2xl bg-[#2563eb]/20 blur-md"
          aria-hidden="true"
        />
      )}
      <svg
        viewBox="0 0 60 60"
        className="absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <polygon
          points="30,3 53,16.5 53,43.5 30,57 7,43.5 7,16.5"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="1.5"
          opacity="0.9"
          style={{ filter: 'drop-shadow(0 0 4px rgba(37, 99, 235, 0.6))' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[#60a5fa]">
        {children}
      </div>
    </div>
  )
}
