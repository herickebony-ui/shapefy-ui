import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { ActionButton } from '../../components/aluno'
import { FormularioRespostas, listarFaltantesObrigatorias } from '../../components/aluno/form'
import { buscarFeedbackAluno, responderFeedback, uploadFotoAluno } from '../../api/aluno'
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
    i > 0 && p?.pergunta === primeira?.pergunta && p?.tipo === primeira?.tipo,
  )
  if (idxRep === -1) return perguntas
  const a = perguntas.slice(0, idxRep)
  const b = perguntas.slice(idxRep)
  const score = (arr) =>
    arr.reduce((acc, p) => acc + (p?.opcoes ? 1 : 0) + (p?.conteudo_html ? 1 : 0) + (p?.resposta ? 1 : 0), 0)
  return score(b) > score(a) ? b : a
}

const isImagem = (t) => t === 'Anexar Imagem' || t === 'Attach Image'
const isPesoQ = (it) =>
  ['Texto Curto', 'Número', 'Numero', 'Int'].includes(it.tipo) && /peso/i.test(it.pergunta || '')

export default function FeedbackResposta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [feedback, setFeedback] = useState(null)
  const [respostas, setRespostas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroValidacao, setErroValidacao] = useState('')
  const [passo, setPasso] = useState(0)

  useEffect(() => {
    let cancelado = false
    buscarFeedbackAluno(id)
      .then(fb => {
        if (cancelado) return
        if (!fb) {
          errorModalRef.current.show({
            type: 'server',
            title: 'Feedback não encontrado',
            messages: ['Verifique o link ou peça pro seu profissional enviar de novo.'],
            statusCode: 404,
          }, 'Feedback')
          return
        }
        setFeedback(fb)
        setRespostas(dedupePerguntas(fb.perguntas_e_respostas || []).map(p => ({ ...p })))
      })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Feedback'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [id])

  const setResposta = (idx, valor) =>
    setRespostas(prev => prev.map((p, i) => i === idx ? { ...p, resposta: valor } : p))

  // Particiona as perguntas em passos: Fotos → Peso → Perguntas (qualitativas).
  const passos = useMemo(() => {
    const fotos = [], peso = [], qual = []
    respostas.forEach((it, idx) => {
      if (isImagem(it.tipo)) fotos.push(idx)
      else if (isPesoQ(it)) peso.push(idx)
      else qual.push(idx)
    })
    const arr = []
    if (fotos.length) arr.push({ id: 'fotos', label: 'Fotos', idxs: new Set(fotos) })
    if (peso.length) arr.push({ id: 'peso', label: 'Peso', idxs: new Set(peso) })
    if (qual.length) arr.push({ id: 'perguntas', label: 'Perguntas', idxs: new Set(qual) })
    return arr
  }, [respostas])

  const stepAtual = passos[passo]
  const isUltimo = passo >= passos.length - 1

  const faltantesDoPasso = () =>
    stepAtual ? listarFaltantesObrigatorias(respostas).filter(f => stepAtual.idxs.has(f.idx)) : []

  const focarFaltante = (faltam) => {
    if (!faltam[0]) return
    document.querySelector(`[data-pergunta-idx="${faltam[0].idx}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const avancar = () => {
    const faltam = faltantesDoPasso()
    if (faltam.length > 0) {
      setErroValidacao(`Faltam ${faltam.length} ${faltam.length === 1 ? 'pergunta obrigatória' : 'perguntas obrigatórias'} neste passo.`)
      focarFaltante(faltam)
      return
    }
    setErroValidacao('')
    setPasso(p => Math.min(p + 1, passos.length - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const voltar = () => {
    setErroValidacao('')
    setPasso(p => Math.max(p - 1, 0))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEnviar = async () => {
    const faltam = listarFaltantesObrigatorias(respostas)
    if (faltam.length > 0) {
      const passoComFalta = passos.findIndex(s => s.idxs.has(faltam[0].idx))
      if (passoComFalta >= 0 && passoComFalta !== passo) setPasso(passoComFalta)
      setErroValidacao(`Faltam ${faltam.length} ${faltam.length === 1 ? 'pergunta obrigatória' : 'perguntas obrigatórias'} sem resposta.`)
      return
    }
    setErroValidacao('')
    setEnviando(true)
    try {
      await responderFeedback(feedback.name, respostas)
      setEnviado(true)
    } catch (err) {
      errorModal.show(err, 'Enviar respostas')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--sf-bg)]">
        {errorModal.element}
        <Spinner />
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center bg-[var(--sf-bg)]">
        <div className="w-16 h-16 rounded-full bg-[var(--sf-green)]/10 border border-[var(--sf-green)]/40 flex items-center justify-center mb-4 shadow-[0_0_24px_var(--sf-green-glow)]">
          <Check className="text-[#22C55E]" size={32} />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">Respostas enviadas!</h2>
        <p className="text-[var(--sf-text-muted)] text-sm max-w-md mb-6">
          Obrigado por preencher. Seu profissional já recebeu as respostas e vai te dar retorno em breve.
        </p>
        <ActionButton variant="primary" onClick={() => navigate('/aluno')} icon={ArrowLeft}>
          Voltar para o início
        </ActionButton>
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 bg-[var(--sf-bg)]">
        {errorModal.element}
      </div>
    )
  }

  return (
    <div className="pb-32 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-start gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-base font-bold leading-tight truncate">{feedback.titulo || 'Feedback'}</h1>
          <p className="text-[var(--sf-text-muted)] text-xs mt-1 truncate">
            {fmtData(feedback.date)}
            {feedback.nome_completo ? ` · ${feedback.nome_completo}` : ''}
          </p>
        </div>
      </div>

      {/* Barra de progresso do wizard */}
      {passos.length > 1 && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1.5">
            {passos.map((s, i) => (
              <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= passo ? 'bg-[var(--sf-blue)]' : 'bg-[var(--sf-border)]'}`} />
            ))}
          </div>
          <p className="text-[var(--sf-text-muted)] text-[11px] mt-2 font-semibold uppercase tracking-wider">
            Passo {passo + 1} de {passos.length} · {stepAtual?.label}
          </p>
        </div>
      )}

      <div className="px-3 pt-3">
        <FormularioRespostas
          perguntas={respostas}
          onChange={setResposta}
          uploadFn={uploadFotoAluno}
          filtrarIdx={stepAtual?.idxs}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[var(--sf-bg)]/95 backdrop-blur-md border-t border-[var(--sf-border)] px-4 py-3 z-20">
        {erroValidacao && (
          <div className="flex items-center gap-2 text-xs text-[var(--sf-red)] mb-2 px-1">
            <AlertCircle size={14} />
            <span>{erroValidacao}</span>
          </div>
        )}
        <div className="flex gap-2">
          {passo > 0 && (
            <div className="shrink-0">
              <ActionButton variant="ghost" onClick={voltar}>Voltar</ActionButton>
            </div>
          )}
          <div className="flex-1">
            {isUltimo ? (
              <ActionButton variant="primary" fullWidth loading={enviando} onClick={handleEnviar}>
                Enviar respostas
              </ActionButton>
            ) : (
              <ActionButton variant="primary" fullWidth onClick={avancar}>
                Próximo
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
