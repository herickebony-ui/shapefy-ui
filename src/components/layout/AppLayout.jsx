import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Users, Home, BarChart2, Dumbbell, Salad, MessageSquare, Activity, FileText, LogOut } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { logout } from '../../api/auth'

const menuItems = [
  { label: 'Meus Alunos', icon: Users, path: '/' },
  { label: 'Hub de Alunos', icon: Home, path: '/alunos' },
  { label: 'Avaliações Corporais', icon: BarChart2, path: '/avaliacoes' },
  { label: 'Fichas de Treino', icon: Dumbbell, path: '/fichas' },
  { label: 'Dietas', icon: Salad, path: '/dietas' },
  { label: 'Feedbacks Recebidos', icon: MessageSquare, path: '/feedbacks' },
  { label: 'Treinos Realizados', icon: Activity, path: '/treinos' },
  { label: 'Banco de Textos', icon: FileText, path: '/banco-textos' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  async function handleLogout() {
    await logout()
    clearAuth()
    navigate('/login')
  }

  const nomeExibido = user?.split('@')[0] || 'Usuário'
  const inicial = nomeExibido.charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#202024] flex">

      {/* Sidebar */}
      <aside className="w-60 bg-[#29292e] border-r border-[#323238] flex flex-col flex-shrink-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#323238] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#850000] flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">
            Shape<span className="text-[#850000]">fy</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const active = location.pathname === item.path
            const Icon = item.icon
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                  ${active
                    ? 'bg-[#850000] text-white shadow-lg shadow-red-900/20'
                    : 'text-gray-400 hover:bg-[#323238] hover:text-gray-200'
                  }`}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-[#323238]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#202024] border border-[#323238] mb-2">
            <div className="w-7 h-7 rounded-full bg-[#850000] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {inicial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{nomeExibido}</p>
              <p className="text-gray-500 text-xs truncate">{user}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-[#323238] hover:text-gray-300 transition-colors"
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-[#29292e] border-b border-[#323238] px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-[#850000] rounded-full" />
            <div>
              <h2 className="text-white text-lg font-bold tracking-wide">GESTÃO CONSULTORIA</h2>
              <p className="text-gray-500 text-xs mt-0.5">Shapefy · Painel Principal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white text-sm font-medium">Administrador</p>
              <p className="text-gray-500 text-xs">{user}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#850000] flex items-center justify-center text-white font-bold text-sm border-2 border-[#323238]">
              {inicial}
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