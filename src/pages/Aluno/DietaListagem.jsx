import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Apple, ChevronRight, CalendarDays } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader } from '../../components/aluno'
import { listarDietasAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const periodo = (date, finalDate) => {
  const ini = fmtDataBR(date)
  const fim = fmtDataBR(finalDate)
  if (ini && fim) return `${ini} - ${fim}`
  if (ini) return `A partir de ${ini}`
  if (fim) return `Até ${fim}`
  return ''
}

export default function DietaListagem() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [dietas, setDietas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarDietasAluno()
      .then(list => { if (!cancelado) setDietas(list) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Dietas'))
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
        <h1 className="text-white text-base font-bold">Minhas Dietas</h1>
      </div>

      <div className="px-4 pt-4">
        <SectionHeader
          icon={<Apple size={15} />}
          label="Suas dietas"
        />

        {carregando ? (
          <div className="h-32 flex items-center justify-center"><Spinner /></div>
        ) : dietas.length === 0 ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <Apple size={28} className="text-[var(--sf-text-soft)] mb-2" />
            <p className="text-[var(--sf-text-muted)] text-sm">Nenhuma dieta ativa no momento.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {dietas.map(d => {
              const intervalo = periodo(d.date, d.final_date)
              return (
                <GlassCard
                  key={d.name}
                  as="button"
                  onClick={() => navigate(`/aluno/dietas/${d.name}`)}
                  className="px-4 py-4 flex items-center gap-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold leading-snug">
                      {d.strategy || 'Dieta'}
                    </p>
                    {d.week_days && (
                      <p className="text-[var(--sf-text-muted)] text-xs mt-1">{d.week_days}</p>
                    )}
                    {d.dias_info && (
                      <p className="text-[var(--sf-text-soft)] text-[11px] mt-1">{d.dias_info}</p>
                    )}
                    {intervalo && (
                      <p className="text-[var(--sf-text-soft)] text-[11px] mt-2 flex items-center gap-1.5">
                        <CalendarDays size={11} />
                        {intervalo}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-[var(--sf-text-soft)] shrink-0" />
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
