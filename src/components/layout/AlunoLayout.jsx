import { LogOut } from 'lucide-react'
import { Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function AlunoLayout() {
  const navigate = useNavigate()
  const aluno = useAuthStore((s) => s.aluno)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  const nome = aluno?.nome_completo || 'Aluno'
  const primeiraLetra = nome.charAt(0).toUpperCase()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col">
      <header className="bg-[#29292e] border-b border-[#323238] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-white text-base font-bold tracking-tight">
            Shape<span className="text-[#2563eb]">fy</span>
          </h1>
          <span className="text-gray-600">·</span>
          <p className="text-gray-400 text-xs font-medium truncate">{nome}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {primeiraLetra}
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="h-9 w-9 flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
