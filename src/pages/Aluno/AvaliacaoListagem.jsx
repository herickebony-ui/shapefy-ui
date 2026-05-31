import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale, ChevronRight, GitCompare, ImageOff } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, ActionButton } from '../../components/aluno'
import { listarAvaliacoesAluno } from '../../api/avaliacoesAluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtDataBR = (d) => {
  if (!d) return ''
  const p = String(d).split(/[T ]/)[0].split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

// Tom visual do status do IMC (texto/pill).
const bmiTone = (status = '') => {
  const s = status.toLowerCase()
  if (s.includes('verificar')) return { txt: 'text-[#F59E0B]', bg: 'bg-[rgba(245,158,11,0.12)]', bd: 'border-[rgba(245,158,11,0.4)]' }
  if (s.includes('obesidade')) return { txt: 'text-[#F87171]', bg: 'bg-[rgba(239,68,68,0.12)]', bd: 'border-[rgba(239,68,68,0.4)]' }
  if (s.includes('acima') || s.includes('sobrepeso')) return { txt: 'text-[#F59E0B]', bg: 'bg-[rgba(245,158,11,0.12)]', bd: 'border-[rgba(245,158,11,0.4)]' }
  if (s.includes('abaixo') || s.includes('baixo')) return { txt: 'text-[#94A3B8]', bg: 'bg-[rgba(100,116,139,0.14)]', bd: 'border-[rgba(100,116,139,0.4)]' }
  if (s) return { txt: 'text-[#22C55E]', bg: 'bg-[rgba(16,185,129,0.12)]', bd: 'border-[rgba(16,185,129,0.4)]' }
  return { txt: 'text-[var(--sf-text-soft)]', bg: 'bg-white/5', bd: 'border-[var(--sf-border)]' }
}

function Thumb({ url }) {
  if (!url) {
    return (
      <div className="h-[72px] w-[56px] shrink-0 rounded-xl bg-[var(--sf-surface-2)] border border-[var(--sf-border)] flex items-center justify-center">
        <ImageOff size={18} className="text-[var(--sf-text-soft)]" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt="Foto frontal"
      loading="lazy"
      className="h-[72px] w-[56px] shrink-0 rounded-xl object-cover border border-[var(--sf-border)]"
    />
  )
}

export default function AvaliacaoListagem() {
  const navigate = useNavigate()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [avaliacoes, setAvaliacoes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarAvaliacoesAluno()
      .then(list => { if (!cancelado) setAvaliacoes(list) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Avaliações'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [])

  // Compara automaticamente as 3 mais recentes (lista vem ordenada da mais nova → mais antiga).
  const compararRecentes = () => {
    const names = avaliacoes.slice(0, 3).map(a => a.name)
    if (names.length < 2) return
    navigate(`/aluno/avaliacoes/comparar?names=${names.join(',')}`)
  }

  return (
    <div className="pb-10 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-white text-base font-bold flex-1">Avaliações</h1>
      </div>

      <div className="px-4 pt-4">
        {/* Comparar evolução — abre as 3 mais recentes automaticamente */}
        {!carregando && avaliacoes.length >= 2 && (
          <div className="mb-5">
            <ActionButton variant="primary" fullWidth icon={GitCompare} onClick={compararRecentes}>
              Comparar evolução (3 últimas)
            </ActionButton>
          </div>
        )}

        <SectionHeader icon={<Scale size={15} />} label="Sua composição corporal" />

        {carregando ? (
          <div className="h-32 flex items-center justify-center"><Spinner /></div>
        ) : avaliacoes.length === 0 ? (
          <GlassCard as="div" className="px-4 py-8 flex flex-col items-center text-center">
            <Scale size={28} className="text-[var(--sf-text-soft)] mb-2" />
            <p className="text-[var(--sf-text-muted)] text-sm">Nenhuma avaliação cadastrada ainda.</p>
            <p className="text-[var(--sf-text-soft)] text-xs mt-1">Seu profissional registra as avaliações no painel.</p>
          </GlassCard>
        ) : (
          <div className="flex flex-col gap-3">
            {avaliacoes.map(a => {
              const tone = bmiTone(a.bmi_status)
              return (
                <GlassCard
                  key={a.name}
                  as="button"
                  onClick={() => navigate(`/aluno/avaliacoes/${a.name}`)}
                  className="px-4 py-4 flex items-center gap-4 text-left"
                >
                  <Thumb url={a.front_photo_url} />

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold">{fmtDataBR(a.date)}</p>
                    <div className="flex items-baseline gap-2 mt-1.5">
                      <span className="text-[#60A5FA] text-lg font-bold leading-none">{a.weight_fmt}</span>
                      <span className="text-[var(--sf-text-soft)] text-[11px]">IMC {a.bmi_fmt}</span>
                    </div>
                    {a.bmi_status && (
                      <span className={`inline-flex items-center mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${tone.txt} ${tone.bg} ${tone.bd}`}>
                        {a.bmi_status}
                      </span>
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
