import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dumbbell, Apple, ClipboardList, Scale, MessageSquare,
  Bell, Calendar, ChevronRight, LayoutGrid, X, Pill,
} from 'lucide-react'
import { Spinner } from '../../components/ui'
import {
  GlassCard, ModuleCard, AlertCard, DataChip, SectionHeader,
} from '../../components/aluno'
import useAuthStore from '../../store/authStore'
import {
  homeAluno,
  listarProximosFeedbacksAluno,
  marcarNotificacoesVisualizadasAluno,
} from '../../api/aluno'

const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || ''

const ICON_POR_ID = {
  treino: Dumbbell,
  dieta: Apple,
  anamnese: ClipboardList,
  avaliacoes: Scale,
  feedback: MessageSquare,
  prescricoes: Pill,
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
    case 'treino':
      if (flags && flags.tem_treino === false) return { disabled: true }
      return { reactPath: '/aluno/treinos' }
    case 'dieta':
      if (flags && flags.tem_dieta === false) return { disabled: true }
      return { href: legado('/dieta_aluno'), externa: true }
    case 'anamnese':
      return pendencias?.anamnese
        ? { reactPath: `/aluno/anamneses/${pendencias.anamnese}` }
        : { href: legado('/anamnese'), externa: true }
    case 'avaliacoes': {
      const recentes = pendencias?.avaliacoes_recentes || []
      return recentes.length > 0
        ? { href: legado(`/compare?names=${recentes.map(encodeURIComponent).join(',')}`), externa: true }
        : { href: legado('/avaliacao-da-composicao-corporal'), externa: true }
    }
    case 'feedback':
      if (pendencias?.feedback_agendado_formulario) {
        return { href: legado(`/verificar_feedback?form=${encodeURIComponent(pendencias.feedback_agendado_formulario)}`), externa: true }
      }
      if (pendencias?.feedback) return { reactPath: `/aluno/feedbacks/${pendencias.feedback}` }
      return { disabled: true, hint: 'Nenhum feedback disponível no momento' }
    case 'prescricoes':
      return { reactPath: '/aluno/prescricoes' }
    default:
      return { href: legado(card.url_legado || '/'), externa: true }
  }
}

const fmtRelativo = (iso) => {
  if (!iso) return ''
  const data = new Date(iso)
  if (isNaN(data)) return ''
  const diffSeg = Math.floor((Date.now() - data.getTime()) / 1000)
  if (diffSeg < 60) return 'agora'
  if (diffSeg < 3600) return `${Math.floor(diffSeg / 60)}min`
  if (diffSeg < 86400) return `${Math.floor(diffSeg / 3600)}h`
  if (diffSeg < 86400 * 7) return `${Math.floor(diffSeg / 86400)}d`
  const partes = iso.split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}`
}

const iconePorTitulo = (titulo = '') => {
  const t = titulo.toLowerCase()
  if (t.includes('feedback')) return { Icon: MessageSquare, cor: 'text-[#60A5FA]' }
  if (t.includes('treino') || t.includes('ficha')) return { Icon: Dumbbell, cor: 'text-orange-400' }
  if (t.includes('dieta')) return { Icon: Apple, cor: 'text-[#22C55E]' }
  if (t.includes('anamnese')) return { Icon: ClipboardList, cor: 'text-purple-400' }
  if (t.includes('prescri')) return { Icon: Pill, cor: 'text-[#38BDF8]' }
  return { Icon: Bell, cor: 'text-[#94A3B8]' }
}

const fmtDataBR = (d) => {
  if (!d) return ''
  const partes = String(d).split(/[T ]/)[0].split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function BannerProfissional({ profissional, naoVisualizadas, onAbrirNotificacoes }) {
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

        <div className="flex items-center gap-3 mt-4">
          <h2 className="text-white text-xl font-bold">{profissional.nome}</h2>
          <button
            type="button"
            title="Notificações"
            onClick={onAbrirNotificacoes}
            className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-[var(--sf-border-strong)] text-[#60A5FA] hover:bg-[#2563EB]/15 hover:border-[#60A5FA] transition-colors shadow-[0_0_12px_rgba(37,99,235,0.25)]"
          >
            <Bell size={15} />
            {naoVisualizadas > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-[var(--sf-red)] text-white text-[9px] font-bold flex items-center justify-center">
                {naoVisualizadas}
              </span>
            )}
          </button>
        </div>

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
  const [notifAberto, setNotifAberto] = useState(false)

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

  const abrirNotificacoes = () => {
    setNotifAberto(true)
    if ((home?.nao_visualizadas || 0) > 0) {
      marcarNotificacoesVisualizadasAluno()
        .then(() => setHome(prev => prev ? { ...prev, nao_visualizadas: 0 } : prev))
        .catch(err => console.warn('Falha ao marcar notificações visualizadas:', err))
    }
  }

  const profissional = home?.profissional || profissionalStore
  const dadosAluno = home?.aluno || aluno
  const pendencias = home?.pendencias || {}
  const flags = dadosAluno?.flags
  const notificacoes = home?.notificacoes || []
  const cards = (home?.cards || []).filter(c => {
    if (c.id === 'anamnese' && !pendencias.anamnese) return false
    return true
  })

  const hojeISO = new Date().toISOString().slice(0, 10)
  const proximosFuturos = proximos.filter(p => {
    const d = String(p.data_agendada || p.data || p.date || '').split(/[T ]/)[0]
    return d >= hojeISO
  })

  const temPendencia = !!(pendencias.feedback || pendencias.feedback_agendado_formulario || pendencias.anamnese)

  const handleCardClick = (card) => () => {
    const link = resolveCardLink(card, pendencias, flags)
    if (link.disabled) return
    if (link.reactPath) navigate(link.reactPath)
    else if (link.href) window.open(link.href, '_blank', 'noopener')
  }

  const irPraPendencia = () => {
    if (pendencias.feedback) navigate(`/aluno/feedbacks/${pendencias.feedback}`)
    else if (pendencias.feedback_agendado_formulario) window.open(`${FRAPPE_URL}/verificar_feedback?form=${encodeURIComponent(pendencias.feedback_agendado_formulario)}`, '_blank', 'noopener')
    else if (pendencias.anamnese) navigate(`/aluno/anamneses/${pendencias.anamnese}`)
  }

  const badgePorCard = (id) => {
    if (id === 'anamnese' && pendencias.anamnese) return '1'
    if (id === 'feedback' && (pendencias.feedback || pendencias.feedback_agendado_formulario)) return '1'
    return null
  }

  const textoPendencia = () => {
    const itens = []
    if (pendencias.anamnese) itens.push('uma anamnese')
    if (pendencias.feedback || pendencias.feedback_agendado_formulario) itens.push('um feedback')
    return itens.join(' e ')
  }

  return (
    <div className="pb-8 bg-[var(--sf-bg)] min-h-full">
      <BannerProfissional
        profissional={profissional}
        naoVisualizadas={home?.nao_visualizadas || 0}
        onAbrirNotificacoes={abrirNotificacoes}
      />

      {temPendencia && (
        <div className="px-4 mt-2">
          <AlertCard
            variant="info"
            titulo={`Você tem ${textoPendencia()} pendente.`}
            descricao="Toque pra responder."
            onClick={irPraPendencia}
          />
        </div>
      )}

      {proximosFuturos.length > 0 && (
        <section className="px-4 mt-6">
          <SectionHeader
            icon={<Calendar size={15} />}
            label="Próximos feedbacks"
          />
          <div className="flex flex-col gap-2">
            {proximosFuturos.map((p, i) => {
              const data = p.data_agendada || p.data || p.date
              return (
                <GlassCard
                  key={p.name || i}
                  as="div"
                  className="px-4 py-3 flex items-center gap-4"
                >
                  <DataChip data={data} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold truncate">
                      {p.titulo || p.formulario_titulo || 'Feedback'}
                    </p>
                    <p className="text-[var(--sf-text-soft)] text-xs mt-0.5">{fmtDataBR(data)}</p>
                  </div>
                  <ChevronRight size={18} className="text-[var(--sf-text-soft)] shrink-0" />
                </GlassCard>
              )
            })}
          </div>
        </section>
      )}

      <section className="px-4 mt-6">
        <SectionHeader
          icon={<LayoutGrid size={15} />}
          label="Meus módulos"
        />
        {carregando && cards.length === 0 ? (
          <div className="h-32 flex items-center justify-center"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {cards.map(card => {
              const link = resolveCardLink(card, pendencias, flags)
              const IconComp = ICON_POR_ID[card.id] || Dumbbell
              return (
                <ModuleCard
                  key={card.id}
                  icon={<IconComp size={18} strokeWidth={1.6} />}
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

      {notifAberto && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setNotifAberto(false)}
          />
          <div className="fixed left-3 right-3 top-16 z-50 max-h-[75vh] flex flex-col bg-[var(--sf-bg)] border border-[var(--sf-border)] rounded-2xl shadow-[0_0_40px_rgba(37,99,235,0.25)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--sf-border)] flex items-center justify-between bg-gradient-to-r from-[var(--sf-bg)] to-[var(--sf-surface-2)]">
              <div>
                <h3 className="text-white text-sm font-bold">Notificações</h3>
                <p className="text-[var(--sf-text-soft)] text-xs mt-0.5">
                  {(home?.nao_visualizadas || 0) > 0
                    ? `${home.nao_visualizadas} nova${home.nao_visualizadas > 1 ? 's' : ''}`
                    : 'Nenhuma nova'}
                </p>
              </div>
              <button
                onClick={() => setNotifAberto(false)}
                className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-white border border-[var(--sf-border)] hover:border-[var(--sf-border-strong)] rounded-lg transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {notificacoes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell size={32} className="text-[var(--sf-text-soft)] mb-3" />
                  <p className="text-[var(--sf-text-muted)] text-sm">Nada por aqui ainda.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {notificacoes.map((n, i) => {
                    const externa = n.url && !n.url.startsWith('/aluno') && !n.url.startsWith(window.location.origin)
                    const { Icon, cor } = iconePorTitulo(n.titulo)
                    const clicavel = !!n.url
                    const onClick = () => {
                      if (!n.url) return
                      setNotifAberto(false)
                      if (externa) window.open(n.url, '_blank', 'noopener')
                      else navigate(n.url.replace(window.location.origin, ''))
                    }
                    return (
                      <div
                        key={n.name || i}
                        className={`relative px-3 py-2.5 rounded-xl border
                          ${n.visualizado
                            ? 'bg-[var(--sf-surface)] border-[var(--sf-border)]'
                            : 'bg-[var(--sf-surface-2)] border-[var(--sf-border-strong)] shadow-[0_0_12px_rgba(37,99,235,0.15)]'
                          }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-lg border border-[var(--sf-border)] bg-[var(--sf-bg)] flex items-center justify-center shrink-0 ${cor}`}>
                            <Icon size={13} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold leading-snug">{n.titulo}</p>
                            {n.descricao && (
                              <p className="text-[var(--sf-text-muted)] text-[11px] leading-relaxed mt-0.5">{n.descricao}</p>
                            )}
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[#60A5FA] text-[10px] font-medium">{fmtRelativo(n.creation)}</span>
                              {clicavel && (
                                <button
                                  onClick={onClick}
                                  className="text-[#60A5FA] text-[11px] font-bold flex items-center gap-0.5 hover:underline"
                                >
                                  Abrir <ChevronRight size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
