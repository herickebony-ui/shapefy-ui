import { useEffect, useState } from 'react'
import { Users, Plus, ClipboardList, CheckSquare, Search, MoreVertical } from 'lucide-react'
import client from '../api/client'
import { Card, Avatar, Badge, Spinner, Input, Button } from '../components/ui'
import { tw } from '../styles/tokens'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, novos: 0, faltaAssinar: 0, faltaEntregar: 0 })
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => { fetchDados() }, [])

  async function fetchDados() {
    try {
      const res = await client.get('/api/resource/Aluno', {
        params: {
          fields: JSON.stringify(["name","nome_completo","email","foto","enabled","creation"]),
          limit: 50,
          order_by: 'creation desc'
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

  const alunosFiltrados = alunos.filter(a =>
    a.nome_completo?.toLowerCase().includes(busca.toLowerCase())
  )

  const statCards = [
    { label: 'TOTAL DE ALUNOS', value: stats.total, sub: 'Base total de cadastros', icon: Users, color: 'text-blue-400' },
    { label: 'NOVOS (MÊS)', value: stats.novos, sub: 'Crescimento Mensal', icon: Plus, color: 'text-green-400' },
    { label: 'FALTA ASSINAR', value: stats.faltaAssinar, sub: 'Contratos pendentes', icon: ClipboardList, color: 'text-yellow-400' },
    { label: 'FALTA ENTREGAR', value: stats.faltaEntregar, sub: 'Alunos sem material', icon: CheckSquare, color: 'text-purple-400' },
  ]

  return (
    <div className="p-8">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-gray-400 text-xs font-medium tracking-wider">{stat.label}</p>
                <Icon size={20} className={stat.color} />
              </div>
              <p className="text-white text-4xl font-bold mb-1">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-gray-500 text-xs">{stat.sub}</p>
            </Card>
          )
        })}
      </div>

      {/* Tabela */}
      <Card>
        <div className={`px-6 py-4 ${tw.dividerBottom} flex items-center justify-between`}>
          <div className="w-64">
            <Input
              value={busca}
              onChange={setBusca}
              placeholder="Buscar aluno..."
              icon={Search}
              onClear={() => setBusca('')}
            />
          </div>
          <Button variant="primary" icon={Plus}>Novo Aluno</Button>
        </div>

        <table className="w-full">
          <thead>
            <tr className={tw.thead}>
              <th className="text-left text-white text-xs font-semibold px-6 py-3 tracking-wider">ALUNO</th>
              <th className="text-left text-white text-xs font-semibold px-6 py-3 tracking-wider">STATUS</th>
              <th className="text-right text-white text-xs font-semibold px-6 py-3 tracking-wider">AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3}><Spinner /></td>
              </tr>
            ) : alunosFiltrados.map((aluno) => (
              <tr key={aluno.name} className={tw.tbodyRow}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar nome={aluno.nome_completo} foto={aluno.foto} size="sm" />
                    <div>
                      <p className="text-white font-medium text-sm">{aluno.nome_completo || aluno.name}</p>
                      {aluno.email && <p className="text-gray-500 text-xs">{aluno.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={aluno.enabled ? 'success' : 'danger'}>
                    {aluno.enabled ? '✓ Ativo' : '✗ Inativo'}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="icon" icon={MoreVertical} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}