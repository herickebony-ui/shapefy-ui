import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ChevronRight, Calendar, User, LayoutGrid, List,
  RefreshCw, AlertCircle, Copy, ClipboardList,
  Trash2, SlidersHorizontal, Eye, Loader, BarChart2,
} from 'lucide-react'
import { listarFichas, buscarFicha, excluirFicha, criarFicha, salvarFicha, listarExercicios } from '../../api/fichas'
import { listarAlunos } from '../../api/alunos'
import { Button, FormGroup, Input, Select, Autocomplete, Modal, EmptyState } from '../../components/ui'

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

const GRUPOS_CONFIG = [
  { key: 'quadriceps',    label: 'Quadríceps' },
  { key: 'isquiotibiais', label: 'Isquiotibiais' },
  { key: 'gluteos',       label: 'Glúteos' },
  { key: 'panturrilha',   label: 'Panturrilha' },
  { key: 'peito',         label: 'Peito' },
  { key: 'dorsais',       label: 'Dorsais' },
  { key: 'ombros',        label: 'Ombros' },
  { key: 'trapezio',      label: 'Trapézio' },
  { key: 'biceps',        label: 'Bíceps' },
  { key: 'triceps',       label: 'Tríceps' },
  { key: 'antebraco',     label: 'Antebraço' },
  { key: 'abdomen',       label: 'Abdômen' },
  { key: 'lombares',      label: 'Lombares' },
  { key: 'adutores',      label: 'Adutores' },
  { key: 'abdutores',     label: 'Abdutores' },
]

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
  if (!start && !end) return 'Rascunho'
  if (start && !end)  return 'Ativa'
  if (start && end && end >= hoje) return 'Ativa'
  if (start && end && end < hoje)  return 'Inativa'
  return 'Rascunho'
}

const STATUS_COLOR = {
  Ativa:    'bg-green-500/10 text-green-300 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
  Inativa:  'bg-red-500/10 text-red-300 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  Rascunho: 'bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
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

const RowFicha = ({ ficha, onClick, onDuplicar, onExcluir, onVisualizar, onHistorico }) => (
  <tr onClick={() => onClick(ficha.name)} className="group border-b border-[#323238] hover:bg-[#2f2f35] cursor-pointer transition-colors">
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

const NIVEIS = ['Iniciante', 'Intermediário', 'Avançado']

const ModalFiltros = ({ filtros, onChange, onClose, onLimpar }) => {
  const [local, setLocal] = useState({ ...filtros })

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Filtros"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => { setLocal({ status: null, nivel: '', filtroLetras: [], filtroTotalDias: '', dataInicioFrom: '', dataInicioTo: '', dataFimFrom: '', dataFimTo: '' }); onLimpar(); onClose() }}>
            Limpar tudo
          </Button>
          <Button variant="primary" onClick={() => { onChange(local); onClose() }}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
          <div className="flex flex-wrap gap-2">
            {['Rascunho', 'Ativa', 'Inativa'].map(s => (
              <button key={s} onClick={() => setLocal(p => ({ ...p, status: p.status === s ? null : s }))}
                className={`px-4 py-1.5 rounded-lg text-sm border transition ${local.status === s ? 'bg-[#850000]/20 border-[#850000]/50 text-red-400' : 'border-[#323238] text-gray-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <FormGroup label="Nível">
          <Select value={local.nivel || ''} onChange={v => setLocal(p => ({ ...p, nivel: v }))} options={NIVEIS} placeholder="Todos" />
        </FormGroup>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Início — de">
            <input type="date" value={local.dataInicioFrom || ''} onChange={e => setLocal(p => ({ ...p, dataInicioFrom: e.target.value }))}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
          <FormGroup label="Início — até">
            <input type="date" value={local.dataInicioTo || ''} onChange={e => setLocal(p => ({ ...p, dataInicioTo: e.target.value }))}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="Fim — de">
            <input type="date" value={local.dataFimFrom || ''} onChange={e => setLocal(p => ({ ...p, dataFimFrom: e.target.value }))}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
          <FormGroup label="Fim — até">
            <input type="date" value={local.dataFimTo || ''} onChange={e => setLocal(p => ({ ...p, dataFimTo: e.target.value }))}
              className="w-full h-10 px-3 bg-[#1a1a1a] border border-[#323238] text-white text-sm rounded-lg outline-none focus:border-[#850000]/60" />
          </FormGroup>
        </div>
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

  useEffect(() => {
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
            vol: calcVolume(dados),
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
    const keys = new Set()
    fichasVol.forEach(fv => Object.keys(fv.vol).forEach(k => keys.add(k)))
    return GRUPOS_CONFIG.filter(g => keys.has(g.key))
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
  status: null, nivel: '',
  filtroLetras: [], filtroTotalDias: '',
  dataInicioFrom: '', dataInicioTo: '',
  dataFimFrom: '', dataFimTo: '',
}

const LIMIT = 50

export default function FichaListagem() {
  const navigate = useNavigate()
  const [fichas, setFichas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('list')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [filtros, setFiltros] = useState(FILTROS_INICIAL)
  const [modalFiltros, setModalFiltros] = useState(false)
  const [modalNova, setModalNova] = useState(false)
  const [modalDuplicar, setModalDuplicar] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [modalViz, setModalViz] = useState(null)
  const [modalHistorico, setModalHistorico] = useState(null)
  const isLoadMore = useRef(false)

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => { isLoadMore.current = false; setQuery(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  const fetchFichas = useCallback(async () => {
    const appending = isLoadMore.current
    isLoadMore.current = false
    if (appending) setLoadingMore(true)
    else setLoading(true)
    setError(null)

    try {
      const temFiltroClienteSide = filtros.status || filtros.filtroLetras?.length > 0 || filtros.filtroTotalDias
      const { list, hasMore: more } = await listarFichas({
        busca: query || undefined,
        nivel: filtros.nivel || undefined,
        page: temFiltroClienteSide ? 1 : page,
        limit: temFiltroClienteSide ? 300 : LIMIT,
      })
      if (appending) setFichas(prev => [...prev, ...list])
      else setFichas(list)
      setHasMore(more && !temFiltroClienteSide)
    } catch (err) {
      setError(err.message ?? 'Erro ao buscar fichas')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [query, page, filtros])

  useEffect(() => { fetchFichas() }, [fetchFichas])

  // Filtros client-side
  const fichasVisiveis = fichas.filter(f => {
    if (query.trim()) return true
    if (filtros.status && statusFicha(f) !== filtros.status) return false
    const estrutura = f.estrutura_calculada || ''
    if (filtros.filtroTotalDias && estrutura.length !== parseInt(filtros.filtroTotalDias)) return false
    if (filtros.filtroLetras?.length > 0) {
      for (const { letra, freq } of filtros.filtroLetras) {
        if (estrutura.split('').filter(l => l === letra).length !== freq) return false
      }
      const letrasPermitidas = filtros.filtroLetras.map(fl => fl.letra)
      if (estrutura.split('').some(l => !letrasPermitidas.includes(l))) return false
      if (estrutura.length !== filtros.filtroLetras.reduce((s, fl) => s + fl.freq, 0)) return false
    }
    if (filtros.dataInicioFrom && (!f.data_de_inicio || f.data_de_inicio < filtros.dataInicioFrom)) return false
    if (filtros.dataInicioTo   && (!f.data_de_inicio || f.data_de_inicio > filtros.dataInicioTo))   return false
    if (filtros.dataFimFrom    && (!f.data_de_fim    || f.data_de_fim    < filtros.dataFimFrom))    return false
    if (filtros.dataFimTo      && (!f.data_de_fim    || f.data_de_fim    > filtros.dataFimTo))      return false
    return true
  })

  const handleExcluirConfirmado = async (ficha) => {
    try {
      await excluirFicha(ficha.name)
      setFichas(prev => prev.filter(f => f.name !== ficha.name))
    } catch (e) {
      alert('Erro ao excluir: ' + e.message)
    }
  }

  const temFiltroAtivo = filtros.status || filtros.nivel ||
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
          onChange={(f) => { isLoadMore.current = false; setPage(1); setFiltros(f) }}
          onClose={() => setModalFiltros(false)}
          onLimpar={() => { isLoadMore.current = false; setPage(1); setFiltros(FILTROS_INICIAL) }}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {fichasVisiveis.map(f => (
              <CardFicha key={f.name} ficha={f} onClick={(id) => navigate(`/fichas/${id}`)} />
            ))}
          </div>
        ) : (
          <div className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#323238] bg-[#1a1a1a]">
                    {['Aluno', 'Nível', 'Estrutura', 'Status', 'Período', 'Ações', ''].map((label, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fichasVisiveis.map(f => (
                    <RowFicha key={f.name} ficha={f}
                      onClick={(id) => navigate(`/fichas/${id}`)}
                      onDuplicar={setModalDuplicar}
                      onExcluir={setModalExcluir}
                      onVisualizar={setModalViz}
                      onHistorico={setModalHistorico}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paginação */}
        {!error && fichasVisiveis.length > 0 && (
          <div className="flex flex-col items-center gap-3 mt-6">
            {hasMore && !loading && (
              <Button variant="secondary" loading={loadingMore} icon={ChevronRight}
                onClick={() => { isLoadMore.current = true; setPage(p => p + 1) }}>
                Carregar mais fichas
              </Button>
            )}
            <p className="text-gray-500 text-xs">
              Exibindo {fichasVisiveis.length} ficha{fichasVisiveis.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
