import { useEffect, useState } from 'react'
import client from '../api/client'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, novos: 0, faltaAssinar: 0, faltaEntregar: 0 })
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDados() }, [])

  async function fetchDados() {
    try {
      const res = await client.get('/api/resource/Aluno', {
        params: {
          fields: JSON.stringify(["name","nome_completo","email","telefone","foto","enabled","creation"]),
          limit: 50
        }
      })
      const lista = res.data.data || []
      setAlunos(lista)
      setStats({
        total: lista.length,
        novos: lista.filter(a => {
          const d = new Date(a.creation)
          const now = new Date()
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length,
        faltaAssinar: lista.filter(a => !a.enabled).length,
        faltaEntregar: 0,
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
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
            <p className="text-white text-4xl font-bold mb-1">{loading ? '—' : stat.value}</p>
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
              <th className="text-left text-white text-xs font-semibold px-6 py-3 tracking-wider">ALUNO</th>
              <th className="text-left text-white text-xs font-semibold px-6 py-3 tracking-wider">STATUS</th>
              <th className="text-right text-white text-xs font-semibold px-6 py-3 tracking-wider">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center text-gray-400 py-12">Carregando...</td></tr>
            ) : alunos.map((aluno) => (
              <tr key={aluno.name} className="border-t border-[#323238] hover:bg-[#323238] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#850000] flex items-center justify-center text-white text-xs font-bold">
                      {aluno.nome_completo?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-white font-medium">{aluno.nome_completo || aluno.name}</p>
                      {aluno.email && <p className="text-gray-500 text-xs">{aluno.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full ${aluno.enabled ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                    {aluno.enabled ? '✓ Ativo' : '✗ Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-white transition-colors text-lg">⋮</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}