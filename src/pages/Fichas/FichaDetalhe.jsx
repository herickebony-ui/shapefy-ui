import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Save,
  Plus, X, Trash2, Copy, Info, Loader,
  Zap, BookmarkPlus, BookmarkCheck,
  Link2, ListOrdered,
} from 'lucide-react'
import {
  listarFichas, buscarFicha, criarFicha, salvarFicha,
  listarExercicios, listarAlongamentos, listarAerobicos, listarGruposMusculares,
} from '../../api/fichas'
import { listarAlunos, buscarAluno, salvarAluno } from '../../api/alunos'
import { listarTextos, salvarNoBancoSeNovo, excluirTexto } from '../../api/bancoTextos'
import {
  Button, FormGroup, Input, Select, Textarea,
  Autocomplete, Modal, Spinner, TextareaComSugestoes,
} from '../../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`

const TREINOS = ['a', 'b', 'c', 'd', 'e', 'f']
const labelTreino = (t, ficha) => ficha[`treino_${t}_label`] || `Treino ${t.toUpperCase()}`

const arrayMove = (arr, from, to) => {
  const a = [...arr]
  const [item] = a.splice(from, 1)
  a.splice(to, 0, item)
  return a
}

const somarDias = (dataStr, dias) => {
  if (!dataStr) return ''
  const d = new Date(dataStr + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

// Semana 01: data_de_inicio → próximo sábado (se já for sáb, vai até o sáb seguinte)
// Semana 02+: sempre dom → sáb
const calcularSemanas = (dataInicio, qtdSemanas) => {
  const inicio = new Date(dataInicio + 'T00:00:00')
  const weekday = inicio.getDay()
  let diasAteSabado = (6 - weekday + 7) % 7
  if (diasAteSabado === 0) diasAteSabado = 7
  const fimSem1 = new Date(inicio)
  fimSem1.setDate(inicio.getDate() + diasAteSabado)
  const semanas = [{ numero: 1, inicio, fim: fimSem1 }]
  for (let i = 2; i <= qtdSemanas; i++) {
    const ini = new Date(fimSem1)
    ini.setDate(fimSem1.getDate() + (i - 2) * 7 + 1)
    const fim = new Date(ini)
    fim.setDate(ini.getDate() + 6)
    semanas.push({ numero: i, inicio: ini, fim })
  }
  return semanas
}

const formatarDataBr = (dateObj) =>
  dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

const normalizar = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const PLATAFORMAS_VIDEO = ['YouTube', 'Google Drive', 'Vimeo']

const extractVideoInfo = (input) => {
  if (!input || !input.includes('://')) return null
  try {
    const url = new URL(input)
    const host = url.hostname.replace('www.', '')
    if (host === 'youtube.com' || host === 'youtu.be') {
      let id = null
      if (host === 'youtu.be') id = url.pathname.slice(1).split('?')[0]
      else if (url.searchParams.get('v')) id = url.searchParams.get('v')
      else { const m = url.pathname.match(/\/(embed|shorts|v)\/([^/?]+)/); if (m) id = m[2] }
      if (id) return { id, platform: 'YouTube' }
    }
    if (host === 'drive.google.com') {
      const m = url.pathname.match(/\/d\/([^/]+)/)
      const id = m ? m[1] : url.searchParams.get('id')
      if (id) return { id, platform: 'Google Drive' }
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = url.pathname.match(/\/(?:video\/)?(\d+)/)
      if (m) return { id: m[1], platform: 'Vimeo' }
    }
  } catch { }
  return null
}

// ─── GRUPOS_CONFIG ────────────────────────────────────────────────────────────

const GRUPOS_CONFIG = [
  { key: 'quadriceps',         label: 'Quads.',       bg: 'bg-violet-500/15' },
  { key: 'isquiotibiais',      label: 'Isquios.',     bg: 'bg-violet-500/15' },
  { key: 'gluteomaximo',       label: 'G. Máx.',      bg: 'bg-violet-500/15' },
  { key: 'gluteomedio',        label: 'G. Méd.',      bg: 'bg-violet-500/15' },
  { key: 'adutores',           label: 'Adut.',        bg: 'bg-violet-500/15' },
  { key: 'panturrilhas',       label: 'Pantur.',      bg: 'bg-violet-500/15' },
  { key: 'costas',             label: 'Costas',       bg: 'bg-blue-500/15' },
  { key: 'trapezio',           label: 'Trapézio',     bg: 'bg-blue-500/15' },
  { key: 'peitoral',           label: 'Peitoral',     bg: 'bg-orange-500/15' },
  { key: 'deltoidesanterior',  label: 'Delts. Ant.',  bg: 'bg-cyan-500/15' },
  { key: 'deltoideslateral',   label: 'Delts. Lat.',  bg: 'bg-cyan-500/15' },
  { key: 'deltoidesposterior', label: 'Delts. Post.', bg: 'bg-cyan-500/15' },
  { key: 'biceps',             label: 'Bíceps',       bg: 'bg-yellow-500/15' },
  { key: 'triceps',            label: 'Tríceps',      bg: 'bg-yellow-500/15' },
  { key: 'abdomen',            label: 'Abd.',         bg: 'bg-emerald-500/15' },
]

const calcVolume = (ficha, intensidadeMap = {}) => {
  const vol = {}
  const diasPorTreino = {}
  ;(ficha.dias_da_semana || []).forEach(d => {
    if (d.treino && d.treino !== 'Off' && d.treino !== '') {
      const key = d.treino.replace('Treino ', '').toLowerCase()
      diasPorTreino[key] = (diasPorTreino[key] || 0) + 1
    }
  })
  ;['a', 'b', 'c', 'd', 'e', 'f'].forEach(t => {
    const dias = diasPorTreino[t] || 0
    if (!dias) return
    ;(ficha[`planilha_de_treino_${t}`] || []).forEach(ex => {
      const series = parseInt(ex.series) || 0
      if (!series || !ex.exercicio) return
      let intensidades = []
      try {
        const raw = ex.intensidade
        intensidades = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
      } catch { }
      if (!intensidades.length) intensidades = intensidadeMap[ex.exercicio] || []
      intensidades.forEach(({ grupo_muscular, intensidade }) => {
        const val = parseFloat(String(intensidade).replace(',', '.')) || 0
        if (val > 0 && grupo_muscular)
          vol[grupo_muscular] = (vol[grupo_muscular] || 0) + (series * val * dias)
      })
    })
  })
  return vol
}

// ─── novaFicha ────────────────────────────────────────────────────────────────

const novaFicha = () => ({
  aluno: '', nome_completo: '', data_de_inicio: '', data_de_fim: '',
  objetivo: '', nivel: '', tipo_de_ciclo: '', orientacoes: '',
  orientacoes_aerobicos: '', orientacoes_aem: '',
  orientacoes_treino_a: '', orientacoes_treino_b: '', orientacoes_treino_c: '',
  orientacoes_treino_d: '', orientacoes_treino_e: '', orientacoes_treino_f: '',
  dias_da_semana: [
    { dia_da_semana: 'Segunda', treino: 'Off' }, { dia_da_semana: 'Terca', treino: 'Off' },
    { dia_da_semana: 'Quarta', treino: 'Off' }, { dia_da_semana: 'Quinta', treino: 'Off' },
    { dia_da_semana: 'Sexta', treino: 'Off' }, { dia_da_semana: 'Sabado', treino: 'Off' },
    { dia_da_semana: 'Domingo', treino: 'Off' },
  ],
  periodizacao: [],
  periodizacao_dos_aerobicos: [],
  planilha_de_alongamentos_e_mobilidade: [],
  planilha_de_treino_a: [], planilha_de_treino_b: [], planilha_de_treino_c: [],
  planilha_de_treino_d: [], planilha_de_treino_e: [], planilha_de_treino_f: [],
  treino_a_label: '', treino_b_label: '', treino_c_label: '',
  treino_d_label: '', treino_e_label: '', treino_f_label: '',
})

// ─── TextareaExpansivel ────────────────────────────────────────────────────────
// Expande ao focar. Com doctype+campo: auto-sugere ao digitar (portal fixed).

const TextareaExpansivel = ({ value, onChange, placeholder = '', resetKey, className = '', doctype, campo }) => {
  const ref = useRef(null)
  const btnRef = useRef(null)
  const blurRef = useRef(null)
  const [todasSugestoes, setTodasSugestoes] = useState(null) // null = não carregado ainda
  const [dropOpen, setDropOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const [salvoBanco, setSalvoBanco] = useState(false)

  useEffect(() => {
    if (ref.current) ref.current.style.height = '2rem'
  }, [resetKey])

  const grow = () => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.max(ref.current.scrollHeight, 32) + 'px'
    }
  }

  const posicionar = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 240) })
  }

  const carregarTodas = async () => {
    if (!doctype || !campo) return []
    if (todasSugestoes !== null) return todasSugestoes
    try {
      const lista = await listarTextos(doctype, campo, { apenasAtivos: true })
      setTodasSugestoes(lista)
      return lista
    } catch (e) { console.error('sugestões:', e.message); return [] }
  }

  // Filtragem local imediata — suporta % como wildcard. Escapa metacaracteres
  // de regex pra que parênteses, *, +, etc. no texto não quebrem o RegExp.
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

  const abrirDrop = async () => {
    const lista = await carregarTodas()
    const filtradas = filtrar(lista, value)
    if (filtradas.length === 0) return
    posicionar()
    setDropOpen(true)
  }

  const sugestoesFiltradas = useMemo(() => {
    if (!todasSugestoes) return []
    return filtrar(todasSugestoes, value)
  }, [todasSugestoes, value])

  // Reposicionar quando value muda e drop já está aberto
  useEffect(() => {
    if (dropOpen) posicionar()
  }, [value, dropOpen])

  const salvarNoBanco = async () => {
    if (!value?.trim() || !doctype || !campo) return
    try {
      await salvarNoBancoSeNovo(doctype, campo, value.trim())
      setSalvoBanco(true)
      setTimeout(() => setSalvoBanco(false), 2000)
    } catch (e) { console.error('salvar banco:', e.message) }
  }

  const excluirSugestao = async (item) => {
    try {
      await excluirTexto(doctype, item.name)
      setTodasSugestoes(prev => prev ? prev.filter(s => s.name !== item.name) : prev)
    } catch (e) { console.error('excluir sugestão:', e.message) }
  }

  const handleBlur = () => { blurRef.current = setTimeout(() => setDropOpen(false), 200) }
  const handleFocus = async () => { clearTimeout(blurRef.current); grow(); await abrirDrop() }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value || ''}
        onChange={e => { onChange(e.target.value); grow() }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={1}
        className={`bg-[#29292e] border border-[#323238] text-gray-200 text-xs rounded px-2 py-1.5 w-full outline-none focus:border-[#2563eb]/60 resize-none leading-tight min-h-[2rem] ${doctype ? 'pr-5' : ''} ${className}`}
      />
      {doctype && campo && value?.trim() && (
        <button type="button"
          onMouseDown={(e) => { e.preventDefault(); salvarNoBanco() }}
          className="absolute top-1 right-0.5 transition-colors"
          title="Salvar no banco de textos">
          {salvoBanco
            ? <BookmarkCheck size={13} className="text-green-400" />
            : <BookmarkPlus size={13} className="text-blue-400/60 hover:text-blue-400" />}
        </button>
      )}
      {dropOpen && dropPos && createPortal(
        <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, width: dropPos.width }}
          className="bg-[#29292e] border border-[#323238] rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {sugestoesFiltradas.length === 0
              ? <p className="text-gray-500 text-xs text-center py-3">Nenhuma sugestão cadastrada</p>
              : sugestoesFiltradas.map(item => (
                <div key={item.name} className="flex items-center group/sug border-b border-[#323238]/50 last:border-0 hover:bg-[#323238] transition-colors">
                  <button type="button"
                    onMouseDown={() => { clearTimeout(blurRef.current); onChange(item[campo]); setDropOpen(false); setTimeout(grow, 0) }}
                    className="flex-1 text-left px-3 py-1.5 text-xs text-gray-300 group-hover/sug:text-white">
                    {item[campo]}
                  </button>
                  <button type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); excluirSugestao(item) }}
                    className="px-2 py-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover/sug:opacity-100 transition-all shrink-0"
                    title="Excluir do banco">
                    <X size={10} />
                  </button>
                </div>
              ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── InputSug ─────────────────────────────────────────────────────────────────
// Input de célula de tabela com auto-sugestão ao digitar (portal fixed).

const InputSug = ({ value, onChange, doctype, campo, className = '' }) => {
  const ref = useRef(null)
  const blurRef = useRef(null)
  const [todasSugestoes, setTodasSugestoes] = useState(null)
  const [dropOpen, setDropOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const [salvoBanco, setSalvoBanco] = useState(false)

  const posicionar = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 220) })
  }

  const carregarTodas = async () => {
    if (todasSugestoes !== null) return todasSugestoes
    try {
      const lista = await listarTextos(doctype, campo, { apenasAtivos: true })
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

  const abrirDrop = async () => {
    const lista = await carregarTodas()
    const filtradas = filtrar(lista, value)
    if (filtradas.length === 0) return
    posicionar()
    setDropOpen(true)
  }

  useEffect(() => {
    if (dropOpen) posicionar()
  }, [value, dropOpen])

  const salvarNoBanco = async () => {
    if (!value?.trim()) return
    try {
      await salvarNoBancoSeNovo(doctype, campo, value.trim())
      setSalvoBanco(true)
      setTimeout(() => setSalvoBanco(false), 2000)
    } catch (e) { console.error('salvar banco:', e.message) }
  }

  const excluirSugestao = async (item) => {
    try {
      await excluirTexto(doctype, item.name)
      setTodasSugestoes(prev => prev ? prev.filter(s => s.name !== item.name) : prev)
    } catch (e) { console.error('excluir sugestão:', e.message) }
  }

  const handleBlur = () => { blurRef.current = setTimeout(() => setDropOpen(false), 200) }

  return (
    <div className="relative flex items-center">
      <input ref={ref} value={value || ''} onChange={e => onChange(e.target.value)}
        onBlur={handleBlur} onFocus={async () => { clearTimeout(blurRef.current); await abrirDrop() }}
        className={`w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 pr-5 ${className}`} />
      {value?.trim() && (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); salvarNoBanco() }}
          className="absolute right-0.5 transition-colors" title="Salvar no banco">
          {salvoBanco
            ? <BookmarkCheck size={13} className="text-green-400" />
            : <BookmarkPlus size={13} className="text-blue-400/60 hover:text-blue-400" />}
        </button>
      )}
      {dropOpen && dropPos && createPortal(
        <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, width: dropPos.width }}
          className="bg-[#29292e] border border-[#323238] rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {sugestoesFiltradas.length === 0
              ? <p className="text-gray-500 text-xs text-center py-3">Nenhuma sugestão</p>
              : sugestoesFiltradas.map(item => (
                <div key={item.name} className="flex items-center group/sug border-b border-[#323238]/50 last:border-0 hover:bg-[#323238] transition-colors">
                  <button type="button"
                    onMouseDown={() => { clearTimeout(blurRef.current); onChange(item[campo]); setDropOpen(false) }}
                    className="flex-1 text-left px-3 py-1.5 text-xs text-gray-300 group-hover/sug:text-white">
                    {item[campo]}
                  </button>
                  <button type="button"
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); excluirSugestao(item) }}
                    className="px-2 py-1.5 text-gray-600 hover:text-red-400 opacity-0 group-hover/sug:opacity-100 transition-all shrink-0"
                    title="Excluir do banco">
                    <X size={10} />
                  </button>
                </div>
              ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── SearchableCombo ──────────────────────────────────────────────────────────
// Input de tabela com dropdown local — h-7, bg visível, estilo consistente com
// os outros inputs da tabela (exceção documentada: não usa Autocomplete DS).

const SearchableCombo = ({ value, onChange, options = [], placeholder = '' }) => {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value)
  const [rect, setRect] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { setQ(value) }, [value])

  const filtered = useMemo(() => {
    if (!q) return options.slice(0, 40)
    const n = normalizar(q)
    return options.filter(o => normalizar(o).includes(n)).slice(0, 40)
  }, [q, options])

  const openDropdown = () => {
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
    setOpen(true)
  }

  // Atualiza posição do dropdown ao scrollar (position:fixed precisa de rect atualizado)
  useEffect(() => {
    if (!open) return
    const update = () => {
      if (inputRef.current) setRect(inputRef.current.getBoundingClientRect())
    }
    window.addEventListener('scroll', update, true)
    return () => window.removeEventListener('scroll', update, true)
  }, [open])

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={q}
        onChange={e => { setQ(e.target.value); openDropdown() }}
        onFocus={openDropdown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 transition-colors placeholder-gray-600 truncate"
      />
      {open && filtered.length > 0 && rect && createPortal(
        <div style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: rect.width, zIndex: 9999 }}
          className="bg-[#1a1a1a] border border-[#323238] rounded shadow-xl max-h-48 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtered.map((o, i) => (
            <button key={i} onMouseDown={() => { onChange(o); setQ(o); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-[#323238] transition-colors truncate block">
              {o}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── TipoCombinadoBtn ─────────────────────────────────────────────────────────

const TITULOS_COMBINADO_ROW = ['Bi-set', 'Tri-set', 'Superset']

const TipoCombinadoBtn = ({ value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 px-2 h-7 rounded border text-xs transition whitespace-nowrap ${value ? 'bg-[#2563eb]/20 border-[#2563eb]/40 text-red-400' : 'border-[#323238] text-gray-500 hover:border-gray-400'}`}>
        {value || 'Tipo...'}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-[#29292e] border border-[#323238] rounded-lg shadow-xl z-50 min-w-[120px]">
          <button onMouseDown={() => { onChange(''); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-[#323238] flex items-center gap-2 italic">
            ✓ Tipo...
          </button>
          {TITULOS_COMBINADO_ROW.map(t => (
            <button key={t} onMouseDown={() => { onChange(t); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#323238] transition ${value === t ? 'text-red-400 font-semibold' : 'text-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── RodapeVolume ─────────────────────────────────────────────────────────────

const RodapeVolume = ({ ficha, intensidadeMap, volumeAnterior }) => {
  const vol = useMemo(() => calcVolume(ficha, intensidadeMap), [ficha, intensidadeMap])
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '')
  const volNorm = {}
  Object.entries(vol).forEach(([k, v]) => { volNorm[norm(k)] = (volNorm[norm(k)] || 0) + v })
  const volAntNorm = {}
  if (volumeAnterior) Object.entries(volumeAnterior).forEach(([k, v]) => { volAntNorm[norm(k)] = (volAntNorm[norm(k)] || 0) + v })

  const metade = Math.ceil(GRUPOS_CONFIG.length / 2)
  return (
    <div className="shrink-0 bg-[#1a1a1a] border-t border-[#323238] px-6 py-1.5 flex flex-col gap-0.5">
      {[GRUPOS_CONFIG.slice(0, metade), GRUPOS_CONFIG.slice(metade)].map((linha, li) => (
        <div key={li} className="flex items-center justify-center gap-3 flex-wrap">
          <span className="text-gray-500 text-[10px] font-bold tracking-widest uppercase shrink-0">
            {li === 0 ? 'VOLUME:' : <span className="opacity-0">VOLUME:</span>}
          </span>
          {linha.map(item => {
            const valor = volNorm[item.key] || 0
            const anterior = volAntNorm[item.key] || 0
            const delta = volumeAnterior ? valor - anterior : null
            return (
              <div key={item.key} className={`flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded ${item.bg}`}>
                <span className={`text-[10px] uppercase tracking-tight font-medium ${valor > 0 ? 'text-white' : 'text-gray-600'}`}>
                  {item.label}
                </span>
                <span className={`text-xs font-bold ${valor > 0 ? 'text-white' : 'text-gray-600'}`}>
                  {valor.toFixed(1)}
                </span>
                {delta !== null && delta !== 0 && (
                  <span className={`text-[9px] font-bold ${delta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── DetalhesExercicio ────────────────────────────────────────────────────────

const DetalhesExercicio = ({ ex, onSave, onClose, intensidadeMap = {} }) => {
  const [local, setLocal] = useState({ ...ex })
  const upd = (f, v) => setLocal(l => ({ ...l, [f]: v }))

  let intensInit = []
  try {
    const raw = local.intensidade
    if (typeof raw === 'string') { try { intensInit = raw && raw !== '[]' ? JSON.parse(raw) : [] } catch { intensInit = [] } }
    else intensInit = raw || []
  } catch { }
  if (!intensInit.length) intensInit = intensidadeMap[local.exercicio] || []

  const [intens, setIntens] = useState(intensInit)

  const addIntensLinha = () => setIntens(prev => [...prev, { grupo_muscular: '', intensidade: '1' }])
  const updIntensLinha = (i, f, v) => setIntens(prev => prev.map((item, idx) => idx === i ? { ...item, [f]: v } : item))
  const removeIntensLinha = (i) => setIntens(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = () => {
    onSave({ ...local, intensidade: JSON.stringify(intens) })
    onClose()
  }

  const handleVideoChange = (v) => {
    const info = extractVideoInfo(v)
    if (info) { upd('video', info.id); upd('plataforma_do_vídeo', info.platform) }
    else upd('video', v)
  }

  return (
    <Modal isOpen onClose={onClose} title={local.exercicio || 'Detalhes'} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={handleSave}>Salvar</Button></>}>
      <div className="p-4 flex flex-col gap-3">

        {/* Carga */}
        <FormGroup label="Carga Sugerida (kg)">
          <Input type="number" value={local.carga_sugerida || ''} onChange={v => upd('carga_sugerida', v)} placeholder="Ex: 40" />
        </FormGroup>

        {/* Vídeo + Plataforma */}
        <div className="grid grid-cols-2 gap-2">
          <FormGroup label="ID / Link do Vídeo">
            <Input value={local.video || ''} onChange={handleVideoChange} placeholder="Ex: dQw4w9WgXcQ" />
          </FormGroup>
          <FormGroup label="Plataforma">
            <Select value={local['plataforma_do_vídeo'] || ''} onChange={v => upd('plataforma_do_vídeo', v)} options={PLATAFORMAS_VIDEO} placeholder="Selecionar..." />
          </FormGroup>
        </div>

        {/* Observação */}
        <FormGroup label="Instruções">
          <Textarea value={local.observacao || ''} onChange={v => upd('observacao', v)} placeholder="Instruções do exercício..." rows={3} />
        </FormGroup>

        {/* Intensidade — editável */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider">Intensidade</label>
            <button onClick={addIntensLinha}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white border border-[#323238] px-2 py-0.5 rounded-lg transition">
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="border border-[#323238] rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#323238] text-gray-500">
                  <th className="text-left py-1.5 px-3">Grupo Muscular</th>
                  <th className="text-left py-1.5 px-3">Intensidade</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {intens.length === 0 && (
                  <tr><td colSpan={3} className="py-3 text-center text-gray-600">Nenhuma intensidade.</td></tr>
                )}
                {intens.map((item, i) => (
                  <tr key={i} className="border-b border-[#323238]/40 last:border-0">
                    <td className="px-3 py-1">
                      <input type="text" value={item.grupo_muscular} onChange={e => updIntensLinha(i, 'grupo_muscular', e.target.value)}
                        placeholder="Grupo..." className="bg-transparent text-gray-200 text-xs w-full outline-none border-b border-[#323238] focus:border-[#850000]/60 py-0.5" />
                    </td>
                    <td className="px-3 py-1">
                      <select value={item.intensidade} onChange={e => updIntensLinha(i, 'intensidade', e.target.value)}
                        className="bg-transparent text-gray-200 text-xs outline-none border-b border-[#323238] focus:border-[#850000]/60 py-0.5 appearance-none cursor-pointer">
                        {['0', '0.25', '0.5', '1'].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-2">
                      <button onClick={() => removeIntensLinha(i)} className="text-gray-600 hover:text-red-400 flex items-center justify-center">
                        <X size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Modal>
  )
}

// ─── DetalhesAerobico ─────────────────────────────────────────────────────────

const DetalhesAerobico = ({ aerobico, onSave, onClose }) => {
  const [local, setLocal] = useState({ ...aerobico })
  const [videoDetected, setVideoDetected] = useState(false)
  const upd = (f, v) => setLocal(l => ({ ...l, [f]: v }))
  const handleVideoChange = (v) => {
    const info = extractVideoInfo(v)
    if (info) { upd('video', info.id); upd('plataforma_do_vídeo', info.platform); setVideoDetected(true) }
    else { upd('video', v); setVideoDetected(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Detalhes do Aeróbico" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { onSave(local); onClose() }}>Salvar</Button></>}>
      <div className="p-4 space-y-4">
        <div className="bg-[#1a1a1a] rounded-lg px-4 py-2 text-sm text-gray-300 font-medium">{local.exercicios || '—'}</div>
        <FormGroup label="Frequência">
          <TextareaComSugestoes value={local.frequencia || ''} onChange={v => upd('frequencia', v)}
            doctype="Frequencia Aerobico" campo="frequencia_aerobico" placeholder="Ex: 2x na semana" rows={1} />
        </FormGroup>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Link ou ID do Vídeo" hint={videoDetected ? '✓ ID extraído' : undefined}>
            <Input value={local.video || ''} onChange={handleVideoChange} placeholder="https://youtu.be/... ou código" />
          </FormGroup>
          <FormGroup label="Plataforma"><Select value={local['plataforma_do_vídeo'] || ''} onChange={v => upd('plataforma_do_vídeo', v)} options={PLATAFORMAS_VIDEO} placeholder="Selecionar..." /></FormGroup>
        </div>
        <FormGroup label="Instruções">
          <TextareaComSugestoes value={local.instrucao || ''} onChange={v => upd('instrucao', v)}
            doctype="Instrucao Aerobico" campo="instrucao_aerobico" placeholder="Descreva as instruções..." rows={4} />
        </FormGroup>
      </div>
    </Modal>
  )
}

// ─── DetalhesAlongamento ──────────────────────────────────────────────────────

const DetalhesAlongamento = ({ alongamento, onSave, onClose }) => {
  const [local, setLocal] = useState({ ...alongamento })
  const [videoDetected, setVideoDetected] = useState(false)
  const upd = (f, v) => setLocal(l => ({ ...l, [f]: v }))
  const handleVideoChange = (v) => {
    const info = extractVideoInfo(v)
    if (info) { upd('video', info.id); upd('plataforma_do_vídeo', info.platform); setVideoDetected(true) }
    else { upd('video', v); setVideoDetected(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title="Detalhes do Alongamento" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={() => { onSave(local); onClose() }}>Salvar</Button></>}>
      <div className="p-4 space-y-4">
        <div className="bg-[#1a1a1a] rounded-lg px-4 py-2 text-sm text-gray-300 font-medium">{local.exercicio || '—'}</div>
        <FormGroup label="Séries"><Input type="number" value={local.series || ''} onChange={v => upd('series', v)} /></FormGroup>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Link ou ID do Vídeo" hint={videoDetected ? '✓ ID extraído' : undefined}>
            <Input value={local.video || ''} onChange={handleVideoChange} placeholder="https://youtu.be/... ou código" />
          </FormGroup>
          <FormGroup label="Plataforma"><Select value={local['plataforma_do_vídeo'] || ''} onChange={v => upd('plataforma_do_vídeo', v)} options={PLATAFORMAS_VIDEO} placeholder="Selecionar..." /></FormGroup>
        </div>
        <FormGroup label="Observações">
          <TextareaComSugestoes value={local.observacoes || ''} onChange={v => upd('observacoes', v)}
            doctype="Alongamento Observacao" campo="alongamento_observacao" rows={4} />
        </FormGroup>
      </div>
    </Modal>
  )
}

// ─── BannerOrientacoes ────────────────────────────────────────────────────────

const BannerOrientacoes = ({ alunoId }) => {
  const [texto, setTexto] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [temp, setTemp] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!alunoId) return
    buscarAluno(alunoId)
      .then(d => { setTexto(d?.orientacoes_globais || ''); setTemp(d?.orientacoes_globais || '') })
      .catch(console.error)
  }, [alunoId])

  if (!alunoId) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      await salvarAluno(alunoId, { orientacoes_globais: temp })
      setTexto(temp)
      setEditMode(false)
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="shrink-0 bg-[#2563eb]/10 border-t border-[#2563eb]/30">
      <div className="px-5 py-2 flex items-start gap-2">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-[10px] font-bold italic text-gray-500 hover:text-gray-300 uppercase tracking-widest transition outline-none shrink-0">
          {open ? <ChevronUp size={12} className="text-red-800" /> : <ChevronDown size={12} className="text-red-800" />}
          Anotações Globais
        </button>
        {open && (
          <div className="flex-1 min-w-0">
            {editMode ? (
              <div className="flex items-start gap-2">
                <textarea value={temp} onChange={e => setTemp(e.target.value)} rows={2}
                  className="flex-1 bg-black/40 border border-red-500/30 focus:border-red-500/60 rounded px-2 py-1 text-red-400 text-xs outline-none resize-none" />
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditMode(false); setTemp(texto) }} className="text-gray-500 hover:text-white text-xs underline">Cancelar</button>
                  <button onClick={handleSave} disabled={saving} className="text-red-400 font-bold text-xs underline disabled:opacity-50">{saving ? '...' : 'Salvar'}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-red-400 text-xs leading-tight whitespace-pre-line">
                  {texto || <span className="italic opacity-50">Sem anotações cadastradas.</span>}
                </p>
                <button onClick={() => { setEditMode(true); setOpen(true) }}
                  className="text-gray-500 hover:text-red-400 text-[9px] uppercase font-bold shrink-0">Editar</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Popover base (portal, fecha fora) ───────────────────────────────────────

const Popover = ({ anchor, onClose, children, width = 280, align = 'left' }) => {
  const ref = useRef(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!anchor) return
    const r = anchor.getBoundingClientRect()
    let left = align === 'right' ? r.right - width : r.left
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8))
    setPos({ top: r.bottom + 6, left })
  }, [anchor, width, align])

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    setTimeout(() => document.addEventListener('mousedown', onClick), 0)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey) }
  }, [onClose])

  return createPortal(
    <div ref={ref} style={{ top: pos.top, left: pos.left, width, position: 'fixed', zIndex: 9999 }}
      className="bg-[#19191d] border border-[#323238] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
      {children}
    </div>,
    document.body
  )
}

// ─── ComboPopover ─────────────────────────────────────────────────────────────

const TIPOS_COMBO = ['Bi-set', 'Tri-set', 'Superset']

const ComboPopover = ({ ex, onChange, anchor, onClose }) => {
  const set = (f, v) => onChange({ ...ex, [f]: v })
  const active = ex.primeiro || ex.ultimo
  return (
    <Popover anchor={anchor} onClose={onClose} width={220} align="right">
      <div className="p-2 flex flex-col gap-1.5">
        {/* Posição */}
        <div className="flex gap-1">
          <button onClick={() => set('primeiro', ex.primeiro ? 0 : 1)}
            className={`flex-1 py-1 rounded text-[11px] font-medium border transition ${
              ex.primeiro ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'text-gray-400 border-[#323238] hover:border-gray-500'
            }`}>1º</button>
          <button onClick={() => set('ultimo', ex.ultimo ? 0 : 1)}
            className={`flex-1 py-1 rounded text-[11px] font-medium border transition ${
              ex.ultimo ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'text-gray-400 border-[#323238] hover:border-gray-500'
            }`}>Último</button>
        </div>
        {/* Tipo */}
        <div className="flex gap-1">
          {TIPOS_COMBO.map(t => (
            <button key={t} onClick={() => set('titulo_do_exercicio_combinado', ex.titulo_do_exercicio_combinado === t ? '' : t)}
              className={`flex-1 py-1 rounded text-[10px] border transition ${
                ex.titulo_do_exercicio_combinado === t
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  : 'text-gray-500 border-[#323238] hover:border-gray-500'
              }`}>{t}</button>
          ))}
        </div>
        {/* Remover */}
        {active && (
          <button onClick={() => { onChange({ ...ex, primeiro: 0, ultimo: 0, titulo_do_exercicio_combinado: '' }); onClose() }}
            className="text-[10px] text-gray-600 hover:text-red-400 transition text-center py-0.5">
            remover
          </button>
        )}
      </div>
    </Popover>
  )
}

// ─── SeriesNamePopover ────────────────────────────────────────────────────────

const TIPOS_SERIE_POPOVER = ['Aquecimento', 'Preparatória', 'Trabalho', 'Válida', 'Transição', 'Top Set', 'Máxima']

const SeriesNamePopover = ({ ex, onChange, anchor, onClose }) => {
  const n = parseInt(ex.series) || 0
  const arr = (ex.tipo_de_serie || '').split(',').map(s => s.trim())
  const hasNames = arr.some(Boolean)

  const setSerie = (i, v) => {
    const next = [...arr]
    while (next.length < n) next.push('')
    next[i] = v
    onChange({ ...ex, tipo_de_serie: next.slice(0, n).join(',') })
  }
  const applyAll = (v) => onChange({ ...ex, tipo_de_serie: Array(n).fill(v).join(',') })
  const clear = () => onChange({ ...ex, tipo_de_serie: '' })

  return (
    <Popover anchor={anchor} onClose={onClose} width={320} align="right">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Nomear cada série</div>
          {hasNames && <button onClick={clear} className="text-[10px] text-gray-500 hover:text-red-400 transition">Limpar</button>}
        </div>
        {n === 0 ? (
          <div className="py-4 text-xs text-gray-500 text-center">Defina o nº de séries primeiro.</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1 mb-3">
              <span className="text-[10px] text-gray-600 self-center mr-1">Aplicar em todas:</span>
              {['Trabalho', 'Válida'].map(t => (
                <button key={t} onClick={() => applyAll(t)}
                  className="px-1.5 py-0.5 text-[10px] bg-[#29292e] text-gray-300 rounded hover:bg-[#323238] transition">{t}</button>
              ))}
            </div>
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
              {Array.from({ length: n }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-[11px] font-mono text-gray-500 text-center">{String(i + 1).padStart(2, '0')}</span>
                  <select value={arr[i] || ''} onChange={(e) => setSerie(i, e.target.value)}
                    className="flex-1 bg-[#0f0f0f] border border-[#323238] text-gray-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-[#2563eb]/50">
                    <option value="">—</option>
                    {TIPOS_SERIE_POPOVER.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Popover>
  )
}

// ─── TabelaExercicios ─────────────────────────────────────────────────────────

// Lista base garantida — independente do que a API retornar
const GRUPOS_BASE = [
  'Quadríceps', 'Isquiotibiais', 'Glúteo Máximo', 'Glúteo Médio',
  'Adutores', 'Abdutores', 'Panturrilhas',
  'Costas', 'Trapézio', 'Peitoral',
  'Deltoides Anterior', 'Deltoides Lateral', 'Deltoides Posterior',
  'Bíceps', 'Tríceps', 'Antebraço', 'Abdômen', 'Lombares',
]

const TabelaExercicios = ({ exercicios, onChange, exerciciosPorGrupo = {}, intensidadeMap = {}, mapaDetalhes = {}, gruposBase = GRUPOS_BASE }) => {
  const [detalheIdx, setDetalheIdx] = useState(null)

  // Mescla grupos do Frappe + grupos já na planilha (preserva grupos de fichas antigas)
  const grupos = useMemo(() => {
    const daPlanilha = exercicios.map(e => e.grupo_muscular).filter(Boolean)
    return [...new Set([...gruposBase, ...daPlanilha])].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [gruposBase, exercicios])

  const upd = (i, field, val) => {
    const arr = [...exercicios]
    arr[i] = { ...arr[i], [field]: val }
    if (field === 'exercicio') {
      const info = mapaDetalhes[val]
      if (info) {
        if (!arr[i].grupo_muscular && info.grupo_muscular) arr[i].grupo_muscular = info.grupo_muscular
        arr[i].video = info.video || ''
        arr[i]['plataforma_do_vídeo'] = info['plataforma_do_vídeo'] || 'YouTube'
        try { arr[i].intensidade = JSON.stringify(intensidadeMap[val] || []) } catch { }
      }
    }
    onChange(arr)
  }

  const addRow = () => onChange([...exercicios, { _id: uid(), grupo_muscular: '', exercicio: '', series: '3', repeticoes: '', descanso: '', observacao: '' }])
  const dupe = (i) => { const arr = [...exercicios]; arr.splice(i + 1, 0, { ...arr[i], _id: uid() }); onChange(arr) }
  const remove = (i) => onChange(exercicios.filter((_, idx) => idx !== i))
  const move = (i, dir) => onChange(arrayMove(exercicios, i, i + dir))

  // Exercícios disponíveis: todos quando sem grupo; filtrados por grupo quando selecionado
  const exerciciosDoGrupo = (grupo, exercicioAtual) => {
    let deAPI
    if (!grupo) {
      deAPI = [...new Set(Object.values(exerciciosPorGrupo).flat())]
    } else {
      const n = normalizar(grupo)
      const key = Object.keys(exerciciosPorGrupo).find(k => normalizar(k) === n) || grupo
      deAPI = exerciciosPorGrupo[key] || []
    }
    if (exercicioAtual && !deAPI.includes(exercicioAtual)) return [...deAPI, exercicioAtual]
    return deAPI
  }

  // Mapa de posição em combinado para cada linha
  let comboActive = false
  const combinadosMap = exercicios.map(ex => {
    let isPart = false; let position = 'none'
    if (ex.primeiro) { comboActive = true; position = 'first' }
    else if (comboActive && !ex.ultimo) position = 'middle'
    if (ex.ultimo) position = 'last'
    if (comboActive) isPart = true
    if (ex.ultimo) comboActive = false
    return { isPart, position }
  })

  return (
    <div className="flex flex-col gap-3">
      {detalheIdx !== null && (
        <DetalhesExercicio
          ex={exercicios[detalheIdx]}
          onSave={updated => { const arr = [...exercicios]; arr[detalheIdx] = updated; onChange(arr) }}
          onClose={() => setDetalheIdx(null)}
          intensidadeMap={intensidadeMap}
        />
      )}

      <div className="rounded-xl border border-[#323238] bg-[#1a1a1a] overflow-hidden">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="text-gray-500 text-[10px] uppercase tracking-wider border-b border-[#323238] bg-[#19191d]">
              <th className="w-[3px] p-0" />
              <th className="w-8 py-2.5 px-2" />
              <th className="text-left py-2.5 px-2 w-36">Grupo Muscular</th>
              <th className="text-left py-2.5 px-2 w-56">Exercício</th>
              <th className="text-center py-2.5 px-2 w-[88px]">Séries</th>
              <th className="text-center py-2.5 px-2 w-24">Reps</th>
              <th className="text-center py-2.5 px-2 w-24">Descanso</th>
              <th className="text-left py-2.5 px-2">Instruções</th>
              <th className="text-right py-2.5 px-2 w-32">Ações</th>
            </tr>
          </thead>
          <tbody>
            {exercicios.map((ex, i) => {
              const { isPart, position } = combinadosMap[i]
              return (
                <ExRow key={ex._id || i}
                  ex={ex} i={i} total={exercicios.length}
                  isPart={isPart} position={position}
                  onChange={e => { const arr = [...exercicios]; arr[i] = e; onChange(arr) }}
                  onMove={dir => move(i, dir)}
                  onDup={() => dupe(i)}
                  onRemove={() => remove(i)}
                  onOpenDetails={() => setDetalheIdx(i)}
                  grupos={grupos}
                  opcoesExercicio={exerciciosDoGrupo(ex.grupo_muscular, ex.exercicio)}
                  upd={(f, v) => upd(i, f, v)}
                />
              )
            })}
          </tbody>
        </table>
      </div>

      <button onClick={addRow}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-[#323238] hover:border-[#2563eb]/50 px-4 py-2 rounded-lg transition w-full justify-center">
        <Plus size={14} /> Adicionar Exercício
      </button>
    </div>
  )
}

// ─── ExRow — linha de exercício com novo visual ───────────────────────────────

const ExRow = ({ ex, i, total, isPart, position, onChange, onMove, onDup, onRemove, onOpenDetails, grupos, opcoesExercicio, upd }) => {
  const [comboOpen, setComboOpen] = useState(false)
  const [seriesOpen, setSeriesOpen] = useState(false)
  const comboBtnRef = useRef(null)
  const seriesBtnRef = useRef(null)
  const comboActive = ex.primeiro || ex.ultimo
  const hasSeriesNames = (ex.tipo_de_serie || '').split(',').some(s => s.trim())

  return (
    <tr className={`border-b border-[#323238] transition group hover:bg-[#202024] relative ${isPart ? 'bg-blue-500/[0.05]' : ''}`}>
      {/* Barra colorida de combinado */}
      <td className="p-0 w-[3px] relative">
        {isPart && <div className="absolute inset-y-0 left-0 w-[3px] bg-blue-500/70" />}
      </td>
      {/* Ordem */}
      <td className="px-2 w-10 align-middle">
        <div className="flex items-center gap-1">
          <div className="flex flex-col">
            <button onClick={() => i > 0 && onMove(-1)} disabled={i === 0}
              className="text-gray-600 hover:text-white disabled:opacity-20 leading-none"><ChevronUp size={11} /></button>
            <button onClick={() => i < total - 1 && onMove(1)} disabled={i === total - 1}
              className="text-gray-600 hover:text-white disabled:opacity-20 leading-none"><ChevronDown size={11} /></button>
          </div>
          <span className="text-[10px] font-bold font-mono text-gray-500">{i + 1}</span>
        </div>
      </td>
      {/* Grupo */}
      <td className="px-2 py-1 align-middle">
        <SearchableCombo value={ex.grupo_muscular || ''} onChange={v => upd('grupo_muscular', v)} options={grupos} placeholder="Grupo..." />
      </td>
      {/* Exercício */}
      <td className="px-2 py-1 align-middle">
        <SearchableCombo value={ex.exercicio || ''} onChange={v => upd('exercicio', v)} options={opcoesExercicio} placeholder="Buscar exercício..." />
      </td>
      {/* Séries + botão nomear */}
      <td className="px-2 py-1 align-middle">
        <div className="flex items-center gap-0.5">
          <input type="number" value={ex.series || ''} onChange={e => upd('series', e.target.value)}
            className="w-full h-8 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-center font-semibold" />
          <button ref={seriesBtnRef} onClick={() => setSeriesOpen(true)} title="Nomear séries"
            className={`h-8 w-6 flex items-center justify-center rounded transition shrink-0 ${
              hasSeriesNames ? 'text-amber-400 hover:text-amber-300' : 'text-gray-600 hover:text-gray-400'
            }`}>
            <ListOrdered size={11} />
          </button>
        </div>
        {seriesOpen && <SeriesNamePopover ex={ex} onChange={onChange} anchor={seriesBtnRef.current} onClose={() => setSeriesOpen(false)} />}
      </td>
      {/* Reps */}
      <td className="px-2 py-1 align-middle">
        <input value={ex.repeticoes || ''} onChange={e => upd('repeticoes', e.target.value)}
          className="w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-center" placeholder="8 a 12" />
      </td>
      {/* Descanso */}
      <td className="px-2 py-1 align-middle">
        <input value={ex.descanso || ''} onChange={e => upd('descanso', e.target.value)}
          className="w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-center" placeholder="00:45 a 01:30" />
      </td>
      {/* Instruções */}
      <td className="px-2 py-1 align-middle">
        <TextareaExpansivel value={ex.observacao || ''} onChange={v => upd('observacao', v)} placeholder="Instruções..." doctype="Treino Observacao" campo="treino_observacao" />
      </td>
      {/* Ações minimalistas */}
      <td className="px-1 py-1 align-middle">
        <div className="flex items-center justify-end gap-0.5">
          {/* Combinado */}
          <button ref={comboBtnRef} onClick={() => setComboOpen(true)} title="Combinado"
            className={`h-7 w-7 flex items-center justify-center rounded transition ${
              comboActive ? 'text-blue-300 bg-blue-500/15' : 'text-gray-500 hover:text-gray-200 hover:bg-[#29292e]'
            }`}>
            <Link2 size={12} />
          </button>
          {comboOpen && <ComboPopover ex={ex} onChange={onChange} anchor={comboBtnRef.current} onClose={() => setComboOpen(false)} />}
          {/* Detalhes */}
          <button onClick={onOpenDetails} title="Detalhes (vídeo, carga, intensidade)"
            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-[#29292e] rounded transition">
            <Info size={12} />
          </button>
          {/* Duplicar */}
          <button onClick={onDup} title="Duplicar"
            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-[#29292e] rounded transition">
            <Copy size={12} />
          </button>
          {/* Excluir */}
          <button onClick={onRemove} title="Excluir"
            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition">
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── GerenciadorTreinos ──────────────────────────────────────────────────────

const GerenciadorTreinos = ({ ficha, upd, onClose }) => {
  const [acao, setAcao] = useState('copiar')
  const [origem, setOrigem] = useState('')
  const [destino, setDestino] = useState('')
  const [feedback, setFeedback] = useState('')

  const executar = () => {
    if (!origem) return setFeedback('Selecione o treino de origem.')
    if (acao !== 'excluir' && !destino) return setFeedback('Selecione o treino de destino.')
    if ((acao === 'copiar' || acao === 'mover' || acao === 'inverter') && origem === destino)
      return setFeedback('Origem e destino não podem ser iguais.')

    const chaveOrigem = `planilha_de_treino_${origem}`
    const chaveDestino = `planilha_de_treino_${destino}`

    // Regenera _id e descarta o `name` do doc vindo do backend para evitar
    // colisão de keys no React e overwrite acidental do exercício original.
    const limpar = (ex) => {
      const { name, _id, ...resto } = ex
      return { ...resto, _id: uid() }
    }
    const exOrigem = (ficha[chaveOrigem] || []).map(limpar)
    const exDestino = (ficha[chaveDestino] || []).map(limpar)

    if (acao === 'copiar') {
      upd(chaveDestino, [...exDestino, ...exOrigem])
      setFeedback(`✅ Exercícios do ${labelTreino(origem, ficha)} copiados para ${labelTreino(destino, ficha)}.`)
    } else if (acao === 'mover') {
      upd(chaveDestino, [...exDestino, ...exOrigem])
      upd(chaveOrigem, [])
      setFeedback(`✅ Exercícios movidos de ${labelTreino(origem, ficha)} para ${labelTreino(destino, ficha)}.`)
    } else if (acao === 'inverter') {
      upd(chaveOrigem, exDestino)
      upd(chaveDestino, exOrigem)
      setFeedback(`✅ ${labelTreino(origem, ficha)} e ${labelTreino(destino, ficha)} invertidos.`)
    } else if (acao === 'excluir') {
      if (!window.confirm(`Excluir todos os exercícios do ${labelTreino(origem, ficha)}?`)) return
      upd(chaveOrigem, [])
      setFeedback(`✅ ${labelTreino(origem, ficha)} limpo.`)
    }
  }

  const rotulo = (t) => {
    const n = (ficha[`planilha_de_treino_${t}`] || []).length
    return `${labelTreino(t, ficha)}${n > 0 ? ` (${n} ex.)` : ' (vazio)'}`
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Gerenciador de Treinos"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={executar}>Executar</Button>
        </>
      }
    >
      <div className="p-4 flex flex-col gap-4">
        <FormGroup label="Ação">
          <Select
            value={acao}
            onChange={v => { setAcao(v); setFeedback('') }}
            placeholder=""
            options={[
              { value: 'copiar', label: 'Copiar exercícios' },
              { value: 'mover', label: 'Mover exercícios' },
              { value: 'inverter', label: 'Inverter treinos' },
              { value: 'excluir', label: 'Limpar treino' },
            ]}
          />
        </FormGroup>

        <FormGroup label={acao === 'inverter' ? 'Treino A (inverter com)' : 'Copiar/Mover/Limpar exercícios do'}>
          <Select
            value={origem}
            onChange={v => { setOrigem(v); setFeedback('') }}
            placeholder="Selecionar treino..."
            options={TREINOS.map(t => ({ value: t, label: rotulo(t) }))}
          />
        </FormGroup>

        {acao !== 'excluir' && (
          <FormGroup label={acao === 'inverter' ? 'Treino B (inverter com)' : 'Para'}>
            <Select
              value={destino}
              onChange={v => { setDestino(v); setFeedback('') }}
              placeholder="Selecionar treino..."
              options={TREINOS.filter(t => t !== origem).map(t => ({ value: t, label: rotulo(t) }))}
            />
          </FormGroup>
        )}

        {feedback && (
          <p className={`text-xs px-3 py-2 rounded-lg ${feedback.startsWith('✅')
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {feedback}
          </p>
        )}
      </div>
    </Modal>
  )
}

// ─── FormularioFicha ──────────────────────────────────────────────────────────

const buscarAlunosFn = async (q) => {
  if (q.length < 2) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

const FormularioFicha = ({ fichaInicial, onClose, onSave }) => {
  const isEdit = !!fichaInicial?.name
  const [step, setStep] = useState(() => parseInt(localStorage.getItem('fichaStep') || '0'))
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [numSemanas, setNumSemanas] = useState(
    fichaInicial?.periodizacao?.length > 0 ? fichaInicial.periodizacao.length : 4
  )
  const [volumeAnterior, setVolumeAnterior] = useState(null)
  const [aerobicoResetKey, setAerobicoResetKey] = useState(0)
  const [alongamentoResetKey, setAlongamentoResetKey] = useState(0)
  const [detalheAerobicoIdx, setDetalheAerobicoIdx] = useState(null)
  const [detalheAlongamentoIdx, setDetalheAlongamentoIdx] = useState(null)
  const [gerenciadorAberto, setGerenciadorAberto] = useState(false)

  const [gruposDisponiveis, setGruposDisponiveis] = useState(GRUPOS_BASE)
  const [porGrupo, setPorGrupo] = useState({})
  const [intensMap, setIntensMap] = useState({})
  const [mapaTreinos, setMapaTreinos] = useState({})
  const [alongs, setAlongs] = useState([])
  const [mapaAlong, setMapaAlong] = useState({})
  const [aerobs, setAerobs] = useState([])
  const [mapaAerob, setMapaAerob] = useState({})
  const [exercisesLoaded, setExercisesLoaded] = useState(false)
  const intensMapRef = useRef({})

  const [ficha, setFicha] = useState(() => {
    const base = novaFicha()
    if (!fichaInicial) return base
    return {
      ...base,
      ...fichaInicial,
      // Se Frappe retornou dias_da_semana vazio, mantém o template padrão
      dias_da_semana: fichaInicial.dias_da_semana?.length > 0
        ? fichaInicial.dias_da_semana
        : base.dias_da_semana,
    }
  })
  const upd = (field, val) => setFicha(f => ({ ...f, [field]: val }))

  const initialRef = useRef({ numSemanas, dataInicio: ficha.data_de_inicio })

  useEffect(() => {
    const { numSemanas: initS, dataInicio: initD } = initialRef.current
    if (numSemanas === initS && ficha.data_de_inicio === initD) return
    const qtd = parseInt(numSemanas) || 0
    if (ficha.data_de_inicio && qtd > 0) {
      const sems = calcularSemanas(ficha.data_de_inicio, qtd)
      const ultimo = sems[sems.length - 1].fim
      upd('data_de_fim', ultimo.toISOString().split('T')[0])
    }
  }, [numSemanas, ficha.data_de_inicio])

  useEffect(() => { localStorage.setItem('fichaStep', step) }, [step])

  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [ficha])

  useEffect(() => {
    listarGruposMusculares()
      .then(lista => { if (lista.length > 0) setGruposDisponiveis(lista) })
      .catch(console.error)

    listarExercicios().then(lista => {
      const mapG = {}, mapI = {}, mapD = {}
      lista.forEach(e => {
        const g = e.grupo_muscular || ''
        if (!mapG[g]) mapG[g] = []
        const nomeExercicio = e.nome_do_exercicio || e['nome_do_exercício'] || ''
        if (nomeExercicio) mapG[g].push(nomeExercicio)
        let intens = []
        try { intens = typeof e.intensidade_json === 'string' ? JSON.parse(e.intensidade_json) : (e.intensidade_json || []) } catch { }
        if (nomeExercicio) mapI[nomeExercicio] = intens
        if (e.name) mapI[e.name] = intens
        if (nomeExercicio) mapD[nomeExercicio] = { grupo_muscular: g, video: e.video, 'plataforma_do_vídeo': e['plataforma_do_vídeo'] }
        if (e.name) mapD[e.name] = { grupo_muscular: g, video: e.video, 'plataforma_do_vídeo': e['plataforma_do_vídeo'] }
      })
      intensMapRef.current = mapI
      setPorGrupo(mapG); setIntensMap(mapI); setMapaTreinos(mapD)
      setExercisesLoaded(true)
    }).catch(console.error)

    listarAlongamentos().then(lista => {
      const nomes = [], det = {}
      lista.forEach(item => {
        const nome = item['nome_do_exercício']
        if (nome) { nomes.push(nome); det[nome] = { video: item.video, 'plataforma_do_vídeo': item['plataforma_do_vídeo'] } }
      })
      setAlongs(nomes); setMapaAlong(det)
    }).catch(console.error)

    listarAerobicos().then(lista => {
      const nomes = [], det = {}
      lista.forEach(item => {
        const nome = item.exercicio_aerobico || item.name
        if (nome) { nomes.push(nome); det[nome] = { video: item.video, 'plataforma_do_vídeo': item['plataforma_do_vídeo'], instrucao: item.instrucao } }
      })
      setAerobs(nomes); setMapaAerob(det)
    }).catch(console.error)
  }, [])

  // Busca volume da ficha anterior do mesmo aluno para comparação
  useEffect(() => {
    if (!exercisesLoaded || !ficha.aluno) { setVolumeAnterior(null); return }
    listarFichas({ aluno: ficha.aluno, limit: 10 })
      .then(({ list }) => {
        const anterior = list.find(f => f.name !== ficha.name)
        if (!anterior) { setVolumeAnterior(null); return }
        buscarFicha(anterior.name)
          .then(fichaCompleta => {
            if (fichaCompleta) setVolumeAnterior(calcVolume(fichaCompleta, intensMapRef.current))
            else setVolumeAnterior(null)
          })
          .catch(console.error)
      })
      .catch(console.error)
  }, [ficha.aluno, ficha.name, exercisesLoaded])

  const gerarPeriodizacao = () => {
    if (!ficha.data_de_inicio) return alert('Selecione uma data de início primeiro.')
    const qtd = parseInt(numSemanas) || 4
    const sems = calcularSemanas(ficha.data_de_inicio, qtd)
    upd('data_de_fim', sems[sems.length - 1].fim.toISOString().split('T')[0])
    const tabelaAtual = ficha.periodizacao || []
    const novaTabela = sems.map((_, i) => {
      const existe = tabelaAtual[i]
      if (existe?.repeticoes || existe?.descanso) return { ...existe, semana: String(i + 1).padStart(2, '0') }
      return { semana: String(i + 1).padStart(2, '0'), series: tabelaAtual[0]?.series || '3', repeticoes: '', descanso: '' }
    })
    upd('periodizacao', novaTabela)
  }

  const handleSave = async () => {
    if (!ficha.aluno) { setErro('Selecione um aluno antes de salvar.'); return }
    setSaving(true); setErro('')
    try {
      const comIdx = (arr) => (arr || []).map((item, i) => {
        const { _id, ...rest } = item
        // Backfill intensidade para exercícios que nunca tiveram o campo populado
        if (!rest.intensidade || rest.intensidade === '[]') {
          const intens = intensMap[rest.exercicio]
          if (intens?.length) rest.intensidade = JSON.stringify(intens)
        }
        if (rest.intensidade && typeof rest.intensidade !== 'string') rest.intensidade = JSON.stringify(rest.intensidade)
        return { ...rest, idx: i + 1 }
      })
      const { name, creation, modified, modified_by, owner, docstatus, ...dados } = {
        ...ficha,
        periodizacao_dos_aerobicos: comIdx((ficha.periodizacao_dos_aerobicos || []).filter(a => a.exercicios?.trim())),
        planilha_de_alongamentos_e_mobilidade: comIdx((ficha.planilha_de_alongamentos_e_mobilidade || []).filter(a => a.exercicio?.trim())),
        planilha_de_treino_a: comIdx(ficha.planilha_de_treino_a),
        planilha_de_treino_b: comIdx(ficha.planilha_de_treino_b),
        planilha_de_treino_c: comIdx(ficha.planilha_de_treino_c),
        planilha_de_treino_d: comIdx(ficha.planilha_de_treino_d),
        planilha_de_treino_e: comIdx(ficha.planilha_de_treino_e),
        planilha_de_treino_f: comIdx(ficha.planilha_de_treino_f),
      }
      const resultado = ficha.name ? await salvarFicha(ficha.name, dados) : await criarFicha(dados)
      if (!ficha.name && resultado?.name) setFicha(f => ({ ...f, name: resultado.name }))
      onSave(resultado)
    } catch (e) {
      console.error(e); setErro(e.message || 'Erro ao salvar a ficha.')
    } finally { setSaving(false) }
  }

  const steps = [
    { id: 'config', label: 'Dados da Ficha' },
    { id: 'aerobico', label: 'Aeróbicos' },
    { id: 'alongamento', label: 'Alongamentos' },
    ...['a', 'b', 'c', 'd', 'e', 'f'].map(t => ({
      id: `treino_${t}`,
      label: ficha[`treino_${t}_label`] || `Treino ${t.toUpperCase()}`,
    })),
  ]

  const renderStep = () => {
    const s = steps[step]

    if (s.id === 'config') return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        <div className="space-y-4">
          <h3 className="text-white font-semibold text-sm border-b border-[#323238] pb-2">Informações da Ficha</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="Aluno" required>
              {ficha.nome_completo ? (
                <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
                  <span className="text-white text-sm">{ficha.nome_completo}</span>
                  <button onClick={() => { upd('aluno', ''); upd('nome_completo', '') }} className="text-gray-500 hover:text-red-400 ml-2">×</button>
                </div>
              ) : (
                <Autocomplete
                  searchFn={buscarAlunosFn}
                  onSelect={a => { upd('aluno', a.name); upd('nome_completo', a.nome_completo) }}
                  renderItem={a => <div><p className="font-medium text-sm text-white">{a.nome_completo}</p>{a.email && <p className="text-xs text-gray-500">{a.email}</p>}</div>}
                  placeholder="Buscar aluno pelo nome..."
                />
              )}
            </FormGroup>
            <FormGroup label="Objetivo">
              <Select value={ficha.objetivo || ''} onChange={v => upd('objetivo', v)}
                options={['Recomposição corporal', 'Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Saúde geral']}
                placeholder="Selecionar..." />
            </FormGroup>
          </div>

          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#323238] space-y-3">
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Planejamento Temporal</span>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <FormGroup label="Data de Início">
                <Input type="date" value={ficha.data_de_inicio || ''} onChange={v => upd('data_de_inicio', v)} />
              </FormGroup>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">Duração (Semanas)</label>
                <div className="flex gap-2">
                  {/* input de célula — exceção documentada */}
                  <input type="number" value={numSemanas} onChange={e => setNumSemanas(e.target.value)}
                    className="bg-[#29292e] border border-[#323238] text-gray-200 text-sm rounded-lg pl-3 w-full outline-none focus:border-[#2563eb]/60 h-10" />
                  <Button variant="primary" onClick={gerarPeriodizacao} icon={Zap} title="Gerar datas e tabela" />
                </div>
              </div>
              <FormGroup label="Data Fim">
                <Input type="date" value={ficha.data_de_fim || ''} onChange={v => upd('data_de_fim', v)} />
              </FormGroup>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup label="Nível">
              <Select value={ficha.nivel || ''} onChange={v => upd('nivel', v)} options={['Iniciante', 'Intermediário', 'Avançado']} placeholder="Selecionar..." />
            </FormGroup>
            <FormGroup label="Ciclo">
              <Select value={ficha.tipo_de_ciclo || ''} onChange={v => upd('tipo_de_ciclo', v)} options={['Macrociclo', 'Mesociclo', 'Microciclo']} placeholder="Selecionar..." />
            </FormGroup>
          </div>

          <FormGroup label="Orientações Gerais">
            <Textarea value={ficha.orientacoes || ''} onChange={v => upd('orientacoes', v)} placeholder="Orientações gerais..." rows={3} />
          </FormGroup>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <h3 className="text-white font-semibold text-sm border-b border-[#323238] pb-2">Distribuição Semanal</h3>
            <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] overflow-hidden">
              {ficha.dias_da_semana.map((dia, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 border-b border-[#323238] last:border-0 h-10">
                  <span className="text-gray-300 text-sm w-24">{dia.dia_da_semana}</span>
                  <select value={dia.treino} onChange={e => { const d = [...ficha.dias_da_semana]; d[i] = { ...d[i], treino: e.target.value }; upd('dias_da_semana', d) }}
                    className="bg-[#29292e] border border-[#323238] text-gray-200 text-xs rounded-lg px-2 py-1 outline-none focus:border-[#2563eb]/60 w-36">
                    <option value="Off">Off</option>
                    {['Treino A', 'Treino B', 'Treino C', 'Treino D', 'Treino E', 'Treino F'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-white font-semibold text-sm border-b border-[#323238] pb-2">Periodização</h3>
            <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-[#323238]">
                    <th className="py-2 px-3 text-left w-12">Sem.</th>
                    <th className="py-2 px-2 text-left text-[10px] text-gray-600 font-bold uppercase tracking-widest">Período (Seg-Dom)</th>
                    <th className="py-2 px-3 text-center">Séries</th>
                    <th className="py-2 px-3 text-center">Reps</th>
                    <th className="py-2 px-3 text-center">Descanso</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {(ficha.periodizacao || []).map((p, i) => {
                    let periodoTexto = '—'
                    if (ficha.data_de_inicio && ficha.periodizacao.length > 0) {
                      const sems = calcularSemanas(ficha.data_de_inicio, ficha.periodizacao.length)
                      const sem = sems[i]
                      if (sem) periodoTexto = `${formatarDataBr(sem.inicio)} - ${formatarDataBr(sem.fim)}`
                    }
                    return (
                      <tr key={i} className="border-b border-[#323238]/50 group h-10 hover:bg-[#202024]">
                        <td className="px-3 text-gray-400 font-mono">{String(i + 1).padStart(2, '0')}</td>
                        <td className="px-2 text-gray-500 text-[10px]">{periodoTexto}</td>
                        <td className="px-2 py-1"><input value={p.series || ''} onChange={e => { const a = [...ficha.periodizacao]; a[i] = { ...a[i], series: e.target.value }; upd('periodizacao', a) }} className="bg-[#29292e] border border-[#323238] text-gray-200 text-xs rounded px-2 py-1 w-full outline-none text-center" /></td>
                        <td className="px-2 py-1"><input value={p.repeticoes || ''} onChange={e => { const a = [...ficha.periodizacao]; a[i] = { ...a[i], repeticoes: e.target.value }; upd('periodizacao', a) }} className="bg-[#29292e] border border-[#323238] text-gray-200 text-xs rounded px-2 py-1 w-full outline-none text-center" /></td>
                        <td className="px-2 py-1"><input value={p.descanso || ''} onChange={e => { const a = [...ficha.periodizacao]; a[i] = { ...a[i], descanso: e.target.value }; upd('periodizacao', a) }} className="bg-[#29292e] border border-[#323238] text-gray-200 text-xs rounded px-2 py-1 w-full outline-none text-center" /></td>
                        <td className="px-2 text-center"><button onClick={() => upd('periodizacao', ficha.periodizacao.filter((_, idx) => idx !== i))} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><X size={11} /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <button onClick={() => { const a = ficha.periodizacao || []; const ul = a[a.length - 1]; upd('periodizacao', [...a, { semana: String(a.length + 1).padStart(2, '0'), series: ul?.series || '3', repeticoes: ul?.repeticoes || '', descanso: ul?.descanso || '' }]) }}
                className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1 transition border-t border-[#323238]/30">
                <Plus size={10} /> Add Semana Manual
              </button>
            </div>
          </div>
        </div>
      </div>
    )

    if (s.id === 'aerobico') return (
      <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
        {detalheAerobicoIdx !== null && (
          <DetalhesAerobico
            aerobico={ficha.periodizacao_dos_aerobicos[detalheAerobicoIdx]}
            onSave={(updated) => { const arr = [...ficha.periodizacao_dos_aerobicos]; arr[detalheAerobicoIdx] = updated; upd('periodizacao_dos_aerobicos', arr) }}
            onClose={() => setDetalheAerobicoIdx(null)}
          />
        )}
        <FormGroup label="Orientações Aeróbicos">
          <Textarea value={ficha.orientacoes_aerobicos || ''} onChange={v => upd('orientacoes_aerobicos', v)} rows={3} placeholder="Orientações gerais para os aeróbicos..." />
        </FormGroup>
        <div className="rounded-lg border border-[#323238] bg-[#1a1a1a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-[#323238]">
                  <th className="w-8 py-2 px-2" />
                  <th className="text-left py-2 px-2 w-56">Exercício</th>
                  <th className="text-left py-2 px-2 w-36">Frequência</th>
                  <th className="text-left py-2 px-2">Instruções</th>
                  <th className="py-2 px-2 w-32" />
                </tr>
              </thead>
              <tbody>
                {(ficha.periodizacao_dos_aerobicos || []).map((a, i) => {
                  const set = (f, v) => {
                    const arr = [...ficha.periodizacao_dos_aerobicos]; arr[i] = { ...arr[i], [f]: v }
                    if (f === 'exercicios') { const info = mapaAerob[v]; if (info) { arr[i].video = info.video || ''; arr[i]['plataforma_do_vídeo'] = info['plataforma_do_vídeo'] || 'YouTube'; if (!arr[i].instrucao?.trim()) arr[i].instrucao = info.instrucao || '' } }
                    upd('periodizacao_dos_aerobicos', arr)
                  }
                  return (
                    <tr key={a._id || i} className="border-b border-[#323238] hover:bg-[#202024] transition group">
                      <td className="px-2 text-center w-12 align-middle">
                        <div className="flex flex-col items-center">
                          <button onClick={() => { const arr = [...ficha.periodizacao_dos_aerobicos]; if (i === 0) return; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; upd('periodizacao_dos_aerobicos', arr) }} disabled={i === 0} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronUp size={12} /></button>
                          <span className="text-[10px] font-mono text-gray-600">{i + 1}</span>
                          <button onClick={() => { const arr = [...ficha.periodizacao_dos_aerobicos]; if (i === arr.length - 1) return; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; upd('periodizacao_dos_aerobicos', arr) }} disabled={i === ficha.periodizacao_dos_aerobicos.length - 1} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronDown size={12} /></button>
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle"><SearchableCombo value={a.exercicios || ''} onChange={v => set('exercicios', v)} options={aerobs} placeholder="Buscar..." /></td>
                      <td className="px-2 py-1 align-middle"><InputSug value={a.frequencia || ''} onChange={v => set('frequencia', v)} doctype="Frequencia Aerobico" campo="frequencia_aerobico" /></td>
                      <td className="px-2 py-1 align-top"><TextareaExpansivel value={a.instrucao || ''} onChange={v => set('instrucao', v)} placeholder="Instruções..." resetKey={aerobicoResetKey} doctype="Instrucao Aerobico" campo="instrucao_aerobico" /></td>
                      <td className="px-1 py-1 align-middle">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => setDetalheAerobicoIdx(i)} title="Detalhes"
                            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-[#29292e] rounded transition"><Info size={12} /></button>
                          <button onClick={() => { const arr = [...ficha.periodizacao_dos_aerobicos]; arr.splice(i+1, 0, { ...a, _id: uid() }); upd('periodizacao_dos_aerobicos', arr) }} title="Duplicar"
                            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-[#29292e] rounded transition"><Copy size={12} /></button>
                          <button onClick={() => upd('periodizacao_dos_aerobicos', ficha.periodizacao_dos_aerobicos.filter((_, idx) => idx !== i))} title="Excluir"
                            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <button onClick={() => { upd('periodizacao_dos_aerobicos', [...(ficha.periodizacao_dos_aerobicos || []), { _id: uid(), exercicios: '', frequencia: '', instrucao: '' }]); setAerobicoResetKey(k => k + 1) }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-[#323238] hover:border-[#2563eb]/50 px-4 py-2 rounded-lg transition w-full justify-center">
          <Plus size={14} /> Adicionar Aeróbico
        </button>
      </div>
    )

    if (s.id === 'alongamento') return (
      <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
        {detalheAlongamentoIdx !== null && (
          <DetalhesAlongamento
            alongamento={ficha.planilha_de_alongamentos_e_mobilidade[detalheAlongamentoIdx]}
            onSave={(updated) => { const arr = [...ficha.planilha_de_alongamentos_e_mobilidade]; arr[detalheAlongamentoIdx] = updated; upd('planilha_de_alongamentos_e_mobilidade', arr) }}
            onClose={() => setDetalheAlongamentoIdx(null)}
          />
        )}
        <FormGroup label="Orientações Alongamentos e Mobilidade">
          <Textarea value={ficha.orientacoes_aem || ''} onChange={v => upd('orientacoes_aem', v)} rows={3} placeholder="Orientações gerais para alongamentos..." />
        </FormGroup>
        <div className="rounded-lg border border-[#323238] bg-[#1a1a1a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-[#323238]">
                  <th className="w-8 py-2 px-2" />
                  <th className="text-left py-2 px-2 w-56">Exercício</th>
                  <th className="text-center py-2 px-2 w-20">Séries</th>
                  <th className="text-left py-2 px-2">Observação</th>
                  <th className="py-2 px-2 w-32" />
                </tr>
              </thead>
              <tbody>
                {(ficha.planilha_de_alongamentos_e_mobilidade || []).map((a, i) => {
                  const set = (f, v) => {
                    const arr = [...ficha.planilha_de_alongamentos_e_mobilidade]; arr[i] = { ...arr[i], [f]: v }
                    if (f === 'exercicio') { const info = mapaAlong[v]; if (info) { arr[i].video = info.video || ''; arr[i]['plataforma_do_vídeo'] = info['plataforma_do_vídeo'] || 'YouTube' } }
                    upd('planilha_de_alongamentos_e_mobilidade', arr)
                  }
                  return (
                    <tr key={a._id || i} className="border-b border-[#323238] hover:bg-[#202024] transition group">
                      <td className="px-2 text-center w-12 align-middle">
                        <div className="flex flex-col items-center">
                          <button onClick={() => { const arr = [...ficha.planilha_de_alongamentos_e_mobilidade]; if (i === 0) return; [arr[i], arr[i-1]] = [arr[i-1], arr[i]]; upd('planilha_de_alongamentos_e_mobilidade', arr) }} disabled={i === 0} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronUp size={12} /></button>
                          <span className="text-[10px] font-mono text-gray-600">{i + 1}</span>
                          <button onClick={() => { const arr = [...ficha.planilha_de_alongamentos_e_mobilidade]; if (i === arr.length - 1) return; [arr[i], arr[i+1]] = [arr[i+1], arr[i]]; upd('planilha_de_alongamentos_e_mobilidade', arr) }} disabled={i === ficha.planilha_de_alongamentos_e_mobilidade.length - 1} className="text-gray-600 hover:text-white disabled:opacity-20"><ChevronDown size={12} /></button>
                        </div>
                      </td>
                      <td className="px-2 py-1 align-middle"><SearchableCombo value={a.exercicio || ''} onChange={v => set('exercicio', v)} options={alongs} placeholder="Buscar..." /></td>
                      <td className="px-2 py-1 align-middle"><input type="number" value={a.series || ''} onChange={e => set('series', e.target.value)} className="w-full h-8 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-center" /></td>
                      <td className="px-2 py-1 align-top"><TextareaExpansivel value={a.observacoes || ''} onChange={v => set('observacoes', v)} placeholder="Observações..." resetKey={alongamentoResetKey} doctype="Alongamento Observacao" campo="alongamento_observacao" /></td>
                      <td className="px-1 py-1 align-middle">
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => setDetalheAlongamentoIdx(i)} title="Detalhes"
                            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-[#29292e] rounded transition"><Info size={12} /></button>
                          <button onClick={() => { const arr = [...ficha.planilha_de_alongamentos_e_mobilidade]; arr.splice(i+1, 0, { ...a, _id: uid() }); upd('planilha_de_alongamentos_e_mobilidade', arr) }} title="Duplicar"
                            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-[#29292e] rounded transition"><Copy size={12} /></button>
                          <button onClick={() => upd('planilha_de_alongamentos_e_mobilidade', ficha.planilha_de_alongamentos_e_mobilidade.filter((_, idx) => idx !== i))} title="Excluir"
                            className="h-7 w-7 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition"><Trash2 size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <button onClick={() => upd('planilha_de_alongamentos_e_mobilidade', [...(ficha.planilha_de_alongamentos_e_mobilidade || []), { _id: uid(), exercicio: '', series: 3, observacoes: '' }])}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-dashed border-[#323238] hover:border-[#2563eb]/50 px-4 py-2 rounded-lg transition w-full justify-center">
          <Plus size={14} /> Adicionar Alongamento
        </button>
      </div>
    )

    // Treinos A–F
    const t = s.id.replace('treino_', '')
    return (
      <div className="flex flex-col gap-4 max-w-6xl mx-auto w-full">
        <div className="max-w-xs">
          <FormGroup label={`Nome do Treino ${t.toUpperCase()} (opcional)`} >
            <Input value={ficha[`treino_${t}_label`] || ''} onChange={v => upd(`treino_${t}_label`, v)} placeholder={`Ex: Inferior A, Upper, Push...`} />
          </FormGroup>
        </div>
        <FormGroup label={`Orientações Treino ${t.toUpperCase()}`}>
          <Textarea value={ficha[`orientacoes_treino_${t}`] || ''} onChange={v => upd(`orientacoes_treino_${t}`, v)} rows={3} placeholder="Orientações específicas deste treino..." />
        </FormGroup>
        <TabelaExercicios
          key={t}
          exercicios={ficha[`planilha_de_treino_${t}`] || []}
          onChange={exs => upd(`planilha_de_treino_${t}`, exs)}
          exerciciosPorGrupo={porGrupo}
          intensidadeMap={intensMap}
          mapaDetalhes={mapaTreinos}
          gruposBase={gruposDisponiveis}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full text-white">
      {/* Header — sticky dentro do scroll container do AppLayout */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-[#323238] bg-[#29292e]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-white font-bold">{isEdit ? 'Editar Ficha' : 'Nova Ficha'}</h1>
            {ficha.nome_completo && <p className="text-gray-400 text-sm">{ficha.nome_completo}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {erro && <p className="text-red-400 text-sm max-w-xs truncate">{erro}</p>}
          <Button variant="secondary" icon={Copy} onClick={() => setGerenciadorAberto(true)}>
            Gerenciar Treinos
          </Button>
          <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
            Salvar Ficha
          </Button>
        </div>
      </div>

      {/* Step nav — sticky abaixo do header */}
      <div className="sticky top-[57px] z-10 flex items-center gap-1 px-6 py-2 border-b border-[#323238] bg-[#29292e] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${i === step ? 'bg-[#2563eb] text-white' : 'text-gray-400 hover:text-white hover:bg-[#323238]'}`}>
            <span className="text-xs mr-1 opacity-40">{i + 1}</span>{s.label}
          </button>
        ))}
      </div>

      {/* Conteúdo do step */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#202024]">
        {renderStep()}
      </div>

      {/* Rodapé de volume — fora do scroll */}
      <RodapeVolume ficha={ficha} intensidadeMap={intensMap} volumeAnterior={volumeAnterior} />

      {/* Banner orientações globais do aluno */}
      {ficha.aluno && <BannerOrientacoes alunoId={ficha.aluno} />}

      {/* Prev / Next */}
      <div className="sticky bottom-0 z-10 flex justify-between items-center px-6 py-3 bg-[#202024] border-t border-[#323238]">
        <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Anterior</Button>
        <span className="text-gray-600 text-xs">{step + 1} / {steps.length}</span>
        <Button variant="ghost" iconRight={ChevronRight} onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>Próximo</Button>
      </div>

      {gerenciadorAberto && (
        <GerenciadorTreinos
          ficha={ficha}
          upd={upd}
          onClose={() => setGerenciadorAberto(false)}
        />
      )}
    </div>
  )
}

// ─── FichaDetalhe ─────────────────────────────────────────────────────────────

export default function FichaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fichaInicial, setFichaInicial] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (id === 'nova') { setFichaInicial(null); setLoading(false); return }
    buscarFicha(id)
      .then(setFichaInicial)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Spinner size="lg" />
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-red-400">{error}</p>
    </div>
  )

  return (
    <FormularioFicha
      fichaInicial={fichaInicial}
      onClose={() => navigate('/fichas')}
      onSave={(saved) => {
        if (id === 'nova' && saved?.name) navigate(`/fichas/${saved.name}`, { replace: true })
      }}
    />
  )
}
