import { useState, useMemo } from 'react'
import { Search, TrendingUp, Dumbbell } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  buscarTreinoRealizado, listarIdsDoAluno,
} from '../../api/treinosRealizados'
import { listarAlunos } from '../../api/alunos'
import { listarFichas, buscarFicha } from '../../api/fichas'
import { Spinner, EmptyState, Autocomplete } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
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

const getWeekLabel = (dateStr) => {
  const d = new Date(String(dateStr).replace(' ', 'T'))
  const jan1 = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
  return `S${String(week).padStart(2, '0')}/${d.getFullYear()}`
}

// ─── ChartTip ────────────────────────────────────────────────────────────────

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

// ─── ProgressaoCargas (standalone page) ──────────────────────────────────────

export default function ProgressaoCargas() {
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

  const fichasDisponiveis = useMemo(() => {
    const set = new Set()
    exercicioStats.forEach(ex => ex.fichas.forEach(f => set.add(f)))
    return ['Todos', ...[...set].sort()]
  }, [exercicioStats])

  const exerciciosFiltrados = useMemo(() => {
    return exercicioStats.filter(ex => {
      const buscaOk = !buscaEx || normalize(ex.nome).includes(normalize(buscaEx))
      const fichaOk = filtroTreino === 'Todos' || ex.fichas.includes(filtroTreino)
      return buscaOk && fichaOk
    })
  }, [exercicioStats, buscaEx, filtroTreino])

  const { chartData, tabelaData } = useMemo(() => {
    const ex = exercicioStats.find(e => e.nome === exercicioSelecionado)
    if (!ex) return { chartData: [], tabelaData: [] }

    if (modoChart === 'sessoes') {
      const rows = ex.sessoes.map(s => ({ label: s.dataFmt, carga: s.carga, treino: s.treino, series: s.series }))
      return { chartData: rows, tabelaData: rows }
    }

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
    <ListPage
      title="Progressão de Cargas"
      subtitle="Evolução de carga por exercício e aluno"
    >
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

                {/* Split layout */}
                <div className="flex flex-col lg:flex-row gap-4 items-start">
                  <div className="w-full lg:w-[40%] bg-[#29292e] rounded-lg border border-[#323238] overflow-hidden">
                    {loadingFicha ? (
                      <div className="flex justify-center py-8"><Spinner /></div>
                    ) : fichaGrupos ? (
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
                                      <span className="text-gray-600 text-[10px] font-mono">
                                        {e.series}×{e.repeticoes}
                                      </span>
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
    </ListPage>
  )
}
