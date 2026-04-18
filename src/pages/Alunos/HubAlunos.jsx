import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, X, User } from 'lucide-react'
import { listarAlunos, excluirAluno } from '../../api/alunos'
import { listarAnamneses } from '../../api/anamneses'
import { Avatar, Badge, EmptyState, Spinner, PageHeader } from '../../components/ui'

export default function HubAlunos() {
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [anamnesePorAluno, setAnamnesePorAluno] = useState({})
  const searchTimeout = useRef(null)

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setQuery(search)
      setPage(1)
    }, 400)
  }, [search])

  const fetchAlunos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarAlunos({ search: query, page, limit: 20 })
      setAlunos(res.list)
      setHasMore(res.hasMore)
      fetchAnamneses(res.list.map(a => a.name))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, page])

  useEffect(() => { fetchAlunos() }, [fetchAlunos])

  async function fetchAnamneses(ids) {
    if (!ids.length) return
    try {
      const map = {}
      await Promise.all(ids.map(async id => {
        const res = await listarAnamneses({ alunoId: id })
        if (res.list.length) map[id] = res.list
      }))
      setAnamnesePorAluno(prev => ({ ...prev, ...map }))
    } catch {}
  }

  async function handleExcluir(name, e) {
    e.stopPropagation()
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return
    try {
      await excluirAluno(name)
      setAlunos(prev => prev.filter(a => a.name !== name))
    } catch {
      alert('Erro ao excluir aluno.')
    }
  }

  function getAnamnese(id) {
    const lista = anamnesePorAluno[id] || []
    if (!lista.length) return null
    if (lista.find(a => a.status === 'Respondido')) return 'respondido'
    if (lista.find(a => a.status === 'Enviado')) return 'enviado'
    return 'pendente'
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Hub de Alunos"
        description="Hub central dos seus pacientes · mais recentes primeiro"
        action={
          <button
            onClick={fetchAlunos}
            disabled={loading}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        }
      />

      {/* Busca */}
      <div className="relative mb-6 max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-10 bg-[#1a1a1a] border border-[#323238] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#850000]/60 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? <Spinner /> : alunos.length === 0 ? (
        <EmptyState
          icon={User}
          title={query ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
          description={query ? `Sem resultados para "${query}"` : 'Os alunos aparecerão aqui'}
        />
      ) : (
        <div className="bg-[#29292e] border border-[#323238] rounded-xl overflow-hidden">
          {alunos.map((aluno, i) => {
            const anamnese = getAnamnese(aluno.name)
            return (
              <div
                key={aluno.name}
                className={`flex items-center gap-4 px-4 py-3.5 hover:bg-[#323238] transition-colors group cursor-pointer ${i < alunos.length - 1 ? 'border-b border-[#323238]' : ''}`}
              >
                <Avatar nome={aluno.nome_completo} foto={aluno.foto} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{aluno.nome_completo}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {aluno.email && <p className="text-gray-500 text-xs truncate">{aluno.email}</p>}
                    <div className="flex items-center gap-1.5">
                      {aluno.dieta === 1 && <Badge variant="orange" size="sm">D</Badge>}
                      {aluno.treino === 1 && <Badge variant="blue" size="sm">T</Badge>}
                      {anamnese === 'respondido' && <Badge variant="success" size="sm">✓ Anamnese</Badge>}
                      {anamnese === 'enviado' && <Badge variant="warning" size="sm">⏳ Anamnese</Badge>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleExcluir(aluno.name, e)}
                  className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginação */}
      {!loading && alunos.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-gray-500 text-sm">Página {page} · {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm text-gray-400 px-2">Página {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={!hasMore}
              className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#29292e] border border-[#323238] text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}