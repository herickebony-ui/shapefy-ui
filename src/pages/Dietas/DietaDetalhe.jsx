import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, AlertCircle, Loader, ChevronUp, ChevronDown, Plus,
  FileText, UtensilsCrossed, Edit, Copy, Trash2, ArrowLeftRight, X,
  BookmarkPlus, BookmarkCheck,
} from 'lucide-react'
import {
  buscarDieta, salvarDieta, listarAlimentos,
  listarRefeicoesProntas, buscarRefeicaoPronta,
  criarRefeicaoPronta, excluirDieta, duplicarDieta
} from '../../api/dietas'
import { listarAlunos, buscarAluno, salvarAluno } from '../../api/alunos'
import { listarTextos, salvarNoBancoSeNovo, excluirTexto } from '../../api/bancoTextos'
import {
  Button, FormGroup, Input, Select, Textarea, Autocomplete,
  Modal, CollapsibleBanner, Tabs, FooterTotais,
} from '../../components/ui'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v, dec = 1) => v != null ? Number(v).toFixed(dec) : '0.0'
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// ─── LegendaSug ───────────────────────────────────────────────────────────────
// Input de legenda com auto-sugestão ao digitar (portal fixed).

const LegendaSug = ({ value, onChange }) => {
  const ref = useRef(null)
  const blurRef = useRef(null)
  const [todasSugestoes, setTodasSugestoes] = useState(null)
  const [dropOpen, setDropOpen] = useState(false)
  const [dropPos, setDropPos] = useState(null)
  const [salvoBanco, setSalvoBanco] = useState(false)

  const posicionar = () => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    setDropPos({ top: r.bottom + 4, left: Math.max(4, r.right - 280), width: 280 })
  }

  const carregarTodas = async () => {
    if (todasSugestoes !== null) return todasSugestoes
    try {
      const lista = await listarTextos('Legendas', 'legend', { apenasAtivos: true, extra: 'full_name' })
      setTodasSugestoes(lista)
      return lista
    } catch (e) { console.error('sugestões legendas:', e.message); return [] }
  }

  const filtrar = (lista, q) => {
    if (!q?.trim()) return lista
    const term = q.trim().toLowerCase().replace(/%/g, '.*')
    const re = new RegExp(term)
    return lista.filter(item => {
      const texto = (item.legend || '').toLowerCase()
      return re.test(texto) && texto !== q.trim().toLowerCase()
    })
  }

  const sugestoesFiltradas = useMemo(() => {
    if (!todasSugestoes) return []
    return filtrar(todasSugestoes, value)
  }, [todasSugestoes, value])

  const abrirDrop = async () => {
    const lista = await carregarTodas()
    if (filtrar(lista, value).length === 0) return
    posicionar()
    setDropOpen(true)
  }

  useEffect(() => { if (dropOpen) posicionar() }, [value, dropOpen])

  const salvarNoBanco = async () => {
    if (!value?.trim()) return
    try {
      await salvarNoBancoSeNovo('Legendas', 'legend', value.trim())
      setSalvoBanco(true)
      setTimeout(() => setSalvoBanco(false), 2000)
    } catch (e) { console.error('salvar legenda banco:', e.message) }
  }

  const excluirSugestao = async (item) => {
    try {
      await excluirTexto('Legendas', item.name)
      setTodasSugestoes(prev => prev ? prev.filter(s => s.name !== item.name) : prev)
    } catch (e) { console.error('excluir sugestão:', e.message) }
  }

  const handleBlur = () => { blurRef.current = setTimeout(() => setDropOpen(false), 200) }
  const handleFocus = async () => { clearTimeout(blurRef.current); await abrirDrop() }

  return (
    <div className="flex items-center gap-1 w-full relative">
      <input ref={ref} value={value || ''} onChange={e => onChange(e.target.value)}
        onBlur={handleBlur} onFocus={handleFocus}
        placeholder="Legenda (Ex: Consumir 40min antes do treino)"
        className="flex-1 bg-transparent text-gray-400 text-xs outline-none border-b border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 transition-colors text-left pb-1"
      />
      {value?.trim() && (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); salvarNoBanco() }}
          className="shrink-0 pb-1 transition-colors" title="Salvar no banco">
          {salvoBanco
            ? <BookmarkCheck size={13} className="text-green-400" />
            : <BookmarkPlus size={13} className="text-blue-400/60 hover:text-blue-400" />}
        </button>
      )}
      {dropOpen && dropPos && sugestoesFiltradas.length > 0 && createPortal(
        <div style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, zIndex: 9999, width: dropPos.width }}
          className="bg-[#29292e] border border-[#323238] rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-44 overflow-y-auto">
            {sugestoesFiltradas.map(item => (
              <div key={item.name} className="flex items-start group/sug border-b border-[#323238]/50 last:border-0 hover:bg-[#323238] transition-colors">
                <button type="button"
                  onMouseDown={() => { clearTimeout(blurRef.current); onChange(item.legend); setDropOpen(false) }}
                  className="flex-1 text-left px-3 py-2 text-xs text-gray-300 group-hover/sug:text-white">
                  {item.full_name && <span className="text-[10px] text-gray-500 block mb-0.5">{item.full_name}</span>}
                  {item.legend}
                </button>
                <button type="button"
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); excluirSugestao(item) }}
                  className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover/sug:opacity-100 transition-all shrink-0"
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

const calcularTotais = (draft) => {
  if (!draft) return null
  let prot = 0, carb = 0, lip = 0, kcal = 0, fib = 0
  for (let i = 1; i <= 8; i++) {
    if (draft[`meal_${i}`] === 1) {
      let primeiraOpcaoAtiva = null
      for (let j = 1; j <= 10; j++) {
        if (draft[`meal_${i}_option_${j}`] === 1) { primeiraOpcaoAtiva = j; break }
      }
      if (primeiraOpcaoAtiva) {
        const itens = draft[`meal_${i}_option_${primeiraOpcaoAtiva}_items`] || []
        itens.forEach(item => {
          if (!item.substitute) {
            prot += Number(item.protein || 0)
            carb += Number(item.carbohydrate || 0)
            lip += Number(item.lipid || 0)
            kcal += Number(item.calories || 0)
            fib += Number(item.fiber || 0)
          }
        })
      }
    }
  }
  const peso = Number(draft.weight) || 1
  return { prot, carb, lip, kcal, fib, relProt: prot / peso, relCarb: carb / peso, relLip: lip / peso, relFib: fib / peso }
}

const verificarSubstitutos = (draft) => {
  const divergencias = []
  const tolerancia = (kcal) => kcal <= 100 ? 20 : kcal <= 200 ? 30 : kcal <= 300 ? 40 : 60
  for (let i = 1; i <= 8; i++) {
    if (draft[`meal_${i}`] !== 1) continue
    for (let j = 1; j <= 10; j++) {
      if (draft[`meal_${i}_option_${j}`] !== 1) continue
      const items = draft[`meal_${i}_option_${j}_items`] || []
      let principal = null
      items.forEach(item => {
        if (!item.substitute || item.substitute === 0) {
          principal = item
        } else if (item.substitute === 1 && principal) {
          const kcalP = Number(principal.calories || 0)
          const kcalS = Number(item.calories || 0)
          if (kcalP > 0) {
            const diff = Math.abs(kcalS - kcalP) / kcalP
            const diffAbs = Math.abs(kcalS - kcalP)
            if (diff > 0.15 && diffAbs > tolerancia(kcalP)) {
              divergencias.push({
                refeicao: draft[`meal_${i}_label`] || `Refeição ${i}`,
                opcao: draft[`meal_${i}_option_${j}_label`] || `Opção ${j}`,
                principal: principal.food, substituto: item.food,
                kcalPrincipal: kcalP, kcalSub: kcalS,
                diff: Math.round(diff * 100),
                idRef: `meal_${i}_option_${j}`,
              })
            }
          }
        }
      })
    }
  }
  return divergencias
}

// ─── Search helpers for Autocomplete ──────────────────────────────────────────
const buscarAlunosFn = async (query) => {
  if (!query || query.length < 2) return []
  const res = await listarAlunos({ search: query, limit: 8 })
  return (res.list || []).map(a => ({ id: a.name, nome: a.nome_completo }))
}

const buscarAlimentosFn = async (query) => {
  const t = (query || '').trim()
  if (!t) return []
  const partes = t.split('%').map(s => s.trim()).filter(Boolean)
  const termoBusca = partes.join(' ')
  const res = await listarAlimentos({ busca: termoBusca, limit: 10 })
  let list = res.list || []
  if (t.includes('%') && partes.length) {
    const lowerParts = partes.map(p => p.toLowerCase())
    list = list.filter((a) => {
      const nome = (a.food || '').toLowerCase()
      let idx = 0
      for (const p of lowerParts) {
        const found = nome.indexOf(p, idx)
        if (found === -1) return false
        idx = found + p.length
      }
      return true
    })
  }
  return list
}

const renderAlimentoItem = (item) => (
  <>
    <div className="text-white text-sm font-medium">{item.food}</div>
    <div className="text-gray-500 text-[10px] mt-[2px]">
      P: {item.protein}g · C: {item.carbohydrate}g · G: {item.lipid}g · {item.calories} kcal
    </div>
  </>
)

// ─── ToastSubstitutos ─────────────────────────────────────────────────────────
const ToastSubstitutos = ({ divergencias, onClose, onConfirmar }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
    <div className="bg-yellow-900/60 border border-yellow-500/60 rounded-lg p-5 shadow-2xl max-w-md w-full mx-4 pointer-events-auto">
      <div className="flex items-start gap-3">
        <span className="text-yellow-400 text-lg mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="text-yellow-300 font-bold text-sm mb-3">Substitutos com calorias divergentes (&gt;15%)</p>
          <div className="space-y-2">
            {divergencias.map((d, i) => (
              <div key={i} className="text-xs text-yellow-200 border-l-2 border-yellow-500/50 pl-2">
                <span className="text-yellow-400 font-semibold">{d.refeicao} · {d.opcao}</span>
                <p className="mt-0.5">
                  <strong>{d.substituto}</strong> ({d.kcalSub} kcal) vs <strong>{d.principal}</strong> ({d.kcalPrincipal} kcal)
                  <span className="ml-1 text-yellow-400 font-bold">— {d.diff}% diferença</span>
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            <Button variant="ghost" size="sm" onClick={() => {
              const el = document.getElementById(divergencias[0]?.idRef)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
              onClose()
            }}>
              Corrigir
            </Button>
            <Button variant="primary" size="sm" onClick={onConfirmar}>
              Salvar mesmo assim
            </Button>
          </div>
        </div>
        <button onClick={onClose} className="text-yellow-400 hover:text-yellow-200 text-xl leading-none ml-2">×</button>
      </div>
    </div>
  </div>
)

// ─── BannerOrientacoes ────────────────────────────────────────────────────────
const BannerOrientacoes = ({ alunoId }) => {
  const [orientacoes, setOrientacoes] = useState('')
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [textoTemp, setTextoTemp] = useState('')

  useEffect(() => {
    if (!alunoId) return
    setLoading(true)
    buscarAluno(alunoId)
      .then(data => { setOrientacoes(data.orientacoes_globais || ''); setTextoTemp(data.orientacoes_globais || '') })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [alunoId])

  const handleSave = async () => {
    setSaving(true)
    try {
      await salvarAluno(alunoId, { orientacoes_globais: textoTemp })
      setOrientacoes(textoTemp)
      setEditMode(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSaving(false) }
  }

  if (!alunoId) return null
  if (loading) return <div className="animate-pulse h-8 bg-[#2563eb]/10 border border-[#2563eb]/20 rounded-lg w-full mb-6" />

  const action = (
    <div className="flex items-center gap-2">
      {saved && <span className="text-green-400 text-[9px] font-bold uppercase tracking-wider">Salvo</span>}
      {editMode ? (
        <>
          <Button variant="ghost" size="xs" onClick={() => { setEditMode(false); setTextoTemp(orientacoes) }}>
            Cancelar
          </Button>
          <Button variant="danger" size="xs" onClick={handleSave} loading={saving}>
            Salvar
          </Button>
        </>
      ) : (
        <button
          onClick={() => setEditMode(true)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-red-400 text-[9px] font-bold uppercase tracking-wider transition-colors"
        >
          <Edit size={10} /> Editar
        </button>
      )}
    </div>
  )

  return (
    <div className="mb-6">
      <CollapsibleBanner title="Anotações Globais do Aluno" variant="primary" action={action}>
        {editMode ? (
          <Textarea
            value={textoTemp}
            onChange={setTextoTemp}
            rows={3}
            placeholder="Escreva as restrições ou contexto importante..."
            className="bg-black/40 border-red-500/30 focus:border-red-500/70 text-red-400"
          />
        ) : (
          <p className="text-[#fca5a5] text-xs leading-relaxed whitespace-pre-line">
            {orientacoes || <span className="opacity-50 italic">Sem contexto cadastrado.</span>}
          </p>
        )}
      </CollapsibleBanner>
    </div>
  )
}

// ─── ModalEditarAlimento ──────────────────────────────────────────────────────
const ModalEditarAlimento = ({ item, onSave, onClose }) => {
  const [formData, setFormData] = useState({ ...item })
  const handleChange = (f, v) => setFormData(p => ({ ...p, [f]: v }))

  return (
    <Modal
      title="Editar Alimento"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="info" onClick={() => onSave(formData)}>Salvar Alterações</Button>
        </>
      }
    >
      <div className="p-4 md:p-5 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <FormGroup label="Alimento">
              <Input value={formData.food || ''} disabled onChange={() => {}} />
            </FormGroup>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" checked={formData.substitute === 1}
              onChange={e => handleChange('substitute', e.target.checked ? 1 : 0)}
              className="w-4 h-4 accent-[#0052cc] rounded" />
            <label className="text-sm text-white">É substituto</label>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormGroup label="Qtd. de Ref">
            <Input type="number" value={formData.ref_weight} onChange={v => handleChange('ref_weight', v)} />
          </FormGroup>
          <FormGroup label="Unidade">
            <Select value={formData.unit} onChange={v => handleChange('unit', v)} options={['g', 'ml', 'unidade']} placeholder="" />
          </FormGroup>
          <FormGroup label="Medida Caseira">
            <Input value={formData.medida_caseira} onChange={v => handleChange('medida_caseira', v)} />
          </FormGroup>
          <FormGroup label="Peso Total">
            <Input type="number" value={formData.weight} onChange={v => handleChange('weight', v)} />
          </FormGroup>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 border-b border-[#323238] pb-2">Macronutrientes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormGroup label="Proteína (g)"><Input type="number" value={formData.protein} onChange={v => handleChange('protein', v)} /></FormGroup>
            <FormGroup label="Carboidrato (g)"><Input type="number" value={formData.carbohydrate} onChange={v => handleChange('carbohydrate', v)} /></FormGroup>
            <FormGroup label="Gorduras Totais (g)"><Input type="number" value={formData.lipid} onChange={v => handleChange('lipid', v)} /></FormGroup>
            <FormGroup label="Fibras (g)"><Input type="number" value={formData.fiber} onChange={v => handleChange('fiber', v)} /></FormGroup>
            <FormGroup label="Valor Energético (kcal)"><Input type="number" value={formData.calories} onChange={v => handleChange('calories', v)} /></FormGroup>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 border-b border-[#323238] pb-2">Minerais</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[['calcium','Cálcio (mg)'],['copper','Cobre (mg)'],['iron','Ferro (mg)'],['phosphor','Fósforo (mg)'],
              ['magnesium','Magnésio (mg)'],['potassium','Potássio (mg)'],['selenium','Selênio (µg)'],
              ['sodium','Sódio (mg)'],['zinc','Zinco (mg)']].map(([f, l]) => (
              <FormGroup key={f} label={l}><Input type="number" value={formData[f]} onChange={v => handleChange(f, v)} /></FormGroup>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-4 border-b border-[#323238] pb-2">Vitaminas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[['vitamin_a','Vitamina A (µg)'],['vitamin_b1','Vitamina B1 (mg)'],['vitamin_b2','Vitamina B2 (mg)'],
              ['vitamin_b3','Vitamina B3 (mg)'],['vitamin_b6','Vitamina B6 (mg)'],['vitamin_b9','Vitamina B9 (µg)'],
              ['vitamin_b12','Vitamina B12 (µg)'],['vitamin_c','Vitamina C (mg)'],['vitamin_d','Vitamina D (µg)'],
              ['vitamin_e','Vitamina E (mg)']].map(([f, l]) => (
              <FormGroup key={f} label={l}><Input type="number" value={formData[f]} onChange={v => handleChange(f, v)} /></FormGroup>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── ModalAdicionarRefeicaoPronta ─────────────────────────────────────────────
const ModalAdicionarRefeicaoPronta = ({ onClose, onSelectMeal }) => {
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState([])
  const [carregando, setCarregando] = useState(false)
  const timerRef = { current: null }

  const buscar = (texto) => {
    setQuery(texto)
    clearTimeout(timerRef.current)
    const t = (texto || '').trim()
    const partes = t.split('%').map(s => s.trim()).filter(Boolean)
    const termoBusca = partes.join(' ')
    timerRef.current = setTimeout(async () => {
      setCarregando(true)
      try {
        const res = await listarRefeicoesProntas({ busca: termoBusca || undefined, enabled: '1', limit: 5 })
        let list = res.list || []
        if (t.includes('%') && partes.length) {
          const lowerParts = partes.map(p => p.toLowerCase())
          list = list.filter((r) => {
            const nome = (r.full_name || r.name || '').toLowerCase()
            let idx = 0
            for (const p of lowerParts) {
              const found = nome.indexOf(p, idx)
              if (found === -1) return false
              idx = found + p.length
            }
            return true
          })
        }
        setResultados(list)
      } catch (e) { console.error(e) }
      finally { setCarregando(false) }
    }, 400)
  }

  useEffect(() => { buscar('') }, [])

  const handleSelect = async (refeicao) => {
    setCarregando(true)
    try {
      const data = await buscarRefeicaoPronta(refeicao.name)
      if (data?.table_foods?.length > 0) {
        onSelectMeal(data.table_foods)
      } else {
        alert('Essa refeição não possui alimentos cadastrados.')
      }
    } catch (e) { alert('Erro ao puxar alimentos: ' + e.message) }
    finally { setCarregando(false) }
  }

  return (
    <Modal title="Adicionar Refeição Pronta" onClose={onClose} size="md">
      <div className="p-4 flex flex-col gap-4">
        <FormGroup label="Selecione a refeição">
          <div className="relative">
            <Input value={query} onChange={buscar} placeholder="Buscar refeição..." />
            {carregando && <Loader size={14} className="animate-spin absolute right-3 top-3 text-gray-400" />}
          </div>
        </FormGroup>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {resultados.map((ref, i) => (
            <button key={i} onClick={() => handleSelect(ref)} disabled={carregando}
              className="w-full text-left p-3 rounded-lg hover:bg-[#29292e] text-gray-300 hover:text-white transition-colors border border-transparent hover:border-[#323238] text-sm">
              {ref.full_name || ref.name}
            </button>
          ))}
          {!carregando && resultados.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Nenhuma refeição encontrada.</p>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── TabelaAlimentos ──────────────────────────────────────────────────────────
const TabelaAlimentos = ({ items, onUpdateItem, onAddItem, onDeleteItem, onDuplicateItem, onMoveItem, onAddRefeicaoPronta, onAddSubstituteBelow, macrosReferencia }) => {
  const [exibirSubs, setExibirSubs] = useState(false)
  const [editingIdx, setEditingIdx] = useState(null)
  const visiveis = exibirSubs ? items : items.filter(i => !i.substitute)

  const macrosOpcao = items.reduce((acc, item) => {
    if (!item.substitute) {
      acc.prot += Number(item.protein || 0)
      acc.carb += Number(item.carbohydrate || 0)
      acc.lip += Number(item.lipid || 0)
      acc.kcal += Number(item.calories || 0)
      acc.fib += Number(item.fiber || 0)
    }
    return acc
  }, { prot: 0, carb: 0, lip: 0, kcal: 0, fib: 0 })

  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg mt-4">
      {editingIdx !== null && (
        <ModalEditarAlimento
          item={items[editingIdx]}
          onClose={() => setEditingIdx(null)}
          onSave={(updatedItem) => { onUpdateItem(editingIdx, '__selecionarAlimento', updatedItem); setEditingIdx(null) }}
        />
      )}

      {/* Mobile: card list */}
      {items.length === 0 ? (
        <div className="p-6 text-left border-b border-[#323238]">
          <p className="text-white text-base">Por favor, adicione uma linha para exibir os campos</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-y-0.5">
              <thead className="text-gray-500 uppercase bg-[#29292e] border-b border-[#323238]">
                <tr>
                  <th className="px-2 py-2 w-8 text-center">#</th>
                  <th className="px-2 py-2 min-w-[180px]">Alimento</th>
                  <th className="px-2 py-2 w-20">Qtd.</th>
                  <th className="px-2 py-2 w-24">Unid.</th>
                  <th className="px-2 py-2 w-28">Medida Cas.</th>
                  <th className="px-2 py-2 w-16">Prot.</th>
                  <th className="px-2 py-2 w-16">Carb.</th>
                  <th className="px-2 py-2 w-16">Gord.</th>
                  <th className="px-2 py-2 w-16">Fib.</th>
                  <th className="px-2 py-2 w-16">Kcal</th>
                  <th className="px-2 py-2 w-24 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#323238]/50">
                {visiveis.map((item, itemIdx) => {
                  const realIdx = item.__uid ? items.findIndex(i => i.__uid === item.__uid) : items.indexOf(item)
                  const temSubstitutoOculto = !exibirSubs && !item.substitute && items[realIdx + 1]?.substitute === 1
                  return (
                    <tr key={item.__uid || itemIdx}
                      className={`transition-colors ${item.substitute ? 'bg-red-500/10' : temSubstitutoOculto ? 'bg-[#2c2c31]' : 'bg-[#222226]'} hover:bg-[#2f2f35]`}>
                      <td className="px-2 py-2 rounded-l-lg">
                        <div className="flex items-center gap-1 justify-center">
                          <div className="flex flex-col items-center">
                            <button onClick={() => onMoveItem(realIdx, -1)} disabled={realIdx === 0}
                              className="h-4 w-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <ChevronUp size={11} />
                            </button>
                            <button onClick={() => onMoveItem(realIdx, +1)} disabled={realIdx === items.length - 1}
                              className="h-4 w-5 flex items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                              <ChevronDown size={11} />
                            </button>
                          </div>
                          <span className="text-gray-600 font-mono text-xs">{realIdx + 1}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          {item.substitute === 1 && (
                            <span className="shrink-0 text-[9px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded uppercase">OU</span>
                          )}
                          <Autocomplete
                            compact
                            value={item.food || ''}
                            onChange={(v) => onUpdateItem(realIdx, 'food', v)}
                            onSelect={(alimento) => {
                              const base = {
                                ref_weight: alimento.ref_weight ?? 100,
                                protein: alimento.protein ?? 0, carbohydrate: alimento.carbohydrate ?? 0,
                                lipid: alimento.lipid ?? 0, fiber: alimento.fiber ?? 0, calories: alimento.calories ?? 0,
                                calcium: alimento.calcium ?? 0, copper: alimento.copper ?? 0, iron: alimento.iron ?? 0,
                                phosphor: alimento.phosphor ?? 0, magnesium: alimento.magnesium ?? 0,
                                potassium: alimento.potassium ?? 0, selenium: alimento.selenium ?? 0,
                                sodium: alimento.sodium ?? 0, zinc: alimento.zinc ?? 0,
                                vitamin_a: alimento.vitamin_a ?? 0, vitamin_b1: alimento.vitamin_b1 ?? 0,
                                vitamin_b2: alimento.vitamin_b2 ?? 0, vitamin_b3: alimento.vitamin_b3 ?? 0,
                                vitamin_b6: alimento.vitamin_b6 ?? 0, vitamin_b9: alimento.vitamin_b9 ?? 0,
                                vitamin_b12: alimento.vitamin_b12 ?? 0, vitamin_c: alimento.vitamin_c ?? 0,
                                vitamin_d: alimento.vitamin_d ?? 0, vitamin_e: alimento.vitamin_e ?? 0,
                              }
                              onUpdateItem(realIdx, '__selecionarAlimento', { food: alimento.food, _base: base, ...base })
                            }}
                            searchFn={buscarAlimentosFn}
                            renderItem={renderAlimentoItem}
                            placeholder="Buscar alimento..."
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input type="number" value={item.ref_weight ?? ''} onChange={e => onUpdateItem(realIdx, 'ref_weight', e.target.value)}
                          className="w-full h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60" />
                      </td>
                      <td className="px-2 py-1">
                        <select value={item.unit || 'g'} onChange={e => onUpdateItem(realIdx, 'unit', e.target.value)}
                          className="w-full h-7 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 appearance-none">
                          <option>g</option><option>ml</option><option>unidade</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input value={item.medida_caseira || ''} onChange={e => onUpdateItem(realIdx, 'medida_caseira', e.target.value)}
                          className="w-full h-7 px-2 bg-transparent border border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 text-white rounded text-xs outline-none transition-colors" />
                      </td>
                      {['protein', 'carbohydrate', 'lipid', 'fiber', 'calories'].map(f => (
                        <td key={f} className="px-2 py-1">
                          <input type="number" value={item[f] ?? ''} onChange={e => onUpdateItem(realIdx, f, e.target.value)}
                            className="w-full h-7 px-1 text-center bg-transparent border border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 text-white rounded text-xs outline-none transition-colors" />
                        </td>
                      ))}
                      <td className="px-2 py-2 rounded-r-lg">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditingIdx(realIdx)} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"><Edit size={11} /></button>
                          <button onClick={() => { onAddSubstituteBelow(realIdx); setExibirSubs(true) }} title="Adicionar substituto abaixo"
                            className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-yellow-500 hover:bg-yellow-600 hover:text-white rounded transition-colors"><ArrowLeftRight size={11} /></button>
                          <button onClick={() => onDuplicateItem(realIdx)} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors"><Copy size={11} /></button>
                          <button onClick={() => onDeleteItem(realIdx)} className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"><Trash2 size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: card stack minimalista */}
          <div className="md:hidden flex flex-col divide-y divide-[#323238]/50">
            {visiveis.map((item, itemIdx) => {
              const realIdx = item.__uid ? items.findIndex(i => i.__uid === item.__uid) : items.indexOf(item)
              return (
                <div key={item.__uid || itemIdx} className={`px-3 py-2 ${item.substitute ? 'bg-red-500/10' : 'bg-[#222226]'}`}>
                  {/* Linha 1: tag OU (se substituto) + alimento + 4 botões */}
                  <div className="flex items-center gap-1.5">
                    {item.substitute === 1 && (
                      <span className="text-[9px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1 py-0.5 rounded uppercase shrink-0">OU</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <Autocomplete
                        compact
                        value={item.food || ''}
                        onChange={(v) => onUpdateItem(realIdx, 'food', v)}
                        onSelect={(alimento) => {
                          const base = { ref_weight: alimento.ref_weight ?? 100, protein: alimento.protein ?? 0, carbohydrate: alimento.carbohydrate ?? 0, lipid: alimento.lipid ?? 0, fiber: alimento.fiber ?? 0, calories: alimento.calories ?? 0 }
                          onUpdateItem(realIdx, '__selecionarAlimento', { food: alimento.food, _base: base, ...base })
                        }}
                        searchFn={buscarAlimentosFn}
                        renderItem={renderAlimentoItem}
                        placeholder="Buscar alimento..."
                      />
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => onDuplicateItem(realIdx)} title="Duplicar"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-gray-400 hover:bg-gray-600 hover:text-white rounded transition-colors"><Copy size={11} /></button>
                      <button onClick={() => { onAddSubstituteBelow(realIdx); setExibirSubs(true) }} title="Adicionar substituto abaixo"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-yellow-500 hover:bg-yellow-600 hover:text-white rounded transition-colors"><ArrowLeftRight size={11} /></button>
                      <button onClick={() => onDeleteItem(realIdx)} title="Excluir"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors"><Trash2 size={11} /></button>
                      <button onClick={() => setEditingIdx(realIdx)} title="Editar detalhes"
                        className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-blue-400 hover:bg-blue-600 hover:text-white rounded transition-colors"><Edit size={11} /></button>
                    </div>
                  </div>
                  {/* Linha 2: gramas + kcal */}
                  <div className="flex gap-2 mt-1.5 pl-0.5">
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.ref_weight ?? ''} onChange={e => onUpdateItem(realIdx, 'ref_weight', e.target.value)}
                        className="w-16 h-6 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-[11px] text-center outline-none focus:border-[#2563eb]/60" />
                      <span className="text-[10px] text-gray-500">g</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input type="number" value={item.calories ?? ''} onChange={e => onUpdateItem(realIdx, 'calories', e.target.value)}
                        className="w-16 h-6 px-1 bg-[#29292e] border border-[#323238] text-white rounded text-[11px] text-center outline-none focus:border-[#2563eb]/60" />
                      <span className="text-[10px] text-gray-500">kcal</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Mobile: adicionar alimento — botão dashed compacto */}
          <button onClick={() => onAddItem(false)}
            className="md:hidden w-full py-2 text-gray-500 hover:text-white text-xs flex items-center justify-center gap-1.5 border-t border-dashed border-[#323238] hover:border-[#2563eb]/40 transition-colors">
            <Plus size={11} /> Adicionar alimento
          </button>
        </>
      )}

      {/* Macros da opção */}
      {items.length > 0 && (
        <div className="px-4 py-3 border-t border-[#323238]">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-2">Macros Totais da Opção</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-gray-500 border-b border-[#323238]">
                <tr>
                  <th className="pb-1.5 font-medium pr-6">Prot (g)</th>
                  <th className="pb-1.5 font-medium pr-6">Carbs (g)</th>
                  <th className="pb-1.5 font-medium pr-6">Gord (g)</th>
                  <th className="pb-1.5 font-medium pr-6">kcal</th>
                  <th className="pb-1.5 font-medium">Fibra (g)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[['prot',1],['carb',1],['lip',1],['kcal',0],['fib',1]].map(([k, d]) => (
                    <td key={k} className="pt-1.5 pr-6">
                      <span className="text-white font-semibold">{fmt(macrosOpcao[k], d)}</span>
                      {macrosReferencia && (() => {
                        const diff = macrosOpcao[k] - macrosReferencia[k]
                        const threshold = k === 'kcal' ? 0.5 : 0.05
                        return (
                          <span className={`ml-1.5 text-[10px] font-bold whitespace-nowrap ${diff > threshold ? 'text-green-400' : diff < -threshold ? 'text-red-400' : 'text-gray-500'}`}>
                            ({fmt(macrosReferencia[k], d)})
                          </span>
                        )
                      })()}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap gap-2 p-3 border-t border-[#323238]">
        {/* Desktop only */}
        <Button variant="info" size="xs" onClick={() => onAddItem(false)} className="hidden md:inline-flex">Adicionar Linha</Button>
        <Button variant="info" size="xs" onClick={() => { onAddItem(true); setExibirSubs(true) }} className="hidden md:inline-flex">Adicionar Substituto</Button>
        {/* Mobile + Desktop */}
        <Button variant="info" size="xs" onClick={onAddRefeicaoPronta}>Adicionar Refeição Pronta</Button>
        <Button variant="secondary" size="xs" onClick={() => setExibirSubs(s => !s)}>
          {exibirSubs ? 'Ocultar Substitutos' : 'Exibir Substitutos'}
        </Button>
      </div>
    </div>
  )
}

// ─── RefeicaoBlock ────────────────────────────────────────────────────────────
const MEAL_LABELS = {
  1: 'Café da Manhã', 2: 'Lanche da Manhã', 3: 'Almoço',
  4: 'Lanche da Tarde', 5: 'Jantar', 6: 'Ceia',
  7: 'Refeição 7', 8: 'Refeição 8'
}

const ModalSalvarRefeicaoPronta = ({ items, onClose }) => {
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async () => {
    if (!nome.trim()) { alert('Digite um nome para a refeição.'); return }
    setSalvando(true)
    try {
      const itemsLimpos = items.map(({ __uid, _base, ...rest }) => rest)
      await criarRefeicaoPronta({ full_name: nome.trim(), table_foods: itemsLimpos })
      alert('✅ Refeição salva com sucesso!')
      onClose()
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSalvando(false) }
  }

  return (
    <Modal
      title="Salvar como Refeição Pronta"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="success" onClick={handleSalvar} loading={salvando}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-gray-400 text-sm">{items.length} alimento(s) serão salvos.</p>
        <FormGroup label="Nome da Refeição" required>
          <Input value={nome} onChange={setNome} placeholder="Ex: Overnight (335kcal — 9g PTN)" />
        </FormGroup>
      </div>
    </Modal>
  )
}

const ModalCopiarOpcao = ({ draft, itemsOrigem, onClose, onCopiar }) => {
  const [refeicaoDestino, setRefeicaoDestino] = useState('')
  const [opcaoDestino, setOpcaoDestino] = useState('')
  const [modoColagem, setModoColagem] = useState('substituir')

  const refeicoes = [1,2,3,4,5,6,7,8].filter(n => draft[`meal_${n}`] === 1)
  const opcoes = refeicaoDestino ? [1,2,3,4,5,6,7,8,9,10].filter(j => draft[`meal_${refeicaoDestino}_option_${j}`] === 1) : []

  const handleCopiar = () => {
    if (!refeicaoDestino || !opcaoDestino) { alert('Selecione a refeição e opção de destino.'); return }
    onCopiar(parseInt(refeicaoDestino), parseInt(opcaoDestino), modoColagem, itemsOrigem)
    onClose()
  }

  return (
    <Modal
      title="Copiar Opção para..."
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleCopiar}>Copiar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-gray-400 text-sm">{itemsOrigem.length} alimento(s) serão copiados.</p>
        <FormGroup label="Refeição Destino">
          <Select value={refeicaoDestino} onChange={v => { setRefeicaoDestino(v); setOpcaoDestino('') }}
            options={refeicoes.map(n => ({ value: String(n), label: draft[`meal_${n}_label`] || MEAL_LABELS[n] }))} />
        </FormGroup>
        {refeicaoDestino && (
          <FormGroup label="Opção Destino">
            <Select value={opcaoDestino} onChange={setOpcaoDestino}
              options={opcoes.map(j => ({ value: String(j), label: draft[`meal_${refeicaoDestino}_option_${j}_label`] || `Opção ${j}` }))} />
          </FormGroup>
        )}
        {opcaoDestino && (
          <FormGroup label="Modo de Colagem">
            <div className="flex gap-2">
              {[{ value: 'substituir', label: 'Substituir' }, { value: 'adicionar', label: 'Adicionar ao final' }].map(op => (
                <button key={op.value} onClick={() => setModoColagem(op.value)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition ${modoColagem === op.value ? 'bg-[#2563eb]/20 border-[#2563eb]/50 text-red-400' : 'border-[#323238] text-gray-400 hover:text-white'}`}>
                  {op.label}
                </button>
              ))}
            </div>
          </FormGroup>
        )}
      </div>
    </Modal>
  )
}

const RefeicaoBlock = ({ n, draft, setDraft }) => {
  const enabled = draft?.[`meal_${n}`] === 1
  const opcoes = [1,2,3,4,5,6,7,8,9,10]
  const opcoesAtivas = enabled ? opcoes.filter(i => draft[`meal_${n}_option_${i}`] === 1) : []
  const temItens = enabled ? opcoesAtivas.some(optNum => (draft[`meal_${n}_option_${optNum}_items`] || []).length > 0) : false

  const itensOpcao1 = draft[`meal_${n}_option_1_items`] || []
  const macrosReferencia = itensOpcao1.reduce((acc, item) => {
    if (!item.substitute) {
      acc.prot += Number(item.protein || 0); acc.carb += Number(item.carbohydrate || 0)
      acc.lip += Number(item.lipid || 0); acc.kcal += Number(item.calories || 0); acc.fib += Number(item.fiber || 0)
    }
    return acc
  }, { prot: 0, carb: 0, lip: 0, kcal: 0, fib: 0 })

  const [modalRefeicaoPronta, setModalRefeicaoPronta] = useState(null)
  const [modalSalvarPronta, setModalSalvarPronta] = useState(null)
  const [modalCopiar, setModalCopiar] = useState(null)
  const [aberta, setAberta] = useState(() => temItens)

  const handleCopiarParaDestino = (refeicaoDestino, opcaoDestino, modo, itemsOrigem) => {
    const itemsField = `meal_${refeicaoDestino}_option_${opcaoDestino}_items`
    setDraft(prev => {
      const novosItens = itemsOrigem.map(item => { const { name, ...sem } = item; return { ...sem, __uid: uid() } })
      const existentes = prev[itemsField] || []
      return { ...prev, [itemsField]: modo === 'substituir' ? novosItens : [...existentes, ...novosItens] }
    })
  }

  const makeHandlers = (optNum) => {
    const field = `meal_${n}_option_${optNum}_items`
    const items = draft[field] || []
    return {
      items,
      onAddItem: (isSubstitute) => {
        const novo = { __uid: uid(), food: '', substitute: isSubstitute ? 1 : 0, ref_weight: '', unit: 'g', weight: '', protein: 0, carbohydrate: 0, lipid: 0, fiber: 0, calories: 0 }
        setDraft(prev => ({ ...prev, [field]: [...(prev[field] || []), novo] }))
      },
      onDeleteItem: (idx) => setDraft(prev => {
        const arr = [...(prev[field] || [])]
        if (arr[idx]?.substitute === 1) { arr.splice(idx, 1) }
        else { let c = 1; while (arr[idx + c]?.substitute === 1) c++; arr.splice(idx, c) }
        return { ...prev, [field]: arr }
      }),
      onDuplicateItem: (idx) => setDraft(prev => {
        const arr = [...(prev[field] || [])]
        const { name, ...sem } = arr[idx]
        arr.splice(idx + 1, 0, { ...sem, medida_caseira: '', __uid: uid() })
        return { ...prev, [field]: arr }
      }),
      onAddSubstituteBelow: (idx) => setDraft(prev => {
        const arr = [...(prev[field] || [])]
        arr.splice(idx + 1, 0, { __uid: uid(), food: '', substitute: 1, ref_weight: '', unit: 'g', weight: '', protein: 0, carbohydrate: 0, lipid: 0, fiber: 0, calories: 0 })
        return { ...prev, [field]: arr }
      }),
      onMoveItem: (idx, dir) => setDraft(prev => {
        const arr = [...(prev[field] || [])]
        const target = idx + dir
        if (target < 0 || target >= arr.length) return prev
        ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
        return { ...prev, [field]: arr }
      }),
      onUpdateItem: (idx, key, value) => setDraft(prev => {
        const arr = [...(prev[field] || [])]
        if (key === '__selecionarAlimento') {
          arr[idx] = { ...arr[idx], ...value }
        } else if (key === 'ref_weight') {
          if (!arr[idx]._base) arr[idx]._base = { ...arr[idx] }
          const novoPeso = parseInt(value, 10) || 0
          const pesoBase = parseFloat(arr[idx]._base.ref_weight) || 100
          const proporcao = pesoBase > 0 ? novoPeso / pesoBase : 0
          const calc = (val) => Math.round(Number(val || 0) * proporcao)
          arr[idx] = {
            ...arr[idx], [key]: value,
            protein: calc(arr[idx]._base.protein), carbohydrate: calc(arr[idx]._base.carbohydrate),
            lipid: calc(arr[idx]._base.lipid), fiber: calc(arr[idx]._base.fiber), calories: calc(arr[idx]._base.calories),
            calcium: calc(arr[idx]._base.calcium), copper: calc(arr[idx]._base.copper), iron: calc(arr[idx]._base.iron),
            phosphor: calc(arr[idx]._base.phosphor), magnesium: calc(arr[idx]._base.magnesium),
            potassium: calc(arr[idx]._base.potassium), selenium: calc(arr[idx]._base.selenium),
            sodium: calc(arr[idx]._base.sodium), zinc: calc(arr[idx]._base.zinc),
            vitamin_a: calc(arr[idx]._base.vitamin_a), vitamin_b1: calc(arr[idx]._base.vitamin_b1),
            vitamin_b2: calc(arr[idx]._base.vitamin_b2), vitamin_b3: calc(arr[idx]._base.vitamin_b3),
            vitamin_b6: calc(arr[idx]._base.vitamin_b6), vitamin_b9: calc(arr[idx]._base.vitamin_b9),
            vitamin_b12: calc(arr[idx]._base.vitamin_b12), vitamin_c: calc(arr[idx]._base.vitamin_c),
            vitamin_d: calc(arr[idx]._base.vitamin_d), vitamin_e: calc(arr[idx]._base.vitamin_e),
          }
        } else {
          arr[idx] = { ...arr[idx], [key]: value }
        }
        return { ...prev, [field]: arr }
      }),
      onAddRefeicaoPronta: () => setModalRefeicaoPronta({ optNum }),
    }
  }

  const adicionarOpcao = () => {
    const proxima = [1,2,3,4,5,6,7,8,9,10].find(j => !draft[`meal_${n}_option_${j}`])
    if (!proxima) return
    setDraft(prev => ({
      ...prev,
      [`meal_${n}_option_${proxima}`]: 1,
      [`meal_${n}_option_${proxima}_label`]: `Opção ${proxima}`,
      [`meal_${n}_option_${proxima}_items`]: [],
    }))
  }

  const desabilitarOpcao = (optNum) => {
    setDraft(prev => ({
      ...prev,
      [`meal_${n}_option_${optNum}`]: 0,
      [`meal_${n}_option_${optNum}_label`]: '',
      [`meal_${n}_option_${optNum}_items`]: [],
    }))
  }

  if (!enabled) return (
    <div className="mb-3">
      <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg px-4 py-3 flex items-center justify-between opacity-40 hover:opacity-70 transition-opacity">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#323238] shrink-0" />
          <span className="text-gray-500 text-sm font-medium">{MEAL_LABELS[n]}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDraft(prev => ({
          ...prev,
          [`meal_${n}`]: 1, [`meal_${n}_label`]: MEAL_LABELS[n],
          [`meal_${n}_option_1`]: 1, [`meal_${n}_option_1_label`]: 'Opção 1', [`meal_${n}_option_1_items`]: []
        }))}>
          Habilitar
        </Button>
      </div>
    </div>
  )

  return (
    <div className="mb-6 bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
      {modalRefeicaoPronta && (
        <ModalAdicionarRefeicaoPronta
          onClose={() => setModalRefeicaoPronta(null)}
          onSelectMeal={(foods) => {
            const { optNum } = modalRefeicaoPronta
            const field = `meal_${n}_option_${optNum}_items`
            const novos = foods.map(f => { const { name, ...sem } = f; return { ...sem, __uid: uid() } })
            setDraft(prev => ({ ...prev, [field]: [...(prev[field] || []), ...novos] }))
            setModalRefeicaoPronta(null)
          }}
        />
      )}
      {modalSalvarPronta && <ModalSalvarRefeicaoPronta items={modalSalvarPronta.items} onClose={() => setModalSalvarPronta(null)} />}
      {modalCopiar && (
        <ModalCopiarOpcao
          draft={draft}
          itemsOrigem={modalCopiar.items}
          onClose={() => setModalCopiar(null)}
          onCopiar={handleCopiarParaDestino}
        />
      )}

      <div className="flex items-center justify-between px-5 py-4 border-b border-[#323238]">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-[#2563eb] shrink-0" />
          <input
            value={draft[`meal_${n}_label`] || MEAL_LABELS[n]}
            onChange={e => setDraft(prev => ({ ...prev, [`meal_${n}_label`]: e.target.value }))}
            className="bg-transparent text-white font-semibold text-base outline-none border-b border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAberta(a => !a)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#1a1a1a] border border-[#323238] text-gray-400 hover:text-white transition-colors">
            {aberta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <Button variant="danger" size="sm" onClick={() => setDraft(prev => ({ ...prev, [`meal_${n}`]: 0 }))}>
            Desabilitar
          </Button>
        </div>
      </div>

      {aberta && (
        <div className="p-4 md:p-5 space-y-6">
          {opcoesAtivas.map(optNum => {
            const h = makeHandlers(optNum)
            return (
              <div key={optNum} id={`meal_${n}_option_${optNum}`} className="border border-[#323238] rounded-lg p-4 bg-[#1a1a1a]">
                <div className="flex flex-col gap-2 mb-4">
                  <input
                    value={draft[`meal_${n}_option_${optNum}_label`] || `Opção ${optNum}`}
                    onChange={e => setDraft(prev => ({ ...prev, [`meal_${n}_option_${optNum}_label`]: e.target.value }))}
                    className="bg-transparent text-white font-bold text-sm outline-none border-b border-transparent hover:border-[#323238] focus:border-[#2563eb]/60 transition-colors uppercase tracking-wider w-full md:w-max"
                  />
                  <LegendaSug
                    value={draft[`meal_${n}_option_${optNum}_legend`] || ''}
                    onChange={v => setDraft(prev => ({ ...prev, [`meal_${n}_option_${optNum}_legend`]: v }))}
                  />
                  <div className="flex flex-row gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5">
                    <Button variant="danger" size="xs" onClick={() => desabilitarOpcao(optNum)} className="whitespace-nowrap shrink-0">
                      Desabilitar Opção
                    </Button>
                    <Button variant="success" size="xs" onClick={() => setModalSalvarPronta({ items: h.items })} className="whitespace-nowrap shrink-0">
                      Salvar como Ref. Pronta
                    </Button>
                    <Button variant="secondary" size="xs" onClick={() => setModalCopiar({ items: h.items })} className="whitespace-nowrap shrink-0">
                      Copiar Opção
                    </Button>
                  </div>
                </div>
                <TabelaAlimentos {...h} macrosReferencia={optNum > 1 ? macrosReferencia : null} />
              </div>
            )
          })}
          <button onClick={adicionarOpcao}
            className="w-full py-2 border border-dashed border-[#323238] text-gray-500 hover:text-white hover:border-[#2563eb]/40 text-sm rounded-lg transition-colors">
            + Adicionar Opção
          </button>
        </div>
      )}
    </div>
  )
}

// ─── ModalDuplicarDieta ───────────────────────────────────────────────────────
export const ModalDuplicarDieta = ({ dietaId, nomeAtual, onClose, onDuplicado }) => {
  const [modo, setModo] = useState('mesmo')
  const [novoAlunoId, setNovoAlunoId] = useState('')
  const [novoAlunoNome, setNovoAlunoNome] = useState('')
  const [dataInicial, setDataInicial] = useState('')
  const [dataFinal, setDataFinal] = useState('')
  const [duplicando, setDuplicando] = useState(false)

  const handleDuplicar = async () => {
    if (modo === 'novo' && !novoAlunoId) { alert('Selecione um aluno.'); return }
    setDuplicando(true)
    try {
      const res = await duplicarDieta(dietaId, modo === 'novo' ? novoAlunoId : null, dataInicial || null, dataFinal || null)
      alert('✅ Dieta duplicada com sucesso!')
      onDuplicado(res?.name)
    } catch (e) { alert('Erro ao duplicar: ' + e.message) }
    finally { setDuplicando(false) }
  }

  return (
    <Modal
      title="Duplicar Dieta"
      onClose={onClose}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleDuplicar} loading={duplicando}>Duplicar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        <p className="text-gray-400 text-sm">Duplicando dieta de <span className="text-white font-medium">{nomeAtual}</span></p>
        <FormGroup label="Vincular a">
          <div className="flex gap-2">
            {[{ value: 'mesmo', label: 'Mesmo Aluno' }, { value: 'novo', label: 'Novo Aluno' }].map(op => (
              <button key={op.value} onClick={() => setModo(op.value)}
                className={`flex-1 py-2 rounded-lg text-sm border transition ${modo === op.value ? 'bg-[#2563eb]/20 border-[#2563eb]/50 text-red-400' : 'border-[#323238] text-gray-400 hover:text-white'}`}>
                {op.label}
              </button>
            ))}
          </div>
        </FormGroup>
        {modo === 'novo' && (
          <FormGroup label="Aluno" required>
            <Autocomplete
              value={novoAlunoNome}
              onChange={setNovoAlunoNome}
              onSelect={(a) => { setNovoAlunoId(a.id); setNovoAlunoNome(a.nome) }}
              searchFn={buscarAlunosFn}
              renderItem={(a) => <span className="text-gray-200 text-sm">{a.nome}</span>}
              placeholder="Digite o nome do aluno..."
            />
          </FormGroup>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="Data Inicial">
            <Input type="date" value={dataInicial} onChange={setDataInicial} />
          </FormGroup>
          <FormGroup label="Data Final">
            <Input type="date" value={dataFinal} onChange={setDataFinal} />
          </FormGroup>
        </div>
      </div>
    </Modal>
  )
}

// ─── DietaDetalhe ─────────────────────────────────────────────────────────────
const TABS_CONFIG = [
  { id: 'gerais',    label: 'Dados Gerais', icon: <FileText size={15} /> },
  { id: 'refeicoes', label: 'Refeições',    icon: <UtensilsCrossed size={15} /> },
]

export default function DietaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('gerais')
  const [toastSubstitutos, setToastSubstitutos] = useState(null)
  const [pendingPayload, setPendingPayload] = useState(null)
  const [draft, setDraft] = useState(null)
  const [modalDuplicar, setModalDuplicar] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await buscarDieta(id)
        const addUids = (d) => {
          const result = { ...d }
          for (let i = 1; i <= 8; i++) {
            for (let j = 1; j <= 10; j++) {
              const field = `meal_${i}_option_${j}_items`
              if (result[field]) {
                result[field] = result[field].map(item => item.__uid ? item : { ...item, __uid: uid() })
              }
            }
          }
          return result
        }
        setDraft(addUids(data))
      } catch (err) {
        setError(err.message ?? 'Erro ao carregar dieta')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (!draft?.aluno) { alert('Selecione um aluno antes de salvar.'); return }
    setSaving(true)
    try {
      const totaisCalc = calcularTotais(draft)
      const payload = { ...draft, total_calories: Math.round(totaisCalc?.kcal || 0) }
      delete payload.nome_completo

      for (let i = 1; i <= 8; i++) {
        for (let j = 1; j <= 10; j++) {
          const field = `meal_${i}_option_${j}_items`
          if (payload[field]) {
            payload[field] = payload[field].map(({ __uid, _base, ...rest }) => rest)
          }
        }
      }

      const divergencias = verificarSubstitutos(draft)
      if (divergencias.length > 0) {
        setPendingPayload({ payload, calculatedCalories: Math.round(totaisCalc?.kcal || 0) })
        setToastSubstitutos(divergencias)
        setSaving(false)
        return
      }
      await salvarDieta(id, payload)
      alert('Dieta salva com sucesso!')
      navigate('/dietas')
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field, value) => setDraft(prev => ({ ...prev, [field]: value }))
  const totais = calcularTotais(draft)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [draft, saving])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-white">
      <Loader size={32} className="animate-spin text-[#2563eb]" />
      <p className="text-gray-500 text-sm">Carregando dieta...</p>
    </div>
  )

  if (error) return (
    <div className="p-8 text-white">
      <button onClick={() => navigate('/dietas')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
        <ArrowLeft size={16} /><span className="text-sm">Voltar</span>
      </button>
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        <AlertCircle size={18} />
        <p className="text-sm">{error}</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-8 text-white pb-32">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/dietas')}
            className="p-2 rounded-lg bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white transition-colors shrink-0">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-base md:text-xl font-bold text-white truncate">
            Editar Dieta: <span className="text-gray-300 font-medium">{draft.nome_completo || draft.aluno}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setModalDuplicar(true)} icon={Copy}>
            <span className="hidden sm:inline">Duplicar</span>
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={async () => {
              if (!window.confirm('Tem certeza que deseja excluir esta dieta?')) return
              try { await excluirDieta(id); alert('Dieta excluída!'); navigate('/dietas') }
              catch (e) { alert('Erro ao excluir: ' + e.message) }
            }}
          >
            <span className="hidden sm:inline">Excluir</span>
          </Button>
          <Button variant="primary" size="md" icon={Save} onClick={handleSave} loading={saving}>
            <span className="hidden sm:inline">{saving ? 'Salvando...' : 'Salvar Dieta'}</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={TABS_CONFIG} active={tab} onChange={setTab} />
      </div>

      {draft.aluno && <BannerOrientacoes alunoId={draft.aluno} />}

      {/* Aba: Dados Gerais */}
      {tab === 'gerais' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[#29292e] border border-[#323238] rounded-lg p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <FormGroup label="Aluno" required>
                  <Autocomplete
                    value={draft.nome_completo || ''}
                    onChange={(v) => handleChange('nome_completo', v)}
                    onSelect={async (a) => {
                      handleChange('aluno', a.id)
                      handleChange('nome_completo', a.nome)
                      try {
                        const data = await buscarAluno(a.id)
                        handleChange('sexo', data.sexo || '')
                        handleChange('age', data.age || '')
                        handleChange('weight', data.weight || '')
                        handleChange('height', data.height || '')
                      } catch (e) { console.error(e) }
                    }}
                    searchFn={buscarAlunosFn}
                    renderItem={(a) => <span className="text-gray-200 text-sm">{a.nome}</span>}
                    placeholder="Digite o nome do aluno..."
                  />
                </FormGroup>
              </div>
              <FormGroup label="Estratégia">
                <Input value={draft.strategy} onChange={(v) => handleChange('strategy', v)} placeholder="Ex: 01 — Dieta Linear" />
              </FormGroup>
              <FormGroup label="Dias da Semana">
                <Input value={draft.week_days} onChange={(v) => handleChange('week_days', v)} placeholder="Ex: Todos os dias" />
              </FormGroup>
              <FormGroup label="Data Inicial">
                <Input type="date" value={draft.date} onChange={(v) => handleChange('date', v)} />
              </FormGroup>
              <FormGroup label="Data Final">
                <Input type="date" value={draft.final_date} onChange={(v) => handleChange('final_date', v)} />
              </FormGroup>
              <FormGroup label="Meta de Calorias">
                <Input type="number" value={draft.calorie_goal} onChange={(v) => handleChange('calorie_goal', v)} />
              </FormGroup>
            </div>
          </div>

          <div className="bg-[#29292e] border border-[#323238] rounded-lg p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormGroup label="Sexo">
                <Select value={draft.sexo} onChange={(v) => handleChange('sexo', v)} options={['Feminino', 'Masculino']} />
              </FormGroup>
              <FormGroup label="Idade">
                <Input type="number" value={draft.age} onChange={(v) => handleChange('age', v)} />
              </FormGroup>
              <FormGroup label="Peso (kg)">
                <Input type="number" value={draft.weight} onChange={(v) => handleChange('weight', v)} />
              </FormGroup>
              <FormGroup label="Altura (cm)">
                <Input type="number" value={draft.height} onChange={(v) => handleChange('height', v)} />
              </FormGroup>
              <div className="md:col-span-2">
                <FormGroup label="Nível de Atividade Física (PAL)">
                  <Select value={draft.frequencia_atividade} onChange={(v) => handleChange('frequencia_atividade', v)}
                    options={['Sedentário', 'Levemente Ativo', 'Moderadamente Ativo', 'Muito Ativo', 'Extremamente Ativo']} />
                </FormGroup>
              </div>
            </div>
          </div>

          <div className="bg-[#29292e] border border-[#323238] rounded-lg p-4 md:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormGroup label="Descrições Gerais">
                <Textarea value={draft.general_description} onChange={(v) => handleChange('general_description', v)} placeholder="Ex: Consumo de água..." />
              </FormGroup>
              <FormGroup label="Observações">
                <Textarea value={draft.obs} onChange={(v) => handleChange('obs', v)} placeholder="Ex: Vegetais permitidos..." />
              </FormGroup>
            </div>
          </div>
        </div>
      )}

      {/* Aba: Refeições */}
      {tab === 'refeicoes' && (
        <div className="animate-in fade-in duration-300 pb-28">
          <h2 className="text-xl font-bold mb-6 text-white">Refeições</h2>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <RefeicaoBlock key={n} n={n} draft={draft} setDraft={setDraft} />
          ))}

          {/* FooterTotais fixo */}
          <div className="fixed bottom-0 left-0 right-0 px-4 md:px-8 pb-4 z-30">
            <FooterTotais
              variant="groups"
              leftGroup={{
                label: 'Totais',
                items: [
                  { label: 'Prot',  shortLabel: 'P', value: `${fmt(totais?.prot, 0)}g` },
                  { label: 'Líp',   shortLabel: 'L', value: `${fmt(totais?.lip, 0)}g` },
                  { label: 'Carb',  shortLabel: 'C', value: `${fmt(totais?.carb, 0)}g` },
                  { label: 'Fib',   shortLabel: 'F', value: `${fmt(totais?.fib, 0)}g` },
                  { label: 'Kcal',  shortLabel: 'Kcal', value: fmt(totais?.kcal, 0), highlight: true },
                ],
              }}
              rightGroup={{
                label: 'Relativos',
                items: [
                  { label: 'PTN', value: fmt(totais?.relProt, 1) },
                  { label: 'LIP', value: fmt(totais?.relLip, 1) },
                  { label: 'CHO', value: fmt(totais?.relCarb, 1) },
                ],
              }}
            />
          </div>
        </div>
      )}

      {/* Modal duplicar */}
      {modalDuplicar && (
        <ModalDuplicarDieta
          dietaId={id}
          nomeAtual={draft.nome_completo || draft.aluno}
          onClose={() => setModalDuplicar(false)}
          onDuplicado={(novaId) => { setModalDuplicar(false); if (novaId) navigate(`/dietas/${novaId}`) }}
        />
      )}

      {/* Toast substitutos */}
      {toastSubstitutos && (
        <ToastSubstitutos
          divergencias={toastSubstitutos}
          onClose={() => { setToastSubstitutos(null); setPendingPayload(null) }}
          onConfirmar={async () => {
            if (!pendingPayload) return
            setSaving(true)
            try {
              await salvarDieta(id, pendingPayload.payload)
              setToastSubstitutos(null)
              setPendingPayload(null)
              alert('Dieta salva com sucesso!')
              navigate('/dietas')
            } catch (err) { alert('Erro ao salvar: ' + err.message) }
            finally { setSaving(false) }
          }}
        />
      )}
    </div>
  )
}
