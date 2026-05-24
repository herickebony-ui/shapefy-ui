import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button, Spinner } from '../../components/ui'
import { FormularioRespostas, listarFaltantesObrigatorias } from '../../components/aluno/form'
import { buscarFeedbackAluno, responderFeedback, uploadFotoAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtData = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split(' ')[0].split('-')
  return `${day}/${m}/${y}`
}

// Backend ocasionalmente duplica a child table de perguntas. Detecta e mantém
// a metade com mais informação preenchida.
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

  const handleEnviar = async () => {
    const faltam = listarFaltantesObrigatorias(respostas)
    if (faltam.length > 0) {
      setErroValidacao(`Faltam ${faltam.length} ${faltam.length === 1 ? 'pergunta obrigatória' : 'perguntas obrigatórias'} sem resposta.`)
      document.querySelector(`[data-pergunta-idx="${faltam[0].idx}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          Obrigado por preencher. Seu profissional já recebeu as respostas e vai te dar retorno em breve.
        </p>
        <Button variant="primary" onClick={() => navigate('/aluno')} icon={ArrowLeft}>
          Voltar para o início
        </Button>
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        {errorModal.element}
      </div>
    )
  }

  return (
    <div className="pb-32 bg-[#050507] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[#1c1c22] bg-[#050507]/95 backdrop-blur-sm sticky top-0 z-10 flex items-start gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[#1f1f24] hover:border-[#2563eb] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-base font-bold leading-tight truncate">{feedback.titulo || 'Feedback'}</h1>
          <p className="text-gray-500 text-xs mt-1 truncate">
            {fmtData(feedback.date)}
            {feedback.nome_completo ? ` · ${feedback.nome_completo}` : ''}
          </p>
        </div>
      </div>

      <div className="px-3 pt-3">
        <FormularioRespostas
          perguntas={respostas}
          onChange={setResposta}
          uploadFn={uploadFotoAluno}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[#050507]/95 backdrop-blur-sm border-t border-[#1c1c22] px-4 py-3 z-20">
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
