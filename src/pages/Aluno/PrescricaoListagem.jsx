import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, ChevronRight, Pill } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, StatusPill } from '../../components/aluno'
import { listarPrescricoesAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const primeiraLinha = (texto) => {
  if (!texto) return 'Emitida pelo profissional'
  const linha = String(texto).split('\n').map(s => s.trim()).find(Boolean)
  return linha || 'Emitida pelo profissional'
}

export default function PrescricaoListagem() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [prescricoes, setPrescricoes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarPrescricoesAluno()
      .then(list => { if (!cancelado) setPrescricoes(list) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Prescrições'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [])

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold">Prescrições</h1>
      </div>

      <div className="px-4 pt-4">
        <SectionHeader
          icon={<Pill size={15} />}
          label="Suas prescrições"
        />

        {carregando ? (
          <div className="h-32 flex items-center justify-center"><Spinner /></div>
        ) : prescricoes.length === 0 ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <Pill size={28} className="text-[var(--sf-text-soft)] mb-2" />
            <p className="text-[var(--sf-text-muted)] text-sm">Você ainda não tem prescrições.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {prescricoes.map(p => (
              <GlassCard
                key={p.name}
                as="button"
                onClick={() => navigate(`/aluno/prescricoes/${p.name}`)}
                className="px-4 py-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-white text-sm font-bold">Prescrição</span>
                    <StatusPill variant={p.ativa ? 'success' : 'muted'}>
                      {p.ativa ? 'Ativa' : 'Expirada'}
                    </StatusPill>
                  </div>
                  <p className="text-[var(--sf-text-muted)] text-xs leading-relaxed line-clamp-2">
                    {primeiraLinha(p.description)}
                  </p>
                  <p className="text-[var(--sf-text-soft)] text-[11px] mt-2 flex items-center gap-1.5">
                    <Calendar size={11} />
                    {fmtDataBR(p.date)}
                  </p>
                </div>
                <ChevronRight size={18} className="text-[var(--sf-text-soft)] shrink-0" />
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
