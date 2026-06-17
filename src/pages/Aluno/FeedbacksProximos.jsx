import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, Repeat, History } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, DataChip, StatusPill } from '../../components/aluno'
import { proximidadeFeedback } from '../../components/aluno/proximidade'
import { listarProximosFeedbacksAluno } from '../../api/aluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const diaSemanaPorISO = (iso) => {
  if (!iso) return ''
  const partes = String(iso).split(/[T ]/)[0].split('-')
  if (partes.length !== 3) return ''
  const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
  return DIAS_SEMANA[d.getDay()] || ''
}

export default function FeedbacksProximos() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [proximos, setProximos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarProximosFeedbacksAluno()
      .then(list => { if (!cancelado) setProximos(list || []) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Próximos feedbacks'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [])

  const futuros = useMemo(() => {
    const hojeISO = new Date().toISOString().slice(0, 10)
    return (proximos || [])
      .filter(p => {
        const d = String(p.data_agendada || p.data || p.date || '').split(/[T ]/)[0]
        return d >= hojeISO
      })
      .sort((a, b) => {
        const da = String(a.data_agendada || a.data || a.date || '').split(/[T ]/)[0]
        const db = String(b.data_agendada || b.data || b.date || '').split(/[T ]/)[0]
        return da.localeCompare(db)
      })
  }, [proximos])

  // Últimos 30 dias (passado) — pra aluna ver o que já cumpriu. Mais recente no topo.
  const passados = useMemo(() => {
    const hojeISO = new Date().toISOString().slice(0, 10)
    return (proximos || [])
      .filter(p => {
        const d = String(p.data_agendada || p.data || p.date || '').split(/[T ]/)[0]
        return d && d < hojeISO
      })
      .sort((a, b) => {
        const da = String(a.data_agendada || a.data || a.date || '').split(/[T ]/)[0]
        const db = String(b.data_agendada || b.data || b.date || '').split(/[T ]/)[0]
        return da.localeCompare(db)
      })
  }, [proximos])

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
        <h1 className="text-white text-base font-bold">Próximos feedbacks</h1>
      </div>

      <div className="px-4 pt-4">
        <SectionHeader
          icon={<Calendar size={15} />}
          label={futuros.length > 0 ? `${futuros.length} agendado${futuros.length > 1 ? 's' : ''}` : 'Agenda'}
        />

        {carregando ? (
          <div className="h-32 flex items-center justify-center"><Spinner /></div>
        ) : futuros.length === 0 ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <Calendar size={28} className="text-[var(--sf-text-soft)] mb-2" />
            <p className="text-[var(--sf-text-muted)] text-sm">Nenhum feedback agendado no momento.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {futuros.map((p, i) => {
              const data = p.data_agendada || p.data || p.date
              const { label, tone } = proximidadeFeedback(data)
              const ehTroca = p.is_training === 1 || p.is_training === true
              return (
                <GlassCard
                  key={p.name || i}
                  as="div"
                  className="px-4 py-4 flex items-center gap-4"
                >
                  <DataChip data={data} size="md" tone={tone} />
                  <div className="flex-1 min-w-0">
                    {p.titulo && p.formulario_titulo && p.titulo !== p.formulario_titulo && (
                      <p
                        className="text-[#60A5FA] text-[10px] font-bold uppercase truncate"
                        style={{ letterSpacing: '0.18em' }}
                      >
                        {p.formulario_titulo}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 mb-1">
                      <p className="text-white text-sm font-bold truncate">
                        {p.titulo || p.formulario_titulo || 'Feedback'}
                      </p>
                      {label && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest shrink-0
                            ${tone === 'today' ? 'text-[#FCD34D]' : 'text-[#FBBF24]'}`}
                        >
                          {label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-[var(--sf-text-soft)] text-[11px]">
                        {diaSemanaPorISO(data)} · {fmtDataBR(data)}
                      </p>
                      {ehTroca && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                          <Repeat size={10} /> Troca de treino
                        </span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}
      </div>

      {!carregando && passados.length > 0 && (
        <div className="px-4 pt-6">
          <SectionHeader icon={<History size={15} />} label="Últimos 30 dias" />
          <div className="flex flex-col gap-3">
            {passados.map((p, i) => {
              const data = p.data_agendada || p.data || p.date
              const ehTroca = p.is_training === 1 || p.is_training === true
              const respondido = p.respondido === 1 || p.respondido === true
              return (
                <GlassCard key={p.name || i} as="div" className="px-4 py-4 flex items-center gap-4">
                  <DataChip data={data} size="md" />
                  <div className="flex-1 min-w-0">
                    {p.titulo && p.formulario_titulo && p.titulo !== p.formulario_titulo && (
                      <p
                        className="text-[#60A5FA] text-[10px] font-bold uppercase truncate"
                        style={{ letterSpacing: '0.18em' }}
                      >
                        {p.formulario_titulo}
                      </p>
                    )}
                    <p className="text-white text-sm font-bold truncate mt-0.5 mb-1">
                      {p.titulo || p.formulario_titulo || 'Feedback'}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="text-[var(--sf-text-soft)] text-[11px]">
                        {diaSemanaPorISO(data)} · {fmtDataBR(data)}
                      </p>
                      {ehTroca && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                          <Repeat size={10} /> Troca de treino
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusPill variant={respondido ? 'success' : 'muted'}>
                    {respondido ? 'Respondido' : 'Não respondido'}
                  </StatusPill>
                </GlassCard>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
