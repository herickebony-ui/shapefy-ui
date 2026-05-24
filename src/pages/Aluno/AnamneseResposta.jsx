import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button, Spinner, ImageUploadResposta } from '../../components/ui'
import { buscarAnamneseAluno, responderAnamnese, uploadFotoAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

function dedupePerguntas(perguntas) {
  if (!Array.isArray(perguntas) || perguntas.length < 2) return perguntas || []
  const primeira = perguntas[0]
  const idxRep = perguntas.findIndex((p, i) =>
    i > 0
    && p?.pergunta === primeira?.pergunta
    && p?.tipo === primeira?.tipo,
  )
  if (idxRep === -1) return perguntas
  const a = perguntas.slice(0, idxRep)
  const b = perguntas.slice(idxRep)
  const score = (arr) =>
    arr.reduce((acc, p) => acc + (p?.opcoes ? 1 : 0) + (p?.conteudo_html ? 1 : 0) + (p?.resposta ? 1 : 0), 0)
  return score(b) > score(a) ? b : a
}

const isSecao = (t) => t === 'Quebra de Seção' || t === 'Quebra de Sessão' || t === 'Section Break'
const isHTML = (t) => t === 'Bloco HTML'
const isImagem = (t) => t === 'Anexar Imagem' || t === 'Attach Image'
const isSelect = (t) => t === 'Select' || t === 'Seleção'
const isChecks = (t) => t === 'Checks' || t === 'Múltipla Escolha'
const isRating = (t) => t === 'Rating' || t === 'Avaliação'
const isInt = (t) => t === 'Int' || t === 'Número'

const respostaPreenchida = (r) => {
  if (r === null || r === undefined) return false
  if (typeof r === 'string') return r.trim().length > 0
  if (typeof r === 'number') return true
  if (Array.isArray(r)) return r.length > 0
  if (typeof r === 'object') return Object.keys(r).length > 0
  return false
}

export default function AnamneseResposta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])
  const [anamnese, setAnamnese] = useState(null)
  const [respostas, setRespostas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroValidacao, setErroValidacao] = useState('')

  useEffect(() => {
    let cancelado = false
    buscarAnamneseAluno(id)
      .then(a => {
        if (cancelado) return
        if (!a) {
          errorModalRef.current.show({
            type: 'server',
            title: 'Anamnese não encontrada',
            messages: ['Verifique o link ou peça pro seu profissional enviar de novo.'],
            statusCode: 404,
          }, 'Anamnese')
          return
        }
        setAnamnese(a)
        setRespostas(dedupePerguntas(a.perguntas_e_respostas || []).map(p => ({ ...p })))
      })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Anamnese'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [id])

  const setResposta = (idx, valor) =>
    setRespostas(prev => prev.map((p, i) => i === idx ? { ...p, resposta: valor } : p))

  const validarObrigatorios = () => {
    return respostas
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => !isSecao(p.tipo) && !isHTML(p.tipo))
      .filter(({ p }) => Number(p.reqd) === 1 && !respostaPreenchida(p.resposta))
  }

  const handleEnviar = async () => {
    const faltam = validarObrigatorios()
    if (faltam.length > 0) {
      setErroValidacao(`Faltam ${faltam.length} ${faltam.length === 1 ? 'pergunta obrigatória' : 'perguntas obrigatórias'} sem resposta.`)
      const primeiraFalta = document.querySelector(`[data-pergunta-idx="${faltam[0].idx}"]`)
      primeiraFalta?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErroValidacao('')
    setEnviando(true)
    try {
      await responderAnamnese(anamnese.name, respostas)
      setEnviado(true)
    } catch (err) {
      errorModal.show(err, 'Enviar respostas')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        {errorModal.element}
        <Spinner />
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mb-4">
          <Check className="text-green-400" size={32} />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">Respostas enviadas!</h2>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          Obrigado por preencher a anamnese. Seu profissional já recebeu as respostas.
        </p>
        <Button variant="primary" onClick={() => navigate('/aluno')} icon={ArrowLeft}>
          Voltar para o início
        </Button>
      </div>
    )
  }

  if (!anamnese) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        {errorModal.element}
      </div>
    )
  }

  return (
    <div className="pb-32">
      {errorModal.element}
      <div className="px-4 pt-4 pb-3 border-b border-[#323238] bg-[#0a0a0a] sticky top-0 z-10 flex items-start gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-[#2563eb] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-base font-bold leading-tight truncate">{anamnese.titulo || 'Anamnese'}</h1>
          <p className="text-gray-500 text-xs mt-1 truncate">
            {fmtData(anamnese.date)}
            {anamnese.nome_completo ? ` · ${anamnese.nome_completo}` : ''}
          </p>
        </div>
      </div>

      <div className="divide-y divide-[#323238]/40 bg-[#1a1a1a] mx-4 mt-3 rounded-xl border border-[#323238] overflow-hidden">
        {respostas.map((item, idx) => {
          if (isSecao(item.tipo)) {
            return (
              <div key={idx} className="px-6 py-5 bg-[#111113] flex items-center gap-4">
                <div className="flex-1 h-px bg-[#323238]" />
                <span className="text-[#2563eb] text-xs font-bold uppercase tracking-widest shrink-0">
                  {item.pergunta}
                </span>
                <div className="flex-1 h-px bg-[#323238]" />
              </div>
            )
          }
          if (isHTML(item.tipo)) {
            return (
              <div key={idx} className="px-4 py-3 bg-[#0a0a0a]">
                <div
                  className="text-xs text-gray-400 prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.conteudo_html || item.pergunta }}
                />
              </div>
            )
          }

          const opcoes = String(item.opcoes || '').split('\n').map(s => s.trim()).filter(Boolean)
          const marcadas = String(item.resposta || '').split(/\n|,/).map(s => s.trim()).filter(Boolean)
          const obrigatoria = Number(item.reqd) === 1

          return (
            <div key={idx} data-pergunta-idx={idx} className="px-4 py-4">
              <p className="text-white text-sm font-semibold leading-relaxed mb-2">
                {item.pergunta}
                {obrigatoria && <span className="text-[#2563eb] ml-1">*</span>}
              </p>

              {isImagem(item.tipo) ? (
                <ImageUploadResposta
                  value={item.resposta || ''}
                  onChange={(url) => setResposta(idx, url)}
                  uploadFn={uploadFotoAluno}
                />
              ) : isSelect(item.tipo) ? (
                <select
                  value={item.resposta || ''}
                  onChange={e => setResposta(idx, e.target.value)}
                  className="w-full h-10 bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-sm rounded-lg px-3 outline-none"
                >
                  <option value="">Selecione...</option>
                  {opcoes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : isChecks(item.tipo) ? (
                <div className="flex flex-col gap-2">
                  {opcoes.map(opt => {
                    const marcada = marcadas.includes(opt)
                    return (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer text-sm text-gray-300 hover:text-white py-1">
                        <input
                          type="checkbox"
                          checked={marcada}
                          onChange={() => {
                            const nova = marcada
                              ? marcadas.filter(v => v !== opt)
                              : [...marcadas, opt]
                            setResposta(idx, nova.join('\n'))
                          }}
                          className="accent-[#2563eb] w-5 h-5"
                        />
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              ) : isRating(item.tipo) ? (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => {
                    const ativo = Number(item.resposta) >= n
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setResposta(idx, String(n))}
                        className={`h-11 w-11 flex items-center justify-center text-base font-bold border rounded-lg transition-colors
                          ${ativo
                            ? 'bg-[#2563eb] border-[#2563eb] text-white'
                            : 'border-[#323238] text-gray-500 hover:border-[#2563eb]/60 hover:text-white'
                          }`}
                      >
                        {n}
                      </button>
                    )
                  })}
                </div>
              ) : isInt(item.tipo) ? (
                <input
                  type="number"
                  value={item.resposta || ''}
                  onChange={e => setResposta(idx, e.target.value)}
                  className="w-32 h-10 bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-sm rounded-lg px-3 outline-none"
                />
              ) : (
                <textarea
                  value={item.resposta || ''}
                  onChange={e => setResposta(idx, e.target.value)}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                  style={{ minHeight: '3rem', overflow: 'hidden' }}
                  className="w-full bg-[#29292e] border border-[#323238] focus:border-[#2563eb]/60 text-white text-sm rounded-lg px-3 py-2 outline-none resize-none leading-relaxed transition-colors"
                  placeholder="Sua resposta..."
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-[#323238] px-4 py-3 z-20">
        {erroValidacao && (
          <div className="flex items-center gap-2 text-xs text-red-400 mb-2 px-1">
            <AlertCircle size={14} />
            <span>{erroValidacao}</span>
          </div>
        )}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={enviando}
          onClick={handleEnviar}
        >
          Enviar respostas
        </Button>
      </div>
    </div>
  )
}
