import { useState, useRef, useEffect } from 'react'
import { Plus, Check } from 'lucide-react'
import { listarTextos, criarTexto } from '../../api/bancoTextos'

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
  const [sugestoes, setSugestoes] = useState([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [salvandoNoBanco, setSalvandoNoBanco] = useState(false)
  const [salvado, setSalvado] = useState(false)
  const debounceRef = useRef(null)
  const blurTimerRef = useRef(null)

  // Auto-suggest enquanto digita
  useEffect(() => {
    if (!doctype || !campo) return
    clearTimeout(debounceRef.current)
    if (!value?.trim()) {
      setSugestoes([])
      setDropdownOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const lista = await listarTextos(doctype, campo, {
          busca: value.trim(),
          apenasAtivos: true,
          extra: extraCampo,
        })
        const filtradas = lista.filter(
          item => (item[campo] || '').trim().toLowerCase() !== value.trim().toLowerCase()
        )
        setSugestoes(filtradas)
        if (filtradas.length > 0) setDropdownOpen(true)
      } catch (e) {
        console.error('sugestões:', e.message)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [value, doctype, campo, extraCampo])

  const selecionarSugestao = (item) => {
    clearTimeout(blurTimerRef.current)
    onChange(item[campo])
    setDropdownOpen(false)
    setSugestoes([])
  }

  const salvarNoBanco = async () => {
    if (!value?.trim() || !doctype || !campo) return
    setSalvandoNoBanco(true)
    try {
      await criarTexto(doctype, campo, value.trim())
      setSalvado(true)
      setTimeout(() => setSalvado(false), 2000)
    } catch (e) {
      console.error('Erro ao salvar no banco:', e.message)
      alert('Erro ao salvar no banco de textos.')
    } finally {
      setSalvandoNoBanco(false)
    }
  }

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => setDropdownOpen(false), 200)
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => clearTimeout(blurTimerRef.current)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full bg-[#1a1a1a] border border-[#323238] focus:border-[#850000]/60 text-white text-sm rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors placeholder-gray-600 disabled:opacity-50"
      />

      {dropdownOpen && sugestoes.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 w-full bg-[#29292e] border border-[#323238] rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#323238] flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sugestões do banco</span>
            <button onMouseDown={() => setDropdownOpen(false)} className="text-gray-600 hover:text-white text-xs">✕</button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {sugestoes.map((item) => (
              <button
                key={item.name}
                type="button"
                onMouseDown={() => selecionarSugestao(item)}
                className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#323238] hover:text-white transition-colors border-b border-[#323238]/50 last:border-0"
              >
                {extraCampo && item[extraCampo] && (
                  <span className="text-[10px] text-gray-500 block mb-0.5">{item[extraCampo]}</span>
                )}
                {item[campo]}
              </button>
            ))}
          </div>
        </div>
      )}

      {doctype && campo && value?.trim() && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={salvarNoBanco}
            disabled={salvandoNoBanco || salvado}
            className="flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
            title="Salvar este texto no banco"
          >
            {salvado ? (
              <><Check size={12} className="text-green-400" /><span className="text-green-400">Salvo!</span></>
            ) : (
              <><Plus size={12} className="text-gray-500 hover:text-[#850000]" /><span className="text-gray-500 hover:text-[#850000]">Salvar no banco</span></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
