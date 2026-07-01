import { useState, useEffect } from 'react'
import { Bell, X, CheckCheck, ChevronRight, EyeOff } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { pollNotificacoesAluno, marcarNotificacoesVisualizadasAluno } from '../../api/aluno'

const POLL_MS = 60_000

function isDevolutiva(n) {
  return n.titulo?.toLowerCase().includes('devolutiva')
}

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
  const [expandidos, setExpandidos] = useState(new Set())
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

  async function marcarLida(notif) {
    if (!notif.visualizado) {
      setNotifs(prev => prev.map(n => n.name === notif.name ? { ...n, visualizado: true } : n))
      setNaoLidas(prev => Math.max(0, prev - 1))
      try { await marcarNotificacoesVisualizadasAluno() } catch {}
    }
  }

  function desver(e, notif) {
    e.stopPropagation()
    setNotifs(prev => prev.map(n => n.name === notif.name ? { ...n, visualizado: false } : n))
    setNaoLidas(prev => prev + 1)
  }

  function toggleExpandido(name) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function clicarNotif(notif) {
    if (isDevolutiva(notif)) {
      // Devolutiva: expande/colapsa no lugar, não navega
      toggleExpandido(notif.name)
      await marcarLida(notif)
      return
    }
    // Outros: navega
    setAberto(false)
    await marcarLida(notif)
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
            {/* Header */}
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
                <div className="flex items-center gap-2 shrink-0 ml-auto">
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

            {/* Lista */}
            <div className="overflow-y-auto flex-1 py-2 px-3">
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Bell size={28} className="text-[#64748B]/40" />
                  <p className="text-[#64748B] text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {notifs.map(n => {
                    const expandido = expandidos.has(n.name)
                    const devolutiva = isDevolutiva(n)
                    return (
                      <button
                        key={n.name}
                        onClick={() => clicarNotif(n)}
                        className={`w-full flex items-start gap-3 px-3 py-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                          !n.visualizado
                            ? 'bg-[rgba(37,99,235,0.12)] border border-[rgba(59,130,246,0.22)] hover:bg-[rgba(37,99,235,0.18)]'
                            : 'border border-transparent hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-bold leading-snug ${expandido ? '' : 'line-clamp-2'} text-white`}>
                            {n.titulo}
                          </p>
                          {n.descricao && (
                            <p className={`text-xs text-[#CBD5E1] mt-0.5 leading-relaxed ${expandido ? '' : 'line-clamp-2'}`}>
                              {n.descricao}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-[#60A5FA]/50 text-[10px] font-medium">
                              {formatarData(n.creation)}
                            </p>
                            {devolutiva && (
                              <span className="text-[#60A5FA]/40 text-[10px]">
                                {expandido ? '· toque para recolher' : '· toque para ler tudo'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {!n.visualizado && (
                            <span className="h-[18px] min-w-[18px] px-1.5 rounded bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(37,99,235,0.6)]">
                              Novo
                            </span>
                          )}
                          {n.visualizado && (
                            <button
                              onClick={(e) => desver(e, n)}
                              title="Marcar como não lida"
                              className="h-6 w-6 flex items-center justify-center rounded-lg text-[#475569] hover:text-[#93C5FD] hover:bg-[rgba(37,99,235,0.15)] transition-colors"
                            >
                              <EyeOff size={11} />
                            </button>
                          )}
                          {!devolutiva && <ChevronRight size={13} className="text-[#64748B]" />}
                        </div>
                      </button>
                    )
                  })}
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
