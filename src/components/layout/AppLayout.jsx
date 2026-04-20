import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Users, Home, BarChart2, Dumbbell, ClipboardList,
  MessageSquare, Activity, FileText, LogOut, ListChecks,
  PanelLeftClose, PanelLeftOpen, UtensilsCrossed, BookOpen,
} from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import { logout } from '../../api/auth'

const NAV_ITEMS = [
  { type: 'divider', label: 'Dashboard' },
  { id: 'main',      label: 'Meus Alunos',          icon: Users,        path: '/' },
  { type: 'divider', label: 'Central de Alunos' },
  { id: 'alunos',    label: 'Hub de Alunos',         icon: Home,         path: '/alunos' },
  { id: 'avaliacoes',label: 'Avaliações Corporais',  icon: BarChart2,    path: '/avaliacoes' },
  { type: 'divider', label: 'Module Trainning' },
  { id: 'fichas',    label: 'Fichas de Treino',      icon: Dumbbell,     path: '/fichas' },
  { id: 'treinos',   label: 'Treinos Realizados',    icon: Activity,     path: '/treinos' },
  { id: 'exercicios',label: 'Gerenciar Exercícios',  icon: ListChecks,   path: '/exercicios' },
  { type: 'divider', label: 'Module Diet' },
  { id: 'dietas',    label: 'Dietas',                icon: ClipboardList,    path: '/dietas' },
  { id: 'alimentos',         label: 'Cadastrar Alimentos',  icon: UtensilsCrossed, path: '/alimentos' },
  { id: 'refeicoes-prontas', label: 'Cadastrar Refeições Prontas',   icon: BookOpen,        path: '/refeicoes-prontas' },
  { type: 'divider', label: 'Gerenciamento de Alunos' },
  { id: 'feedbacks', label: 'Feedbacks Recebidos',   icon: MessageSquare,path: '/feedbacks' },  
  { type: 'divider', label: 'Gestão Consultoria' },
  { id: 'textos',    label: 'Banco de Textos',       icon: FileText,     path: '/banco-textos' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const [expanded, setExpanded] = useState(false)

  async function handleLogout() {
    await logout()
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#202024] flex">

      {/* Overlay mobile */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed md:sticky md:top-0 md:h-screen inset-y-0 left-0 z-[60] flex flex-col flex-shrink-0
        bg-[#222226] border-r border-[#323238] shadow-2xl transition-all duration-300 ease-in-out
        ${expanded ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0 md:w-20'}
      `}>

        {/* Header da sidebar */}
        <div className={`h-16 flex items-center border-b border-[#323238] bg-[#1a1a1a]/50
          ${expanded ? 'justify-between px-4' : 'justify-center'}
        `}>
          {expanded ? (
            <div className="flex items-center gap-2 text-white font-bold tracking-wider">
              <div className="p-1.5 bg-[#850000] rounded-lg">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm uppercase tracking-widest">Shapefy</span>
            </div>
          ) : (
            <div className="p-2 bg-[#850000] rounded-xl">
              <Activity className="w-5 h-5 text-white" />
            </div>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1a1a1a] transition-colors"
          >
            {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item, idx) => {
            if (item.type === 'divider') {
              return expanded ? (
                <p key={idx} className="px-3 pt-4 pb-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {item.label}
                </p>
              ) : (
                <div key={idx} className="my-3 border-t border-[#323238] mx-2" />
              )
            }

            const active = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => { navigate(item.path); if (window.innerWidth < 768) setExpanded(false) }}
                title={!expanded ? item.label : ''}
                className={`w-full flex items-center rounded-xl transition-all text-sm font-medium text-left
                  ${expanded ? 'gap-3 px-4 py-2.5' : 'justify-center py-2.5'}
                  ${active
                    ? 'bg-[#850000] text-white'
                    : 'text-gray-400 hover:bg-[#323238] hover:text-white'
                  }
                `}
              >
                <Icon size={18} className="flex-shrink-0" />
                {expanded && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[#323238] bg-[#1a1a1a]/30">
          <button
            onClick={handleLogout}
            title={!expanded ? 'Sair' : ''}
            className={`w-full flex items-center rounded-xl transition-colors text-gray-400
              hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20
              ${expanded ? 'px-4 py-2 gap-3' : 'justify-center py-2'}
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {expanded && <span className="text-xs font-bold uppercase">Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header className="bg-[#29292e] border-b border-[#323238] px-6 py-4 flex items-center justify-between flex-shrink-0">
          {/* Botão mobile para abrir sidebar */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setExpanded(true)}
              className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#323238] transition-colors"
            >
              <PanelLeftOpen size={18} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-1 h-7 bg-[#850000] rounded-full" />
              <div>
                <h2 className="text-white text-base font-bold tracking-wide uppercase">
                  Gestão Consultoria
                </h2>
                <p className="text-gray-500 text-xs">Shapefy · Painel Principal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">Administrador</p>
              <p className="text-gray-500 text-xs">{user}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#850000] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
