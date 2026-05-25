import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Pill } from 'lucide-react'
import { Spinner, Button } from '../../components/ui'
import { GlassCard } from '../../components/aluno'
import { listarPrescricoesAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const fmtDataBR = (d) => {
  if (!d) return '—'
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function InfoCell({ label, value }) {
  return (
    <div className="min-w-0">
      <p
        className="text-[#60A5FA] text-[10px] font-bold uppercase"
        style={{ letterSpacing: '0.18em' }}
      >
        {label}
      </p>
      <p className="text-white text-sm font-semibold mt-0.5 truncate">{value || '—'}</p>
    </div>
  )
}

function agruparPorMomento(itens) {
  const grupos = []
  const indice = new Map()
  for (const item of itens || []) {
    const chave = (item.momento_de_uso || 'Sem horário definido').trim() || 'Sem horário definido'
    if (!indice.has(chave)) {
      indice.set(chave, grupos.length)
      grupos.push({ momento: chave, itens: [] })
    }
    grupos[indice.get(chave)].itens.push(item)
  }
  return grupos
}

export default function PrescricaoDetalhe() {
  const { name } = useParams()
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [prescricao, setPrescricao] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarPrescricoesAluno()
      .then(list => {
        if (cancelado) return
        const p = list.find(x => x.name === name)
        if (!p) {
          errorModalRef.current.show({
            type: 'server',
            title: 'Prescrição não encontrada',
            messages: ['Esta prescrição não existe ou não pertence ao seu perfil.'],
            statusCode: 404,
          }, 'Prescrição')
          return
        }
        setPrescricao(p)
      })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Prescrição'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [name])

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-[var(--sf-bg)]">
        {errorModal.element}
        <Spinner />
      </div>
    )
  }

  if (!prescricao) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6 bg-[var(--sf-bg)]">
        {errorModal.element}
      </div>
    )
  }

  const grupos = agruparPorMomento(prescricao.itens)
  const prof = prescricao.profissional || {}
  const printUrl = `${FRAPPE_URL}/prescricao/${encodeURIComponent(prescricao.name)}?print=1`

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/prescricoes')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold flex-1">Prescrição</h1>
        <Button
          variant="secondary"
          size="sm"
          icon={Printer}
          onClick={() => window.open(printUrl, '_blank', 'noopener')}
        >
          Imprimir
        </Button>
      </div>

      <div className="px-3 pt-3 space-y-3">
        <GlassCard as="div" className="px-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <InfoCell label="Profissional" value={prof.nome} />
            <InfoCell label="Data" value={fmtDataBR(prescricao.date)} />
            <InfoCell
              label="Validade"
              value={prescricao.validade_dias ? `${prescricao.validade_dias} dias` : '—'}
            />
            <InfoCell label="Válida até" value={fmtDataBR(prescricao.data_fim)} />
          </div>
          {prescricao.aviar_para && (
            <p className="text-[var(--sf-text-muted)] text-xs mt-3 pt-3 border-t border-[var(--sf-border)]">
              Aviar para: <span className="text-gray-300">{prescricao.aviar_para}</span>
            </p>
          )}
        </GlassCard>

        {grupos.length > 0 && (
          <div className="space-y-3">
            {grupos.map(grupo => (
              <GlassCard key={grupo.momento} as="div">
                <div className="border-l-2 border-[#2563EB] px-4 py-3 bg-[#2563EB]/[0.08]">
                  <p
                    className="text-[#60A5FA] text-xs font-bold uppercase"
                    style={{ letterSpacing: '0.18em' }}
                  >
                    {grupo.momento}
                  </p>
                </div>
                <div className="divide-y divide-[var(--sf-border)]">
                  {grupo.itens.map((item, i) => (
                    <div key={i} className="px-4 py-3 flex gap-3">
                      <Pill size={14} className="text-[#60A5FA] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold leading-snug">
                          {item.manipulated || 'Item'}
                        </p>
                        {item.description && (
                          <p className="text-[var(--sf-text-muted)] text-xs leading-relaxed mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {prescricao.description && (
          <GlassCard as="div" className="px-4 py-4">
            <p
              className="text-[#60A5FA] text-xs font-bold uppercase mb-2"
              style={{ letterSpacing: '0.18em' }}
            >
              Orientações
            </p>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {prescricao.description}
            </p>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
