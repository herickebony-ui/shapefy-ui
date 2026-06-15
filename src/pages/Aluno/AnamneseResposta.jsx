import { useEffect, useRef, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Check, AlertCircle, ArrowLeft } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { ActionButton } from '../../components/aluno'
import { FormularioRespostas, listarFaltantesObrigatorias } from '../../components/aluno/form'
import CampoImagem from '../../components/aluno/form/CampoImagem'
import { cropImgStyle } from '../../components/evolucao/ModeloCropper'
import { buscarAnamneseAluno, responderAnamnese, uploadFotoAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

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

export default function AnamneseResposta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [anamnese, setAnamnese] = useState(null)
  const [respostas, setRespostas] = useState([])
  const [fotosSlots, setFotosSlots] = useState({}) // {slot_id: url} — fluxo com conjunto
  const [pesoVal, setPesoVal] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroValidacao, setErroValidacao] = useState('')
  const [passo, setPasso] = useState(0)

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

  const novoFluxo = !!anamnese?.conjunto_fotos
  const conjuntoSlots = anamnese?.conjunto_slots || []
  const incluirPeso = anamnese?.incluir_peso === 1

  // Partição das perguntas por tipo.
  const particao = useMemo(() => {
    const fotos = [], peso = [], qual = []
    respostas.forEach((it, idx) => {
      if (isImagem(it.tipo)) fotos.push(idx)
      else if (isPesoQ(it)) peso.push(idx)
      else qual.push(idx)
    })
    return { fotos, peso, qual }
  }, [respostas])

  // Passos do wizard. Com conjunto: Fotos(slots) → Peso(input) → Perguntas.
  // O conjunto é ADITIVO: os passos Fotos/Peso do conjunto são coleta estruturada
  // EXTRA; TODAS as perguntas do formulário (incl. Anexar Imagem e peso) continuam
  // aparecendo normalmente nas Perguntas — nada do template é escondido.
  // Sem conjunto: Fotos(perguntas-foto) → Peso(pergunta-peso) → Perguntas.
  const passos = useMemo(() => {
    const arr = []
    if (novoFluxo) {
      if (conjuntoSlots.length) arr.push({ id: 'fotos', label: 'Fotos', tipo: 'slots' })
      if (incluirPeso) arr.push({ id: 'peso', label: 'Peso', tipo: 'peso' })
      arr.push({ id: 'perguntas', label: 'Perguntas', tipo: 'form', idxs: new Set([...particao.qual, ...particao.fotos, ...particao.peso]) })
    } else {
      if (particao.fotos.length) arr.push({ id: 'fotos', label: 'Fotos', tipo: 'form', idxs: new Set(particao.fotos) })
      if (particao.peso.length) arr.push({ id: 'peso', label: 'Peso', tipo: 'form', idxs: new Set(particao.peso) })
      if (particao.qual.length) arr.push({ id: 'perguntas', label: 'Perguntas', tipo: 'form', idxs: new Set(particao.qual) })
    }
    return arr
  }, [novoFluxo, conjuntoSlots, incluirPeso, particao])

  const stepAtual = passos[passo]
  const isUltimo = passo >= passos.length - 1

  const faltantesDoPasso = () => {
    if (!stepAtual) return []
    if (stepAtual.tipo === 'form') {
      return listarFaltantesObrigatorias(respostas)
        .filter(f => stepAtual.idxs.has(f.idx))
        .map(f => f.pergunta || 'pergunta')
    }
    if (stepAtual.tipo === 'slots') {
      return conjuntoSlots.filter(s => s.obrigatorio && !fotosSlots[s.slot_id]).map(s => s.rotulo)
    }
    return [] // peso é opcional
  }

  const avancar = () => {
    const faltam = faltantesDoPasso()
    if (faltam.length > 0) {
      setErroValidacao(`Faltam ${faltam.length} ${faltam.length === 1 ? 'item obrigatório' : 'itens obrigatórios'} neste passo.`)
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
    // Todas as perguntas do formulário aparecem e são validadas (o conjunto adiciona
    // slots/peso por cima, mas não esconde nada do template).
    const idxsForm = new Set([...particao.qual, ...particao.fotos, ...particao.peso])
    const faltamForm = listarFaltantesObrigatorias(respostas).filter(f => idxsForm.has(f.idx))
    const slotsFaltando = novoFluxo
      ? conjuntoSlots.filter(s => s.obrigatorio && !fotosSlots[s.slot_id])
      : []

    if (faltamForm.length > 0 || slotsFaltando.length > 0) {
      // pula pro passo da primeira falta
      if (slotsFaltando.length > 0) {
        const i = passos.findIndex(s => s.tipo === 'slots')
        if (i >= 0) setPasso(i)
      } else {
        const i = passos.findIndex(s => s.tipo === 'form' && s.idxs?.has(faltamForm[0].idx))
        if (i >= 0) setPasso(i)
      }
      const total = faltamForm.length + slotsFaltando.length
      setErroValidacao(`Faltam ${total} ${total === 1 ? 'item obrigatório' : 'itens obrigatórios'}.`)
      return
    }

    setErroValidacao('')
    setEnviando(true)
    try {
      let extra = {}
      if (novoFluxo) {
        const fotos = conjuntoSlots
          .map(s => ({ slot_id: s.slot_id, rotulo: s.rotulo, ordem: s.ordem, url: fotosSlots[s.slot_id] || '' }))
          .filter(f => f.url)
        extra = { fotos, peso: pesoVal.trim() || null }
      }
      await responderAnamnese(anamnese.name, respostas, extra)
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
          Obrigado por preencher a anamnese. Seu profissional já recebeu as respostas.
        </p>
        <ActionButton variant="primary" onClick={() => navigate('/aluno')} icon={ArrowLeft}>
          Voltar para o início
        </ActionButton>
      </div>
    )
  }

  if (!anamnese) {
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
          <h1 className="text-white text-base font-bold leading-tight truncate">{anamnese.titulo || 'Anamnese'}</h1>
          <p className="text-[var(--sf-text-muted)] text-xs mt-1 truncate">
            {fmtData(anamnese.date)}
            {anamnese.nome_completo ? ` · ${anamnese.nome_completo}` : ''}
          </p>
        </div>
      </div>

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
        {stepAtual?.tipo === 'slots' && (
          <div className="grid grid-cols-2 gap-3">
            {conjuntoSlots.map(s => (
              <div key={s.slot_id}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-text-muted)] mb-1">
                  {s.rotulo}{s.obrigatorio ? <span className="text-[var(--sf-red)]"> *</span> : null}
                </p>
                {s.foto_modelo && (
                  <div className="relative mb-1.5 rounded-lg overflow-hidden border border-[var(--sf-border)] aspect-square">
                    <img src={`${FRAPPE_URL}${encodeURI(s.foto_modelo)}`} alt="modelo" draggable={false} style={cropImgStyle(s.foto_modelo_crop)} className="opacity-50" />
                    <span className="absolute top-1 left-1 text-[8px] font-bold uppercase tracking-widest bg-black/60 text-white px-1.5 py-0.5 rounded">modelo</span>
                  </div>
                )}
                <CampoImagem
                  value={fotosSlots[s.slot_id] || ''}
                  onChange={(url) => setFotosSlots(prev => ({ ...prev, [s.slot_id]: url || '' }))}
                  uploadFn={uploadFotoAluno}
                />
              </div>
            ))}
          </div>
        )}

        {stepAtual?.tipo === 'peso' && (
          <div className="px-1 pt-2">
            <p className="text-white text-sm font-semibold mb-1">Qual seu peso atual?</p>
            <p className="text-[var(--sf-text-muted)] text-xs mb-3">Em kg. Se não tiver se pesado, pode deixar em branco.</p>
            <input
              type="text"
              inputMode="decimal"
              value={pesoVal}
              onChange={(e) => setPesoVal(e.target.value)}
              placeholder="Ex: 72,5"
              className="w-full h-14 px-4 bg-[var(--sf-surface)] border border-[var(--sf-border)] text-white rounded-2xl text-xl outline-none focus:border-[var(--sf-blue)]"
            />
          </div>
        )}

        {stepAtual?.tipo === 'form' && (
          <FormularioRespostas
            perguntas={respostas}
            onChange={setResposta}
            uploadFn={uploadFotoAluno}
            filtrarIdx={stepAtual.idxs}
          />
        )}
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
