import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { maybeOpenNewTab } from '../../utils/navigation'
import { RefreshCw, Search, Columns, CheckCircle, Star, X, ArrowLeft, Link2, Trash2, AlertTriangle, Copy, Check, StickyNote } from 'lucide-react'
import {
  listarFeedbacks, listarFormularios, buscarFeedback, listarFeedbacksDoAluno,
  salvarStatusFeedback, rotarImagemFeedback, trocarFotosFeedback, excluirFeedback,
  buscarAgendamentosPorFeedbacks,
} from '../../api/feedbacks'
import { salvarAgendamento } from '../../api/cronogramaFeedbacks'
import { buscarRegistro } from '../../api/evolucao'
import useErrorModal from '../../hooks/useErrorModal'
import { Button, Badge, Spinner, EmptyState, DataTable, Modal, FormGroup, Textarea } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import ImagemInterativa from './ImagemInterativa'
import VincularFeedbackModal from '../../components/feedback/VincularFeedbackModal'
import { buscarSmart } from '../../utils/strings'
import { formatComparacaoParaCopia, copiarTexto } from '../../utils/copiarRespostas'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''
const PAGE_SIZE = 30
const STATUS_FILTRO = ['Enviado', 'Respondido', 'Finalizado']

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

const numBR = (n) => (n == null ? '—' : Number(n).toFixed(1).replace('.', ','))

// Carrega o Registro de Evolução de cada feedback comparado (fotos do conjunto + peso).
async function enriquecerComRegistro(dados) {
  return Promise.all(dados.map(async (d) => {
    if (!d.registro_evolucao) return { ...d, registro: null }
    try { return { ...d, registro: await buscarRegistro(d.registro_evolucao) } }
    catch { return { ...d, registro: null } }
  }))
}

function ViewComparacao({ dados, imgSrcs, onVoltar, onRotate, modoTrocarFoto, setModoTrocarFoto, fotosSelecionadas, setFotosSelecionadas, salvandoTroca, onConfirmarTroca }) {
  // `dados` vem ordenado ascendente (mais antigo → mais recente), então o último
  // é o feedback mais recente. As perguntas de referência (coluna esquerda)
  // seguem o formulário mais recente; respostas são casadas por índice de posição.
  const referencia = dados.length ? dados[dados.length - 1] : null
  const base = referencia?.perguntas_e_respostas || []
  const formulariosDistintos = new Set(dados.map(d => d.formulario).filter(Boolean)).size > 1
  const [copiado, setCopiado] = useState(false)

  // Fotos do conjunto + peso vêm do Registro de cada feedback (alinhadas por slot_id).
  const slotMapCmp = new Map()
  dados.forEach((d) => (d.registro?.fotos || []).forEach((f) => {
    if (f.slot_id) slotMapCmp.set(f.slot_id, { slot_id: f.slot_id, rotulo: f.rotulo || '—', ordem: f.ordem ?? 999 })
  }))
  const slotsConjunto = [...slotMapCmp.values()].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  const temPeso = dados.some((d) => d.registro?.peso != null)
  const temEvolucao = slotsConjunto.length > 0 || temPeso
  const urlSlot = (registro, slotId) => (registro?.fotos || []).find((x) => x.slot_id === slotId)?.url || null

  const handleCopiarRespostas = async () => {
    const ok = await copiarTexto(formatComparacaoParaCopia(dados, { tipo: 'Feedback' }))
    if (ok) {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

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
            <>
              <button
                onClick={handleCopiarRespostas}
                title="Copiar respostas em texto"
                className={`px-3 py-1.5 bg-[#29292e] border rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  copiado
                    ? 'border-green-500/50 text-green-400'
                    : 'border-[#323238] hover:border-blue-500/50 text-blue-300'
                }`}
              >
                {copiado ? <Check size={12} /> : <Copy size={12} />}
                {copiado ? 'Copiado' : 'Copiar Respostas'}
              </button>
              <button
                onClick={() => { setModoTrocarFoto(true); setFotosSelecionadas([]) }}
                className="px-3 py-1.5 bg-[#29292e] border border-[#323238] hover:border-orange-500/50 text-orange-300 rounded-lg text-xs font-bold transition-all"
              >
                Trocar Fotos
              </button>
            </>
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
            <h1 className="text-sm font-bold text-white">{referencia?.nome_completo}</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">{referencia?.titulo}</p>
          </div>

          {formulariosDistintos && (
            <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
              <span className="leading-relaxed">
                Você está comparando feedbacks de <strong>formulários diferentes</strong>. As perguntas da coluna à esquerda seguem o formulário mais recente
                {referencia?.titulo ? <> (<span className="font-semibold text-amber-100">{referencia.titulo}</span>)</> : null}; respostas de outros formulários podem não alinhar.
              </span>
            </div>
          )}

          <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#323238]">
                  <th className="p-2 md:p-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-[#0a0a0a] z-10 min-w-[140px] md:min-w-[200px] md:w-48">
                    Pergunta
                  </th>
                  {dados.map((fb, i) => (
                    <th key={i} className="p-2 md:p-3 text-[10px] font-bold text-white uppercase tracking-wider text-center min-w-[160px] md:min-w-[220px]">
                      {fmtData((fb.data_resposta || fb.modified || '').split(' ')[0])}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#323238]/40">
                {temEvolucao && (
                  <>
                    <tr className="bg-[#0a0a0a]/50">
                      <td colSpan={dados.length + 1} className="p-3">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider bg-[#2563eb]/10 border-l-4 border-[#2563eb] px-4 py-2 rounded-r-lg">
                          Evolução · Fotos &amp; Peso (conjunto)
                        </h3>
                      </td>
                    </tr>
                    {temPeso && (
                      <tr className="hover:bg-white/5">
                        <td className="p-2 md:p-3 align-top sticky left-0 bg-[#1a1a1a] z-10 min-w-[140px] md:min-w-[200px] md:w-48">
                          <span className="text-white text-xs font-bold">Peso</span>
                        </td>
                        {dados.map((d, i) => (
                          <td key={i} className="p-2 md:p-3 text-center align-top">
                            {d.registro?.peso != null
                              ? <span className="text-white text-sm font-bold">{numBR(d.registro.peso)} <span className="text-gray-500 text-xs">kg</span></span>
                              : <span className="text-gray-600 text-xs">—</span>}
                          </td>
                        ))}
                      </tr>
                    )}
                    {slotsConjunto.map((slot) => (
                      <tr key={slot.slot_id} className="hover:bg-white/5">
                        <td className="p-2 md:p-3 align-top sticky left-0 bg-[#1a1a1a] z-10 min-w-[140px] md:min-w-[200px] md:w-48">
                          <span className="text-[#93C5FD] text-[10px] font-bold uppercase tracking-wider">{slot.rotulo}</span>
                        </td>
                        {dados.map((d, i) => {
                          const url = urlSlot(d.registro, slot.slot_id)
                          return (
                            <td key={i} className="p-0 text-center align-top">
                              {url ? (
                                <ImagemInterativa
                                  src={`${FRAPPE_URL}${encodeURI(url)}`}
                                  feedbackId={d.name}
                                  idx={`reg_${slot.slot_id}`}
                                  onRotate={() => onRotate(d.name, url)}
                                />
                              ) : (
                                <span className="text-gray-600 text-xs">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </>
                )}
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
                      <td className="p-2 md:p-3 text-[11px] md:text-xs text-white font-bold sticky left-0 bg-[#1a1a1a] z-10 border-r border-[#323238]/30">
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
  const errorModal = useErrorModal()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [feedbacks, setFeedbacks] = useState([])
  const [formularios, setFormularios] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState(['Respondido']) // multi-seleção
  const [filtroFormulario, setFiltroFormulario] = useState('')
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [page, setPage] = useState(1)

  const [view, setView] = useState('list')
  const [modalVincular, setModalVincular] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [modoComparar, setModoComparar] = useState(false)
  const [selecionados, setSelecionados] = useState([])
  const [dadosComparacao, setDadosComparacao] = useState([])
  const [loadingComparacao, setLoadingComparacao] = useState(false)

  const [imgSrcs, setImgSrcs] = useState({})

  const [modoTrocarFoto, setModoTrocarFoto] = useState(false)
  const [fotosSelecionadas, setFotosSelecionadas] = useState([])
  const [salvandoTroca, setSalvandoTroca] = useState(false)

  const [modalNota, setModalNota] = useState(null)
  const [notaTexto, setNotaTexto] = useState('')
  const [salvandoNota, setSalvandoNota] = useState(false)

  const debounceRef = useRef(null)

  const carregar = useCallback(async (opts = {}) => {
    setLoading(true)
    try {
      const buscaUsada = opts.busca ?? busca
      const { list } = await listarFeedbacks({
        busca: buscaUsada,
        status: opts.status ?? filtroStatus,
        page: 1,
        limit: 500,
      })
      const lista = buscaUsada
        ? list.filter(f => buscarSmart([f.nome_completo, f.email, f.aluno], buscaUsada))
        : list
      const mapaAgendamentos = await buscarAgendamentosPorFeedbacks(lista.map(f => f.name))
      const listaComNota = lista.map(f => ({ ...f, ...(mapaAgendamentos[f.name] || {}) }))
      setFeedbacks(listaComNota)
      setPage(1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [busca, filtroStatus])

  useEffect(() => {
    listarFormularios().then(setFormularios).catch(console.error)
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      carregar({ busca, status: filtroStatus })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca, filtroStatus])

  // Status (multi) já vem do servidor; formulário e a data (por data_resposta com
  // fallback modified) são aplicados no client.
  const feedbacksFiltrados = useMemo(() => {
    let list = feedbacks
    if (filtroFormulario) list = list.filter(f => f.titulo === filtroFormulario)
    if (filtroStatus.length) list = list.filter(f => filtroStatus.includes(f.status || 'Enviado'))
    if (filtroDataInicio || filtroDataFim) {
      list = list.filter(f => {
        const d = (f.data_resposta || f.modified || '').slice(0, 10)
        if (!d) return false
        if (filtroDataInicio && d < filtroDataInicio) return false
        if (filtroDataFim && d > filtroDataFim) return false
        return true
      })
    }
    return list
  }, [feedbacks, filtroFormulario, filtroStatus, filtroDataInicio, filtroDataFim])

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
      dados.sort((a, b) => (a.data_resposta || a.modified || '').localeCompare(b.data_resposta || b.modified || ''))
      setDadosComparacao(await enriquecerComRegistro(dados))
    } catch (e) {
      console.error(e)
      setView('list')
    } finally {
      setLoadingComparacao(false)
    }
  }

  const compararUltimos3 = async (fb) => {
    setLoadingComparacao(true)
    setView('compare')
    try {
      const respondidos = await listarFeedbacksDoAluno(fb.aluno)
      const ultimos = respondidos.slice(0, 3)
      if (ultimos.length < 2) {
        setView('list')
        alert('Este aluno tem menos de 2 feedbacks respondidos para comparar.')
        return
      }
      setSelecionados(ultimos)
      const resultados = await Promise.all(ultimos.map(f => buscarFeedback(f.name)))
      const dados = resultados.filter(Boolean)
      dados.sort((a, b) => (a.data_resposta || a.modified || '').localeCompare(b.data_resposta || b.modified || ''))
      setDadosComparacao(await enriquecerComRegistro(dados))
    } catch (e) {
      console.error(e)
      setView('list')
    } finally {
      setLoadingComparacao(false)
    }
  }

  // Abre a comparação direto pela URL (/feedbacks/compare?aluno=...) — usado pelo Cmd+Click.
  useEffect(() => {
    const aluno = searchParams.get('aluno')
    if (aluno) compararUltimos3({ aluno })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      errorModal.show(e, 'Trocar fotos do feedback')
    } finally {
      setSalvandoTroca(false)
    }
  }

  const abrirModalNota = (row) => {
    setModalNota(row)
    setNotaTexto(row.observacao || '')
  }

  const salvarNota = async () => {
    if (!modalNota?.agendamento_name) return
    setSalvandoNota(true)
    try {
      await salvarAgendamento(modalNota.agendamento_name, { observacao: notaTexto })
      setFeedbacks(prev => prev.map(f => f.name === modalNota.name ? { ...f, observacao: notaTexto } : f))
      setModalNota(null)
    } catch (e) {
      console.error(e)
    } finally {
      setSalvandoNota(false)
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

  const handleConfirmarExcluir = async () => {
    if (!modalExcluir || excluindo) return
    setExcluindo(true)
    try {
      await excluirFeedback(modalExcluir.name)
      setFeedbacks(prev => prev.filter(f => f.name !== modalExcluir.name))
      setSelecionados(prev => prev.filter(f => f.name !== modalExcluir.name))
      setModalExcluir(null)
    } catch (e) {
      errorModal.show(e, 'Excluir feedback')
    } finally {
      setExcluindo(false)
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
        onVoltar={() => {
          setView('list'); setModoComparar(false); setSelecionados([])
          if (searchParams.get('aluno')) navigate('/feedbacks', { replace: true })
        }}
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

  const formularioOpts = [
    { value: '', label: 'Todos os formulários' },
    ...formularios.map(f => ({ value: f.titulo, label: f.titulo })),
  ]

  const toggleStatusFiltro = (s) => {
    setFiltroStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    setPage(1)
  }

  const columns = [
    {
      label: 'Ações',
      headerClass: 'w-24 text-center',
      cellClass: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={(e) => { if (maybeOpenNewTab(e, `/feedbacks/compare?aluno=${encodeURIComponent(row.aluno)}`)) return; compararUltimos3(row) }}
            onAuxClick={(e) => { if (e.button === 1) maybeOpenNewTab(e, `/feedbacks/compare?aluno=${encodeURIComponent(row.aluno)}`) }}
            title="Comparar últimos 3 (Cmd/Ctrl+clique: nova aba)"
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
          <button
            onClick={() => setModalExcluir(row)}
            title="Excluir feedback"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
    {
      label: 'Aluno',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{row.nome_completo}</span>
          {row.agendamento_name && (
            <button
              onClick={(e) => { e.stopPropagation(); abrirModalNota(row) }}
              title={row.observacao ? `Nota: ${row.observacao}` : 'Adicionar nota interna'}
              className="flex items-center gap-1 shrink-0 transition-colors"
            >
              {row.observacao ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-red-500/50 text-red-400 text-[10px] font-medium shadow-[0_0_4px_rgba(239,68,68,0.2)]">
                  <StickyNote size={10} />
                  Notas
                </span>
              ) : (
                <span className="flex items-center gap-1 text-gray-600 hover:text-gray-400 text-[11px]">
                  <StickyNote size={10} />
                  Notas
                </span>
              )}
            </button>
          )}
        </div>
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
      render: (row) => {
        const dataExibida = row.data_resposta || row.modified
        return (
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">{fmtData((dataExibida || '').split(' ')[0])}</span>
            <span className="text-gray-600 text-[10px]">{fmtHora(dataExibida)}</span>
          </div>
        )
      },
    },
    {
      label: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row) => {
        const status = row.status || 'Enviado'
        const cor = status === 'Finalizado'
          ? 'bg-green-500/10 text-green-400 border-green-500/20'
          : status === 'Enviado'
            ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20'
            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
        return (
          <div onClick={e => e.stopPropagation()}>
            <select
              value={status}
              onChange={e => handleStatusChange(row, e.target.value)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border outline-none cursor-pointer appearance-none text-center ${cor}`}
            >
              <option value="Enviado">Enviado</option>
              <option value="Respondido">Respondido</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <ListPage
        title="Feedbacks Recebidos"
        subtitle={`Respostas que chegaram dos seus alunos · ${feedbacksFiltrados.length} feedback(s)`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} loading={loading} />
            {!modoComparar && (
              <Button variant="primary" size="sm" icon={Link2} onClick={() => setModalVincular(true)}>
                Vincular Feedback
              </Button>
            )}
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
          { type: 'select', value: filtroFormulario, onChange: v => { setFiltroFormulario(v); setPage(1) }, options: formularioOpts },
        ]}
        loading={loading}
        empty={
          feedbacksFiltrados.length === 0 && !loading
            ? { title: 'Nenhum feedback encontrado', description: 'Aguarde novos envios ou ajuste os filtros.' }
            : null
        }
      >
        {/* Filtro de status (multi) — clique pra somar/remover; nenhum = todos */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mr-1">Status</span>
          {STATUS_FILTRO.map(s => {
            const ativo = filtroStatus.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatusFiltro(s)}
                className={`h-8 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                  ativo
                    ? 'bg-[#2563eb] text-white border-[#2563eb]'
                    : 'text-gray-300 border-[#323238] hover:border-gray-500'
                }`}
              >
                {s}
              </button>
            )
          })}
        </div>

        {/* Filtro de datas — por data_resposta com fallback modified */}
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
            rowHref={(row) => `/feedbacks/${row.name}`}
          />
        )}
      </ListPage>
      {modalVincular && (
        <VincularFeedbackModal
          onClose={() => setModalVincular(false)}
          onVinculado={() => { setModalVincular(false); carregar() }}
        />
      )}

      {modalExcluir && (
        <Modal
          isOpen
          onClose={() => !excluindo && setModalExcluir(null)}
          title="Excluir feedback?"
          size="sm"
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => setModalExcluir(null)}
                disabled={excluindo}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                onClick={handleConfirmarExcluir}
                loading={excluindo}
              >
                Excluir
              </Button>
            </>
          }
        >
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div className="text-sm text-gray-300 space-y-1.5">
                <p>
                  Esta ação é <strong className="text-white">permanente</strong> e não pode ser desfeita.
                </p>
                <p className="text-gray-400 text-xs">
                  Aluno: <span className="text-gray-200">{modalExcluir.nome_completo || '—'}</span>
                </p>
                <p className="text-gray-400 text-xs">
                  Formulário: <span className="text-gray-200">{modalExcluir.titulo || modalExcluir.formulario || '—'}</span>
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {modalNota && (
        <Modal
          isOpen
          onClose={() => !salvandoNota && setModalNota(null)}
          title="Nota interna"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalNota(null)} disabled={salvandoNota}>Cancelar</Button>
              <Button variant="primary" onClick={salvarNota} loading={salvandoNota}>Salvar</Button>
            </>
          }
        >
          <div className="p-4">
            <FormGroup label="Nota" hint="Visível apenas para você">
              <Textarea
                value={notaTexto}
                onChange={setNotaTexto}
                placeholder="Digite sua nota interna sobre este feedback..."
                rows={4}
              />
            </FormGroup>
          </div>
        </Modal>
      )}
      {errorModal.element}
    </>
  )
}
