export default function KanbanCard({ title, count, icon: Icon, accent = 'gray', items, onClickItem, emptyText }) {
  const accentClass = {
    red:    'border-red-500/30 bg-red-500/5',
    yellow: 'border-yellow-500/30 bg-yellow-500/5',
    blue:   'border-blue-500/30 bg-blue-500/5',
    gray:   'border-[#323238] bg-[#1a1a1a]',
  }[accent] || 'border-[#323238] bg-[#1a1a1a]'

  const accentText = {
    red: 'text-red-400', yellow: 'text-yellow-400',
    blue: 'text-blue-400', gray: 'text-gray-400',
  }[accent] || 'text-gray-400'

  return (
    <div className={`flex flex-col rounded-xl border p-4 ${accentClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} className={accentText} />}
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">{title}</h3>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${accentText} bg-[#0a0a0a]/60 border border-[#323238]`}>
          {count}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-gray-600 text-xs italic py-3">{emptyText || 'Nada por aqui.'}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.slice(0, 5).map((it, i) => (
            <li key={it.key || i}>
              <button
                onClick={() => onClickItem(it)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-[#29292e] text-white text-xs font-medium truncate transition-colors"
              >
                {it.label}
              </button>
            </li>
          ))}
          {count > 5 && (
            <li className="text-[10px] text-gray-500 mt-1 px-2">+ {count - 5} restantes</li>
          )}
        </ul>
      )}
    </div>
  )
}
