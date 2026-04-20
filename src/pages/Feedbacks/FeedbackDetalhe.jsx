import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Star, X, RefreshCw, User, Calendar, FileText, Clock } from 'lucide-react'
import {
  buscarFeedback,
  salvarStatusFeedback,
  rotarImagemFeedback,
  salvarRespostaFeedback,
  trocarFotosFeedback,
} from '../../api/feedbacks'
import { Button, Spinner, Textarea, FormGroup } from '../../components/ui'
import DetailPage from '../../components/templates/DetailPage'
import ImagemInterativa from './ImagemInterativa'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtData = (d) => {
  if (!d) return '—'
  const parte = String(d).split(' ')[0]
  const [y, m, day] = parte.split('-')
  return `${day}/${m}/${y}`
}

const fmtHora = (dt) => {
  if (!dt) return ''
  try {
    const d = new Date(dt.replace(' ', 'T'))
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

export default function FeedbackDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const feedbacksFiltrados = location.state?.feedbacksFiltrados || []

  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusLocal, setStatusLocal] = useState('')
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  const [imgSrcs, setImgSrcs] = useState({})

  const [resposta, setResposta] = useState('')
  const [salvandoResposta, setSalvandoResposta] = useState(false)
  const [savedBadge, setSavedBadge] = useState(false)

  const [modoTrocarFoto, setModoTrocarFoto] = useState(false)
  const [fotosSelecionadas, setFotosSelecionadas] = useState([])
  const [salvandoTroca, setSalvandoTroca] = useState(false)

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      try {
        const data = await buscarFeedback(id)
        setFeedback(data)
        setStatusLocal(data.status || 'Respondido')
        setResposta(data.feedback_do_profissional || '')
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [id])

  const handleRotate = async (feedbackId, fileUrl) => {
    const key = `${feedbackId}_${fileUrl}`
    try {
      await rotarImagemFeedback([feedbackId], fileUrl, 'right')
      setImgSrcs(prev => ({ ...prev, [key]: `${FRAPPE_URL}${fileUrl}?v=${Date.now()}` }))
    } catch (e) {
      console.error(e)
    }
  }

  const handleStatusChange = async (novoStatus) => {
    setStatusLocal(novoStatus)
    setSalvandoStatus(true)
    try {
      await salvarStatusFeedback(id, novoStatus)
    } catch (e) {
      console.error(e)
    } finally {
      setSalvandoStatus(false)
    }
  }

  const handleRespostaBlur = async () => {
    setSalvandoResposta(true)
    try {
      await salvarRespostaFeedback(id, resposta)
      setSavedBadge(true)
      setTimeout(() => setSavedBadge(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSalvandoResposta(false)
    }
  }

  const selecionarFoto = (feedbackId, idx) => {
    const key = `${feedbackId}_${idx}`
    setFotosSelecionadas(prev => {
      const existe = prev.findIndex(f => f.key === key)
      if (existe !== -1) return prev.filter(f => f.key !== key)
      if (prev.length >= 2) return prev
      return [...prev, { key, feedbackId, idx }]
    })
  }

  const confirmarTroca = async () => {
    const [f1, f2] = fotosSelecionadas
    if (!f1 || !f2) return
    setSalvandoTroca(true)

    const perguntas = feedback.perguntas_e_respostas
    const novas = perguntas.map((p, i) => {
      if (i === f1.idx) return { ...p, resposta: perguntas[f2.idx].resposta }
      if (i === f2.idx) return { ...p, resposta: perguntas[f1.idx].resposta }
      return p
    })
    setFeedback(prev => ({ ...prev, perguntas_e_respostas: novas }))
    setFotosSelecionadas([])
    setModoTrocarFoto(false)

    try {
      await trocarFotosFeedback(id, perguntas, f1.idx, f2.idx)
    } catch (e) {
      console.error(e)
      alert('Erro ao trocar fotos.')
    } finally {
      setSalvandoTroca(false)
    }
  }

  const navegar = (direcao) => {
    if (!feedbacksFiltrados.length) return
    const idx = feedbacksFiltrados.findIndex(f => f.name === id)
    if (idx === -1) return
    const novo = feedbacksFiltrados[idx + direcao]
    if (novo) navigate(`/feedbacks/${novo.name}`, { state: { feedbacksFiltrados } })
  }

  const idxAtual = feedbacksFiltrados.findIndex(f => f.name === id)

  const statusNode = (
    <div className="flex items-center gap-2">
      <select
        value={statusLocal}
        onChange={e => handleStatusChange(e.target.value)}
        disabled={salvandoStatus}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border outline-none cursor-pointer transition-all ${
          statusLocal === 'Finalizado'
            ? 'bg-green-500/10 text-green-400 border-green-500/30'
            : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        } ${salvandoStatus ? 'opacity-50' : ''}`}
      >
        <option value="Respondido">Respondido</option>
        <option value="Finalizado">Finalizado</option>
      </select>
      {salvandoStatus && <RefreshCw size={12} className="text-gray-500 animate-spin" />}
    </div>
  )

  const actionsNode = !modoTrocarFoto ? (
    <button
      onClick={() => { setModoTrocarFoto(true); setFotosSelecionadas([]) }}
      className="px-3 py-1.5 bg-[#29292e] border border-[#323238] hover:border-orange-500/50 text-orange-300 rounded-lg text-xs font-bold transition-all"
    >
      Trocar Fotos
    </button>
  ) : (
    <div className="flex items-center gap-2">
      <span className="text-xs text-orange-300 font-bold">{fotosSelecionadas.length}/2</span>
      <button
        onClick={confirmarTroca}
        disabled={fotosSelecionadas.length !== 2 || salvandoTroca}
        className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-bold transition-all disabled:opacity-30"
      >
        {salvandoTroca ? 'Salvando...' : 'Confirmar'}
      </button>
      <button
        onClick={() => { setModoTrocarFoto(false); setFotosSelecionadas([]) }}
        className="px-2 py-1.5 bg-[#29292e] border border-[#323238] hover:border-red-500/50 text-red-400 rounded-lg text-xs font-bold transition-all"
      >
        <X size={14} />
      </button>
    </div>
  )

  return (
    <DetailPage
      backHref="/feedbacks"
      title={feedback?.nome_completo || '…'}
      subtitle={feedback?.titulo}
      status={statusNode}
      actions={actionsNode}
    >
      {loading || !feedback ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* Info do aluno */}
          <div className="bg-[#29292e] px-4 py-3 rounded-lg border border-[#323238] mb-6 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><User size={12} /> {feedback.nome_completo}</span>
            <span className="flex items-center gap-1.5"><Calendar size={12} /> {fmtData(feedback.date)}</span>
            <span className="flex items-center gap-1.5"><Clock size={12} /> {fmtHora(feedback.modified)}</span>
            <span className="flex items-center gap-1.5 text-blue-400"><FileText size={12} /> {feedback.titulo}</span>
            {feedback.email && <span>{feedback.email}</span>}
          </div>

          {/* Tabela Q&A */}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] overflow-hidden mb-6">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-[#323238]/40">
                {feedback.perguntas_e_respostas?.map((item, idx) => {
                  if (item.tipo === 'Quebra de Seção') {
                    return (
                      <tr key={idx} className="bg-[#0a0a0a]">
                        <td colSpan={2} className="p-4">
                          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                            {item.pergunta}
                          </h2>
                        </td>
                      </tr>
                    )
                  }

                  if (item.tipo === 'Bloco HTML') {
                    return (
                      <tr key={idx} className="bg-[#0a0a0a]">
                        <td colSpan={2} className="p-4">
                          <div
                            className="text-xs text-gray-400 leading-relaxed prose prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ __html: item.conteudo_html || item.pergunta }}
                          />
                        </td>
                      </tr>
                    )
                  }

                  if (item.tipo === 'Anexar Imagem') {
                    const rotKey = `${feedback.name}_${item.resposta}`
                    const selecionada = fotosSelecionadas.findIndex(f => f.key === `${feedback.name}_${idx}`)

                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td colSpan={2} className="p-0 w-full">
                          <div className="px-4 pt-3 pb-1">
                            <h3 className="text-white text-xs font-bold">{item.pergunta}</h3>
                          </div>
                          <div className="w-full pb-4">
                            {item.resposta ? (
                              <div className="relative">
                                <ImagemInterativa
                                  src={imgSrcs[rotKey] || `${FRAPPE_URL}${item.resposta}`}
                                  feedbackId={feedback.name}
                                  idx={idx}
                                  onRotate={() => handleRotate(feedback.name, item.resposta)}
                                />
                                {modoTrocarFoto && (
                                  <div
                                    onClick={() => selecionarFoto(feedback.name, idx)}
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
                            ) : (
                              <span className="text-gray-600 text-xs italic px-4">Não enviada</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 w-1/3 align-top border-r border-[#323238]/30">
                        <h3 className="text-white text-xs font-bold leading-relaxed">{item.pergunta}</h3>
                      </td>
                      <td className="p-4 align-top text-sm text-gray-300 leading-relaxed">
                        {item.tipo === 'Avaliação' ? (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: parseInt(item.opcoes) || 5 }, (_, i) => (
                              <Star key={i} size={16} className={i < (parseInt(item.resposta) || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-[#323238]'} />
                            ))}
                            <span className="text-gray-500 text-xs ml-2">({item.resposta}/{item.opcoes})</span>
                          </div>
                        ) : (
                          item.resposta || <span className="text-gray-600 italic opacity-50">Não respondida</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Resposta do profissional */}
          <div className="bg-[#1a1a1a] rounded-lg border border-[#323238] p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Resposta do Profissional</h3>
              {savedBadge && (
                <span className="text-[10px] text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-lg">
                  Salvo
                </span>
              )}
            </div>
            <FormGroup label="">
              <Textarea
                value={resposta}
                onChange={setResposta}
                placeholder="Escreva sua análise e orientações para o aluno..."
                rows={5}
              />
            </FormGroup>
            <div className="flex justify-end mt-3">
              <Button
                variant="primary"
                size="sm"
                loading={salvandoResposta}
                onClick={handleRespostaBlur}
              >
                Salvar Resposta
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Navegação prev/next */}
      {feedbacksFiltrados.length > 0 && !loading && (
        <>
          <button
            onClick={() => navegar(-1)}
            disabled={idxAtual <= 0}
            className="fixed left-4 md:left-20 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-[#29292e]/90 backdrop-blur border border-[#323238] rounded-full shadow-xl hover:bg-[#1a1a1a] hover:border-[#850000]/50 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => navegar(1)}
            disabled={idxAtual >= feedbacksFiltrados.length - 1}
            className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 z-30 p-2 md:p-3 bg-[#29292e]/90 backdrop-blur border border-[#323238] rounded-full shadow-xl hover:bg-[#1a1a1a] hover:border-[#850000]/50 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </DetailPage>
  )
}
