import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ChevronRight, Calendar, User, LayoutGrid, List,
  RefreshCw, AlertCircle, Copy, ClipboardList, X,
  Trash2, SlidersHorizontal, Eye, Loader, BarChart2,
} from 'lucide-react'
import { listarFichas, buscarFicha, excluirFicha, criarFicha, salvarFicha, listarExercicios } from '../../api/fichas'
import { listarAlunos } from '../../api/alunos'
import { Button, FormGroup, Input, Autocomplete, Modal, EmptyState, Pagination, DataTable } from '../../components/ui'

// Indexa por nome_do_exercicio E name do DocType para cobrir fichas antigas e novas
const buildIntensMap = (lista) => {
  const map = {}
  lista.forEach(e => {
    try {
      const parsed = typeof e.intensidade_json === 'string'
        ? JSON.parse(e.intensidade_json) : (e.intensidade_json || [])
      if (e.nome_do_exercicio) map[e.nome_do_exercicio] = parsed
      if (e.name) map[e.name] = parsed
    } catch { }
  })
  return map
}

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toYMD = (v) => {
  if (!v) return ''
  const s = String(v).trim()
  const m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`
  return ''
}

const formatDate = (v) => {
  const ymd = toYMD(v)
  if (!ymd) return '—'
  const [y, mo, d] = ymd.split('-')
  return `${d}/${mo}/${y}`
}

// ─── Volume ───────────────────────────────────────────────────────────────────

// Chaves espelham os valores reais de grupo_muscular no Frappe (FichaDetalhe como referência)
const GRUPOS_CONFIG = [
  { key: 'quadriceps',         label: 'Quadríceps' },
  { key: 'isquiotibiais',      label: 'Isquiotibiais' },
  { key: 'gluteomaximo',       label: 'G. Máximo' },
  { key: 'gluteomedio',        label: 'G. Médio' },
  { key: 'adutores',           label: 'Adutores' },
  { key: 'panturrilhas',       label: 'Panturrilhas' },
  { key: 'costas',             label: 'Costas' },
  { key: 'trapezio',           label: 'Trapézio' },
  { key: 'peitoral',           label: 'Peitoral' },
  { key: 'deltoidesanterior',  label: 'Delts. Ant.' },
  { key: 'deltoideslateral',   label: 'Delts. Lat.' },
  { key: 'deltoidesposterior', label: 'Delts. Post.' },
  { key: 'biceps',             label: 'Bíceps' },
  { key: 'triceps',            label: 'Tríceps' },
  { key: 'abdomen',            label: 'Abdômen' },
]

// Mapa de chave → label para lookup rápido (inclui variações comuns)
const GRUPO_LABEL = Object.fromEntries([
  ...GRUPOS_CONFIG.map(g => [g.key, g.label]),
  ['gluteos', 'Glúteos'], ['panturrilha', 'Panturrilha'],
  ['peito', 'Peito'], ['dorsais', 'Dorsais'], ['ombros', 'Ombros'],
  ['lombares', 'Lombares'], ['abdutores', 'Abdutores'], ['antebraco', 'Antebraço'],
])

const calcVolume = (ficha, intensidadeMap = {}) => {
  const vol = {}
  const diasPorTreino = {}
  ;(ficha.dias_da_semana || []).forEach(d => {
    if (d.treino && d.treino !== 'Off') {
      const key = d.treino.replace('Treino ', '').toLowerCase()
      diasPorTreino[key] = (diasPorTreino[key] || 0) + 1
    }
  })
  ;['a', 'b', 'c', 'd', 'e', 'f'].forEach(t => {
    const dias = diasPorTreino[t] || 0
    if (!dias) return
    ;(ficha[`planilha_de_treino_${t}`] || []).forEach(ex => {
      const series = parseInt(ex.series) || 0
      let intensidades = []
      try {
        intensidades = typeof ex.intensidade === 'string'
          ? JSON.parse(ex.intensidade)
          : (ex.intensidade || [])
      } catch {}
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

// ─── Status ───────────────────────────────────────────────────────────────────

const statusFicha = (f) => {
  const start = toYMD(f?.data_de_inicio)
  const end   = toYMD(f?.data_de_fim)
  const hoje  = new Date().toISOString().split('T')[0]
  const emBreve = new Date(); emBreve.setDate(emBreve.getDate() + 7)
  const emBreveStr = emBreve.toISOString().split('T')[0]
  if (!start && !end) return 'Rascunho'
  if (end && end < hoje) return 'Concluído'
  if (end && end >= hoje && end <= emBreveStr) return 'Vence em breve'
  if (start) return 'Ativo'
  return 'Rascunho'
}

const STATUS_COLOR = {
  'Ativo':          'bg-green-500/10 text-green-300 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  'Vence em breve': 'bg-orange-500/10 text-orange-300 border-orange-500/20 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
  'Concluído':      'bg-red-500/10 text-red-300 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  'Rascunho':       'bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
}

const StatusBadge = ({ ficha }) => {
  const label = statusFicha(ficha)
  return (
    <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider w-max ${STATUS_COLOR[label]}`}>
      {label}
    </span>
  )
}

// ─── Card (grade) ─────────────────────────────────────────────────────────────

const CardFicha = ({ ficha, onClick }) => (
  <button
    onClick={() => onClick(ficha.name)}
    className="group w-full text-left bg-[#29292e] border border-[#323238] rounded-lg p-5 transition-all duration-200 hover:bg-[#2f2f35] hover:scale-[1.015] focus:outline-none focus:ring-2 focus:ring-[#850000]/50"
  >
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-base truncate">{ficha.nome_completo || 'Sem aluno'}</p>
        <p className="text-gray-400 text-xs mt-1 flex items-center gap-1.5">
          <User size={11} /><span className="truncate">{ficha.aluno}</span>
        </p>
        <p className="text-gray-500 text-xs mt-0.5">criado em: {formatDate(ficha.creation)}</p>
      </div>
      <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-300 mt-0.5 shrink-0" />
    </div>
    {ficha.nivel && (
      <p className="text-xs font-medium text-blue-400 mb-3 truncate">{ficha.nivel}</p>
    )}
    {ficha.estrutura_calculada && (
      <div className="flex gap-1 mb-4 flex-wrap">
        {ficha.estrutura_calculada.split('').map((l, i) => (
          <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 bg-[#323238] text-gray-300 rounded">
            {l}
          </span>
        ))}
      </div>
    )}
    <div className="flex items-center justify-between pt-3 border-t border-[#323238]">
      <StatusBadge ficha={ficha} />
      <div className="flex flex-col text-right">
        <span className="text-gray-500 text-[10px]">Início: {formatDate(ficha.data_de_inicio)}</span>
        <span className="text-gray-500 text-[10px]">Fim: {formatDate(ficha.data_de_fim)}</span>
      </div>
    </div>
  </button>
)

// ─── Row (lista) ──────────────────────────────────────────────────────────────

const RowFicha = ({ ficha, index = 0, onClick, onDuplicar, onExcluir, onVisualizar, onHistorico }) => (
  <tr onClick={() => onClick(ficha.name)} className={`group border-b border-[#323238] hover:bg-[#202024] cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e22]'}`}>
    <td className="px-4 py-3.5 min-w-[200px]">
      <p className="text-white font-medium text-sm truncate">{ficha.nome_completo || '—'}</p>
      <p className="text-gray-500 text-xs mt-0.5 truncate">{ficha.aluno}</p>
      <p className="text-gray-500 text-xs mt-0.5">criado em: {formatDate(ficha.creation)}</p>
    </td>
    <td className="px-4 py-3.5 min-w-[100px]">
      <span className="text-blue-400 text-xs font-medium">{ficha.nivel || '—'}</span>
    </td>
    <td className="px-4 py-3.5 min-w-[100px]">
      {ficha.estrutura_calculada ? (
        <div className="flex gap-1 flex-wrap">
          {ficha.estrutura_calculada.split('').map((l, i) => (
            <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 bg-[#323238] text-gray-300 rounded">{l}</span>
          ))}
        </div>
      ) : <span className="text-gray-600">—</span>}
    </td>
    <td className="px-4 py-3.5 min-w-[100px]"><StatusBadge ficha={ficha} /></td>
    <td className="px-4 py-3.5 min-w-[160px]">
      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
        <Calendar size={11} />
        <span>{formatDate(ficha.data_de_inicio)}</span>
        <span className="text-gray-600">→</span>
        <span>{formatDate(ficha.data_de_fim)}</span>
      </div>
    </td>
    <td className="px-4 py-3.5 min-w-[100px]">
      <div className="flex items-center gap-1.5">
        <button onClick={(e) => { e.stopPropagation(); onVisualizar(ficha) }}
          className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors" title="Visualizar">
          <Eye size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onHistorico(ficha) }}
          className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors" title="Comparar volumes">
          <BarChart2 size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDuplicar(ficha) }}
          className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors" title="Duplicar">
          <Copy size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onExcluir(ficha) }}
          className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors" title="Excluir">
          <Trash2 size={12} />
        </button>
      </div>
    </td>
    <td className="px-4 py-3.5 min-w-[40px]">
      <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors" />
    </td>
  </tr>
)

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ view }) =>
  view === 'grid' ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-[#29292e] border border-[#323238] rounded-lg p-5 animate-pulse space-y-3">
          <div className="h-4 bg-[#323238] rounded w-3/4" />
          <div className="h-3 bg-[#323238] rounded w-1/2" />
          <div className="h-3 bg-[#323238] rounded w-1/3" />
          <div className="h-px bg-[#323238]" />
          <div className="flex justify-between">
            <div className="h-5 bg-[#323238] rounded w-16" />
            <div className="h-3 bg-[#323238] rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-14 border-b border-[#323238] animate-pulse" />
      ))}
    </div>
  )

// ─── Modal Filtros ────────────────────────────────────────────────────────────

const FILTROS_LIMPO = {
  filtroSexo: '', status: null, nivel: '',
  filtroLetras: [], filtroTotalDias: '',
  dataInicioFrom: '', dataInicioTo: '',
  dataFimFrom: '', dataFimTo: '',
}

const ToggleGroup = ({ label, options, value, onChange }) => (
  <div>
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = value === opt
        return (
          <button key={opt} onClick={() => onChange(active ? (typeof value === 'string' ? '' : null) : opt)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              active ? 'bg-[#850000]/20 border-[#850000]/50 text-red-300' : 'border-[#323238] text-gray-400 hover:text-white hover:border-[#444]'
            }`}>
            {opt}
          </button>
        )
      })}
    </div>
  </div>
)

const LETRAS_TREINO = ['A', 'B', 'C', 'D', 'E', 'F']
const FREQS = ['1x', '2x', '3x', '4x', '5x', '6x', '7x']

const EstruturaSelector = ({ value, onChange }) => {
  const letrasJaUsadas = value.map(x => x.letra)
  const letrasDisponiveis = LETRAS_TREINO.filter(l => !letrasJaUsadas.includes(l))
  const [novaLetra, setNovaLetra] = useState(() => letrasDisponiveis[0] || 'A')
  const [novaFreq, setNovaFreq] = useState('1x')

  useEffect(() => {
    if (!letrasDisponiveis.includes(novaLetra) && letrasDisponiveis.length > 0) {
      setNovaLetra(letrasDisponiveis[0])
    }
  }, [value])

  const adicionar = () => {
    if (!novaLetra || letrasJaUsadas.includes(novaLetra)) return
    onChange([...value, { letra: novaLetra, freq: parseInt(novaFreq) }])
    const proxima = letrasDisponiveis.filter(l => l !== novaLetra)[0]
    if (proxima) setNovaLetra(proxima)
    setNovaFreq('1x')
  }

  const remover = (letra) => onChange(value.filter(x => x.letra !== letra))

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Estrutura do treino</p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {value.map(x => (
            <span key={x.letra} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#850000]/20 border border-[#850000]/40 text-red-300 text-sm">
              <span className="font-bold">{x.letra}</span>
              <span className="text-red-400/70">{x.freq}×</span>
              <button onClick={() => remover(x.letra)} className="ml-0.5 text-red-400/60 hover:text-red-300 transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {letrasDisponiveis.length > 0 && (
        <div className="flex items-center gap-2">
          <select value={novaLetra} onChange={e => setNovaLetra(e.target.value)}
            className="h-9 px-2 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60 appearance-none w-16">
            {letrasDisponiveis.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={novaFreq} onChange={e => setNovaFreq(e.target.value)}
            className="h-9 px-2 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60 appearance-none w-20">
            {FREQS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={adicionar}
            className="h-9 px-3 rounded-lg bg-[#29292e] border border-[#323238] text-gray-300 hover:text-white hover:border-[#444] text-sm transition-colors flex items-center gap-1">
            <Plus size={13} />
            Adicionar
          </button>
        </div>
      )}

      {value.length > 0 && (
        <p className="text-gray-600 text-xs mt-2">
          Total: {value.reduce((s, x) => s + x.freq, 0)} dias · composição exata
        </p>
      )}
    </div>
  )
}

const ModalFiltros = ({ filtros, onChange, onClose, onLimpar }) => {
  const [local, setLocal] = useState({ ...filtros, filtroLetras: [...(filtros.filtroLetras || [])] })
  const set = (key) => (val) => setLocal(p => ({ ...p, [key]: val }))

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Filtros"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => { setLocal(FILTROS_LIMPO); onLimpar(); onClose() }}>
            Limpar tudo
          </Button>
          <Button variant="primary" onClick={() => { onChange(local); onClose() }}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-5">
        <ToggleGroup label="Sexo" options={['Masculino', 'Feminino']} value={local.filtroSexo} onChange={set('filtroSexo')} />
        <ToggleGroup label="Nível" options={['Iniciante', 'Intermediário', 'Avançado']} value={local.nivel} onChange={set('nivel')} />
        <ToggleGroup label="Status" options={['Ativo', 'Vence em breve', 'Concluído', 'Rascunho']} value={local.status} onChange={set('status')} />
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Início — de">
            <input type="date" value={local.dataInicioFrom || ''} onChange={e => set('dataInicioFrom')(e.target.value)}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
          <FormGroup label="Início — até">
            <input type="date" value={local.dataInicioTo || ''} onChange={e => set('dataInicioTo')(e.target.value)}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Fim — de">
            <input type="date" value={local.dataFimFrom || ''} onChange={e => set('dataFimFrom')(e.target.value)}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
          <FormGroup label="Fim — até">
            <input type="date" value={local.dataFimTo || ''} onChange={e => set('dataFimTo')(e.target.value)}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
        </div>
        <ToggleGroup label="Total de dias na semana" options={['2x', '3x', '4x', '5x', '6x']} value={local.filtroTotalDias} onChange={set('filtroTotalDias')} />
        <EstruturaSelector value={local.filtroLetras} onChange={set('filtroLetras')} />
      </div>
    </Modal>
  )
}

// ─── Modal Visualização Rápida ────────────────────────────────────────────────
// TODO: implementar após receber partes com calcVolume e GRUPOS_CONFIG

const VisualizacaoRapidaModal = ({ ficha, onClose }) => {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState('a')

  useEffect(() => {
    if (!ficha?.name) return
    setLoading(true)
    buscarFicha(ficha.name)
      .then(d => { setDados(d); setAbaAtiva('a') })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [ficha?.name])

  const treinos = dados
    ? ['a','b','c','d','e','f'].filter(t => (dados[`planilha_de_treino_${t}`] || []).length > 0)
    : []

  const tabs = treinos.map(t => ({
    id: t,
    label: dados?.[`treino_${t}_label`] || `Treino ${t.toUpperCase()}`,
  }))

  return (
    <Modal isOpen onClose={onClose} title={ficha?.nome_completo || 'Ficha'} size="xl">
      <div className="p-4 min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={28} className="animate-spin text-[#850000]" />
          </div>
        ) : !dados ? (
          <p className="text-red-400 text-center py-10">Erro ao carregar ficha.</p>
        ) : (
          <>
            {/* TODO: RodapeVolume / calcVolume — aguardando partes restantes */}

            {/* Tabs de treinos */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setAbaAtiva(t.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${abaAtiva === t.id ? 'bg-[#850000] text-white' : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#323238]'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-[#323238]">
                    <th className="text-left py-2 pr-4">Grupo Muscular</th>
                    <th className="text-left py-2 pr-4">Exercício</th>
                    <th className="text-center py-2 pr-4 w-16">Séries</th>
                    <th className="text-center py-2 pr-4 w-20">Reps</th>
                    <th className="text-center py-2 w-20">Descanso</th>
                  </tr>
                </thead>
                <tbody>
                  {(dados[`planilha_de_treino_${abaAtiva}`] || []).map((ex, i) => (
                    <tr key={i} className="border-b border-[#323238]/50 hover:bg-[#1a1a1a] transition">
                      <td className="py-2.5 pr-4 text-gray-400 text-xs">{ex.grupo_muscular}</td>
                      <td className="py-2.5 pr-4 text-gray-200 font-medium">{ex.exercicio}</td>
                      <td className="py-2.5 pr-4 text-center text-gray-300">{ex.series}</td>
                      <td className="py-2.5 pr-4 text-center text-gray-300">{ex.repeticoes || '—'}</td>
                      <td className="py-2.5 text-center text-gray-400 text-xs">{ex.descanso || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Modal Nova Ficha ─────────────────────────────────────────────────────────

const buscarAlunosFn = async (q) => {
  if (q.length < 2) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

const ModalNovaFicha = ({ onClose, onCriada }) => {
  const [aluno, setAluno] = useState(null)
  const [criando, setCriando] = useState(false)

  const handleCriar = async () => {
    if (!aluno) return
    setCriando(true)
    try {
      const nova = await criarFicha({ aluno: aluno.name, nome_completo: aluno.nome_completo })
      onCriada(nova.name)
    } catch (err) {
      alert('Erro ao criar ficha: ' + err.message)
    } finally { setCriando(false) }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Nova Ficha de Treino"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Plus} onClick={handleCriar} loading={criando} disabled={!aluno}>
            Criar Ficha
          </Button>
        </>
      }
    >
      <div className="p-5">
        <FormGroup label="Aluno" required>
          {aluno ? (
            <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#850000]/40">
              <span className="text-white text-sm">{aluno.nome_completo}</span>
              <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">
                ×
              </button>
            </div>
          ) : (
            <Autocomplete
              searchFn={buscarAlunosFn}
              onSelect={(a) => setAluno(a)}
              renderItem={(a) => (
                <div>
                  <p className="font-medium text-sm text-white">{a.nome_completo}</p>
                  {a.email && <p className="text-gray-500 text-xs">{a.email}</p>}
                </div>
              )}
              placeholder="Buscar aluno pelo nome..."
            />
          )}
        </FormGroup>
      </div>
    </Modal>
  )
}

// ─── Modal Excluir Ficha ──────────────────────────────────────────────────────

const ModalExcluirFicha = ({ ficha, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(ficha)
    setLoading(false)
    onClose()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Excluir Ficha"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="danger" onClick={handleConfirm} loading={loading}>Sim, Excluir</Button>
        </>
      }
    >
      <div className="p-5">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <Trash2 size={20} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-red-400 font-bold text-sm">Tem certeza?</h3>
            <p className="text-gray-400 text-xs mt-1">
              Você está prestes a excluir a ficha de{' '}
              <strong className="text-gray-200">{ficha?.nome_completo}</strong>.{' '}
              Essa ação <span className="text-red-400 underline">não pode ser desfeita</span>.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal Duplicar Ficha ─────────────────────────────────────────────────────

const ModalDuplicarFicha = ({ ficha, onClose, onDuplicada }) => {
  const [aluno, setAluno] = useState(null)
  const [duplicando, setDuplicando] = useState(false)

  const handleDuplicar = async () => {
    if (!aluno) return
    setDuplicando(true)
    try {
      const dadosCompletos = await buscarFicha(ficha.name)
      const { name, modified, creation, modified_by, owner, docstatus, ...resto } = dadosCompletos

      const renovarIds = (lista) => (lista || []).map(item => ({ ...item, _id: uid() }))

      const novaFicha = {
        ...resto,
        aluno: aluno.name,
        nome_completo: aluno.nome_completo,
        periodizacao:                         renovarIds(dadosCompletos.periodizacao),
        periodizacao_dos_aerobicos:           renovarIds(dadosCompletos.periodizacao_dos_aerobicos),
        planilha_de_alongamentos_e_mobilidade: renovarIds(dadosCompletos.planilha_de_alongamentos_e_mobilidade),
        planilha_de_treino_a: renovarIds(dadosCompletos.planilha_de_treino_a),
        planilha_de_treino_b: renovarIds(dadosCompletos.planilha_de_treino_b),
        planilha_de_treino_c: renovarIds(dadosCompletos.planilha_de_treino_c),
        planilha_de_treino_d: renovarIds(dadosCompletos.planilha_de_treino_d),
        planilha_de_treino_e: renovarIds(dadosCompletos.planilha_de_treino_e),
        planilha_de_treino_f: renovarIds(dadosCompletos.planilha_de_treino_f),
      }

      const nova = await criarFicha(novaFicha)
      onDuplicada(nova.name)
    } catch (err) {
      alert('Erro ao duplicar: ' + err.message)
    } finally { setDuplicando(false) }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Duplicar Ficha"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Copy} onClick={handleDuplicar} loading={duplicando} disabled={!aluno}>
            Duplicar
          </Button>
        </>
      }
    >
      <div className="p-5">
        <p className="text-gray-400 text-sm mb-4">
          Duplicando ficha de <strong className="text-white">{ficha?.nome_completo}</strong>. Selecione o aluno destino:
        </p>
        <FormGroup label="Aluno destino" required>
          {aluno ? (
            <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#850000]/40">
              <span className="text-white text-sm">{aluno.nome_completo}</span>
              <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">×</button>
            </div>
          ) : (
            <Autocomplete
              searchFn={buscarAlunosFn}
              onSelect={(a) => setAluno(a)}
              renderItem={(a) => (
                <div>
                  <p className="font-medium text-sm text-white">{a.nome_completo}</p>
                  {a.email && <p className="text-gray-500 text-xs">{a.email}</p>}
                </div>
              )}
              placeholder="Buscar aluno..."
            />
          )}
        </FormGroup>
      </div>
    </Modal>
  )
}

// ─── Modal Histórico / Comparativo de Volume ─────────────────────────────────

const ModalHistoricoAluno = ({ ficha: fichaRef, onClose }) => {
  const navigate = useNavigate()
  const [aba, setAba] = useState('fichas')
  const [todasFichas, setTodasFichas] = useState([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [fichasVol, setFichasVol] = useState([])
  const [loadingVol, setLoadingVol] = useState(false)
  const [errVol, setErrVol] = useState(null)
  const volCarregado = useRef(false)
  const intensMapRef = useRef({})

  useEffect(() => {
    listarExercicios().then(lista => { intensMapRef.current = buildIntensMap(lista) }).catch(console.error)
    listarFichas({ aluno: fichaRef.aluno, limit: 100 })
      .then(({ list }) => {
        const ordenadas = list.slice().sort((a, b) => {
          const da = toYMD(a.data_de_inicio) || toYMD(a.creation) || ''
          const db = toYMD(b.data_de_inicio) || toYMD(b.creation) || ''
          return da.localeCompare(db)
        })
        setTodasFichas(ordenadas)
      })
      .catch(console.error)
      .finally(() => setLoadingLista(false))
  }, [fichaRef.aluno])

  const carregarVolumes = useCallback(async (lista) => {
    if (volCarregado.current || lista.length === 0) return
    volCarregado.current = true
    setLoadingVol(true)
    setErrVol(null)
    try {
      const alvo = lista.slice(-6)
      const resultados = await Promise.all(
        alvo.map(async (f) => {
          const dados = await buscarFicha(f.name)
          return {
            fichaId: f.name,
            label: formatDate(f.data_de_inicio) || formatDate(f.creation),
            nivel: f.nivel,
            isCurrent: f.name === fichaRef.name,
            vol: calcVolume(dados, intensMapRef.current),
          }
        })
      )
      setFichasVol(resultados)
    } catch (e) {
      console.error(e)
      setErrVol(e.message ?? 'Erro ao calcular volumes')
      volCarregado.current = false
    } finally {
      setLoadingVol(false)
    }
  }, [fichaRef.name])

  useEffect(() => {
    if (aba === 'volume' && todasFichas.length > 0) {
      carregarVolumes(todasFichas)
    }
  }, [aba, todasFichas])

  const gruposAtivos = useMemo(() => {
    if (!fichasVol.length) return []
    const totais = {}
    fichasVol.forEach(fv => Object.entries(fv.vol).forEach(([k, v]) => {
      totais[k] = (totais[k] || 0) + v
    }))
    return Object.entries(totais)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => ({ key, label: GRUPO_LABEL[key] || key }))
  }, [fichasVol])

  const deltaLabel = (curr, prev) => {
    if (prev === null || prev === undefined) return null
    const diff = curr - prev
    if (diff === 0) return { label: '=', cls: 'text-gray-500' }
    const pct = prev > 0 ? Math.round(Math.abs(diff / prev) * 100) : 0
    return diff > 0
      ? { label: `+${pct}%`, cls: 'text-green-400' }
      : { label: `-${pct}%`, cls: 'text-red-400' }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Histórico — ${fichaRef.nome_completo}`} size="xl">
      <div className="flex flex-col">
        <div className="flex border-b border-[#323238] px-5">
          {[{ id: 'fichas', label: 'Fichas' }, { id: 'volume', label: 'Comparativo de Volume' }].map(t => (
            <button key={t.id} onClick={() => setAba(t.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${aba === t.id ? 'border-[#850000] text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 min-h-[320px]">
          {aba === 'fichas' ? (
            loadingLista ? (
              <div className="flex justify-center py-16">
                <Loader size={28} className="animate-spin text-[#850000]" />
              </div>
            ) : todasFichas.length === 0 ? (
              <p className="text-gray-500 text-center py-10">Nenhuma ficha encontrada para este aluno.</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {todasFichas.map((f, i) => (
                  <button key={f.name} onClick={() => { onClose(); navigate(`/fichas/${f.name}`) }}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition hover:bg-[#2f2f35] ${f.name === fichaRef.name ? 'border-[#850000]/40 bg-[#850000]/10' : 'border-[#323238] bg-[#222226]'}`}>
                    <span className="text-gray-600 text-xs w-5 text-right shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium">{f.nivel || 'Sem nível'}</span>
                        <StatusBadge ficha={f} />
                        {f.estrutura_calculada && (
                          <span className="text-gray-500 text-xs font-mono">{f.estrutura_calculada}</span>
                        )}
                        {f.name === fichaRef.name && (
                          <span className="text-[10px] text-[#850000] font-bold uppercase tracking-wider border border-[#850000]/40 px-1.5 py-0.5 rounded">atual</span>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        <span className="text-gray-500 text-xs">Criado: {formatDate(f.creation)}</span>
                        {f.data_de_inicio && <span className="text-gray-500 text-xs">Início: {formatDate(f.data_de_inicio)}</span>}
                        {f.data_de_fim && <span className="text-gray-500 text-xs">Fim: {formatDate(f.data_de_fim)}</span>}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 shrink-0" />
                  </button>
                ))}
              </div>
            )
          ) : (
            loadingVol ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader size={28} className="animate-spin text-[#850000]" />
                <p className="text-gray-500 text-sm">Carregando fichas e calculando volumes…</p>
              </div>
            ) : errVol ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <p className="text-red-400 text-sm">{errVol}</p>
                <Button variant="secondary" size="sm" onClick={() => { volCarregado.current = false; carregarVolumes(todasFichas) }}>
                  Tentar novamente
                </Button>
              </div>
            ) : gruposAtivos.length === 0 && !loadingLista ? (
              <p className="text-gray-500 text-center py-10 text-sm">
                Nenhum volume encontrado. Verifique se as fichas têm dias da semana e exercícios com intensidade preenchidos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#323238]">
                      <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[130px]">Grupo Muscular</th>
                      {fichasVol.map((fv) => (
                        <th key={fv.fichaId} className={`text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider min-w-[90px] ${fv.isCurrent ? 'text-[#a00000]' : 'text-gray-400'}`}>
                          <div>{fv.label}</div>
                          {fv.nivel && <div className="font-normal text-[10px] text-gray-500 mt-0.5 normal-case">{fv.nivel}</div>}
                          {fv.isCurrent && <div className="text-[10px] text-[#850000] normal-case mt-0.5 font-bold">atual</div>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gruposAtivos.map(g => (
                      <tr key={g.key} className="border-b border-[#323238]/50 hover:bg-[#1a1a1a] transition-colors">
                        <td className="py-2.5 pr-4 text-gray-300 text-xs font-medium">{g.label}</td>
                        {fichasVol.map((fv, idx) => {
                          const curr = fv.vol[g.key] || 0
                          const prev = idx > 0 ? (fichasVol[idx - 1].vol[g.key] || 0) : null
                          const d = prev !== null ? deltaLabel(curr, prev) : null
                          return (
                            <td key={fv.fichaId} className={`py-2.5 px-3 text-center ${fv.isCurrent ? 'bg-[#850000]/5' : ''}`}>
                              <div className={`text-sm font-bold ${curr > 0 ? (fv.isCurrent ? 'text-white' : 'text-gray-200') : 'text-gray-700'}`}>
                                {curr > 0 ? curr.toFixed(1) : '—'}
                              </div>
                              {d && curr > 0 && (
                                <div className={`text-[10px] mt-0.5 font-semibold ${d.cls}`}>{d.label}</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-gray-600 text-xs mt-3">
                  Volume = séries × intensidade × dias/semana. Mostrando últimas {fichasVol.length} fichas em ordem cronológica.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── FichaListagem ────────────────────────────────────────────────────────────

const FILTROS_INICIAL = {
  filtroSexo: '', status: null, nivel: '',
  filtroLetras: [], filtroTotalDias: '',
  dataInicioFrom: '', dataInicioTo: '',
  dataFimFrom: '', dataFimTo: '',
}

const FETCH_LIMIT = 200

export default function FichaListagem() {
  const navigate = useNavigate()
  const [fichas, setFichas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filtros, setFiltros] = useState(FILTROS_INICIAL)
  const [modalFiltros, setModalFiltros] = useState(false)
  const [modalNova, setModalNova] = useState(false)
  const [modalDuplicar, setModalDuplicar] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [modalViz, setModalViz] = useState(null)
  const [modalHistorico, setModalHistorico] = useState(null)

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [filtros])

  const fetchFichas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { list } = await listarFichas({
        busca: query || undefined,
        limit: FETCH_LIMIT,
      })
      setFichas(list)
    } catch (err) {
      setError(err.message ?? 'Erro ao buscar fichas')
    } finally {
      setLoading(false)
    }
  }, [query, filtros])

  useEffect(() => { fetchFichas() }, [fetchFichas])

  // Filtros client-side — busca por nome bypassa todos os filtros locais
  const fichasVisiveis = fichas.filter(f => {
    if (query.trim()) return true
    if (filtros.status && statusFicha(f) !== filtros.status) return false
    if (filtros.nivel && f.nivel !== filtros.nivel) return false
    const estrutura = f.estrutura_calculada || ''
    if (filtros.filtroTotalDias && estrutura.length !== parseInt(filtros.filtroTotalDias)) return false
    if (filtros.filtroLetras?.length > 0) {
      // 1. cada letra tem que aparecer exatamente na freq escolhida
      for (const { letra, freq } of filtros.filtroLetras) {
        if (estrutura.split('').filter(l => l === letra).length !== freq) return false
      }
      // 2. não pode haver letra fora do conjunto selecionado
      const letrasPermitidas = filtros.filtroLetras.map(x => x.letra)
      if (estrutura.split('').some(l => !letrasPermitidas.includes(l))) return false
      // 3. tamanho total tem que bater com a soma das frequências
      const totalEsperado = filtros.filtroLetras.reduce((s, x) => s + x.freq, 0)
      if (estrutura.length !== totalEsperado) return false
    }
    if (filtros.dataInicioFrom && (!f.data_de_inicio || toYMD(f.data_de_inicio) < filtros.dataInicioFrom)) return false
    if (filtros.dataInicioTo   && (!f.data_de_inicio || toYMD(f.data_de_inicio) > filtros.dataInicioTo))   return false
    if (filtros.dataFimFrom    && (!f.data_de_fim    || toYMD(f.data_de_fim)    < filtros.dataFimFrom))    return false
    if (filtros.dataFimTo      && (!f.data_de_fim    || toYMD(f.data_de_fim)    > filtros.dataFimTo))      return false
    return true
  })

  const fichasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize
    return fichasVisiveis.slice(start, start + pageSize)
  }, [fichasVisiveis, page, pageSize])

  const handleExcluirConfirmado = async (ficha) => {
    try {
      await excluirFicha(ficha.name)
      setFichas(prev => prev.filter(f => f.name !== ficha.name))
    } catch (e) {
      alert('Erro ao excluir: ' + e.message)
    }
  }

  const temFiltroAtivo = filtros.filtroSexo || filtros.status || filtros.nivel ||
    filtros.filtroLetras?.length > 0 || filtros.filtroTotalDias ||
    filtros.dataInicioFrom || filtros.dataInicioTo || filtros.dataFimFrom || filtros.dataFimTo

  return (
    <div className="p-8 text-white">
      {modalNova && (
        <ModalNovaFicha
          onClose={() => setModalNova(false)}
          onCriada={(id) => { setModalNova(false); navigate(`/fichas/${id}`) }}
        />
      )}
      {modalDuplicar && (
        <ModalDuplicarFicha
          ficha={modalDuplicar}
          onClose={() => setModalDuplicar(null)}
          onDuplicada={(id) => { setModalDuplicar(null); navigate(`/fichas/${id}`) }}
        />
      )}
      {modalExcluir && (
        <ModalExcluirFicha
          ficha={modalExcluir}
          onClose={() => setModalExcluir(null)}
          onConfirm={handleExcluirConfirmado}
        />
      )}
      {modalViz && (
        <VisualizacaoRapidaModal
          ficha={modalViz}
          onClose={() => setModalViz(null)}
        />
      )}
      {modalHistorico && (
        <ModalHistoricoAluno
          ficha={modalHistorico}
          onClose={() => setModalHistorico(null)}
        />
      )}
      {modalFiltros && (
        <ModalFiltros
          filtros={filtros}
          onChange={(f) => { setPage(1); setFiltros(f) }}
          onClose={() => setModalFiltros(false)}
          onLimpar={() => { setPage(1); setFiltros(FILTROS_INICIAL) }}
        />
      )}

      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Fichas de Treino</h1>
            <p className="text-gray-400 text-sm mt-1">Gerencie as fichas de treino dos alunos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchFichas} loading={loading} title="Atualizar" />
            <Button
              variant={temFiltroAtivo ? 'danger' : 'secondary'}
              size="sm"
              icon={SlidersHorizontal}
              onClick={() => setModalFiltros(true)}
              title="Filtros"
            />
            <div className="flex items-center bg-[#29292e] border border-[#323238] rounded-lg p-1 gap-0.5">
              {[{ key: 'grid', icon: <LayoutGrid size={14} />, title: 'Grade' }, { key: 'list', icon: <List size={14} />, title: 'Lista' }].map(({ key, icon, title }) => (
                <button key={key} onClick={() => setView(key)} title={title}
                  className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${view === key ? 'bg-[#850000] text-white' : 'text-gray-400 hover:text-white'}`}>
                  {icon}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalNova(true)}>
              Nova Ficha
            </Button>
          </div>
        </div>

        {/* Busca */}
        <div className="mb-6 max-w-md">
          <Input
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome do aluno…"
            icon={({ size }) => <ClipboardList size={size} />}
          />
        </div>

        {/* Conteúdo */}
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Erro ao carregar fichas</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchFichas} className="ml-auto">Tentar novamente</Button>
          </div>
        ) : loading ? (
          <Skeleton view={view} />
        ) : fichasVisiveis.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={query ? 'Nenhuma ficha encontrada' : 'Nenhuma ficha cadastrada'}
            description={query ? `Sem resultados para "${query}"` : 'As fichas cadastradas aparecerão aqui'}
          />
        ) : view === 'grid' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {fichasPaginadas.map(f => (
                <CardFicha key={f.name} ficha={f} onClick={(id) => navigate(`/fichas/${id}`)} />
              ))}
            </div>
            <div className="mt-4">
              <Pagination page={page} pageSize={pageSize} total={fichasVisiveis.length} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }} />
            </div>
          </>
        ) : (
          <DataTable
            rows={fichasVisiveis}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
            onRowClick={(f) => navigate(`/fichas/${f.name}`)}
            columns={[
              {
                label: 'Aluno',
                headerClass: 'min-w-[200px]',
                render: (f) => (
                  <>
                    <p className="text-white font-medium text-sm truncate">{f.nome_completo || '—'}</p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">{f.aluno}</p>
                    <p className="text-gray-500 text-xs mt-0.5">criado em: {formatDate(f.creation)}</p>
                  </>
                ),
              },
              {
                label: 'Nível',
                headerClass: 'min-w-[100px]',
                render: (f) => <span className="text-blue-400 text-xs font-medium">{f.nivel || '—'}</span>,
              },
              {
                label: 'Estrutura',
                headerClass: 'min-w-[100px]',
                render: (f) => f.estrutura_calculada ? (
                  <div className="flex gap-1 flex-wrap">
                    {f.estrutura_calculada.split('').map((l, i) => (
                      <span key={i} className="text-[10px] font-bold px-1.5 py-0.5 bg-[#323238] text-gray-300 rounded">{l}</span>
                    ))}
                  </div>
                ) : <span className="text-gray-600">—</span>,
              },
              {
                label: 'Status',
                headerClass: 'min-w-[100px]',
                render: (f) => <StatusBadge ficha={f} />,
              },
              {
                label: 'Período',
                headerClass: 'min-w-[160px]',
                render: (f) => (
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Calendar size={11} />
                    <span>{formatDate(f.data_de_inicio)}</span>
                    <span className="text-gray-600">→</span>
                    <span>{formatDate(f.data_de_fim)}</span>
                  </div>
                ),
              },
              {
                label: 'Ações',
                headerClass: 'min-w-[100px]',
                render: (f) => (
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setModalViz(f)}
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors" title="Visualizar">
                      <Eye size={12} />
                    </button>
                    <button onClick={() => setModalHistorico(f)}
                      className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors" title="Comparar volumes">
                      <BarChart2 size={12} />
                    </button>
                    <button onClick={() => setModalDuplicar(f)}
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors" title="Duplicar">
                      <Copy size={12} />
                    </button>
                    <button onClick={() => setModalExcluir(f)}
                      className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors" title="Excluir">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ),
              },
              {
                label: '',
                headerClass: 'w-10',
                render: () => <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors" />,
              },
            ]}
          />
        )}
      </div>
    </div>
  )
}
