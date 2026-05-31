import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Activity, Percent, Ruler, Layers, Camera, AlertTriangle } from 'lucide-react'
import { Spinner } from '../../components/ui'
import { GlassCard, SectionHeader, SemaphoreBar, Photo } from '../../components/aluno'
import { buscarAvaliacaoAluno } from '../../api/avaliacoesAluno'
import useErrorModal from '../../hooks/useErrorModal'

const fmtDataBR = (d) => {
  if (!d) return ''
  const p = String(d).split(/[T ]/)[0].split('-')
  return `${p[2]}/${p[1]}/${p[0]}`
}

const numBR = (n, dec = 1) => Number(n).toFixed(dec).replace('.', ',')

const FORMULAS = [
  { key: 'jp7_body_fat', label: 'JP7', desc: 'Pop. geral e atletas · mais precisa', recomendada: true },
  { key: 'jp4_body_fat', label: 'JP4', desc: 'Intermediária · 4 dobras' },
  { key: 'jp3_body_fat', label: 'JP3', desc: 'Avaliação rápida · 3 dobras' },
  { key: 'faulkner_body_fat', label: 'Faulkner', desc: 'Atletas · 4 dobras específicas' },
  { key: 'guedes_body_fat', label: 'Guedes', desc: 'Validada p/ brasileiros' },
]

const GRUPOS_CIRC = [
  {
    titulo: 'Tronco', unit: 'cm', campos: [
      ['neck_circumference', 'Pescoço'], ['shoulder_circumference', 'Ombros'], ['chest_circumference', 'Peito/Tórax'],
      ['waist_circumference', 'Cintura'], ['abdomen_circumference', 'Abdômen'], ['hip_circumference', 'Quadril'],
    ],
  },
  {
    titulo: 'Braços', unit: 'cm', campos: [
      ['left_arm_relaxed', 'Braço esq. relaxado'], ['left_arm_flexed', 'Braço esq. flexionado'], ['left_forearm', 'Antebraço esq.'],
      ['right_arm_relaxed', 'Braço dir. relaxado'], ['right_arm_flexed', 'Braço dir. flexionado'], ['right_forearm', 'Antebraço dir.'],
    ],
  },
  {
    titulo: 'Pernas', unit: 'cm', campos: [
      ['left_thigh', 'Coxa esq.'], ['left_calf', 'Panturrilha esq.'], ['right_thigh', 'Coxa dir.'], ['right_calf', 'Panturrilha dir.'],
    ],
  },
  {
    titulo: 'Outras', unit: 'cm', campos: [
      ['wrist_circumference', 'Punho'], ['ankle_circumference', 'Tornozelo'],
    ],
  },
]

const DOBRAS = [
  ['skinfold_triceps', 'Tríceps'], ['skinfold_subscapular', 'Subescapular'], ['skinfold_suprailiac', 'Supra-ilíaca'],
  ['skinfold_abdominal', 'Abdominal'], ['skinfold_chest', 'Peitoral'], ['skinfold_midaxillary', 'Axilar média'], ['skinfold_thigh', 'Coxa'],
]

// Renderiza linhas (label → valor) só dos campos preenchidos (> 0).
function MeasureRows({ av, campos, unit }) {
  const preenchidos = campos.filter(([k]) => (av[k] || 0) > 0)
  if (!preenchidos.length) return null
  return (
    <div className="divide-y divide-[var(--sf-border)]">
      {preenchidos.map(([k, label]) => (
        <div key={k} className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[var(--sf-text-muted)] text-xs">{label}</span>
          <span className="text-white text-sm font-semibold">{numBR(av[k])} {unit}</span>
        </div>
      ))}
    </div>
  )
}

export default function AvaliacaoDetalhe() {
  const navigate = useNavigate()
  const { name } = useParams()
  const errorModal = useErrorModal()
  const errorModalRef = useRef(errorModal)
  useEffect(() => { errorModalRef.current = errorModal }, [errorModal])

  const [data, setData] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    buscarAvaliacaoAluno(name)
      .then(res => { if (!cancelado) setData(res) })
      .catch(err => !cancelado && errorModalRef.current.show(err, 'Avaliação'))
      .finally(() => !cancelado && setCarregando(false))
    return () => { cancelado = true }
  }, [name])

  const av = data?.avaliacao
  const indicadores = data?.indicadores_saude || []
  const verificarDados = av?.bmi_status === 'Verificar Dados'

  const algumaCircunferencia = GRUPOS_CIRC.some(g => g.campos.some(([k]) => (av?.[k] || 0) > 0))
  const algumaDobra = DOBRAS.some(([k]) => (av?.[k] || 0) > 0)
  const algumaFoto = (av?.fotos || []).some(f => f.url)

  return (
    <div className="pb-10 bg-[var(--sf-bg)] min-h-full">
      {errorModal.element}

      <div className="px-4 pt-4 pb-3 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/95 backdrop-blur-sm sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => navigate('/aluno/avaliacoes')}
          title="Voltar"
          className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white text-base font-bold leading-tight">Avaliação</h1>
          {av && <p className="text-[var(--sf-text-soft)] text-xs">{fmtDataBR(av.date)}</p>}
        </div>
      </div>

      {carregando ? (
        <div className="h-40 flex items-center justify-center"><Spinner /></div>
      ) : !av ? (
        <div className="px-4 pt-6">
          <GlassCard as="div" className="px-4 py-8 text-center">
            <p className="text-[var(--sf-text-muted)] text-sm">Avaliação não encontrada.</p>
          </GlassCard>
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-5">
          {/* Hero */}
          <GlassCard as="div" className="px-5 py-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[var(--sf-text-soft)] text-[10px] uppercase tracking-widest font-bold mb-1">Peso</p>
                <p className="text-white text-4xl font-bold leading-none">{av.weight_fmt}</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--sf-text-soft)] text-[10px] uppercase tracking-widest font-bold mb-1">IMC</p>
                <p className="text-[#60A5FA] text-3xl font-bold leading-none">{av.bmi_fmt}</p>
              </div>
            </div>
            {verificarDados ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.35)] px-3 py-2.5">
                <AlertTriangle size={15} className="text-[#F59E0B] mt-0.5 shrink-0" />
                <p className="text-[#FBBF24] text-xs leading-snug">
                  Dados de peso/altura parecem fora de escala. Confirme com seu profissional.
                </p>
              </div>
            ) : (
              <p className="mt-3 text-[var(--sf-text-muted)] text-sm font-semibold">{av.bmi_status}</p>
            )}
            <div className="mt-4 pt-3 border-t border-[var(--sf-border)] flex items-center gap-4 text-xs">
              <span className="text-[var(--sf-text-muted)]">Altura <strong className="text-white ml-1">{av.height_fmt}</strong></span>
              <span className="text-[var(--sf-text-muted)]">Idade <strong className="text-white ml-1">{av.age}</strong></span>
              <span className="text-[var(--sf-text-muted)]">Sexo <strong className="text-white ml-1">{av.sex}</strong></span>
            </div>
          </GlassCard>

          {/* Indicadores de saúde */}
          {indicadores.length > 0 && (
            <div>
              <SectionHeader icon={<Activity size={15} />} label="Indicadores de saúde" />
              <GlassCard as="div" className="px-4 py-2 divide-y divide-[var(--sf-border)]">
                {indicadores.map((ind, i) => (
                  <SemaphoreBar key={i} indicator={ind} />
                ))}
              </GlassCard>
            </div>
          )}

          {/* % de gordura por fórmula */}
          <div>
            <SectionHeader icon={<Percent size={15} />} label="% de gordura" />
            <div className="grid grid-cols-2 gap-2.5">
              {FORMULAS.map(f => (
                <GlassCard
                  key={f.key}
                  as="div"
                  variant={f.recomendada ? 'success' : 'default'}
                  className="px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[var(--sf-text-soft)] text-[10px] uppercase tracking-widest font-bold">{f.label}</p>
                    {f.recomendada && (
                      <span className="inline-flex items-center text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.4)] text-[#22C55E] shrink-0">
                        Recomendada
                      </span>
                    )}
                  </div>
                  <p className={`text-xl font-bold mt-0.5 ${f.recomendada ? 'text-[#22C55E]' : 'text-white'}`}>
                    {(av[f.key] || 0) > 0 ? `${numBR(av[f.key])}%` : '—'}
                  </p>
                  <p className="text-[var(--sf-text-soft)] text-[10px] mt-0.5 leading-snug">{f.desc}</p>
                </GlassCard>
              ))}
            </div>
            <p className="text-[var(--sf-text-soft)] text-[11px] mt-2.5 leading-snug px-1">
              Cada fórmula usa um conjunto de dobras diferente. A <strong className="text-[#22C55E]">JP7 (Jackson &amp; Pollock 7)</strong> é a mais
              precisa para população geral e atletas; as de 3/4 dobras são mais rápidas e a Faulkner é voltada a atletas.
            </p>
          </div>

          {/* Circunferências */}
          <div>
            <SectionHeader icon={<Ruler size={15} />} label="Circunferências" />
            {algumaCircunferencia ? (
              <div className="space-y-3">
                {GRUPOS_CIRC.map(g => {
                  const tem = g.campos.some(([k]) => (av[k] || 0) > 0)
                  if (!tem) return null
                  return (
                    <GlassCard key={g.titulo} as="div" className="overflow-hidden">
                      <div className="border-l-2 border-[#2563EB] px-4 py-2.5 bg-[#2563EB]/[0.08]">
                        <p className="text-[#93C5FD] text-[11px] font-bold uppercase tracking-wider">{g.titulo}</p>
                      </div>
                      <MeasureRows av={av} campos={g.campos} unit={g.unit} />
                    </GlassCard>
                  )
                })}
              </div>
            ) : (
              <GlassCard as="div" className="px-4 py-6 text-center">
                <p className="text-[var(--sf-text-soft)] text-xs">Circunferências não informadas nesta avaliação.</p>
              </GlassCard>
            )}
          </div>

          {/* Dobras cutâneas */}
          <div>
            <SectionHeader icon={<Layers size={15} />} label="Dobras cutâneas (mm)" />
            {algumaDobra ? (
              <GlassCard as="div" className="overflow-hidden">
                <MeasureRows av={av} campos={DOBRAS} unit="mm" />
              </GlassCard>
            ) : (
              <GlassCard as="div" className="px-4 py-6 text-center">
                <p className="text-[var(--sf-text-soft)] text-xs">Dobras não informadas nesta avaliação.</p>
              </GlassCard>
            )}
          </div>

          {/* Fotos */}
          <div>
            <SectionHeader icon={<Camera size={15} />} label="Fotos" />
            {algumaFoto ? (
              <div className="grid grid-cols-2 gap-2.5">
                {av.fotos.map(f => (
                  <div key={f.field}>
                    <Photo url={f.url} label={f.label} caption={f.label} />
                    <p className="text-[var(--sf-text-soft)] text-[10px] text-center mt-1">{f.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <GlassCard as="div" className="px-4 py-6 text-center">
                <p className="text-[var(--sf-text-soft)] text-xs">Nenhuma foto nesta avaliação.</p>
              </GlassCard>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
