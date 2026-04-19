import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw, Salad, ChevronRight } from 'lucide-react'
import { listarDietas } from '../../api/dietas'
import { Card, Badge, Spinner, EmptyState, PageHeader, Button, Input } from '../../components/ui'
import { tw } from '../../styles/tokens'

const formatDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export default function DietaListagem() {
  const navigate = useNavigate()
  const [dietas, setDietas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const searchTimeout = useRef(null)

  useEffect(() => {
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setQuery(search)
      setPage(1)
    }, 400)
  }, [search])

  const fetchDietas = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarDietas({ busca: query, page, limit: 20 })
      setDietas(res.list)
      setHasMore(res.hasMore)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [query, page])

  useEffect(() => { fetchDietas() }, [fetchDietas])

  function getStatusDieta(d) {
    const hoje = new Date().toISOString().split('T')[0]
    if (!d.date) return { label: 'Rascunho', variant: 'default' }
    if (!d.final_date || d.final_date >= hoje) return { label: 'Ativa', variant: 'success' }
    return { label: 'Inativa', variant: 'danger' }
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Dietas"
        description="Todas as dietas cadastradas · mais recentes primeiro"
        action={
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" icon={RefreshCw} loading={loading} onClick={fetchDietas} />
            <Button variant="primary" onClick={() => navigate('/dietas/nova')}>
              + Nova Dieta
            </Button>
          </div>
        }
      />

      {/* Busca */}
      <div className="mb-6 max-w-md">
        <Input
          value={search}
          onChange={setSearch}
          placeholder="Buscar por aluno..."
          icon={Search}
          onClear={() => setSearch('')}
        />
      </div>

      {/* Lista */}
      {loading ? <Spinner /> : dietas.length === 0 ? (
        <EmptyState
          icon={Salad}
          title={query ? 'Nenhuma dieta encontrada' : 'Nenhuma dieta cadastrada'}
          description={query ? `Sem resultados para "${query}"` : 'As dietas aparecerão aqui'}
        />
      ) : (
        <Card>
          {dietas.map((dieta, i) => {
            const status = getStatusDieta(dieta)
            return (
              <button
                key={dieta.name}
                onClick={() => navigate(`/dietas/${dieta.name}`)}
                className={`w-full text-left flex items-center gap-4 px-5 py-4 hover:bg-[#323238] transition-colors group ${i < dietas.length - 1 ? tw.dividerBottom : ''}`}
              >
                {/* Ícone */}
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Salad size={18} className="text-orange-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`${tw.title} text-sm truncate`}>
                      {dieta.nome_completo || dieta.aluno || dieta.name}
                    </p>
                    <Badge variant={status.variant} size="sm">{status.label}</Badge>
                  </div>
                  <p className={`${tw.meta} text-xs`}>
                    {dieta.strategy || 'Sem estratégia'}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {dieta.week_days && (
                      <span className={`${tw.disabled} text-xs`}>{dieta.week_days}</span>
                    )}
                    {dieta.date && (
                      <span className={`${tw.disabled} text-xs`}>
                        {formatDate(dieta.date)}
                        {dieta.final_date && ` → ${formatDate(dieta.final_date)}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Kcal */}
                {dieta.total_calories > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 font-semibold flex-shrink-0">
                    {dieta.total_calories} kcal
                  </span>
                )}

                <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-300 transition-colors flex-shrink-0" />
              </button>
            )
          })}
        </Card>
      )}

      {/* Paginação */}
      {!loading && dietas.length > 0 && (
        <div className="flex items-center justify-between mt-6">
          <p className={`${tw.meta} text-sm`}>
            Página {page} · {dietas.length} dieta{dietas.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ← Anterior
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
              Próxima →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}