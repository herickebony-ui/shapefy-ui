import { useState, useEffect } from 'react'
import { Bell, X, CheckCheck, ChevronRight } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { pollNotificacoesAluno, marcarNotificacoesVisualizadasAluno } from '../../api/aluno'

const POLL_MS = 60_000

// URLs de notificação podem vir como URLs absolutas do Frappe (ex: https://shapefy.online/preencher_feedback?name=XYZ).
// Mapeia para rotas React do aluno.
function resolverUrl(rawUrl) {
  if (!rawUrl) return '/aluno'
  if (rawUrl.startsWith('/aluno')) return rawUrl
  if (rawUrl.startsWith('/')) return `/aluno${rawUrl}`
  try {
    const u = new URL(rawUrl)
    const name = u.searchParams.get('name')
    if (u.pathname.includes('preencher_feedback') && name) return `/aluno/feedbacks/${name}`
    if (u.pathname.includes('preencher_anamnese') && name) return `/aluno/anamneses/${name}`
  } catch {}
  return '/aluno'
}

function formatarData(creation) {
  if (!creation) return ''
  const d = new Date(creation)
  const diffMin = Math.floor((Date.now() - d) / 60000)
  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `${diffMin} min atrás`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h atrás`
  const diffD = Math.floor(diffH / 24)
  if (diffD === 1) return 'ontem'
  if (diffD < 7) return `${diffD} dias atrás`
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function SinhoNotificacoesAluno() {
  const [notifs, setNotifs] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [aberto, setAberto] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  async function buscar() {
    try {
      const data = await pollNotificacoesAluno()
      setNotifs(data.notificacoes || [])
      setNaoLidas(data.nao_visualizadas || 0)
    } catch {}
  }

  useEffect(() => {
    buscar()
    const id = setInterval(buscar, POLL_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { buscar() }, [location.pathname])

  useEffect(() => {
    if (!aberto) return
    const onKey = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [aberto])

  async function marcarTodas() {
    setNotifs(prev => prev.map(n => ({ ...n, visualizado: true })))
    setNaoLidas(0)
    try { await marcarNotificacoesVisualizadasAluno() } catch {}
  }

  async function clicarNotif(notif) {
    setAberto(false)
    if (!notif.visualizado) {
      setNotifs(prev => prev.map(n => n.name === notif.name ? { ...n, visualizado: true } : n))
      setNaoLidas(prev => Math.max(0, prev - 1))
      try { await marcarNotificacoesVisualizadasAluno() } catch {}
    }
    navigate(resolverUrl(notif.url))
  }

  return (
    <>
      <button
        onClick={() => setAberto(v => !v)}
        className="relative h-9 w-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur text-white/80 border border-white/15 hover:bg-black/60 hover:text-white transition-colors shadow-lg"
        aria-label="Notificações"
      >
        <Bell size={14} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-[3px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[100] flex flex-col">
          {/* Painel — topo até ~62vh, estilo GlassCard */}
          <div
            className="flex flex-col rounded-b-3xl border-b border-x border-[rgba(59,130,246,0.24)] shadow-[0_0_34px_rgba(37,99,235,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
            style={{
              maxHeight: '62vh',
              background: 'radial-gradient(circle at 50% 0%, rgba(37,99,235,0.18), transparent 50%), rgba(5,7,13,0.97)',
            }}
          >
            {/* Header — padrão SectionHeader + título grande */}
            <div className="px-5 pt-5 pb-4 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Bell size={13} className="text-[#60A5FA]" />
                <span
                  className="text-[#93C5FD] uppercase"
                  style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em' }}
                >
                  Notificações
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                {naoLidas > 0 && (
                  <p className="text-white text-xl font-bold leading-tight">
                    {naoLidas} não lida{naoLidas > 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  {naoLidas > 0 && (
                    <button
                      onClick={marcarTodas}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(37,99,235,0.15)] border border-[rgba(59,130,246,0.28)] text-[#93C5FD] hover:bg-[rgba(37,99,235,0.25)] transition-colors"
                      style={{ fontSize: '11px', fontWeight: 700 }}
                    >
                      <CheckCheck size={12} />
                      Marcar lidas
                    </button>
                  )}
                  <button
                    onClick={() => setAberto(false)}
                    className="h-8 w-8 flex items-center justify-center rounded-xl border border-[rgba(59,130,246,0.2)] text-[#64748B] hover:text-white hover:border-[rgba(59,130,246,0.4)] transition-colors"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Divisor com glow */}
            <div className="h-px mx-5 shrink-0" style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)' }} />

            {/* Lista — padrão ModuleCard */}
            <div className="overflow-y-auto flex-1 py-2 px-3">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Bell size={28} className="text-[#64748B]/40" />
                  <p className="text-[#64748B] text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {notifs.map(n => (
                    <button
                      key={n.name}
                      onClick={() => clicarNotif(n)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                        !n.visualizado
                          ? 'bg-[rgba(37,99,235,0.12)] border border-[rgba(59,130,246,0.22)] hover:bg-[rgba(37,99,235,0.18)]'
                          : 'border border-transparent hover:bg-[rgba(255,255,255,0.04)]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-bold leading-snug truncate ${n.visualizado ? 'text-[#64748B]' : 'text-white'}`}>
                          {n.titulo}
                        </p>
                        {n.descricao && (
                          <p className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                            {n.descricao}
                          </p>
                        )}
                        <p className="text-[#60A5FA]/50 text-[10px] mt-1 font-medium">
                          {formatarData(n.creation)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!n.visualizado && (
                          <span className="h-[18px] min-w-[18px] px-1.5 rounded bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(37,99,235,0.6)]">
                            Novo
                          </span>
                        )}
                        <ChevronRight size={13} className="text-[#64748B]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overlay inferior — fecha ao clicar */}
          <div
            className="flex-1 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setAberto(false)}
          />
        </div>
      )}
    </>
  )
}
