// Cabeçalho de seção da home/telas do aluno — ícone azul + label uppercase.
export default function SectionHeader({ icon, label, action }) {
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <div className="flex items-center gap-2 text-[#60a5fa]">
        {icon}
        <h2 className="text-gray-200 text-xs font-bold uppercase tracking-widest">{label}</h2>
      </div>
      {action}
    </div>
  )
}
