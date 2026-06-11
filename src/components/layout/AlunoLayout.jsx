import { useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { logoutAluno } from '../../api/aluno'

export default function AlunoLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const clearAuth = useAuthStore((s) => s.clearAuth)

  useEffect(() => {
    localStorage.setItem('aluno_last_path', location.pathname + location.search)
  }, [location])

  const handleLogout = async () => {
    await logoutAluno()
    localStorage.removeItem('aluno_last_path')
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--sf-bg)] flex flex-col relative">
      {/* Logout flutuante — canto superior direito, sobre o conteudo. Sem barra fixa. */}
      <button
        onClick={handleLogout}
        title="Sair"
        className="fixed top-3 right-3 z-30 h-9 w-9 flex items-center justify-center rounded-full bg-black/40 backdrop-blur text-white/80 border border-white/15 hover:bg-black/60 hover:text-white transition-colors shadow-lg"
        style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <LogOut size={14} />
      </button>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
