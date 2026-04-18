import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Users, Home, BarChart2, Dumbbell, ClipboardList,
  MessageSquare, Activity, FileText, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import { logout } from '../../api/auth'

const MENU = {
  main: [
    { label: 'Meus Alunos', icon: Users, path: '/' },
  ],
  shapefy: [
    { label: 'Hub de Alunos', icon: Home, path: '/alunos' },
    { label: 'Avaliações Corporais', icon: BarChart2, path: '/avaliacoes' },
    { label: 'Fichas de Treino', icon: Dumbbell, path: '/fichas' },
    { label: 'Dietas', icon: ClipboardList, path: '/dietas' },
    { label: 'Feedbacks Recebidos', icon: MessageSquare, path: '/feedbacks' },
    { label: 'Treinos Realizados', icon: Activity, path: '/treinos' },
    { label: 'Banco de Textos', icon: FileText, path: '/banco-textos' },
  ],
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  async function handleLogout() {
    await logout()
    clearAuth()
    navigate('/login')
  }

  const MenuItem = ({ item }) => {
    const active = location.pathname === item.path
    const Icon = item.icon
    return (
      <button
        onClick={() => navigate(item.path)}
        title={collapsed ? item.label : ''}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left
          ${active
            ? 'bg-[#850000] text-white shadow-lg'
            : 'text-gray-400 hover:bg-[#323238] hover:text-white'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <Icon size={18} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[#202024] flex">

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-[#29292e] border-r border-[#323238] flex flex-col flex-shrink-0 transition-all duration-300`}>

        {/* Logo */}
        <div className={`flex items-center border-b border-[#323238] px-4 py-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#850000] flex items-center justify-center flex-shrink-0">
                <Activity size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-sm tracking-widest uppercase">
                Shapefy
              </span>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded-lg bg-[#850000] flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#323238] text-gray-400 hover:text-white hover:bg-[#323238] transition-colors flex-shrink-0"
            >
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

          {/* Item principal */}
          {MENU.main.map(item => <MenuItem key={item.path} item={item} />)}

          {/* Seção Shapefy Module */}
          {!collapsed && (
            <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase px-3 pt-4 pb-1">
              Shapefy Module
            </p>
          )}
          {collapsed && <div className="my-2 border-t border-[#323238]" />}
          {MENU.shapefy.map(item => <MenuItem key={item.path} item={item} />)}

          {/* Seção Gestão */}
          {!collapsed && (
            <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase px-3 pt-4 pb-1">
              Gestão Consultoria
            </p>
          )}
          {collapsed && <div className="my-2 border-t border-[#323238]" />}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-[#323238] space-y-1">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="w-full flex items-center justify-center py-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#323238] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          ) : null}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:bg-[#323238] hover:text-white transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={17} className="flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-[#29292e] border-b border-[#323238] px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-1 h-7 bg-[#850000] rounded-full" />
            <div>
              <h2 className="text-white text-base font-bold tracking-wide uppercase">
                Gestão Consultoria
              </h2>
              <p className="text-gray-500 text-xs">Shapefy · Painel Principal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white text-sm font-medium">Administrador</p>
              <p className="text-gray-500 text-xs">{user}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#850000] flex items-center justify-center text-white font-bold text-sm">
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