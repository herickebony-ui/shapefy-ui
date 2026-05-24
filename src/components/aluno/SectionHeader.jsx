// Cabecalho de secao da home/telas do aluno.
// Padrao mobile: icone azul + label uppercase com tracking forte (peso 800).
export default function SectionHeader({ icon, label, action }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2 text-[#60A5FA]">
        {icon}
        <h2
          className="text-[#93C5FD] uppercase"
          style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.18em' }}
        >
          {label}
        </h2>
      </div>
      {action}
    </div>
  )
}
