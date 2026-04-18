import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { logout } from '../api/auth'
import client from '../api/client'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [stats, setStats] = useState({
    total: 0, novos: 0, faltaAssinar: 0, faltaEntregar: 0
  })
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDados()
  }, [])

  async function fetchDados() {
    try {
      const res = await client.get('/api/resource/Aluno', {
        params: {
          fields: JSON.stringify(["name", "nome_completo", "email", "telefone", "enabled", "profissional", "foto", "sexo"]),
          limit: 50
        }
      })
      console.log('RESULTADO:', res.data)
      const lista = res.data.data || []
      setAlunos(lista)
      setStats({
        total: lista.length,
        novos: 0,
        faltaAssinar: lista.filter(a => !a.enabled).length,
        faltaEntregar: 0,
      })
    } catch (err) {
      console.error('ERRO:', err.response)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logout()
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#202024] flex">

      {/* Sidebar */}
      <aside className="w-64 bg-[#29292e] border-r border-[#323238] flex flex-col">
        <div className="p-6 border-b border-[#323238]">
          <h1 className="text-2xl font-bold text-white">
            Shape<span className="text-[#850000]">fy</span>
          </h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { label: 'Meus Alunos', icon: '👥', active: true },
            { label: 'Hub de Alunos', icon: '🏠' },
            { label: 'Avaliações Corporais', icon: '📊' },
            { label: 'Fichas de Treino', icon: '💪' },
            { label: 'Dietas', icon: '🥗' },
            { label: 'Feedbacks Recebidos', icon: '💬' },
            { label: 'Treinos Realizados', icon: '🏋️' },
            { label: 'Banco de Textos', icon: '📝' },
          ].map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${item.active
                  ? 'bg-[#850000] text-white'
                  : 'text-gray-400 hover:bg-[#323238] hover:text-white'
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#323238]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-[#323238] hover:text-white transition-colors"
          >
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="bg-[#29292e] border-b border-[#323238] px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white text-2xl font-bold">GESTÃO CONSULTORIA</h2>
            <p className="text-gray-400 text-sm mt-0.5">Shapefy · Painel Principal</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-white text-sm font-medium">Administrador</p>
              <p className="text-gray-400 text-xs">{user}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#850000] flex items-center justify-center text-white font-bold text-sm">
              {user?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'TOTAL DE ALUNOS', value: stats.total, sub: 'Base total de cadastros', icon: '👥' },
              { label: 'NOVOS (MÊS)', value: stats.novos, sub: 'Crescimento Mensal', icon: '➕' },
              { label: 'FALTA ASSINAR', value: stats.faltaAssinar, sub: 'Contratos pendentes', icon: '📋' },
              { label: 'FALTA ENTREGAR', value: stats.faltaEntregar, sub: 'Alunos sem material', icon: '✅' },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#29292e] border border-[#323238] rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-gray-400 text-xs font-medium tracking-wider">{stat.label}</p>
                  <span className="text-xl">{stat.icon}</span>
                </div>
                <p className="text-white text-4xl font-bold mb-1">
                  {loading ? '—' : stat.value}
                </p>
                <p className="text-gray-500 text-xs">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabela */}
          <div className="bg-[#29292e] border border-[#323238] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#323238] flex items-center justify-between">
              <input
                placeholder="Buscar aluno..."
                className="bg-[#1a1a1a] border border-[#323238] rounded-lg px-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#850000] w-64"
              />
              <button className="bg-[#850000] hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                + Novo Aluno
              </button>
            </div>

            <table className="w-full">
              <thead>
                <tr className="bg-[#1a1a1a]">
                  <th className="text-left text-white text-xs font-semibold px-6 py-3 tracking-wider">DATA ENTRADA</th>
                  <th className="text-left text-white text-xs font-semibold px-6 py-3 tracking-wider">ALUNO</th>
                  <th className="text-left text-white text-xs font-semibold px-6 py-3 tracking-wider">STATUS</th>
                  <th className="text-right text-white text-xs font-semibold px-6 py-3 tracking-wider">AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-12">
                      Carregando alunos...
                    </td>
                  </tr>
                ) : alunos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-12">
                      Nenhum aluno encontrado.
                    </td>
                  </tr>
                ) : (
                  alunos.map((aluno) => (
                    <tr key={aluno.name} className="border-t border-[#323238] hover:bg-[#323238] transition-colors">
                      <td className="px-6 py-4 text-gray-400 text-sm">—</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {aluno.foto ? (
                            <img src={aluno.foto} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#850000] flex items-center justify-center text-white text-xs font-bold">
                              {aluno.nome_completo?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{aluno.nome_completo || aluno.name}</p>
                            {aluno.email && <p className="text-gray-500 text-xs">{aluno.email}</p>}
                            {aluno.telefone && <p className="text-gray-500 text-xs">{aluno.telefone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full
      ${aluno.enabled
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}>
                          {aluno.enabled ? '✓ Ativo' : '✗ Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-white transition-colors text-lg">⋮</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>
    </div>
  )
}