// Props: tabs [{id, label, icon (ReactNode)?, badge?, disabled?}],
//        active, onChange(id), variant (underline/pills)
// Mobile: scroll horizontal, no line break
export default function Tabs({ tabs = [], active, onChange, variant = 'underline' }) {
  if (variant === 'pills') {
    return (
      <div className="flex gap-2 overflow-x-auto whitespace-nowrap pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={`
              inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors shrink-0
              disabled:opacity-40 disabled:cursor-not-allowed
              ${active === tab.id
                ? 'bg-[#2563eb] text-white'
                : 'bg-[#29292e] text-gray-400 hover:text-white hover:bg-[#323238]'
              }
            `}
          >
            {tab.icon && <span className="text-[15px]">{tab.icon}</span>}
            {tab.label}
            {tab.badge != null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white/20">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="border-b border-[#323238] overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-0.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={`
              inline-flex items-center gap-2 px-4 md:px-5 py-3
              text-[12px] md:text-[13px] font-medium border-b-2 transition-colors shrink-0
              disabled:opacity-40 disabled:cursor-not-allowed
              ${active === tab.id
                ? 'border-[#2563eb] text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
              }
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            {tab.label}
            {tab.badge != null && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${active === tab.id ? 'bg-[#2563eb]/30 text-red-300' : 'bg-[#29292e] text-gray-500'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
