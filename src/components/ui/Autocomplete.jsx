// Props: value, onChange, onSelect, searchFn(query)→Promise<item[]>,
//        renderItem(item), placeholder, icon, disabled, emptyState, compact
import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Loader } from 'lucide-react'

export default function Autocomplete({
  value = '',
  onChange,
  onSelect,
  searchFn,
  renderItem,
  placeholder = 'Buscar...',
  icon: Icon,
  disabled = false,
  emptyState = 'Nenhum resultado',
  compact = false,
}) {
  const [query, setQuery] = useState(value)
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [dropdownPos, setDropdownPos] = useState(null)
  const timerRef = useRef(null)
  const inputRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => { setQuery(value) }, [value])

  const search = useCallback(async (q) => {
    clearTimeout(timerRef.current)
    if (!q || q.length < 1) { setItems([]); setOpen(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchFn(q)
        setItems(results || [])
        setOpen(true)
        setActiveIdx(-1)
      } catch { setItems([]); setOpen(false) }
      finally { setLoading(false) }
    }, 200)
  }, [searchFn])

  const computeDropdownPos = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow
    setDropdownPos({
      left: rect.left + window.scrollX,
      width: rect.width,
      openUpward,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top - window.scrollY + 4 }
        : { top: rect.bottom + window.scrollY + 4 }
      ),
    })
  }

  const handleChange = (e) => {
    const v = e.target.value
    setQuery(v)
    onChange?.(v)
    computeDropdownPos()
    search(v)
  }

  const handleSelect = (item) => {
    setOpen(false)
    setItems([])
    onSelect?.(item)
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(items[activeIdx]) }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  const inputClass = compact
    ? 'w-full h-7 px-2 bg-transparent border border-transparent hover:border-[#323238] focus:border-[#850000]/60 text-white rounded text-xs outline-none transition-colors placeholder-gray-600'
    : `w-full h-10 bg-[#1a1a1a] border border-[#323238] rounded-lg text-white text-sm placeholder-gray-600 outline-none transition-colors focus:border-[#850000]/60 focus:ring-1 focus:ring-[#850000]/30 disabled:opacity-40 disabled:cursor-not-allowed ${Icon ? 'pl-10' : 'pl-3'} pr-3`

  const useBottomSheet = isMobile && items.length > 5 && !compact

  const desktopDropdownStyle = dropdownPos ? {
    position: 'fixed',
    left: dropdownPos.left,
    width: dropdownPos.width,
    zIndex: 9999,
    ...(dropdownPos.openUpward
      ? { bottom: dropdownPos.bottom }
      : { top: dropdownPos.top }
    ),
  } : {}

  const dropdown = open && items.length > 0 && (
    useBottomSheet ? (
      createPortal(
        <div
          className="fixed inset-0 z-[200] flex flex-col justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#1a1a1a] border-t border-[#323238] rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#323238]">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Resultados</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {items.map((item, i) => (
                <button
                  key={i}
                  onMouseDown={() => handleSelect(item)}
                  className={`w-full text-left px-4 py-3 border-b border-[#323238]/50 last:border-0 transition-colors min-h-[44px] ${activeIdx === i ? 'bg-[#323238]' : 'hover:bg-[#323238]'}`}
                >
                  {renderItem ? renderItem(item) : (
                    <span className="text-gray-200 text-sm">{item.nome_completo || item.food || item.name || String(item)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )
    ) : createPortal(
      <div
        style={desktopDropdownStyle}
        className="bg-[#29292e] border border-[#323238] rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden max-h-56 overflow-y-auto"
      >
        {items.map((item, i) => (
          <button
            key={i}
            onMouseDown={() => handleSelect(item)}
            className={`w-full text-left px-3.5 py-2.5 border-b border-[#323238]/50 last:border-0 transition-colors min-h-[40px] ${activeIdx === i ? 'bg-[#323238]' : 'hover:bg-[#323238]'}`}
          >
            {renderItem ? renderItem(item) : (
              <span className="text-gray-200 text-sm">{item.nome_completo || item.food || item.name || String(item)}</span>
            )}
          </button>
        ))}
      </div>,
      document.body
    )
  )

  const emptyDropdown = open && !loading && items.length === 0 && query.length >= 1 && createPortal(
    <div style={desktopDropdownStyle} className="bg-[#29292e] border border-[#323238] rounded-lg shadow-lg overflow-hidden">
      <p className="px-4 py-3 text-gray-500 text-sm text-center">{emptyState}</p>
    </div>,
    document.body
  )

  return (
    <div className="relative w-full">
      <div className="relative">
        {Icon && !compact && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
            <Icon size={14} />
          </span>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onFocus={() => { computeDropdownPos(); query.length >= 1 && items.length > 0 && setOpen(true) }}
          placeholder={placeholder}
          disabled={disabled}
          className={inputClass}
        />
        {loading && (
          <span className={`absolute ${compact ? 'right-2 top-1' : 'right-3 top-1/2 -translate-y-1/2'} text-gray-500`}>
            <Loader size={compact ? 12 : 14} className="animate-spin" />
          </span>
        )}
      </div>
      {dropdown}
      {emptyDropdown}
    </div>
  )
}
