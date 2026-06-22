import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell, Apple, ClipboardList, Scale, MessageSquare,
  Calendar, ChevronRight, Pill, Repeat, User, BookOpen, Check,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import {
  GlassCard, ModuleCard, AlertCard, DataChip, SectionHeader,
} from '../../components/aluno'
import { proximidadeFeedback } from '../../components/aluno/proximidade'
import useAuthStore from '../../store/authStore'
import {
  homeAluno,
  listarProximosFeedbacksAluno,
} from '../../api/aluno'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const ICON_POR_ID = {
  instrucoes: BookOpen,
  treino: Dumbbell,
  dieta: Apple,
  anamnese: ClipboardList,
  avaliacoes: Scale,
  feedback: MessageSquare,
  prescricoes: Pill,
  perfil: User,
  comunidade: MessageSquare,
}

const InstagramIcon = (props) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
)

function resolveCardLink(card, pendencias, flags) {
  const legado = (path) => `${FRAPPE_URL}${path}`
  switch (card.id) {
    case 'instrucoes':
      return { reactPath: '/aluno/instrucoes' }
    case 'treino':
      if (flags && flags.tem_treino === false) return { disabled: true }
      return { reactPath: '/aluno/treinos' }
    case 'dieta':
      if (flags && flags.tem_dieta === false) return { disabled: true }
      return { reactPath: '/aluno/dietas' }
    case 'anamnese':
      return pendencias?.anamnese
        ? { reactPath: `/aluno/anamneses/${pendencias.anamnese}` }
        : { href: legado('/anamnese'), externa: true }
    case 'avaliacoes':
      return { reactPath: '/aluno/avaliacoes' }
    case 'feedback':
      if (pendencias?.feedback) return { reactPath: `/aluno/feedbacks/${pendencias.feedback}` }
      // Sem Feedback Enviado: só exibe status (backend não cria mais Feedback).
      return { mostrarStatusFeedback: true }
    case 'prescricoes':
      return { reactPath: '/aluno/prescricoes' }
    case 'perfil':
      return { reactPath: '/aluno/perfil' }
    case 'comunidade':
      return { reactPath: '/aluno/comunidades' }
    default:
      return { href: legado(card.url_legado || '/'), externa: true }
  }
}

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function BannerProfissional({ profissional }) {
  if (!profissional) return null
  const iniciais = (profissional.nome || '').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const banner = profissional.banner_url || profissional.capa_url

  return (
    <div className="relative">
      <div
        className="h-52 w-full relative overflow-hidden"
        style={banner
          ? { backgroundImage: `url("${encodeURI(banner)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : {
              backgroundImage: `
                radial-gradient(circle at 15% 20%, rgba(37, 99, 235, 0.45) 0px, transparent 50%),
                radial-gradient(circle at 85% 80%, rgba(96, 165, 250, 0.35) 0px, transparent 45%),
                linear-gradient(135deg, #0b1c44 0%, #050918 100%)
              `,
            }
        }
      >
        {!banner && (
          <svg
            className="absolute inset-0 w-full h-full opacity-50"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M-50,120 Q100,80 250,140 T500,100" stroke="url(#line-grad)" strokeWidth="1" fill="none" />
            <path d="M-50,160 Q150,100 300,180 T550,140" stroke="url(#line-grad)" strokeWidth="0.8" fill="none" />
            <path d="M0,40 Q120,80 240,30 T480,60" stroke="url(#line-grad)" strokeWidth="0.6" fill="none" />
          </svg>
        )}
        <span className="absolute top-3 left-4 z-10 text-white/85 text-[10px] font-bold uppercase tracking-widest drop-shadow">
          Seu profissional
        </span>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-[var(--sf-bg)]" />
      </div>

      <div className="px-4 -mt-20 pb-5 flex flex-col items-center text-center relative">
        <div className="relative">
          <div className="absolute -inset-3 rounded-full bg-[#2563EB]/40 blur-2xl" aria-hidden="true" />
          <div className="absolute -inset-1 rounded-full bg-[#60A5FA]/30 blur-lg" aria-hidden="true" />
          {profissional.foto_url ? (
            <img
              src={profissional.foto_url}
              alt={profissional.nome}
              className="relative w-28 h-28 rounded-full object-cover ring-2 ring-[#60A5FA] shadow-[0_0_30px_rgba(37,99,235,0.6)]"
            />
          ) : (
            <div className="relative w-28 h-28 rounded-full bg-[var(--sf-bg)] flex items-center justify-center text-white font-bold text-2xl ring-2 ring-[#60A5FA] shadow-[0_0_30px_rgba(37,99,235,0.6)]">
              {iniciais || 'P'}
            </div>
          )}
        </div>

        <h2 className="text-white text-xl font-bold mt-4">{profissional.nome}</h2>

        {profissional.area_atuacao && (
          <p className="text-[var(--sf-text-muted)] text-sm mt-1">{profissional.area_atuacao}</p>
        )}
        {profissional.instagram && (
          <a
            href={`https://instagram.com/${profissional.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center gap-2 text-gray-300 hover:text-white text-sm transition-colors"
          >
            <InstagramIcon />
            <span>@{profissional.instagram}</span>
          </a>
        )}
      </div>
    </div>
  )
}

export default function AlunoHome() {
  const navigate = useNavigate()
  const aluno = useAuthStore((s) => s.aluno)
  const profissionalStore = useAuthStore((s) => s.profissional)
  const [home, setHome] = useState(null)
  const [proximos, setProximos] = useState([])
  const [carregando, setCarregando] = useState(true)
  // Modal informativo de status do próximo feedback (sem ação de criar registro).
  const [mostrarStatusFeedback, setMostrarStatusFeedback] = useState(false)

  useEffect(() => {
    let cancelado = false
    Promise.allSettled([homeAluno(), listarProximosFeedbacksAluno()])
      .then(([h, p]) => {
        if (cancelado) return
        if (h.status === 'fulfilled' && h.value) setHome(h.value)
        if (p.status === 'fulfilled') setProximos(p.value || [])
        setCarregando(false)
      })
    return () => { cancelado = true }
  }, [])

  const profissional = home?.profissional || profissionalStore
  const dadosAluno = home?.aluno || aluno
  const pendencias = home?.pendencias || {}
  const flags = dadosAluno?.flags
  const cardsBackend = (home?.cards || []).filter(c => {
    if (c.id === 'anamnese' && !pendencias.anamnese) return false
    return true
  })
  const cards = cardsBackend.some(c => c.id === 'perfil')
    ? cardsBackend
    : [...cardsBackend, { id: 'perfil', titulo: 'Meu Perfil' }]

  const hojeISO = new Date().toISOString().slice(0, 10)
  const proximosFuturos = proximos.filter(p => {
    const d = String(p.data_agendada || p.data || p.date || '').split(/[T ]/)[0]
    return d >= hojeISO
  })

  const feedbackPendente = !!(pendencias.feedback || pendencias.feedback_agendado_formulario)

  const handleCardClick = (card) => () => {
    const link = resolveCardLink(card, pendencias, flags)
    if (link.disabled) return
    if (link.mostrarStatusFeedback) { setMostrarStatusFeedback(true); return }
    if (link.reactPath) navigate(link.reactPath)
    else if (link.href) window.open(link.href, '_blank', 'noopener')
  }

  const badgePorCard = (id) => {
    if (id === 'anamnese' && pendencias.anamnese) return '1'
    if (id === 'feedback' && feedbackPendente) return '1'
    return null
  }

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <BannerProfissional profissional={profissional} />

      {pendencias.anamnese && (
        <div className="px-4 mt-2">
          <AlertCard
            variant="info"
            titulo="Você tem uma anamnese pendente."
            descricao="Toque pra responder."
            onClick={() => navigate(`/aluno/anamneses/${pendencias.anamnese}`)}
          />
        </div>
      )}

      {pendencias.ultimo_feedback_respondido && (
        <div className="px-4 mt-2">
          <div className="flex items-center gap-2 px-1 text-[var(--sf-text-muted)] text-xs">
            <Check size={14} className="text-[var(--sf-green)] shrink-0" />
            <span>Último feedback enviado em {fmtDataBR(pendencias.ultimo_feedback_respondido)}.</span>
          </div>
        </div>
      )}

      {/* Modulos PRIMEIRO, sem label de secao, grid compacto */}
      <section className="px-4 mt-4">
        {carregando && cards.length === 0 ? (
          <div className="h-32 flex items-center justify-center"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {cards.map(card => {
              const link = resolveCardLink(card, pendencias, flags)
              const IconComp = ICON_POR_ID[card.id] || Dumbbell
              return (
                <ModuleCard
                  key={card.id}
                  icon={<IconComp size={16} strokeWidth={1.6} />}
                  label={card.titulo}
                  badge={badgePorCard(card.id)}
                  onClick={handleCardClick(card)}
                  disabled={link.disabled}
                  hint={link.disabled ? (link.hint || 'Não incluso no seu plano') : undefined}
                />
              )
            })}
          </div>
        )}
      </section>

      {proximosFuturos.length > 0 && (
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-2">
            <SectionHeader
              icon={<Calendar size={15} />}
              label="Próximo feedback"
            />
            {proximosFuturos.length > 1 && (
              <button
                onClick={() => navigate('/aluno/feedbacks')}
                className="flex items-center gap-1 text-[#60A5FA] text-xs font-bold hover:text-white transition-colors -mt-1"
              >
                Ver todos ({proximosFuturos.length})
                <ChevronRight size={13} />
              </button>
            )}
          </div>
          {(() => {
            const p = proximosFuturos[0]
            const data = p.data_agendada || p.data || p.date
            const { label, tone } = proximidadeFeedback(data)
            const ehTroca = p.is_training === 1 || p.is_training === true
            return (
              <GlassCard as="div" className="px-3 py-2.5 flex items-center gap-3">
                <DataChip data={data} size="sm" tone={tone} />
                <div className="flex-1 min-w-0">
                  {p.titulo && p.formulario_titulo && p.titulo !== p.formulario_titulo && (
                    <p
                      className="text-[#60A5FA] text-[9px] font-bold uppercase truncate"
                      style={{ letterSpacing: '0.18em' }}
                    >
                      {p.formulario_titulo}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <p className="text-white text-xs font-bold truncate">
                      {p.titulo || p.formulario_titulo || 'Feedback'}
                    </p>
                    {label && (
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest shrink-0
                          ${tone === 'today' ? 'text-[#FCD34D]' : 'text-[#FBBF24]'}`}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {!label && (
                      <p className="text-[var(--sf-text-soft)] text-[10px]">{fmtDataBR(data)}</p>
                    )}
                    {ehTroca && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-300">
                        <Repeat size={9} /> Troca treino
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })()}
        </section>
      )}

      {mostrarStatusFeedback && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-3"
          onClick={() => setMostrarStatusFeedback(false)}
        >
          <div
            className="w-full max-w-[400px] bg-[var(--sf-bg)] border border-[var(--sf-border-strong)] rounded-2xl shadow-[0_25px_50px_rgba(0,0,0,0.6)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-4">
              <p className="text-white text-sm font-bold">Próximo feedback</p>
              <p className="text-[var(--sf-text-muted)] text-xs mt-1.5 leading-relaxed">
                {proximosFuturos[0]?.data_agendada
                  ? `Seu feedback está agendado para ${fmtDataBR(proximosFuturos[0].data_agendada)}.`
                  : 'Você não tem feedback agendado.'}
              </p>
            </div>
            <div className="px-4 pb-4 flex items-center justify-end">
              <button
                onClick={() => setMostrarStatusFeedback(false)}
                className="h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
