import { useState, useEffect, useRef, useMemo } from 'react'
import {
  ArrowLeft, RefreshCw, ChevronLeft, ChevronRight,
  Dumbbell, Activity, Clock, MessageSquare,
  Save, Search, Calendar, TrendingUp, Check, Eye, EyeOff,
} from 'lucide-react'
import { buscarSmart } from '../../utils/strings'
import {
  listarTreinosRealizados, buscarTreinoRealizado,
  salvarFeedbackProfissional, marcarEntregueTreino,
} from '../../api/treinosRealizados'
import { Button, Badge, Spinner } from '../../components/ui'
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

// ─── DetalheView ─────────────────────────────────────────────────────────────

function DetalheView({ treinoBase, listaFiltrada, onVoltar, onEntregueAtualizado }) {
  const [detalhe, setDetalhe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [marcandoEntrega, setMarcandoEntrega] = useState(false)
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

  const toggleEntregue = async () => {
    if (!detalhe) return
    setMarcandoEntrega(true)
    try {
      const novo = !detalhe.entregue
      await marcarEntregueTreino(detalhe.name, novo)
      setDetalhe(d => ({ ...d, entregue: novo ? 1 : 0 }))
      onEntregueAtualizado?.(detalhe.name, novo ? 1 : 0)
    } catch (e) {
      console.error(e)
      alert('Erro ao marcar conferido. Verifique se o campo "entregue" existe no DocType Treino Realizado.')
    } finally { setMarcandoEntrega(false) }
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
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={STATUS_VARIANT[detalhe.status] || 'default'} size="sm">
                    {detalhe.status}
                  </Badge>
                  {detalhe.intensidade_do_treino && (
                    <Badge variant={INTENSIDADE_VARIANT[detalhe.intensidade_do_treino] || 'default'} size="sm">
                      {detalhe.intensidade_do_treino}
                    </Badge>
                  )}
                  <button
                    onClick={toggleEntregue}
                    disabled={marcandoEntrega}
                    title={detalhe.entregue ? 'Desmarcar conferido' : 'Marcar como conferido'}
                    className={`h-7 px-3 flex items-center gap-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 ${
                      detalhe.entregue
                        ? 'text-green-300 bg-green-500/10 border border-green-500/30 hover:border-green-500/60'
                        : 'text-gray-400 hover:text-white border border-[#323238] hover:bg-green-700 hover:border-green-700'
                    }`}
                  >
                    <Check size={11} /> {detalhe.entregue ? 'Conferido' : 'Marcar conferido'}
                  </button>
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
      const lista = query ? list.filter(t => buscarSmart(t.nome_completo, query)) : list
      setLista(prev => reset ? lista : [...prev, ...lista])
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
      const fichaOk = !filtroTreino || buscarSmart([t.treino_label, t.treino], filtroTreino)
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
          onEntregueAtualizado={(id, entregue) => {
            setLista(prev => prev.map(t => t.name === id ? { ...t, entregue } : t))
          }}
        />
      </div>
    )
  }

  return (
    <ListPage
      title="Treinos Realizados"
      subtitle="Histórico de execução dos alunos"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} loading={loading} />
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
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const anterior = t.entregue
                          const novo = anterior ? 0 : 1
                          setLista(prev => prev.map(x => x.name === t.name ? { ...x, entregue: novo } : x))
                          marcarEntregueTreino(t.name, !!novo).catch(err => {
                            console.error(err)
                            setLista(prev => prev.map(x => x.name === t.name ? { ...x, entregue: anterior } : x))
                            alert('Erro ao marcar visto. Verifique o campo "entregue" no backend.')
                          })
                        }}
                        title={t.entregue ? 'Treino visto — clique para desmarcar' : 'Marcar treino como visto'}
                        className={`shrink-0 h-6 w-6 flex items-center justify-center rounded-full border transition-colors ${
                          t.entregue
                            ? 'bg-green-500/15 border-green-500/60 text-green-400 hover:bg-green-500/25'
                            : 'bg-transparent border-[#3a3a40] text-gray-600 hover:border-gray-400 hover:text-gray-300'
                        }`}
                      >
                        {t.entregue ? <Eye size={11} /> : <EyeOff size={11} />}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium transition-colors ${
                          t.entregue
                            ? 'text-gray-500 group-hover:text-gray-400'
                            : 'text-white group-hover:text-[#2563eb]'
                        }`}>
                          {t.nome_completo}
                        </p>
                        {t.entregue ? (
                          <p className="text-[9px] text-green-500/80 font-bold uppercase tracking-wider mt-0.5">
                            Visto
                          </p>
                        ) : null}
                      </div>
                    </div>
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
