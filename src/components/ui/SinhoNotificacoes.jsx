import { useState, useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getNotificacoesProfissional, marcarNotificacoesLidas } from '../../api/notificacoes'

const POLL_MS = 60_000

function formatarData(creation) {
  if (!creation) return ''
  const d = new Date(creation)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SinhoNotificacoes() {
  const [notifs, setNotifs] = useState([])
  const [naoLidas, setNaoLidas] = useState(0)
  const [aberto, setAberto] = useState(false)
  const wrapRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  async function buscar() {
    try {
      const data = await getNotificacoesProfissional()
      setNotifs(data.notificacoes || [])
      setNaoLidas(data.nao_lidas || 0)
    } catch {
      // silencioso — usuário pode não ser profissional
    }
  }

  useEffect(() => {
    buscar()
    const id = setInterval(buscar, POLL_MS)
    return () => clearInterval(id)
  }, [])

  // rebusca a cada troca de rota
  useEffect(() => {
    buscar()
  }, [location.pathname])

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function marcarTodas() {
    const names = notifs.filter(n => !n.lida).map(n => n.name)
    setNotifs(prev => prev.map(n => ({ ...n, lida: 1 })))
    setNaoLidas(0)
    try { await marcarNotificacoesLidas(names) } catch {}
  }

  async function clicarNotif(notif) {
    setAberto(false)
    if (!notif.lida) {
      setNotifs(prev => prev.map(n => n.name === notif.name ? { ...n, lida: 1 } : n))
      setNaoLidas(prev => Math.max(0, prev - 1))
      try { await marcarNotificacoesLidas([notif.name]) } catch {}
    }
    if (notif.url) navigate(notif.url)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setAberto(v => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/8 transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-[3px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-[#1e1e23] border border-[#323238] rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#323238]">
            <span className="text-sm font-semibold text-white">Notificações</span>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-[#323238]/60">
            {notifs.length === 0 ? (
              <li className="px-4 py-5 text-center text-sm text-gray-500">
                Nenhuma notificação
              </li>
            ) : (
              notifs.map(n => (
                <li
                  key={n.name}
                  onClick={() => clicarNotif(n)}
                  className={`px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors ${!n.lida ? 'border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                >
                  <p className={`text-sm font-medium leading-snug ${n.lida ? 'text-gray-400' : 'text-white'}`}>
                    {n.titulo}
                  </p>
                  {n.descricao && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.descricao}</p>
                  )}
                  <p className="text-[11px] text-gray-600 mt-1">{formatarData(n.creation)}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
