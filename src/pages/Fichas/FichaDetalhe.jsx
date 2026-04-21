import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Save,
  Plus, X, Trash2, Copy, Info, GripVertical, Loader,
  Settings, Zap, Lightbulb, BookmarkPlus, BookmarkCheck,
} from 'lucide-react'
import {
  listarFichas, buscarFicha, criarFicha, salvarFicha,
  listarExercicios, listarAlongamentos, listarAerobicos, listarGruposMusculares,
} from '../../api/fichas'
import { listarAlunos, buscarAluno, salvarAluno } from '../../api/alunos'
import { listarTextos, salvarNoBancoSeNovo } from '../../api/bancoTextos'
import {
  Button, FormGroup, Input, Select, Textarea,
  Autocomplete, Modal, Spinner, TextareaComSugestoes,
} from '../../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`

const arrayMove = (arr, from, to) => {
  const a = [...arr]
  const [item] = a.splice(from, 1)
  a.splice(to > from ? to - 1 : to, 0, item)
  return a
}

const somarDias = (dataStr, dias) => {
  if (!dataStr) return ''
  const d = new Date(dataStr + 'T00:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

const getSegundaFeira = (dataStr) => {
  if (!dataStr) return null
  const d = new Date(dataStr + 'T00:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
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
  const debRef = useRef(null)
  const blurRef = useRef(null)
  const [sugestoes, setSugestoes] = useState([])
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

  const abrirComResultados = (lista) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 240) })
    setSugestoes(lista)
    if (lista.length > 0) setDropOpen(true)
  }

  // Auto-suggest enquanto digita
  useEffect(() => {
    if (!doctype || !campo) return
    clearTimeout(debRef.current)
    if (!value?.trim()) { setSugestoes([]); setDropOpen(false); return }
    debRef.current = setTimeout(async () => {
      try {
        const lista = await listarTextos(doctype, campo, { busca: value.trim(), apenasAtivos: true })
        const filtradas = lista.filter(item => (item[campo] || '').trim().toLowerCase() !== value.trim().toLowerCase())
        abrirComResultados(filtradas)
      } catch (e) { console.error('sugestões:', e.message) }
    }, 300)
    return () => clearTimeout(debRef.current)
  }, [value, doctype, campo])

  // Lightbulb: busca explícita sem filtro de texto
  const abrirTodas = async () => {
    if (!doctype || !campo) return
    try {
      const lista = await listarTextos(doctype, campo, { apenasAtivos: true })
      abrirComResultados(lista)
    } catch (e) { console.error('sugestões:', e.message) }
  }

  const salvarNoBanco = async () => {
    if (!value?.trim() || !doctype || !campo) return
    try {
      await salvarNoBancoSeNovo(doctype, campo, value.trim())
      setSalvoBanco(true)
      setTimeout(() => setSalvoBanco(false), 2000)
    } catch (e) { console.error('salvar banco:', e.message) }
  }

  const handleBlur = () => { blurRef.current = setTimeout(() => setDropOpen(false), 200) }
  const handleFocus = () => clearTimeout(blurRef.current)

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value || ''}
        onChange={e => { onChange(e.target.value); grow() }}
        onFocus={(e) => { grow(); handleFocus() }}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={1}
        className={`bg-[#29292e] border border-[#323238] text-gray-200 text-xs rounded px-2 py-1.5 w-full outline-none focus:border-[#2563eb]/60 resize-none leading-tight min-h-[2rem] ${doctype ? 'pr-9' : ''} ${className}`}
      />
      {doctype && campo && (
        <>
          <button ref={btnRef} type="button" onClick={abrirTodas}
            className="absolute top-1 right-5 text-gray-600 hover:text-yellow-400 transition-colors"
            title="Ver todas as sugestões">
            <Lightbulb size={10} />
          </button>
          {value?.trim() && (
            <button type="button"
              onMouseDown={(e) => { e.preventDefault(); salvarNoBanco() }}
              className="absolute top-1 right-1 transition-colors"
              title="Salvar no banco de textos">
              {salvoBanco
                ? <BookmarkCheck size={10} className="text-green-400" />
                : <BookmarkPlus size={10} className="text-gray-600 hover:text-[#2563eb]" />}
            </button>
          )}
        </>
      )}
      {dropOpen && dropPos && createPortal(
        <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, width: dropPos.width }}
          className="bg-[#29292e] border border-[#323238] rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#323238] flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sugestões</span>
            <button onMouseDown={() => setDropOpen(false)} className="text-gray-600 hover:text-white text-xs">✕</button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {sugestoes.length === 0
              ? <p className="text-gray-500 text-xs text-center py-3">Nenhuma sugestão cadastrada</p>
              : sugestoes.map(item => (
                <button key={item.name} type="button"
                  onMouseDown={() => { clearTimeout(blurRef.current); onChange(item[campo]); setDropOpen(false); setTimeout(grow, 0) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#323238] hover:text-white transition-colors border-b border-[#323238]/50 last:border-0">
                  {item[campo]}
                </button>
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
  const debRef = useRef(null)
  const blurRef = useRef(null)
  const [sugestoes, setSugestoes] = useState([])
  const [dropOpen, setDropOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const [salvoBanco, setSalvoBanco] = useState(false)

  const abrirComResultados = (lista) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) })
    setSugestoes(lista)
    if (lista.length > 0) setDropOpen(true)
  }

  useEffect(() => {
    clearTimeout(debRef.current)
    if (!value?.trim()) { setSugestoes([]); setDropOpen(false); return }
    debRef.current = setTimeout(async () => {
      try {
        const lista = await listarTextos(doctype, campo, { busca: value.trim(), apenasAtivos: true })
        const filtradas = lista.filter(item => (item[campo] || '').trim().toLowerCase() !== value.trim().toLowerCase())
        abrirComResultados(filtradas)
      } catch (e) { console.error('sugestões:', e.message) }
    }, 300)
    return () => clearTimeout(debRef.current)
  }, [value, doctype, campo])

  const abrirTodas = async () => {
    try {
      const lista = await listarTextos(doctype, campo, { apenasAtivos: true })
      abrirComResultados(lista)
    } catch (e) { console.error('sugestões:', e.message) }
  }

  const salvarNoBanco = async () => {
    if (!value?.trim()) return
    try {
      await salvarNoBancoSeNovo(doctype, campo, value.trim())
      setSalvoBanco(true)
      setTimeout(() => setSalvoBanco(false), 2000)
    } catch (e) { console.error('salvar banco:', e.message) }
  }

  const handleBlur = () => { blurRef.current = setTimeout(() => setDropOpen(false), 200) }

  return (
    <div className="relative flex items-center">
      <input ref={ref} value={value || ''} onChange={e => onChange(e.target.value)}
        onBlur={handleBlur} onFocus={() => clearTimeout(blurRef.current)}
        className={`w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 pr-9 ${className}`} />
      <button type="button" onClick={abrirTodas}
        className="absolute right-5 text-gray-600 hover:text-yellow-400 transition-colors" title="Ver todas as sugestões">
        <Lightbulb size={10} />
      </button>
      {value?.trim() && (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); salvarNoBanco() }}
          className="absolute right-1 transition-colors" title="Salvar no banco">
          {salvoBanco
            ? <BookmarkCheck size={10} className="text-green-400" />
            : <BookmarkPlus size={10} className="text-gray-600 hover:text-[#2563eb]" />}
        </button>
      )}
      {dropOpen && dropPos && createPortal(
        <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, width: dropPos.width }}
          className="bg-[#29292e] border border-[#323238] rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 border-b border-[#323238] flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sugestões</span>
            <button onMouseDown={() => setDropOpen(false)} className="text-gray-600 hover:text-white text-xs">✕</button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {sugestoes.length === 0
              ? <p className="text-gray-500 text-xs text-center py-3">Nenhuma sugestão</p>
              : sugestoes.map(item => (
                <button key={item.name} type="button"
                  onMouseDown={() => { clearTimeout(blurRef.current); onChange(item[campo]); setDropOpen(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-[#323238] hover:text-white transition-colors border-b border-[#323238]/50 last:border-0">
                  {item[campo]}
                </button>
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
  const normKey = s => normalizar(s).replace(/\s/g, '')

  const getVal = (map, key) =>
    Object.entries(map || {}).find(([k]) => normKey(k) === key)?.[1] || 0

  return (
    <div className="shrink-0 bg-[#0a0a0a] border-t border-[#323238] px-4 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex items-center gap-3 min-w-max">
        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest shrink-0">Volume</span>
        {GRUPOS_CONFIG.map(g => {
          const atual = getVal(vol, g.key)
          const anterior = getVal(volumeAnterior, g.key)
          const delta = volumeAnterior ? atual - anterior : null
          return (
            <div key={g.key} className={`flex items-center gap-1 px-2 py-0.5 rounded ${g.bg} ${atual === 0 ? 'opacity-40' : ''}`}>
              <span className="text-[9px] text-gray-400">{g.label}</span>
              <span className={`text-[10px] font-bold ${atual === 0 ? 'text-gray-500' : 'text-white'}`}>{atual.toFixed(0)}</span>
              {delta !== null && delta !== 0 && (
                <span className={`text-[8px] font-bold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {delta > 0 ? `+${delta.toFixed(0)}` : delta.toFixed(0)}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DetalhesExercicio ────────────────────────────────────────────────────────

const DetalhesExercicio = ({ ex, onSave, onClose, intensidadeMap = {} }) => {
  const [local, setLocal] = useState({ ...ex })
  const [videoDetected, setVideoDetected] = useState(false)
  const upd = (f, v) => setLocal(l => ({ ...l, [f]: v }))
  const handleVideoChange = (v) => {
    const info = extractVideoInfo(v)
    if (info) { upd('video', info.id); upd('plataforma_do_vídeo', info.platform); setVideoDetected(true) }
    else { upd('video', v); setVideoDetected(false) }
  }

  const TITULOS_COMBINADO = ['Bi-set', 'Tri-set', 'Superset']

  let intensidades = []
  try {
    const raw = local.intensidade
    intensidades = typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
  } catch { }
  if (!intensidades.length) intensidades = intensidadeMap[local.exercicio] || []

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Detalhes do Exercício"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => { onSave(local); onClose() }}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <div className="bg-[#1a1a1a] rounded-lg px-4 py-2 text-sm text-gray-300 font-medium">{local.exercicio || '—'}</div>

        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Carga Sugerida (kg)">
            <Input type="number" value={local.carga_sugerida || ''} onChange={v => upd('carga_sugerida', v)} />
          </FormGroup>
          <FormGroup label="Link ou ID do Vídeo" hint={videoDetected ? '✓ ID extraído automaticamente' : 'Cole o link ou o código'}>
            <Input value={local.video || ''} onChange={handleVideoChange} placeholder="https://youtu.be/... ou dQw4w9WgXcQ" />
          </FormGroup>
        </div>

        <FormGroup label="Tipo de Série (séries nomeadas, separadas por vírgula)">
          <Input value={local.tipo_de_serie || ''} onChange={v => upd('tipo_de_serie', v)} placeholder="Ex: Aquecimento,Preparatória,Válida" />
        </FormGroup>

        <FormGroup label="Plataforma do Vídeo">
          <Select value={local['plataforma_do_vídeo'] || ''} onChange={v => upd('plataforma_do_vídeo', v)}
            options={PLATAFORMAS_VIDEO} placeholder="Selecionar..." />
        </FormGroup>

        <div className="border border-[#323238] rounded-lg p-4 space-y-3">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Exercício Combinado</span>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={!!local.primeiro} onChange={e => upd('primeiro', e.target.checked ? 1 : 0)} className="accent-[#2563eb] w-4 h-4" />
              Primeiro exercício
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={!!local.ultimo} onChange={e => upd('ultimo', e.target.checked ? 1 : 0)} className="accent-[#2563eb] w-4 h-4" />
              Último exercício
            </label>
          </div>
          {(local.primeiro || local.ultimo) && (
            <FormGroup label="Título do Combinado">
              <Select value={local.titulo_do_exercicio_combinado || ''} onChange={v => upd('titulo_do_exercicio_combinado', v)} options={TITULOS_COMBINADO} placeholder="Selecionar..." />
            </FormGroup>
          )}
        </div>

        {intensidades.length > 0 && (
          <div className="border border-[#323238] rounded-lg p-4 space-y-2">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Intensidade por Grupo</span>
            {intensidades.map((int, i) => {
              const val = parseFloat(String(int.intensidade).replace(',', '.')) || 0
              return (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{int.grupo_muscular}</span>
                  <span className={`font-bold ${val >= 1 ? 'text-red-400' : val >= 0.5 ? 'text-yellow-400' : 'text-gray-400'}`}>{int.intensidade}</span>
                </div>
              )
            })}
          </div>
        )}
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

  // Mapa de quais linhas fazem parte de um combinado
  let comboActive = false
  const combinadosMap = exercicios.map(ex => {
    let isPart = false
    if (ex.primeiro) comboActive = true
    if (comboActive) isPart = true
    if (ex.ultimo) comboActive = false
    return isPart
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

      <div className="rounded-xl border border-[#323238] bg-[#1a1a1a]">
        <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-[#323238]">
                <th className="w-8 py-2 px-2"></th>
                <th className="text-left py-2 px-2 w-36">Grupo Muscular</th>
                <th className="text-left py-2 px-2 w-56">Exercício</th>
                <th className="text-center py-2 px-2 w-12">Séries</th>
                <th className="text-center py-2 px-2 w-24">Reps</th>
                <th className="text-center py-2 px-2 w-24">Descanso</th>
                <th className="text-left py-2 px-2">Instruções</th>
                <th className="text-center py-2 px-2 w-32">Ações</th>
              </tr>
            </thead>
            <tbody>
              {exercicios.map((ex, i) => {
                const isInCombo = combinadosMap[i]
                return (
                  <tr key={ex._id || i}
                    className={`border-b border-[#323238] transition group hover:bg-[#202024] ${isInCombo ? 'bg-[#2563eb]/10 border-l-2 border-l-[#2563eb]' : 'border-l-2 border-l-transparent'}`}>
                    {/* Ordem */}
                    <td className="px-2 text-center w-8 align-middle">
                      <div className="flex flex-row items-center justify-center gap-1">
                        <div className="flex flex-col items-center">
                          <button onClick={() => i > 0 && move(i, -1)} disabled={i === 0}
                            className="text-gray-600 hover:text-white disabled:opacity-20 transition"><ChevronUp size={12} /></button>
                          <button onClick={() => i < exercicios.length - 1 && move(i, 1)} disabled={i === exercicios.length - 1}
                            className="text-gray-600 hover:text-white disabled:opacity-20 transition"><ChevronDown size={12} /></button>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-gray-500">{i + 1}</span>
                      </div>
                    </td>
                    {/* Grupo */}
                    <td className="px-2 py-1 align-middle">
                      <SearchableCombo
                        value={ex.grupo_muscular || ''}
                        onChange={v => upd(i, 'grupo_muscular', v)}
                        options={grupos}
                        placeholder="Grupo..."
                      />
                    </td>
                    {/* Exercício */}
                    <td className="px-2 py-1 align-middle">
                      <SearchableCombo
                        value={ex.exercicio || ''}
                        onChange={v => upd(i, 'exercicio', v)}
                        options={exerciciosDoGrupo(ex.grupo_muscular, ex.exercicio)}
                        placeholder="Buscar exercício..."
                      />
                    </td>
                    {/* Séries */}
                    <td className="px-2 py-1 align-middle">
                      <input type="number" value={ex.series || ''} onChange={e => upd(i, 'series', e.target.value)}
                        className="w-full h-8 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-center" />
                    </td>
                    {/* Reps */}
                    <td className="px-2 py-1 align-middle">
                      <input value={ex.repeticoes || ''} onChange={e => upd(i, 'repeticoes', e.target.value)}
                        className="w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-center" />
                    </td>
                    {/* Descanso */}
                    <td className="px-2 py-1 align-middle">
                      <input value={ex.descanso || ''} onChange={e => upd(i, 'descanso', e.target.value)}
                        className="w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 text-center" />
                    </td>
                    {/* Instruções */}
                    <td className="px-2 py-1 align-middle">
                      <TextareaExpansivel value={ex.observacao || ''} onChange={v => upd(i, 'observacao', v)} placeholder="Instruções..." doctype="Treino Observacao" campo="treino_observacao" />
                    </td>
                    {/* Ações */}
                    <td className="px-1 py-1 align-top">
                      <div className="flex flex-col gap-1 justify-center h-full pt-0.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => upd(i, 'primeiro', ex.primeiro ? 0 : 1)}
                            className={`text-[10px] font-bold px-2 h-7 rounded border transition ${ex.primeiro ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'border-[#323238] text-gray-500 hover:border-gray-500'}`}>
                            1º
                          </button>
                          <button onClick={() => upd(i, 'ultimo', ex.ultimo ? 0 : 1)}
                            className={`text-[10px] font-bold px-2 h-7 rounded border transition ${ex.ultimo ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'border-[#323238] text-gray-500 hover:border-gray-500'}`}>
                            Ult
                          </button>
                          <div className="w-px h-5 bg-[#323238]" />
                          {!!ex.primeiro && (
                            <TipoCombinadoBtn value={ex.titulo_do_exercicio_combinado || ''} onChange={v => upd(i, 'titulo_do_exercicio_combinado', v)} />
                          )}
                          <button onClick={() => setDetalheIdx(i)} title="Detalhes"
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors">
                            <Info size={10} />
                          </button>
                          <button onClick={() => dupe(i)} title="Duplicar"
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors">
                            <Copy size={10} />
                          </button>
                          <button onClick={() => remove(i)} title="Excluir"
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
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
    if (ficha.data_de_inicio && parseInt(numSemanas) > 0) {
      upd('data_de_fim', somarDias(ficha.data_de_inicio, parseInt(numSemanas) * 7 - 1))
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
      console.log('[Exercicios] total:', lista.length, 'exemplo:', lista[0])
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
    const semanas = parseInt(numSemanas) || 4
    upd('data_de_fim', somarDias(ficha.data_de_inicio, semanas * 7 - 1))
    const tabelaAtual = ficha.periodizacao || []
    const novaTabela = Array.from({ length: semanas }, (_, i) => {
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
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
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
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Duração (Semanas)</label>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <th className="py-2 px-3 text-left w-10">Sem.</th>
                    <th className="py-2 px-2 text-left text-[10px] text-gray-600 font-normal">Período</th>
                    <th className="py-2 px-3 text-center">Séries</th>
                    <th className="py-2 px-3 text-center">Reps</th>
                    <th className="py-2 px-3 text-center">Descanso</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {(ficha.periodizacao || []).map((p, i) => {
                    let periodoTexto = '—'
                    if (ficha.data_de_inicio) {
                      const seg = getSegundaFeira(ficha.data_de_inicio)
                      if (seg) {
                        const ini = new Date(seg); ini.setDate(seg.getDate() + i * 7)
                        const fim = new Date(ini); fim.setDate(ini.getDate() + 6)
                        periodoTexto = `${formatarDataBr(ini)} - ${formatarDataBr(fim)}`
                      }
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
      <div className="flex flex-col gap-4 w-full">
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
                  <th className="w-10 py-2 px-2" />
                  <th className="text-left py-2 px-2 w-[25%]">Exercício</th>
                  <th className="text-left py-2 px-2 w-[15%]">Frequência</th>
                  <th className="text-left py-2 px-2">Instruções</th>
                  <th className="py-2 px-2 w-20" />
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
                      <td className="px-2 py-1 text-center align-middle">
                        <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => setDetalheAerobicoIdx(i)} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"><Info size={10} /></button>
                          <button onClick={() => { const arr = [...ficha.periodizacao_dos_aerobicos]; arr.splice(i+1, 0, { ...a, _id: uid() }); upd('periodizacao_dos_aerobicos', arr) }} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors"><Copy size={10} /></button>
                          <button onClick={() => upd('periodizacao_dos_aerobicos', ficha.periodizacao_dos_aerobicos.filter((_, idx) => idx !== i))} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"><Trash2 size={10} /></button>
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
      <div className="flex flex-col gap-4 w-full">
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
                  <th className="w-10 py-2 px-2" />
                  <th className="text-left py-2 px-2 w-[35%]">Exercício</th>
                  <th className="text-center py-2 px-2 w-[10%]">Séries</th>
                  <th className="text-left py-2 px-2">Observação</th>
                  <th className="py-2 px-2 w-20" />
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
                      <td className="px-2 py-1 text-center align-middle">
                        <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => setDetalheAlongamentoIdx(i)} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"><Info size={10} /></button>
                          <button onClick={() => { const arr = [...ficha.planilha_de_alongamentos_e_mobilidade]; arr.splice(i+1, 0, { ...a, _id: uid() }); upd('planilha_de_alongamentos_e_mobilidade', arr) }} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors"><Copy size={10} /></button>
                          <button onClick={() => upd('planilha_de_alongamentos_e_mobilidade', ficha.planilha_de_alongamentos_e_mobilidade.filter((_, idx) => idx !== i))} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"><Trash2 size={10} /></button>
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
      <div className="flex flex-col gap-4 w-full">
        <FormGroup label={`Nome do Treino ${t.toUpperCase()} (opcional)`} >
          <Input value={ficha[`treino_${t}_label`] || ''} onChange={v => upd(`treino_${t}_label`, v)} placeholder={`Ex: Inferior A, Upper, Push...`} />
        </FormGroup>
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
      <div className="flex-1 px-6 py-6 bg-[#202024]">
        {renderStep()}
      </div>

      {/* Rodapé de volume — sticky na base */}
      <RodapeVolume ficha={ficha} intensidadeMap={intensMap} volumeAnterior={volumeAnterior} />

      {/* Banner orientações globais do aluno */}
      {ficha.aluno && <BannerOrientacoes alunoId={ficha.aluno} />}

      {/* Prev / Next */}
      <div className="sticky bottom-0 z-10 flex justify-between items-center px-6 py-3 bg-[#202024] border-t border-[#323238]">
        <Button variant="ghost" icon={ChevronLeft} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Anterior</Button>
        <span className="text-gray-600 text-xs">{step + 1} / {steps.length}</span>
        <Button variant="ghost" iconRight={ChevronRight} onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))} disabled={step === steps.length - 1}>Próximo</Button>
      </div>
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
