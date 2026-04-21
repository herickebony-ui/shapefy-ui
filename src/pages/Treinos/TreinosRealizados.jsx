import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ArrowLeft, RefreshCw, ChevronLeft, ChevronRight,
  Dumbbell, Activity, TrendingUp, Clock, MessageSquare,
  Save, Search, Calendar,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  listarTreinosRealizados, buscarTreinoRealizado,
  salvarFeedbackProfissional, listarIdsDoAluno,
} from '../../api/treinosRealizados'
import { listarAlunos } from '../../api/alunos'
import { listarFichas, buscarFicha } from '../../api/fichas'
import { Button, Badge, Spinner, EmptyState, Autocomplete } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

const fmtTime = (d) => {
  if (!d) return ''
  const t = String(d).split(' ')[1] || ''
  return t.slice(0, 5)
}

const normalize = (s) =>
  (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const fmtDateShort = (d) => {
  if (!d) return null
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y.slice(2)}`
}

const fichaLabel = (f) => {
  const partes = []
  if (f.objetivo) partes.push(f.objetivo)
  const ini = fmtDateShort(f.data_de_inicio)
  const fim = fmtDateShort(f.data_de_fim)
  if (ini || fim) partes.push(`${ini || '?'} → ${fim || '?'}`)
  return partes.join(' · ') || f.name
}

const normalizeSeries = (arr, fallbackCarga = 0) =>
  arr.map(s => {
    if (typeof s === 'number') return { repeticoes: s, carga: fallbackCarga, concluida: false }
    if (Array.isArray(s)) return { repeticoes: s[0] ?? 0, carga: s[1] ?? fallbackCarga, concluida: !!s[2] }
    if (s && typeof s === 'object') return {
      carga: Number(s.carga ?? s.weight ?? fallbackCarga),
      repeticoes: Number(s.repeticoes ?? s.reps ?? 0),
      concluida: !!(s.concluida ?? s.done ?? false),
    }
    return null
  }).filter(Boolean)

const parseSeries = (str, fallbackCarga = 0) => {
  try {
    if (Array.isArray(str)) return normalizeSeries(str, fallbackCarga)
    const parsed = JSON.parse(str || '[]')
    return Array.isArray(parsed) ? normalizeSeries(parsed, fallbackCarga) : []
  } catch { return [] }
}

const STATUS_VARIANT = {
  'Finalizado':    'success',
  'Em andamento':  'warning',
  'Cancelado':     'danger',
}

const INTENSIDADE_VARIANT = {
  'Muito leve': 'default',
  'Leve':       'info',
  'Moderado':   'warning',
  'Intenso':    'orange',
  'Muito intenso': 'danger',
  'Exaustivo':  'purple',
}

// ─── SeriesChips ──────────────────────────────────────────────────────────────

function SeriesChips({ series: str }) {
  const series = parseSeries(str)
  const validas = series.filter(s => s.carga || s.repeticoes)
  if (!validas.length) return <span className="text-[10px] text-gray-600 italic">não preenchida</span>
  return (
    <div className="flex flex-wrap gap-1 mt-1 ml-4">
      {validas.map((s, i) => (
        <div key={i} className="flex items-center gap-1 bg-[#1a1a1a] border border-[#323238] rounded px-1.5 py-0.5 text-[10px]">
          {s.carga > 0 ? (
            <>
              <span className="text-white font-bold font-mono">{s.carga}kg</span>
              <span className="text-gray-600 text-[8px]">×</span>
              <span className="text-gray-400 font-medium">{s.repeticoes}</span>
            </>
          ) : (
            <span className="text-gray-400 font-medium">{s.repeticoes} reps</span>
          )}
          {s.concluida && <span className="text-green-500 text-[8px]">✓</span>}
        </div>
      ))}
    </div>
  )
}

// ─── SectionTable ─────────────────────────────────────────────────────────────

function SectionTable({ title, items, tipo, icon }) {
  if (!items?.length) return null
  return (
    <div className="bg-[#29292e] rounded-lg overflow-hidden border border-[#323238]">
      <div className="bg-[#1a1a1a] px-4 py-2.5 border-b border-[#323238] flex items-center gap-2">
        {icon}
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h2>
        <span className="ml-auto text-[10px] text-white font-bold font-mono bg-[#2563eb]/20 border border-[#2563eb]/30 px-2 py-0.5 rounded">
          {items.length}
        </span>
      </div>
      <div className="divide-y divide-[#323238]/40">
        {items.map((item, idx) => {
          const nome = item.exercicio || item.exercicios || '—'
          return (
            <div key={idx} className="px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.realizado ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${item.realizado ? 'text-white' : 'text-gray-500 line-through'}`}>
                  {nome}
                </span>
              </div>
              {tipo === 'strength' && item.series && <SeriesChips series={item.series} />}
              {item.feedback_do_aluno && (
                <p className="mt-1 ml-4 text-[10px] text-yellow-400/80 italic flex items-center gap-1.5">
                  <MessageSquare size={9} />"{item.feedback_do_aluno}"
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── ChartTooltip ────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const series = payload[0]?.payload?.series || []
  const validas = series.filter(s => s.carga || s.repeticoes)
  return (
    <div className="bg-[#1a1a1a] border border-[#323238] rounded-lg px-3 py-2 text-xs shadow-xl space-y-1.5">
      <p className="text-gray-400">{label}</p>
      <p style={{ color: payload[0].color }} className="font-bold text-sm">{payload[0].value} kg</p>
      {validas.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5 border-t border-[#323238]">
          {validas.map((s, i) => (
            <span key={i} className="text-gray-400 text-[10px] bg-[#29292e] border border-[#323238] rounded px-1.5 py-0.5">
              {s.carga > 0 ? `${s.carga}kg×${s.repeticoes}` : `${s.repeticoes}reps`}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DetalheView ─────────────────────────────────────────────────────────────

function DetalheView({ treinoBase, listaFiltrada, onVoltar }) {
  const [detalhe, setDetalhe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const scrollRef = useRef(null)
  const scrollPosRef = useRef(0)

  const idxAtual = listaFiltrada.findIndex(t => t.name === treinoBase.name)
  const [treinoAtual, setTreinoAtual] = useState(treinoBase)

  const carregar = async (treino, manterScroll = false) => {
    if (!manterScroll) { setLoading(true); setDetalhe(null) }
    try {
      const doc = await buscarTreinoRealizado(treino.name)
      setDetalhe(doc)
      setFeedback(doc.feedback_do_profissional || '')
    } catch (e) { console.error(e) }
    finally {
      setLoading(false)
      if (manterScroll) {
        setTimeout(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollPosRef.current
        }, 100)
      }
    }
  }

  useEffect(() => { carregar(treinoAtual) }, [])

  const navegar = (dir) => {
    const idx = listaFiltrada.findIndex(t => t.name === treinoAtual.name)
    const novo = listaFiltrada[idx + dir]
    if (!novo) return
    if (scrollRef.current) scrollPosRef.current = 0
    setTreinoAtual(novo)
    carregar(novo)
  }

  const salvarFeedback = async () => {
    if (!detalhe) return
    setSalvando(true)
    try {
      await salvarFeedbackProfissional(detalhe.name, feedback)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    } catch (e) { console.error(e); alert('Erro ao salvar feedback.') }
    finally { setSalvando(false) }
  }

  const idxCurrent = listaFiltrada.findIndex(t => t.name === treinoAtual.name)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 bg-[#1a1a1a]/95 backdrop-blur border-b border-[#323238] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onVoltar}
          className="flex items-center gap-2 text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wide transition-colors"
        >
          <ArrowLeft size={14} /> Voltar
        </button>
        <span className="text-gray-600 text-xs">
          {idxCurrent + 1} / {listaFiltrada.length}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Nav arrows */}
        {!loading && detalhe && (
          <>
            <button
              onClick={() => navegar(-1)}
              disabled={idxCurrent <= 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-[#29292e]/90 backdrop-blur border border-[#323238] rounded-full hover:border-[#2563eb]/50 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => navegar(1)}
              disabled={idxCurrent >= listaFiltrada.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2 bg-[#29292e]/90 backdrop-blur border border-[#323238] rounded-full hover:border-[#2563eb]/50 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div ref={scrollRef} className="w-full h-full overflow-y-auto px-4 py-4 md:px-8">
          {loading || !detalhe ? (
            <div className="flex justify-center py-24"><Spinner /></div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4 pb-12">
              {/* Aluno + meta */}
              <div className="bg-[#29292e] px-4 py-3 rounded-lg border border-[#323238] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-base">{detalhe.nome_completo}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <Calendar size={11} />{fmtDate(detalhe.data_e_hora_do_inicio)} {fmtTime(detalhe.data_e_hora_do_inicio)}
                    </span>
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <Clock size={11} />{detalhe.tempo_total_de_treino}
                    </span>
                    <span className="text-[#2563eb] text-xs font-bold flex items-center gap-1">
                      <Dumbbell size={11} />{detalhe.treino_label || detalhe.treino}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[detalhe.status] || 'default'} size="sm">
                    {detalhe.status}
                  </Badge>
                  {detalhe.intensidade_do_treino && (
                    <Badge variant={INTENSIDADE_VARIANT[detalhe.intensidade_do_treino] || 'default'} size="sm">
                      {detalhe.intensidade_do_treino}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Feedbacks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-[#29292e] p-3 rounded-lg border border-[#323238]">
                  <h3 className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-2 flex items-center gap-1.5">
                    <MessageSquare size={11} /> Feedback do Aluno
                  </h3>
                  <p className="text-xs italic text-yellow-400/80 min-h-[2.5rem]">
                    {detalhe.feedback_do_aluno
                      ? `"${detalhe.feedback_do_aluno}"`
                      : <span className="text-gray-600 not-italic">Nenhum feedback.</span>}
                  </p>
                </div>

                <div className="bg-[#29292e] p-3 rounded-lg border border-[#323238] focus-within:border-[#2563eb]/40 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[#2563eb] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                      <MessageSquare size={11} /> Seu Feedback
                    </h3>
                    <div className="flex items-center gap-2">
                      {salvo && <span className="text-[10px] text-green-400 font-bold">Salvo ✓</span>}
                      <Button variant="primary" size="xs" icon={Save} loading={salvando} onClick={salvarFeedback}>
                        Salvar
                      </Button>
                    </div>
                  </div>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Digite seu feedback..."
                    rows={3}
                    className="w-full bg-[#1a1a1a] text-white text-xs p-2 rounded-lg border border-[#323238] focus:border-[#2563eb]/60 outline-none resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Tabelas */}
              <SectionTable
                title="Musculação"
                items={detalhe.planilha_de_treino || []}
                tipo="strength"
                icon={<Dumbbell size={14} className="text-white" />}
              />
              <SectionTable
                title="Aeróbicos"
                items={detalhe.aerobicos || []}
                tipo="simple"
                icon={<Activity size={14} className="text-white" />}
              />
              <SectionTable
                title="Alongamentos"
                items={detalhe.planilha_de_alongamentos_e_mobilidade || []}
                tipo="simple"
                icon={<TrendingUp size={14} className="text-white" />}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ProgressaoView ──────────────────────────────────────────────────────────

const getWeekLabel = (dateStr) => {
  const d = new Date(String(dateStr).replace(' ', 'T'))
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
  return `S${String(week).padStart(2, '0')}/${d.getFullYear()}`
}

function ProgressaoView() {
  const [alunoQuery, setAlunoQuery] = useState('')
  const [alunoSelecionado, setAlunoSelecionado] = useState(null)
  const [treinos, setTreinos] = useState([])
  const [loadingTreinos, setLoadingTreinos] = useState(false)
  const [buscaEx, setBuscaEx] = useState('')
  const [filtroTreino, setFiltroTreino] = useState('Todos')
  const [exercicioSelecionado, setExercicioSelecionado] = useState('')
  const [modoChart, setModoChart] = useState('sessoes')
  const [fichas, setFichas] = useState([])
  const [fichaSelecionada, setFichaSelecionada] = useState(null)
  const [fichaDoc, setFichaDoc] = useState(null)
  const [loadingFicha, setLoadingFicha] = useState(false)

  // Agrega stats por exercício
  const exercicioStats = useMemo(() => {
    const map = {}
    treinos.forEach(t => {
      ;(t.planilha_de_treino || []).forEach(e => {
        if (!e.exercicio) return
        const series = parseSeries(e.series, e.carga || 0)
        const maxCarga = Math.max(...series.map(s => s.carga || 0), e.carga || 0)
        if (!maxCarga && !series.some(s => s.repeticoes)) return
        if (!map[e.exercicio]) map[e.exercicio] = { nome: e.exercicio, fichas: new Set(), sessoes: [] }
        map[e.exercicio].fichas.add(t.treino_label || t.treino || '')
        map[e.exercicio].sessoes.push({
          data: t.data_e_hora_do_inicio,
          dataFmt: fmtDate(t.data_e_hora_do_inicio),
          semana: getWeekLabel(t.data_e_hora_do_inicio),
          carga: maxCarga,
          treino: t.treino_label || t.treino,
          series,
        })
      })
    })
    return Object.values(map).map(ex => {
      const sessoes = ex.sessoes.sort((a, b) => String(a.data).localeCompare(String(b.data)))
      const primeira = sessoes[0]?.carga || 0
      const ultima = sessoes[sessoes.length - 1]?.carga || 0
      const ultimasSeries = sessoes[sessoes.length - 1]?.series || []
      const rawData = sessoes[sessoes.length - 1]?.dataFmt || ''
      const ultimaData = rawData === '—' ? '' : rawData
      const seriesValidas = ultimasSeries.filter(s => s.repeticoes || s.carga)
      const qtdSeries = seriesValidas.length
      const ultimasReps = seriesValidas[seriesValidas.length - 1]?.repeticoes || 0
      return {
        nome: ex.nome,
        fichas: [...ex.fichas].sort(),
        sessoes,
        ultimaCarga: ultima,
        ultimaData,
        qtdSeries,
        ultimasReps,
        evolucao: ultima - primeira,
        qtdSessoes: sessoes.length,
      }
    }).sort((a, b) => b.qtdSessoes - a.qtdSessoes)
  }, [treinos])

  // Fichas disponíveis para o filtro
  const fichasDisponiveis = useMemo(() => {
    const set = new Set()
    exercicioStats.forEach(ex => ex.fichas.forEach(f => set.add(f)))
    return ['Todos', ...[...set].sort()]
  }, [exercicioStats])

  // Exercícios filtrados por busca + ficha
  const exerciciosFiltrados = useMemo(() => {
    return exercicioStats.filter(ex => {
      const buscaOk = !buscaEx || normalize(ex.nome).includes(normalize(buscaEx))
      const fichaOk = filtroTreino === 'Todos' || ex.fichas.includes(filtroTreino)
      return buscaOk && fichaOk
    })
  }, [exercicioStats, buscaEx, filtroTreino])

  // Dados do gráfico para o exercício selecionado
  const { chartData, tabelaData } = useMemo(() => {
    const ex = exercicioStats.find(e => e.nome === exercicioSelecionado)
    if (!ex) return { chartData: [], tabelaData: [] }

    if (modoChart === 'sessoes') {
      const rows = ex.sessoes.map(s => ({ label: s.dataFmt, carga: s.carga, treino: s.treino, series: s.series }))
      return { chartData: rows, tabelaData: rows }
    }

    // Modo semanas: max carga por semana
    const semMap = {}
    ex.sessoes.forEach(s => {
      if (!semMap[s.semana]) semMap[s.semana] = { label: s.semana, carga: 0, treino: s.treino, series: s.series, sessoes: [] }
      if (s.carga > semMap[s.semana].carga) {
        semMap[s.semana].carga = s.carga
        semMap[s.semana].series = s.series
        semMap[s.semana].treino = s.treino
      }
      semMap[s.semana].sessoes.push(s)
    })
    const semanas = Object.values(semMap)
    return { chartData: semanas, tabelaData: semanas }
  }, [exercicioStats, exercicioSelecionado, modoChart])

  const selecionarAluno = async (aluno) => {
    setAlunoSelecionado(aluno)
    setExercicioSelecionado('')
    setBuscaEx('')
    setFiltroTreino('Todos')
    setFichaSelecionada(null)
    setFichaDoc(null)
    setFichas([])
    setTreinos([])
    setLoadingTreinos(true)
    try {
      const [ids, fichasRes] = await Promise.all([
        listarIdsDoAluno(aluno.name),
        listarFichas({ aluno: aluno.name, limit: 20 }),
      ])
      setFichas(fichasRes.list || [])
      if (!ids.length) { setLoadingTreinos(false); return }
      const LOTE = 12
      const primeiro = await Promise.all(ids.slice(0, LOTE).map(buscarTreinoRealizado))
      setTreinos(primeiro)
      setLoadingTreinos(false)
      for (let i = LOTE; i < ids.length; i += LOTE) {
        const lote = await Promise.all(ids.slice(i, i + LOTE).map(buscarTreinoRealizado))
        setTreinos(prev => [...prev, ...lote])
      }
    } catch (e) {
      console.error(e)
      setLoadingTreinos(false)
    }
  }

  const toggleExercicio = (nome) =>
    setExercicioSelecionado(prev => prev === nome ? '' : nome)

  const selecionarFicha = async (ficha) => {
    if (fichaSelecionada?.name === ficha.name) { limparFicha(); return }
    setFichaSelecionada(ficha)
    setExercicioSelecionado('')
    setLoadingFicha(true)
    try {
      const doc = await buscarFicha(ficha.name)
      setFichaDoc(doc)
    } catch (e) { console.error(e) }
    finally { setLoadingFicha(false) }
  }

  const limparFicha = () => {
    setFichaSelecionada(null)
    setFichaDoc(null)
    setExercicioSelecionado('')
  }

  // Exercícios agrupados por treino a partir da ficha selecionada
  const fichaGrupos = useMemo(() => {
    if (!fichaDoc) return null
    const TREINOS = ['a','b','c','d','e','f']
    return TREINOS
      .map(t => {
        const label = fichaDoc[`treino_${t}_label`] || `Treino ${t.toUpperCase()}`
        const exercicios = (fichaDoc[`planilha_de_treino_${t}`] || []).map(e => {
          const stats = exercicioStats.find(s => s.nome === e.exercicio)
          return { ...e, stats }
        })
        return { treino: `Treino ${t.toUpperCase()}`, label, exercicios }
      })
      .filter(g => g.exercicios.length > 0)
  }, [fichaDoc, exercicioStats])

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto pb-12">
      {/* Aluno */}
      <div className="bg-[#29292e] rounded-lg border border-[#323238] p-4 space-y-3">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Selecionar Aluno</p>
        <Autocomplete
          value={alunoQuery}
          onChange={setAlunoQuery}
          onSelect={selecionarAluno}
          searchFn={async (q) => { const r = await listarAlunos({ search: q, limit: 10 }); return r.list || r }}
          renderItem={(a) => (
            <div>
              <p className="text-white text-sm font-medium">{a.nome_completo}</p>
              <p className="text-gray-500 text-xs">{a.email}</p>
            </div>
          )}
          placeholder="Buscar aluno..."
          icon={Search}
        />
      </div>

      {alunoSelecionado && (
        <>
          {loadingTreinos ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : treinos.length === 0 ? (
            <EmptyState icon={Dumbbell} title="Sem treinos finalizados" description="Este aluno ainda não tem treinos finalizados registrados" />
          ) : (
            <>
              {/* Filtros */}
              <div className="space-y-2">
                {/* Pills de ficha */}
                {fichas.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-600 text-[10px] uppercase tracking-widest shrink-0">Ficha:</span>
                    {fichas.map(f => (
                      <button
                        key={f.name}
                        onClick={() => selecionarFicha(f)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                          fichaSelecionada?.name === f.name
                            ? 'bg-[#2563eb] border-[#2563eb] text-white'
                            : 'border-[#323238] text-gray-400 hover:border-[#2563eb]/50 hover:text-white'
                        }`}
                      >
                        {fichaLabel(f)}
                      </button>
                    ))}
                  </div>
                )}
                {/* Busca + pills de treino (só no modo sem ficha) */}
                {!fichaSelecionada && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Buscar exercício..."
                        value={buscaEx}
                        onChange={e => { setBuscaEx(e.target.value); setExercicioSelecionado('') }}
                        className="w-full h-8 pl-8 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {fichasDisponiveis.map(f => (
                        <button
                          key={f}
                          onClick={() => { setFiltroTreino(f); setExercicioSelecionado('') }}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                            filtroTreino === f
                              ? 'bg-[#2563eb] border-[#2563eb] text-white'
                              : 'border-[#323238] text-gray-400 hover:border-[#2563eb]/50 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <span className="text-gray-600 text-[10px] shrink-0">
                      {exerciciosFiltrados.length} exercício{exerciciosFiltrados.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Split layout: lista à esquerda, gráfico à direita */}
              <div className="flex flex-col lg:flex-row gap-4 items-start">

                {/* Coluna esquerda — lista de exercícios */}
                <div className="w-full lg:w-[40%] bg-[#29292e] rounded-lg border border-[#323238] overflow-hidden">
                  {loadingFicha ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                  ) : fichaGrupos ? (
                    /* Modo ficha: agrupado por Treino A, B, C... */
                    <div className="max-h-[70vh] overflow-y-auto">
                      {fichaGrupos.map(grupo => (
                        <div key={grupo.treino}>
                          <div className="px-3 py-1.5 bg-[#1a1a1a] border-b border-[#323238] flex items-center gap-2 sticky top-0 z-10">
                            <span className="text-[10px] font-bold text-[#2563eb] uppercase tracking-widest">{grupo.label || grupo.treino}</span>
                            <span className="text-gray-600 text-[10px]">({grupo.exercicios.length})</span>
                          </div>
                          {grupo.exercicios.map((e, idx) => {
                            const nome = e.exercicio
                            const stats = e.stats
                            const selecionado = exercicioSelecionado === nome
                            const temDados = !!stats
                            return (
                              <button
                                key={idx}
                                onClick={() => temDados && toggleExercicio(nome)}
                                className={`w-full text-left px-3 py-2.5 border-b border-[#323238]/40 transition-colors ${
                                  !temDados ? 'opacity-40 cursor-default' :
                                  selecionado ? 'bg-[#2563eb]/15 border-l-2 border-[#2563eb]' : 'hover:bg-white/5 border-l-2 border-transparent'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`text-xs font-semibold truncate flex-1 ${selecionado ? 'text-[#2563eb]' : 'text-white'}`}>
                                    {e.titulo_do_exercicio_combinado || nome}
                                  </p>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Prescrito */}
                                    <span className="text-gray-600 text-[10px] font-mono">
                                      {e.series}×{e.repeticoes}
                                    </span>
                                    {/* Realizado */}
                                    {stats && stats.ultimaCarga > 0 && (
                                      <span className={`text-xs font-bold ${selecionado ? 'text-[#2563eb]' : 'text-gray-200'}`}>
                                        {stats.ultimaCarga} kg
                                      </span>
                                    )}
                                    {stats && stats.qtdSessoes > 1 && stats.evolucao !== 0 && (
                                      <span className={`text-[10px] font-bold ${stats.evolucao > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {stats.evolucao > 0 ? '+' : ''}{stats.evolucao}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {stats ? (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {stats.ultimaData && <span className="text-gray-500 text-[10px]">{stats.ultimaData}</span>}
                                    <span className="text-gray-600 text-[10px]">{stats.qtdSessoes} sessão{stats.qtdSessoes !== 1 ? 'ões' : ''}</span>
                                    {stats.qtdSeries > 0 && stats.ultimasReps > 0 && (
                                      <span className="text-gray-500 text-[10px] font-mono">{stats.qtdSeries}×{stats.ultimasReps} real</span>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-gray-600 text-[10px] mt-0.5">Sem registros</p>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Modo padrão: todos os exercícios */
                    exerciciosFiltrados.length === 0 ? (
                      <p className="text-gray-600 text-xs italic p-4">Nenhum exercício encontrado.</p>
                    ) : (
                      <div className="divide-y divide-[#323238]/50 max-h-[70vh] overflow-y-auto">
                        {exerciciosFiltrados.map(ex => {
                          const selecionado = exercicioSelecionado === ex.nome
                          return (
                            <button
                              key={ex.nome}
                              onClick={() => toggleExercicio(ex.nome)}
                              className={`w-full text-left px-3 py-2.5 transition-colors ${
                                selecionado ? 'bg-[#2563eb]/15 border-l-2 border-[#2563eb]' : 'hover:bg-white/5 border-l-2 border-transparent'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-xs font-semibold truncate flex-1 ${selecionado ? 'text-[#2563eb]' : 'text-white'}`}>
                                  {ex.nome}
                                </p>
                                <div className="flex items-center gap-2 shrink-0">
                                  {ex.qtdSeries > 0 && ex.ultimasReps > 0 && (
                                    <span className="text-gray-400 text-[10px] font-mono">{ex.qtdSeries}×{ex.ultimasReps}</span>
                                  )}
                                  {ex.ultimaCarga > 0 && (
                                    <span className={`text-xs font-bold ${selecionado ? 'text-[#2563eb]' : 'text-gray-200'}`}>
                                      {ex.ultimaCarga} kg
                                    </span>
                                  )}
                                  {ex.qtdSessoes > 1 && ex.evolucao !== 0 && (
                                    <span className={`text-[10px] font-bold ${ex.evolucao > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {ex.evolucao > 0 ? '+' : ''}{ex.evolucao}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                {ex.ultimaData && <span className="text-gray-500 text-[10px]">{ex.ultimaData}</span>}
                                <span className="text-gray-600 text-[10px]">{ex.qtdSessoes} sessão{ex.qtdSessoes !== 1 ? 'ões' : ''}</span>
                                {ex.fichas.map(f => (
                                  <span key={f} className="text-[9px] text-blue-400/60 font-mono">{f}</span>
                                ))}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  )}
                </div>

                {/* Coluna direita — gráfico */}
                <div className="w-full lg:w-[60%] lg:sticky lg:top-4">
                  {!exercicioSelecionado ? (
                    <div className="bg-[#29292e] rounded-lg border border-[#323238] flex items-center justify-center py-24">
                      <div className="text-center">
                        <TrendingUp size={36} className="text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm font-medium">Selecione um exercício</p>
                        <p className="text-gray-700 text-xs mt-1">O gráfico aparecerá aqui</p>
                      </div>
                    </div>
                  ) : chartData.length > 0 ? (
                    <div className="bg-[#29292e] rounded-lg border border-[#2563eb]/40 p-4 space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-white text-sm font-bold">{exercicioSelecionado}</p>
                          <p className="text-gray-500 text-xs">Progressão de carga por sessão</p>
                        </div>
                        <div className="flex items-center bg-[#1a1a1a] border border-[#323238] rounded-lg p-0.5 gap-0.5">
                          {['sessoes', 'semanas'].map(m => (
                            <button
                              key={m}
                              onClick={() => setModoChart(m)}
                              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                modoChart === m ? 'bg-[#2563eb] text-white' : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              {m === 'sessoes' ? 'Sessões' : 'Semanas'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Chart */}
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#323238" />
                          <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} unit="kg" />
                          <Tooltip content={<ChartTip />} />
                          <Line type="monotone" dataKey="carga" stroke="#2563eb" strokeWidth={2}
                            dot={{ fill: '#2563eb', r: 4 }} activeDot={{ r: 6 }} name="Carga" />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Tabela */}
                      <div className="border border-[#323238] rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#1a1a1a] border-b border-[#323238] sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px]">
                                {modoChart === 'sessoes' ? 'Data' : 'Semana'}
                              </th>
                              <th className="px-3 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px]">Treino</th>
                              <th className="px-3 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px]">Séries</th>
                              <th className="px-3 py-2 text-gray-500 font-bold uppercase tracking-wide text-[10px] text-right">Carga máx.</th>
                            </tr>
                          </thead>
                        </table>
                        <div className="max-h-[240px] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                          <tbody className="divide-y divide-[#323238]/50">
                            {tabelaData.map((d, i) => (
                              <tr key={i} className="hover:bg-white/5 transition-colors">
                                <td className="px-3 py-2 text-gray-300 font-mono text-[11px]">{d.label}</td>
                                <td className="px-3 py-2 text-gray-400 text-[11px]">{d.treino}</td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {(d.series || []).filter(s => s.carga || s.repeticoes).map((s, j) => (
                                      <span key={j} className="text-[10px] bg-[#1a1a1a] border border-[#323238] rounded px-1.5 py-0.5 text-gray-400">
                                        {s.carga > 0 ? `${s.carga}kg×${s.repeticoes}` : `${s.repeticoes}reps`}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-[#2563eb] text-[11px]">{d.carga} kg</td>
                              </tr>
                            ))}
                          </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: '', label: 'Todos os status' },
  { value: 'Finalizado', label: 'Finalizado' },
  { value: 'Em andamento', label: 'Em andamento' },
  { value: 'Cancelado', label: 'Cancelado' },
]

export default function TreinosRealizados() {
  const [view, setView] = useState('lista') // 'lista' | 'detalhe' | 'progressao'
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [filtroTreino, setFiltroTreino] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [treinoAberto, setTreinoAberto] = useState(null)
  const debounceRef = useRef(null)

  const carregar = async (reset = true, query = queryBusca, status = statusFiltro) => {
    setLoading(true)
    try {
      const p = reset ? 1 : page + 1
      const { list, hasMore: more } = await listarTreinosRealizados({
        busca: query, status, page: p, limit: 50,
      })
      setLista(prev => reset ? list : [...prev, ...list])
      setHasMore(more)
      if (reset) setPage(1); else setPage(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQueryBusca(busca)
      carregar(true, busca, statusFiltro)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca])

  const listaFiltrada = useMemo(() => {
    return lista.filter(t => {
      const fichaOk = !filtroTreino || normalize(t.treino_label || t.treino).includes(normalize(filtroTreino))
      const data = t.data_e_hora_do_inicio ? String(t.data_e_hora_do_inicio).substring(0, 10) : ''
      const dataInicioOk = !filtroDataInicio || data >= filtroDataInicio
      const dataFimOk = !filtroDataFim || data <= filtroDataFim
      return fichaOk && dataInicioOk && dataFimOk
    })
  }, [lista, filtroTreino, filtroDataInicio, filtroDataFim])

  if (view === 'detalhe' && treinoAberto) {
    return (
      <div className="h-full flex flex-col">
        <DetalheView
          treinoBase={treinoAberto}
          listaFiltrada={listaFiltrada}
          onVoltar={() => { setView('lista'); setTreinoAberto(null) }}
        />
      </div>
    )
  }

  if (view === 'progressao') {
    return (
      <ListPage
        title="Progressão de Cargas"
        subtitle="Evolução de carga por exercício e aluno"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setView('lista')}>
              ← Treinos Realizados
            </Button>
          </>
        }
      >
        <ProgressaoView />
      </ListPage>
    )
  }

  return (
    <ListPage
      title="Treinos Realizados"
      subtitle="Histórico de execução dos alunos"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} loading={loading} />
          <Button variant="secondary" size="sm" icon={TrendingUp} onClick={() => setView('progressao')}>
            Progressão de Cargas
          </Button>
        </>
      }
      loading={loading && lista.length === 0}
      empty={listaFiltrada.length === 0 && !loading ? {
        title: 'Nenhum treino encontrado',
        description: 'Ajuste os filtros ou aguarde novos registros',
      } : null}
    >
      {/* Filtros extras */}
      <div className="px-4 pb-3 flex flex-wrap gap-2">
        {/* Busca nome */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar aluno..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 transition-colors"
          />
        </div>
        {/* Filtro treino */}
        <div className="relative">
          <Dumbbell size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Filtrar treino..."
            value={filtroTreino}
            onChange={e => setFiltroTreino(e.target.value)}
            className="w-36 h-8 pl-8 pr-3 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 transition-colors"
          />
        </div>
        {/* Status */}
        <select
          value={statusFiltro}
          onChange={e => { setStatusFiltro(e.target.value); carregar(true, queryBusca, e.target.value) }}
          className="h-8 px-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 transition-colors"
        >
          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {/* Datas */}
        <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)}
          className="h-8 px-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 transition-colors" />
        <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)}
          className="h-8 px-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-xs outline-none focus:border-[#2563eb]/60 transition-colors" />
      </div>

      {/* Tabela */}
      {listaFiltrada.length > 0 && (
        <div className="mx-4 mb-4 bg-[#29292e] rounded-lg border border-[#323238] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#1a1a1a] border-b border-[#323238]">
              <tr>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Aluno</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Treino</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Data</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Duração</th>
                <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#323238]/40">
              {listaFiltrada.map(t => (
                <tr
                  key={t.name}
                  onClick={() => { setTreinoAberto(t); setView('detalhe') }}
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <p className="text-white text-sm font-medium group-hover:text-[#2563eb] transition-colors">{t.nome_completo}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-mono text-blue-300 bg-[#1a1a1a] border border-[#323238] px-2 py-0.5 rounded">
                      {t.treino_label || t.treino}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-gray-300 text-xs">{fmtDate(t.data_e_hora_do_inicio)}</p>
                    <p className="text-gray-600 text-[10px]">{fmtTime(t.data_e_hora_do_inicio)}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-gray-400 text-xs flex items-center gap-1">
                      <Clock size={11} />{t.tempo_total_de_treino || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={STATUS_VARIANT[t.status] || 'default'} size="sm">
                      {t.status || '—'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div className="p-3 text-center border-t border-[#323238]">
              <Button variant="secondary" size="sm" loading={loading} onClick={() => carregar(false)}>
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}
    </ListPage>
  )
}
