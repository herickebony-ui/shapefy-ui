// Props: value, onChange, onSelect, searchFn(query)→Promise<item[]>,
//        renderItem(item), placeholder, icon, disabled, emptyState, compact
//        items (lista pré-fetchada — quando passada, faz filtro local com buscarSmart),
//        searchFields (campos a buscar quando usar items)
//        loadInitial: () => Promise<item[]> — carrega lista quando foca sem query
//        initialHeader: string — rótulo no topo da lista inicial (ex: "Últimos cadastrados")
import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Loader } from 'lucide-react'
import { buscarSmart } from '../../utils/strings'

export default function Autocomplete({
  value = '',
  onChange,
  onSelect,
  searchFn,
  items,
  searchFields = ['nome_completo', 'name'],
  renderItem,
  placeholder = 'Buscar...',
  icon: Icon,
  disabled = false,
  emptyState = 'Nenhum resultado',
  compact = false,
  loadInitial,
  initialHeader,
}) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const [dropdownPos, setDropdownPos] = useState(null)
  const [showingInitial, setShowingInitial] = useState(false)
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

  // Quando recebe `items` (lista pré-fetchada), usa filtro local com buscarSmart
  // — evita o consumidor reescrever a função de busca.
  const effectiveSearchFn = useMemo(() => {
    if (Array.isArray(items)) {
      return async (q) => items
        .filter(it => buscarSmart(searchFields.map(f => it?.[f]), q))
        .slice(0, 30)
    }
    return searchFn
  }, [items, searchFields, searchFn])

  const search = useCallback(async (q) => {
    clearTimeout(timerRef.current)
    if (!q || q.length < 1) { setResults([]); setOpen(false); setShowingInitial(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      setShowingInitial(false)
      try {
        const r = await effectiveSearchFn(q)
        setResults(r || [])
        setOpen(true)
        setActiveIdx(-1)
      } catch { setResults([]); setOpen(false) }
      finally { setLoading(false) }
    }, 200)
  }, [effectiveSearchFn])

  const carregarInicial = useCallback(async () => {
    if (!loadInitial) return
    setLoading(true)
    setShowingInitial(true)
    try {
      const r = await loadInitial()
      setResults(r || [])
      setOpen(true)
      setActiveIdx(-1)
    } catch { setResults([]); setOpen(false) }
    finally { setLoading(false) }
  }, [loadInitial])

  const computeDropdownPos = () => {
    if (!inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUpward = spaceBelow < 260 && spaceAbove > spaceBelow
    setDropdownPos({
      left: rect.left,
      width: rect.width,
      openUpward,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }
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
    setResults([])
    onSelect?.(item)
  }

  const handleKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); handleSelect(results[activeIdx]) }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1) }
  }

  const inputClass = compact
    ? 'w-full h-7 px-2 bg-transparent border border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 text-white rounded text-xs outline-none transition-colors placeholder-gray-600'
    : `w-full h-10 bg-[#1a1a1a] border border-[#323238] rounded-lg text-white text-sm placeholder-gray-600 outline-none transition-colors focus:border-[#2563eb]/60 focus:ring-1 focus:ring-[#2563eb]/30 disabled:opacity-40 disabled:cursor-not-allowed ${Icon ? 'pl-10' : 'pl-3'} pr-3`

  const useBottomSheet = isMobile && results.length > 5 && !compact

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

  const dropdown = open && results.length > 0 && (
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
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">{showingInitial && initialHeader ? initialHeader : 'Resultados'}</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {results.map((item, i) => (
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
        {showingInitial && initialHeader && (
          <div className="px-3.5 py-1.5 border-b border-[#323238] bg-[#1a1a1a]/60 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
            {initialHeader}
          </div>
        )}
        {results.map((item, i) => (
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

  const emptyDropdown = open && !loading && results.length === 0 && query.length >= 1 && createPortal(
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
          onFocus={() => {
            computeDropdownPos()
            if (query.length >= 1 && results.length > 0) setOpen(true)
            else if (!query && loadInitial) carregarInicial()
          }}
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
