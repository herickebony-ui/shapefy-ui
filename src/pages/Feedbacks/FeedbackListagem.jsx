import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Search, Columns, CheckCircle, Star, X, ArrowLeft } from 'lucide-react'
import {
  listarFeedbacks, listarFormularios, buscarFeedback,
  salvarStatusFeedback, rotarImagemFeedback, trocarFotosFeedback,
} from '../../api/feedbacks'
import { Button, Badge, Spinner, EmptyState, DataTable } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import ImagemInterativa from './ImagemInterativa'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''
const PAGE_SIZE = 30

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split('-')
  return `${day}/${m}/${y}`
}

const fmtHora = (dt) => {
  if (!dt) return ''
  try {
    return new Date(dt.replace(' ', 'T')).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const normalizar = (t) =>
  (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// ─── View: Comparação ────────────────────────────────────────────────────────

function ViewComparacao({ dados, imgSrcs, onVoltar, onRotate, modoTrocarFoto, setModoTrocarFoto, fotosSelecionadas, setFotosSelecionadas, salvandoTroca, onConfirmarTroca }) {
  const base = dados[0]?.perguntas_e_respostas || []

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-white animate-in fade-in duration-300">
      <div className="shrink-0 bg-[#0a0a0a]/95 backdrop-blur-md z-20 border-b border-[#323238] px-6 py-3 flex items-center justify-between">
        <button
          onClick={onVoltar}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">
            Comparando {dados.length} feedbacks
          </span>
          {!modoTrocarFoto ? (
            <button
              onClick={() => { setModoTrocarFoto(true); setFotosSelecionadas([]) }}
              className="px-3 py-1.5 bg-[#29292e] border border-[#323238] hover:border-orange-500/50 text-orange-300 rounded-lg text-xs font-bold transition-all"
            >
              Trocar Fotos
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-300 font-bold">{fotosSelecionadas.length}/2 selecionadas</span>
              <button
                onClick={onConfirmarTroca}
                disabled={fotosSelecionadas.length !== 2 || salvandoTroca}
                className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
              >
                {salvandoTroca ? 'Salvando...' : 'Confirmar Troca'}
              </button>
              <button
                onClick={() => { setModoTrocarFoto(false); setFotosSelecionadas([]) }}
                className="px-2 py-1.5 bg-[#29292e] border border-[#323238] hover:border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition-all"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#29292e] px-4 py-3 rounded-lg border border-[#323238] mb-4">
            <h1 className="text-sm font-bold text-white">{dados[0]?.nome_completo}</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">{dados[0]?.titulo}</p>
          </div>

          <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#323238]">
                  <th className="p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-[#0a0a0a] z-10 min-w-[200px] w-48">
                    Pergunta
                  </th>
                  {dados.map((fb, i) => (
                    <th key={i} className="p-3 text-[10px] font-bold text-white uppercase tracking-wider text-center min-w-[220px]">
                      {fmtData(fb.date || (fb.modified || '').split(' ')[0])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#323238]/40">
                {base.map((item, idx) => {
                  if (item.tipo === 'Quebra de Seção') {
                    return (
                      <tr key={idx} className="bg-[#0a0a0a]/50">
                        <td colSpan={dados.length + 1} className="p-3">
                          <h3 className="text-xs font-bold text-white uppercase tracking-wider bg-[#2563eb]/10 border-l-4 border-[#2563eb] px-4 py-2 rounded-r-lg">
                            {item.pergunta}
                          </h3>
                        </td>
                      </tr>
                    )
                  }

                  if (item.tipo === 'Bloco HTML') {
                    return null
                  }

                  return (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-3 text-xs text-white font-bold sticky left-0 bg-[#1a1a1a] z-10 border-r border-[#323238]/30">
                        {item.pergunta}
                      </td>
                      {dados.map((fb, fi) => {
                        const resp = fb.perguntas_e_respostas?.[idx]
                        if (!resp?.resposta) return <td key={fi} className="p-3 text-center text-gray-600 text-xs">—</td>

                        if (resp.tipo === 'Anexar Imagem') {
                          const rotKey = `${fb.name}_${resp.resposta}`
                          const selKey = `${fb.name}_${idx}`
                          const selecionada = fotosSelecionadas.findIndex(f => f.key === selKey)

                          return (
                            <td key={fi} className="p-0 text-center align-top">
                              <div className="relative">
                                <ImagemInterativa
                                  src={imgSrcs[rotKey] || `${FRAPPE_URL}${resp.resposta}`}
                                  feedbackId={fb.name}
                                  idx={idx}
                                  onRotate={() => onRotate(fb.name, resp.resposta)}
                                />
                                {modoTrocarFoto && (
                                  <div
                                    onClick={() => {
                                      setFotosSelecionadas(prev => {
                                        const jaExiste = prev.findIndex(f => f.key === selKey)
                                        if (jaExiste !== -1) return prev.filter(f => f.key !== selKey)
                                        if (prev.length >= 2) return prev
                                        return [...prev, { key: selKey, feedbackId: fb.name, idx }]
                                      })
                                    }}
                                    className={`absolute inset-0 cursor-pointer flex items-start justify-end p-2 transition-all z-10 rounded-lg ${
                                      selecionada !== -1
                                        ? 'bg-orange-500/20 border-2 border-orange-400'
                                        : 'bg-black/30 border-2 border-dashed border-orange-400/40 hover:bg-orange-500/10'
                                    }`}
                                  >
                                    {selecionada !== -1 && (
                                      <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                                        {selecionada + 1}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          )
                        }

                        if (resp.tipo === 'Avaliação') {
                          const val = parseInt(resp.resposta) || 0
                          const max = parseInt(resp.opcoes) || 5
                          return (
                            <td key={fi} className="p-3 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                {Array.from({ length: max }, (_, i) => (
                                  <Star key={i} size={14} className={i < val ? 'text-yellow-400 fill-yellow-400' : 'text-[#323238]'} />
                                ))}
                                <span className="text-gray-500 text-[10px] ml-1">{val}/{max}</span>
                              </div>
                            </td>
                          )
                        }

                        return (
                          <td key={fi} className="p-3 text-xs text-white text-center whitespace-pre-wrap">
                            {resp.resposta}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function FeedbackListagem() {
  const navigate = useNavigate()

  const [feedbacks, setFeedbacks] = useState([])
  const [formularios, setFormularios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroFormulario, setFiltroFormulario] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [page, setPage] = useState(1)

  const [view, setView] = useState('list')
  const [modoComparar, setModoComparar] = useState(false)
  const [selecionados, setSelecionados] = useState([])
  const [dadosComparacao, setDadosComparacao] = useState([])
  const [loadingComparacao, setLoadingComparacao] = useState(false)

  const [imgSrcs, setImgSrcs] = useState({})

  const [modoTrocarFoto, setModoTrocarFoto] = useState(false)
  const [fotosSelecionadas, setFotosSelecionadas] = useState([])
  const [salvandoTroca, setSalvandoTroca] = useState(false)

  const debounceRef = useRef(null)

  const carregar = useCallback(async (opts = {}) => {
    setLoading(true)
    try {
      const { list } = await listarFeedbacks({
        busca: opts.busca ?? busca,
        status: opts.status ?? filtroStatus,
        dataInicio: opts.dataInicio ?? filtroDataInicio,
        dataFim: opts.dataFim ?? filtroDataFim,
        page: 1,
        limit: 500,
      })
      setFeedbacks(list)
      setPage(1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [busca, filtroStatus, filtroDataInicio, filtroDataFim])

  useEffect(() => {
    listarFormularios().then(setFormularios).catch(console.error)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      carregar({ busca, status: filtroStatus, dataInicio: filtroDataInicio, dataFim: filtroDataFim })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca, filtroStatus, filtroDataInicio, filtroDataFim])

  const handleRotate = async (feedbackId, fileUrl) => {
    const key = `${feedbackId}_${fileUrl}`
    const names = dadosComparacao.map(d => d.name)
    try {
      await rotarImagemFeedback(names, fileUrl, 'right')
      setImgSrcs(prev => ({ ...prev, [key]: `${FRAPPE_URL}${fileUrl}?v=${Date.now()}` }))
    } catch (e) {
      console.error(e)
    }
  }

  const toggleSelecionado = (fb) => {
    setSelecionados(prev => {
      const existe = prev.find(f => f.name === fb.name)
      const novo = existe ? prev.filter(f => f.name !== fb.name) : [...prev, fb]
      if (novo.length > 0) setModoComparar(true)
      return novo.slice(0, 3)
    })
  }

  const iniciarComparacao = async (lista) => {
    if (lista.length < 2) return
    setLoadingComparacao(true)
    setView('compare')
    try {
      const resultados = await Promise.all(lista.map(fb => buscarFeedback(fb.name)))
      const dados = resultados.filter(Boolean)
      dados.sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      setDadosComparacao(dados)
    } catch (e) {
      console.error(e)
      setView('list')
    } finally {
      setLoadingComparacao(false)
    }
  }

  const compararUltimos3 = async (fb) => {
    const doAluno = feedbacks
      .filter(f => f.nome_completo === fb.nome_completo)
      .sort((a, b) => (b.modified || '').localeCompare(a.modified || ''))
      .slice(0, 3)
    if (doAluno.length < 2) {
      alert('Este aluno tem menos de 2 feedbacks para comparar.')
      return
    }
    setSelecionados(doAluno)
    await iniciarComparacao(doAluno)
  }

  const confirmarTroca = async () => {
    const [f1, f2] = fotosSelecionadas
    if (!f1 || !f2 || f1.feedbackId !== f2.feedbackId) return
    setSalvandoTroca(true)

    const fbDados = dadosComparacao.find(d => d.name === f1.feedbackId)
    if (!fbDados) { setSalvandoTroca(false); return }

    const perguntas = fbDados.perguntas_e_respostas
    const novas = perguntas.map((p, i) => {
      if (i === f1.idx) return { ...p, resposta: perguntas[f2.idx].resposta }
      if (i === f2.idx) return { ...p, resposta: perguntas[f1.idx].resposta }
      return p
    })

    setDadosComparacao(prev => prev.map(d =>
      d.name === f1.feedbackId ? { ...d, perguntas_e_respostas: novas } : d
    ))
    setFotosSelecionadas([])
    setModoTrocarFoto(false)

    try {
      await trocarFotosFeedback(f1.feedbackId, perguntas, f1.idx, f2.idx)
    } catch (e) {
      console.error(e)
      alert('Erro ao trocar fotos.')
    } finally {
      setSalvandoTroca(false)
    }
  }

  const handleStatusChange = async (fb, novoStatus) => {
    setFeedbacks(prev => prev.map(f => f.name === fb.name ? { ...f, status: novoStatus } : f))
    try {
      await salvarStatusFeedback(fb.name, novoStatus)
    } catch (e) {
      console.error(e)
      setFeedbacks(prev => prev.map(f => f.name === fb.name ? { ...f, status: fb.status } : f))
    }
  }

  if (view === 'compare') {
    if (loadingComparacao) {
      return (
        <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
          <Spinner size="lg" />
        </div>
      )
    }
    return (
      <ViewComparacao
        dados={dadosComparacao}
        imgSrcs={imgSrcs}
        onVoltar={() => { setView('list'); setModoComparar(false); setSelecionados([]) }}
        onRotate={handleRotate}
        modoTrocarFoto={modoTrocarFoto}
        setModoTrocarFoto={setModoTrocarFoto}
        fotosSelecionadas={fotosSelecionadas}
        setFotosSelecionadas={setFotosSelecionadas}
        salvandoTroca={salvandoTroca}
        onConfirmarTroca={confirmarTroca}
      />
    )
  }

  const statusOpts = [
    { value: '', label: 'Todos' },
    { value: 'Respondido', label: 'Respondido' },
    { value: 'Finalizado', label: 'Finalizado' },
  ]

  const formularioOpts = [
    { value: '', label: 'Todos os formulários' },
    ...formularios.map(f => ({ value: f.titulo, label: f.titulo })),
  ]

  const feedbacksFiltrados = (!busca && filtroFormulario)
    ? feedbacks.filter(f => f.titulo === filtroFormulario)
    : feedbacks

  const columns = [
    {
      label: 'Ações',
      headerClass: 'w-24 text-center',
      cellClass: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => compararUltimos3(row)}
            title="Comparar últimos 3"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors relative group"
          >
            <Columns size={12} />
            <span className="absolute -top-1.5 -right-1.5 bg-[#2563eb] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">3</span>
          </button>
          <button
            onClick={() => toggleSelecionado(row)}
            title="Selecionar para comparar"
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors ${
              selecionados.find(f => f.name === row.name)
                ? 'text-[#2563eb] border-[#2563eb]/40 bg-[#2563eb]/10'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
            }`}
          >
            <CheckCircle size={12} />
          </button>
        </div>
      ),
    },
    {
      label: 'Aluno',
      render: (row) => (
        <span className="text-white text-sm font-medium">{row.nome_completo}</span>
      ),
    },
    {
      label: 'Formulário',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => (
        <Badge variant="info" size="sm">{row.titulo || row.formulario}</Badge>
      ),
    },
    {
      label: 'Data',
      headerClass: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-gray-400 text-xs">{fmtData((row.modified || '').split(' ')[0])}</span>
          <span className="text-gray-600 text-[10px]">{fmtHora(row.modified)}</span>
        </div>
      ),
    },
    {
      label: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row) => (
        <div onClick={e => e.stopPropagation()}>
          <select
            value={row.status || 'Respondido'}
            onChange={e => handleStatusChange(row, e.target.value)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border outline-none cursor-pointer appearance-none text-center ${
              row.status === 'Finalizado'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
            }`}
          >
            <option value="Respondido">Respondido</option>
            <option value="Finalizado">Finalizado</option>
          </select>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Feedbacks Recebidos"
        subtitle={`${feedbacksFiltrados.length} feedback(s) encontrado(s)`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} loading={loading} />
            {!modoComparar ? (
              <Button variant="secondary" size="sm" icon={Columns} onClick={() => setModoComparar(true)}>
                Comparar
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-300 font-bold">{selecionados.length} selecionado(s)</span>
                <Button
                  variant="info"
                  size="sm"
                  icon={Columns}
                  onClick={() => iniciarComparacao(selecionados)}
                  disabled={selecionados.length < 2}
                >
                  Comparar ({selecionados.length})
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => { setModoComparar(false); setSelecionados([]) }}
                >
                  <X size={14} />
                </Button>
              </div>
            )}
          </>
        }
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar aluno...', icon: Search },
          { type: 'select', value: filtroStatus, onChange: v => { setFiltroStatus(v); setPage(1) }, options: statusOpts },
          { type: 'select', value: filtroFormulario, onChange: v => { setFiltroFormulario(v); setPage(1) }, options: formularioOpts },
        ]}
        loading={loading}
        empty={
          feedbacksFiltrados.length === 0 && !loading
            ? { title: 'Nenhum feedback encontrado', description: 'Aguarde novos envios ou ajuste os filtros.' }
            : null
        }
      >
        {/* Filtro de datas */}
        <div className="flex gap-3 mb-3 flex-wrap">
          <div className="relative">
            <label className="absolute -top-2 left-2 text-[9px] text-gray-500 font-bold uppercase tracking-wider bg-[#0a0a0a] px-1 z-10">De</label>
            <input
              type="date"
              value={filtroDataInicio}
              onChange={e => { setFiltroDataInicio(e.target.value); setPage(1) }}
              className="w-40 px-3 py-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 transition-colors"
            />
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-2 text-[9px] text-gray-500 font-bold uppercase tracking-wider bg-[#0a0a0a] px-1 z-10">Até</label>
            <input
              type="date"
              value={filtroDataFim}
              onChange={e => { setFiltroDataFim(e.target.value); setPage(1) }}
              className="w-40 px-3 py-2 bg-[#1a1a1a] border border-[#323238] text-white rounded-lg text-sm outline-none focus:border-[#2563eb]/60 transition-colors"
            />
          </div>
        </div>

        {!loading && feedbacksFiltrados.length > 0 && (
          <DataTable
            columns={columns}
            rows={feedbacksFiltrados}
            rowKey="name"
            page={page}
            pageSize={busca ? feedbacksFiltrados.length : PAGE_SIZE}
            onPage={busca ? undefined : setPage}
            onRowClick={(row) => navigate(`/feedbacks/${row.name}`, { state: { feedbacksFiltrados: feedbacksFiltrados } })}
          />
        )}
      </ListPage>
    </>
  )
}
