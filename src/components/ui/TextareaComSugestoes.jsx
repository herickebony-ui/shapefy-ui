import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { listarTextos, salvarNoBancoSeNovo, excluirTexto } from '../../api/bancoTextos'

const normalizar = (s) => (s || '').trim().toLowerCase().replace(/[.,;:!?]+$/, '').replace(/\s+/g, ' ')

export default function TextareaComSugestoes({
  value,
  onChange,
  doctype,
  campo,
  placeholder,
  rows = 3,
  disabled = false,
  extraCampo = null,
}) {
  const blurTimerRef = useRef(null)
  const [todasSugestoes, setTodasSugestoes] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [salvado, setSalvado] = useState(false)

  const carregarTodas = async () => {
    if (!doctype || !campo) return []
    if (todasSugestoes !== null) return todasSugestoes
    try {
      const lista = await listarTextos(doctype, campo, { apenasAtivos: true, extra: extraCampo })
      setTodasSugestoes(lista)
      return lista
    } catch (e) { console.error('sugestões:', e.message); return [] }
  }

  const filtrar = (lista, q) => {
    if (!q?.trim()) return lista
    const trimmed = q.trim().toLowerCase()
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*')
    let re
    try { re = new RegExp(escaped) } catch { return lista }
    return lista.filter(item => {
      const texto = (item[campo] || '').toLowerCase()
      return re.test(texto) && texto !== trimmed
    })
  }

  const sugestoesFiltradas = useMemo(() => {
    if (!todasSugestoes) return []
    return filtrar(todasSugestoes, value)
  }, [todasSugestoes, value])

  const jaExisteNoBanco = useMemo(() => {
    if (!todasSugestoes || !value?.trim()) return false
    const n = normalizar(value)
    return todasSugestoes.some(s => normalizar(s[campo]) === n)
  }, [todasSugestoes, value, campo])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (doctype && campo && value?.trim() && todasSugestoes === null) carregarTodas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, doctype, campo])

  const abrirDrop = async () => {
    const lista = await carregarTodas()
    const filtradas = filtrar(lista, value)
    if (filtradas.length > 0) setDropdownOpen(true)
  }

  const salvarNoBanco = async () => {
    const valorTrim = (value || '').trim()
    if (!valorTrim || !doctype || !campo) return
    try {
      await salvarNoBancoSeNovo(doctype, campo, valorTrim)
      setTodasSugestoes(prev => {
        const n = normalizar(valorTrim)
        const base = prev || []
        if (base.some(s => normalizar(s[campo]) === n)) return base
        return [...base, { name: `__local_${Date.now()}`, [campo]: valorTrim, enabled: 1 }]
      })
      setSalvado(true)
      setTimeout(() => setSalvado(false), 1500)
    } catch (e) { console.error('salvar banco:', e.message) }
  }

  const excluirSugestao = async (item) => {
    try {
      await excluirTexto(doctype, item.name)
      setTodasSugestoes(prev => prev ? prev.filter(s => s.name !== item.name) : prev)
    } catch (e) { console.error('excluir sugestão:', e.message) }
  }

  const handleBlur = () => { blurTimerRef.current = setTimeout(() => setDropdownOpen(false), 200) }
  const handleFocus = async () => { clearTimeout(blurTimerRef.current); await abrirDrop() }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full bg-[#1a1a1a] border border-[#323238] focus:border-[#2563eb]/60 text-white text-sm rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors placeholder-gray-600 disabled:opacity-50"
      />

      {/* Botão salvar no banco — canto inferior direito da textarea */}
      {doctype && campo && value?.trim() && !jaExisteNoBanco && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); salvarNoBanco() }}
          className="absolute bottom-2 right-2 h-6 w-6 flex items-center justify-center rounded transition-colors hover:bg-[#2563eb]/15"
          title="Salvar no Banco de Textos"
        >
          {salvado
            ? <Check size={14} className="text-green-400" strokeWidth={3} />
            : <Plus size={15} className="text-blue-300/70 hover:text-blue-300" strokeWidth={2.75} />}
        </button>
      )}

      {dropdownOpen && sugestoesFiltradas.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-[#29292e] border border-[#323238] rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {sugestoesFiltradas.map((item) => (
              <div key={item.name} className="flex items-start group/sug border-b border-[#323238]/50 last:border-0 hover:bg-[#323238] transition-colors">
                <button
                  type="button"
                  onMouseDown={() => { clearTimeout(blurTimerRef.current); onChange(item[campo]); setDropdownOpen(false) }}
                  className="flex-1 text-left px-3 py-2 text-xs text-gray-300 group-hover/sug:text-white"
                >
                  {extraCampo && item[extraCampo] && (
                    <span className="text-[10px] text-gray-500 block mb-0.5">{item[extraCampo]}</span>
                  )}
                  {item[campo]}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); excluirSugestao(item) }}
                  className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover/sug:opacity-100 transition-all shrink-0"
                  title="Remover sugestão"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
