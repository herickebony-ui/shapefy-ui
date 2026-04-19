import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, RefreshCw, ChevronLeft, ChevronRight, Trash2, User } from 'lucide-react'
import { listarAlunos, excluirAluno } from '../../api/alunos'
import { listarAnamneses } from '../../api/anamneses'
import { Avatar, Badge, EmptyState, Spinner, PageHeader, Input, Button } from '../../components/ui'
import { tw } from '../../styles/tokens'

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
          <Button
            variant="secondary"
            size="icon"
            icon={RefreshCw}
            loading={loading}
            onClick={fetchAlunos}
          />
        }
      />

      {/* Busca */}
      <div className="mb-6 max-w-md">
        <Input
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome..."
          icon={Search}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Lista */}
      {loading ? <Spinner /> : alunos.length === 0 ? (
        <EmptyState
          icon={User}
          title={query ? 'Nenhum aluno encontrado' : 'Nenhum aluno cadastrado'}
          description={query ? `Sem resultados para "${query}"` : 'Os alunos aparecerão aqui'}
        />
      ) : (
        <div className={`${tw.card} overflow-hidden`}>
          {alunos.map((aluno, i) => {
            const anamnese = getAnamnese(aluno.name)
            return (
              <div
                key={aluno.name}
                className={`flex items-center gap-4 px-4 py-3.5 hover:bg-[#323238] transition-colors group cursor-pointer ${i < alunos.length - 1 ? tw.dividerBottom : ''}`}
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
          <p className={`${tw.meta} text-sm`}>Página {page} · {alunos.length} aluno{alunos.length !== 1 ? 's' : ''}</p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" icon={ChevronLeft} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} />
            <span className={`${tw.meta} text-sm px-2`}>Página {page}</span>
            <Button variant="secondary" size="icon" icon={ChevronRight} onClick={() => setPage(p => p + 1)} disabled={!hasMore} />
          </div>
        </div>
      )}
    </div>
  )
}