import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, ChevronRight, Calendar, X,
  Flame, User, LayoutGrid, List,
  RefreshCw, AlertCircle, Copy, ClipboardList,
  Trash2, SlidersHorizontal, Eye, Loader,
} from 'lucide-react'
import { listarDietas, excluirDieta, buscarDieta, salvarDieta, criarDieta } from '../../api/dietas'
import { listarAlunos } from '../../api/alunos'
import { ModalDuplicarDieta } from './DietaDetalhe'
import { Button, FormGroup, Input, Autocomplete, Modal, EmptyState, Pagination, DataTable } from '../../components/ui'
import { buscarSmart } from '../../utils/strings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toYMD = (v) => {
  if (v == null) return ''
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(v).trim()
  if (!s) return ''
  let m = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
  return ''
}

const formatDate = (v) => {
  const ymd = toYMD(v)
  if (!ymd) return '—'
  const [y, mo, d] = ymd.split('-')
  return `${d}/${mo}/${y}`
}

const fmt = (v, dec = 1) => v != null ? Number(v).toFixed(dec) : '0'

// ─── Cores por estratégia ─────────────────────────────────────────────────────

const STRATEGY_COLORS = {
  '01': { border: 'border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.07)]', text: 'text-blue-400' },
  '02': { border: 'border-purple-500/30', glow: 'shadow-[0_0_15px_rgba(168,85,247,0.07)]', text: 'text-purple-400' },
  '03': { border: 'border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(52,211,153,0.07)]', text: 'text-emerald-400' },
  '04': { border: 'border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(251,191,36,0.07)]', text: 'text-amber-400' },
}
const DEFAULT_STYLE = { border: 'border-[#323238]', glow: '', text: 'text-gray-400' }
const getStrategyStyle = (strategy) => STRATEGY_COLORS[strategy?.slice(0, 2)] ?? DEFAULT_STYLE

// ─── Status ───────────────────────────────────────────────────────────────────

const getStatus = (dieta) => {
  const start = toYMD(dieta?.date)
  const end = toYMD(dieta?.final_date)
  const hoje = new Date().toISOString().split('T')[0]
  if (!start && !end) return { label: 'Rascunho', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.5)]' }
  if (!start && end)  return { label: 'Sem início', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20 shadow-[0_0_8px_rgba(148,163,184,0.35)]' }
  if (start && !end)  return { label: 'Ativa', color: 'bg-green-500/10 text-green-300 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)]' }
  return end >= hoje
    ? { label: 'Ativa',   color: 'bg-green-500/10 text-green-300 border-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.5)]' }
    : { label: 'Inativa', color: 'bg-red-500/10 text-red-300 border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.5)]' }
}

const StatusBadge = ({ dieta }) => {
  const { label, color } = getStatus(dieta)
  return (
    <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider w-max ${color}`}>
      {label}
    </span>
  )
}

// ─── Card (grade) ─────────────────────────────────────────────────────────────

const CardDieta = ({ dieta, onClick }) => {
  const s = getStrategyStyle(dieta.strategy)
  return (
    <button
      onClick={() => onClick(dieta.name)}
      className={`group w-full text-left bg-[#29292e] border ${s.border} ${s.glow} rounded-lg p-5 transition-all duration-200 hover:bg-[#2f2f35] hover:scale-[1.015] hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/50`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base truncate leading-tight">
            {dieta.nome_completo || 'Paciente sem nome'}
          </p>
          <p className="text-gray-400 text-xs mt-1 flex items-center gap-1.5">
            <User size={11} />
            <span className="truncate">{dieta.aluno}</span>
          </p>
          <p className="text-gray-500 text-xs mt-0.5">criado em: {formatDate(dieta.creation)}</p>
        </div>
        <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-300 transition-colors mt-0.5 shrink-0" />
      </div>
      {dieta.strategy && <p className={`text-xs font-medium mb-3 truncate ${s.text}`}>{dieta.strategy}</p>}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-orange-400">
          <Flame size={13} />
          <span className="text-sm font-semibold">{dieta.total_calories ?? '—'}</span>
          <span className="text-gray-500 text-xs">kcal</span>
        </div>
        {dieta.week_days && (
          <div className="flex items-center gap-1.5 text-gray-400">
            <Calendar size={12} />
            <span className="text-xs">{dieta.week_days}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[#323238]">
        <StatusBadge dieta={dieta} />
        <div className="flex flex-col text-right">
          <span className="text-gray-500 text-[10px]">Início: {formatDate(dieta.date)}</span>
          <span className="text-gray-500 text-[10px]">Fim: {formatDate(dieta.final_date)}</span>
        </div>
      </div>
    </button>
  )
}

// ─── Período editável (cell) ──────────────────────────────────────────────────

const RowDietaPeriodo = ({ dieta, onDatasAtualizadas }) => {
  const [editando, setEditando] = useState(false)
  const [datas, setDatas] = useState({ date: toYMD(dieta.date) || '', final_date: toYMD(dieta.final_date) || '' })
  const [salvando, setSalvando] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!editando) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setEditando(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [editando])

  const handleSalvar = async (e) => {
    e.stopPropagation()
    setSalvando(true)
    try {
      await salvarDieta(dieta.name, { date: datas.date || null, final_date: datas.final_date || null })
      onDatasAtualizadas(dieta.name, datas)
      setEditando(false)
    } catch (err) {
      alert('Erro ao salvar datas: ' + err.message)
    } finally { setSalvando(false) }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={(e) => { e.stopPropagation(); setEditando(v => !v) }}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-xs transition-colors group/btn">
        <Calendar size={11} className="shrink-0" />
        <span>{formatDate(dieta.date)}</span>
        <span className="text-gray-600">→</span>
        <span>{formatDate(dieta.final_date)}</span>
        <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity text-[10px] text-[#2563eb]">editar</span>
      </button>
      {editando && (
        <div onClick={e => e.stopPropagation()}
          className="absolute z-50 top-7 left-0 bg-[#1a1a1a] border border-[#323238] rounded-lg p-4 shadow-2xl w-72 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Editar período</p>
          <div className="space-y-2">
            <FormGroup label="Início">
              <input type="date" value={datas.date} onChange={e => setDatas(p => ({ ...p, date: e.target.value }))}
                className="w-full h-9 px-3 bg-[#29292e] border border-[#323238] text-white text-xs rounded-lg outline-none focus:border-[#2563eb]/60" />
            </FormGroup>
            <FormGroup label="Fim">
              <input type="date" value={datas.final_date} onChange={e => setDatas(p => ({ ...p, final_date: e.target.value }))}
                className="w-full h-9 px-3 bg-[#29292e] border border-[#323238] text-white text-xs rounded-lg outline-none focus:border-[#2563eb]/60" />
            </FormGroup>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="sm" fullWidth onClick={() => setEditando(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" fullWidth loading={salvando} onClick={handleSalvar}>Salvar</Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ view }) =>
  view === 'grid' ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-[#29292e] border border-[#323238] rounded-lg p-5 animate-pulse space-y-3">
          <div className="h-4 bg-[#323238] rounded w-3/4" />
          <div className="h-3 bg-[#323238] rounded w-1/2" />
          <div className="h-3 bg-[#323238] rounded w-2/3" />
          <div className="flex gap-3"><div className="h-3 bg-[#323238] rounded w-20" /><div className="h-3 bg-[#323238] rounded w-24" /></div>
          <div className="h-px bg-[#323238]" />
          <div className="flex justify-between"><div className="h-5 bg-[#323238] rounded w-16" /><div className="h-3 bg-[#323238] rounded w-20" /></div>
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

const REFEICOES_LABELS = {
  1: 'Café da Manhã', 2: 'Lanche da Manhã', 3: 'Almoço',
  4: 'Lanche da Tarde', 5: 'Jantar', 6: 'Ceia', 7: 'Refeição 7', 8: 'Refeição 8',
}

const ModalFiltros = ({ filtros, onChange, onClose, onLimpar }) => {
  const [local, setLocal] = useState({ ...filtros })
  const toggle = (key, val) => setLocal(p => ({ ...p, [key]: p[key] === val ? null : val }))
  const toggleRefeicao = (n) => setLocal(p => {
    const arr = p.refeicoes || []
    return { ...p, refeicoes: arr.includes(n) ? arr.filter(x => x !== n) : [...arr, n] }
  })

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Filtros"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => { setLocal({ status: null, kcalMin: '', kcalMax: '', refeicoes: [] }); onLimpar(); onClose() }}>
            Limpar tudo
          </Button>
          <Button variant="primary" onClick={() => { onChange(local); onClose() }}>
            Aplicar
          </Button>
        </>
      }
    >
      <div className="p-5 space-y-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Status</p>
          <div className="flex flex-wrap gap-2">
            {['Rascunho', 'Ativa', 'Inativa'].map(s => (
              <button key={s} onClick={() => toggle('status', s)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition ${local.status === s ? 'bg-[#2563eb]/20 border-[#2563eb]/50 text-red-400' : 'border-[#323238] text-gray-400 hover:text-white'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Calorias</p>
          <div className="flex items-end gap-3">
            <FormGroup label="Mínimo" className="flex-1">
              <Input type="number" value={local.kcalMin || ''} onChange={v => setLocal(p => ({ ...p, kcalMin: v }))} placeholder="Ex: 1200" />
            </FormGroup>
            <span className="text-gray-500 pb-2.5">—</span>
            <FormGroup label="Máximo" className="flex-1">
              <Input type="number" value={local.kcalMax || ''} onChange={v => setLocal(p => ({ ...p, kcalMax: v }))} placeholder="Ex: 2500" />
            </FormGroup>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Refeições Incluídas</p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => {
              const ativo = (local.refeicoes || []).includes(n)
              return (
                <button key={n} onClick={() => toggleRefeicao(n)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition ${ativo ? 'bg-[#2563eb]/20 border-[#2563eb]/50 text-red-400' : 'border-[#323238] text-gray-400 hover:text-white'}`}>
                  {REFEICOES_LABELS[n]}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Modal Visualização Rápida ────────────────────────────────────────────────

const REFEICAO_NOMES = {
  1: 'Café da Manhã', 2: 'Lanche da Manhã', 3: 'Almoço',
  4: 'Lanche da Tarde', 5: 'Jantar', 6: 'Ceia', 7: 'Refeição 7', 8: 'Refeição 8',
}

const VisualizacaoDietaModal = ({ dietaId, onClose }) => {
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!dietaId) return
    setLoading(true)
    buscarDieta(dietaId)
      .then(res => { setDados(res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dietaId])

  const totais = (() => {
    if (!dados) return null
    let prot = 0, carb = 0, lip = 0, kcal = 0, fib = 0
    for (let i = 1; i <= 8; i++) {
      if (dados[`meal_${i}`] === 1) {
        for (let j = 1; j <= 10; j++) {
          if (dados[`meal_${i}_option_${j}`] === 1) {
            const itens = dados[`meal_${i}_option_${j}_items`] || []
            itens.forEach(item => {
              if (!item.substitute) {
                prot += Number(item.protein || 0)
                carb += Number(item.carbohydrate || 0)
                lip += Number(item.lipid || 0)
                kcal += Number(item.calories || 0)
                fib += Number(item.fiber || 0)
              }
            })
            break
          }
        }
      }
    }
    const peso = Number(dados?.weight) || 1
    return { prot, carb, lip, kcal, fib, relProt: prot / peso, relCarb: carb / peso, relLip: lip / peso, relFib: fib / peso }
  })()

  const footer = totais ? (
    <div className="flex flex-wrap items-center gap-4 text-xs w-full justify-center">
      <span className="text-gray-400 font-bold uppercase tracking-widest">Totais:</span>
      <span className="text-gray-300">Prot: <strong className="text-white">{fmt(totais.prot, 0)}g</strong></span>
      <span className="text-gray-300">Líp: <strong className="text-white">{fmt(totais.lip, 0)}g</strong></span>
      <span className="text-gray-300">Carb: <strong className="text-white">{fmt(totais.carb, 0)}g</strong></span>
      <span className="text-gray-300">Fib: <strong className="text-white">{fmt(totais.fib, 0)}g</strong></span>
      <span className="bg-[#2563eb]/20 text-red-300 border border-[#2563eb]/30 px-2 py-0.5 rounded font-medium">
        Kcal: <strong className="text-white">{fmt(totais.kcal, 0)}</strong>
      </span>
      <span className="text-gray-500">|</span>
      <span className="text-gray-400">PTN: <strong className="text-white">{fmt(totais.relProt, 1)}</strong></span>
      <span className="text-gray-400">LIP: <strong className="text-white">{fmt(totais.relLip, 1)}</strong></span>
      <span className="text-gray-400">CHO: <strong className="text-white">{fmt(totais.relCarb, 1)}</strong></span>
      <span className="text-gray-400">FIB: <strong className="text-white">{fmt(totais.relFib, 1)}</strong></span>
    </div>
  ) : null

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={dados?.nome_completo || 'Carregando...'}
      subtitle={dados ? `${dados.strategy || ''} · ${dados.week_days || ''} · ${formatDate(dados.date)} → ${formatDate(dados.final_date) || 'em aberto'}` : undefined}
      size="xl"
      footer={footer}
    >
      <div className="p-4 space-y-4 min-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={28} className="animate-spin text-[#2563eb]" />
          </div>
        ) : !dados ? (
          <p className="text-red-400 text-center py-10">Erro ao carregar dieta.</p>
        ) : (
          [1, 2, 3, 4, 5, 6, 7, 8].map(n => {
            if (dados[`meal_${n}`] !== 1) return null
            const opcoesAtivas = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(j => dados[`meal_${n}_option_${j}`] === 1)
            return (
              <div key={n} className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#323238]">
                  <span className="h-2 w-2 rounded-full bg-[#2563eb] shrink-0" />
                  <span className="text-white font-semibold text-sm">{dados[`meal_${n}_label`] || REFEICAO_NOMES[n]}</span>
                </div>
                <div className="p-3 space-y-3">
                  {opcoesAtivas.map(j => {
                    const items = dados[`meal_${n}_option_${j}_items`] || []
                    const legend = dados[`meal_${n}_option_${j}_legend`]
                    const label = dados[`meal_${n}_option_${j}_label`] || `Opção ${j}`
                    const macros = items.reduce((acc, item) => {
                      if (!item.substitute) {
                        acc.prot += Number(item.protein || 0)
                        acc.carb += Number(item.carbohydrate || 0)
                        acc.lip += Number(item.lipid || 0)
                        acc.kcal += Number(item.calories || 0)
                      }
                      return acc
                    }, { prot: 0, carb: 0, lip: 0, kcal: 0 })
                    return (
                      <div key={j} className="bg-[#1a1a1a] border border-[#323238] rounded-lg p-3">
                        <p className="text-white text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                        {legend && <p className="text-gray-500 text-xs mb-2">{legend}</p>}
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-500 border-b border-[#323238]">
                              <th className="text-left pb-1.5 font-medium">Alimento</th>
                              <th className="text-center pb-1.5 font-medium w-16">Qtd.</th>
                              <th className="text-center pb-1.5 font-medium w-12">Unid.</th>
                              <th className="text-center pb-1.5 font-medium w-12">Prot.</th>
                              <th className="text-center pb-1.5 font-medium w-12">Carb.</th>
                              <th className="text-center pb-1.5 font-medium w-12">Gord.</th>
                              <th className="text-center pb-1.5 font-medium w-14">Kcal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.filter(item => !item.substitute).map((item, idx) => (
                              <tr key={idx} className="border-b border-[#323238]/40 last:border-0">
                                <td className="py-1.5 text-gray-300">{item.food}</td>
                                <td className="py-1.5 text-center text-gray-300">{item.ref_weight}</td>
                                <td className="py-1.5 text-center text-gray-500">{item.unit}</td>
                                <td className="py-1.5 text-center text-gray-300">{item.protein}</td>
                                <td className="py-1.5 text-center text-gray-300">{item.carbohydrate}</td>
                                <td className="py-1.5 text-center text-gray-300">{item.lipid}</td>
                                <td className="py-1.5 text-center text-gray-300">{item.calories}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 pt-2 border-t border-[#323238] flex gap-4 text-xs text-gray-400">
                          <span>Prot: <strong className="text-white">{fmt(macros.prot, 0)}g</strong></span>
                          <span>Carb: <strong className="text-white">{fmt(macros.carb, 0)}g</strong></span>
                          <span>Líp: <strong className="text-white">{fmt(macros.lip, 0)}g</strong></span>
                          <span>Kcal: <strong className="text-white">{fmt(macros.kcal, 0)}</strong></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Modal>
  )
}

// ─── Modal Nova Dieta ─────────────────────────────────────────────────────────

const buscarAlunosFn = async (q) => {
  if (q.length < 2) return []
  try {
    const res = await listarAlunos({ search: q, limit: 8 })
    return res.list
  } catch { return [] }
}

const ModalNovaDieta = ({ onClose, onCriada }) => {
  const [aluno, setAluno] = useState(null)
  const [criando, setCriando] = useState(false)

  const handleCriar = async () => {
    if (!aluno) return
    setCriando(true)
    try {
      const nova = await criarDieta({ aluno: aluno.name })
      onCriada(nova.name)
    } catch (err) {
      alert('Erro ao criar dieta: ' + err.message)
    } finally { setCriando(false) }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Nova Dieta"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Plus} onClick={handleCriar} loading={criando} disabled={!aluno}>
            Criar Dieta
          </Button>
        </>
      }
    >
      <div className="p-5">
        <FormGroup label="Aluno" required>
          {aluno ? (
            <div className="flex items-center justify-between h-10 px-3 rounded-lg bg-[#29292e] border border-[#2563eb]/40">
              <span className="text-white text-sm">{aluno.nome_completo}</span>
              <button onClick={() => setAluno(null)} className="text-gray-500 hover:text-red-400 transition-colors ml-2">
                <X size={13} />
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

// ─── DietaListagem ────────────────────────────────────────────────────────────

const FETCH_LIMIT = 200

export default function DietaListagem() {
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState({ status: null, kcalMin: '', kcalMax: '', refeicoes: [] })
  const [modalFiltros, setModalFiltros] = useState(false)
  const [vizId, setVizId] = useState(null)
  const [modalDuplicar, setModalDuplicar] = useState(null)
  const [modalNovaDieta, setModalNovaDieta] = useState(false)
  const [dietas, setDietas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [view, setView] = useState('list')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [filtros])

  const fetchDietas = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { list } = await listarDietas({
        busca: query || undefined,
        kcalMin: filtros.kcalMin || undefined,
        kcalMax: filtros.kcalMax || undefined,
        limit: FETCH_LIMIT,
      })
      const lista = query ? list.filter(d => buscarSmart(d.nome_completo, query)) : list
      setDietas(lista)
    } catch (err) {
      setError(err.message ?? 'Erro ao buscar dietas')
    } finally {
      setLoading(false)
    }
  }, [query, filtros])

  useEffect(() => { fetchDietas() }, [fetchDietas])

  const handleDatasAtualizadas = useCallback((id, novasDatas) => {
    setDietas(prev => prev.map(d => d.name === id ? { ...d, ...novasDatas } : d))
  }, [])

  const dietasFiltradas = useMemo(() => dietas.filter(d => {
    if (filtros.status && getStatus(d).label !== filtros.status) return false
    if (filtros.refeicoes?.length > 0) {
      const match = [1, 2, 3, 4, 5, 6, 7, 8].every(i => {
        const deveEstar = filtros.refeicoes.includes(i)
        const estaAtiva = d[`meal_${i}`] === 1
        return deveEstar === estaAtiva
      })
      if (!match) return false
    }
    return true
  }), [dietas, filtros])

  const dietasPaginadas = useMemo(() => {
    const start = (page - 1) * pageSize
    return dietasFiltradas.slice(start, start + pageSize)
  }, [dietasFiltradas, page, pageSize])

  const handleExcluir = async (id, nome) => {
    if (!window.confirm(`Excluir dieta de ${nome}?`)) return
    try {
      await excluirDieta(id)
      fetchDietas()
    } catch (e) {
      alert('Erro ao excluir: ' + e.message)
    }
  }

  const temFiltroAtivo = filtros.status || filtros.kcalMin || filtros.kcalMax || filtros.refeicoes?.length > 0

  return (
    <div className="p-8 text-white">
      {modalNovaDieta && (
        <ModalNovaDieta
          onClose={() => setModalNovaDieta(false)}
          onCriada={(id) => { setModalNovaDieta(false); navigate(`/dietas/${id}`) }}
        />
      )}
      {modalDuplicar && (
        <ModalDuplicarDieta
          dietaId={modalDuplicar.id}
          nomeAtual={modalDuplicar.nome}
          onClose={() => setModalDuplicar(null)}
          onDuplicado={(novaId) => { setModalDuplicar(null); if (novaId) navigate(`/dietas/${novaId}`); else fetchDietas() }}
        />
      )}
      {vizId && <VisualizacaoDietaModal dietaId={vizId} onClose={() => setVizId(null)} />}
      {modalFiltros && (
        <ModalFiltros
          filtros={filtros}
          onChange={(f) => { setPage(1); setFiltros(f) }}
          onClose={() => setModalFiltros(false)}
          onLimpar={() => { setPage(1); setFiltros({ status: null, kcalMin: '', kcalMax: '', refeicoes: [] }) }}
        />
      )}

      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dietas</h1>
            <p className="text-gray-400 text-sm mt-1">Gerencie os planos alimentares dos pacientes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchDietas} loading={loading} title="Atualizar" />
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
                  className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${view === key ? 'bg-[#2563eb] text-white' : 'text-gray-400 hover:text-white'}`}>
                  {icon}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalNovaDieta(true)}>
              Nova Dieta
            </Button>
          </div>
        </div>

        {/* Busca */}
        <div className="mb-6 max-w-md">
          <Input
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nome do paciente…"
            icon={({ size }) => <ClipboardList size={size} />}
          />
        </div>

        {/* Conteúdo */}
        {error ? (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium text-sm">Erro ao carregar dietas</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchDietas} className="ml-auto">Tentar novamente</Button>
          </div>
        ) : loading ? (
          <Skeleton view={view} />
        ) : dietasFiltradas.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={query ? 'Nenhuma dieta encontrada' : 'Nenhuma dieta cadastrada'}
            description={query ? `Sem resultados para "${query}"` : 'As dietas cadastradas no Frappe aparecerão aqui'}
          />
        ) : view === 'grid' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dietasPaginadas.map(d => <CardDieta key={d.name} dieta={d} onClick={(id) => navigate(`/dietas/${id}`)} />)}
            </div>
            <div className="mt-4">
              <Pagination page={page} pageSize={pageSize} total={dietasFiltradas.length} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }} />
            </div>
          </>
        ) : (
          <DataTable
            rows={dietasFiltradas}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
            onRowClick={(d) => navigate(`/dietas/${d.name}`)}
            columns={[
              {
                label: 'Paciente',
                headerClass: 'min-w-[200px]',
                render: (d) => {
                  const s = getStrategyStyle(d.strategy)
                  return (
                    <>
                      <p className="text-white font-medium text-sm truncate">{d.nome_completo || '—'}</p>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{d.aluno}</p>
                      <p className="text-gray-500 text-xs mt-0.5">criado em: {formatDate(d.creation)}</p>
                    </>
                  )
                },
              },
              {
                label: 'Estratégia',
                headerClass: 'min-w-[140px]',
                render: (d) => {
                  const s = getStrategyStyle(d.strategy)
                  return <span className={`text-xs font-medium ${s.text}`}>{d.strategy || '—'}</span>
                },
              },
              {
                label: 'Calorias',
                headerClass: 'min-w-[100px]',
                render: (d) => (
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Flame size={12} />
                    <span className="text-sm font-medium">{d.total_calories ?? '—'}</span>
                    <span className="text-gray-500 text-xs">kcal</span>
                  </div>
                ),
              },
              {
                label: 'Dias',
                headerClass: 'min-w-[140px]',
                render: (d) => <span className="text-gray-400 text-sm">{d.week_days || '—'}</span>,
              },
              {
                label: 'Status',
                headerClass: 'min-w-[100px]',
                render: (d) => <StatusBadge dieta={d} />,
              },
              {
                label: 'Período',
                headerClass: 'min-w-[200px]',
                render: (d) => <RowDietaPeriodo dieta={d} onDatasAtualizadas={handleDatasAtualizadas} />,
              },
              {
                label: 'Ações',
                headerClass: 'min-w-[120px]',
                render: (d) => (
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setVizId(d.name)}
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors" title="Visualizar">
                      <Eye size={12} />
                    </button>
                    <button onClick={() => setModalDuplicar({ id: d.name, nome: d.nome_completo })}
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors" title="Duplicar">
                      <Copy size={12} />
                    </button>
                    <button onClick={() => handleExcluir(d.name, d.nome_completo)}
                      className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors" title="Excluir">
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
