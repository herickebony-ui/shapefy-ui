import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Edit2, Tag, Search } from 'lucide-react'
import { Button, Spinner, EmptyState, Badge, DataTable } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import { listarPlanos, buscarPlano } from '../../api/planosShapefy'
import { COLOR_DOT, COLOR_BADGE } from './constants'
import { formatCurrency } from './utils'
import PlanosModal from './PlanosModal'

export default function PlanosListagem() {
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Cache de detalhes (variações) por plano — carregado lazy ao expandir/abrir
  const [detalhes, setDetalhes] = useState({})

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const ativoParam = filtroAtivo === '' ? null : filtroAtivo === '1'
      const res = await listarPlanos({ search: busca, ativo: ativoParam, limit: 100 })
      setPlanos(res.list || [])
      // Carrega detalhes em paralelo (só nome_plano + valor da 1ª variação)
      const detalhesMap = {}
      await Promise.all(
        (res.list || []).map(async (p) => {
          try {
            const doc = await buscarPlano(p.name)
            detalhesMap[p.name] = doc
          } catch { detalhesMap[p.name] = null }
        })
      )
      setDetalhes(detalhesMap)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [busca, filtroAtivo])

  useEffect(() => { carregar() }, [carregar])

  const onMutate = () => {
    setModalOpen(false)
    carregar()
  }

  const lista = useMemo(() =>
    planos.map((p) => {
      const doc = detalhes[p.name]
      const variacoes = doc?.variacoes || []
      const primeira = variacoes[0]
      const ultima = variacoes[variacoes.length - 1]
      return {
        ...p,
        variacoes,
        valor_min: primeira?.valor_liquido_a_vista || 0,
        valor_max: ultima?.valor_liquido_a_vista || 0,
        qtd_variacoes: variacoes.length,
      }
    }),
  [planos, detalhes])

  const empty = !loading && lista.length === 0 ? {
    icon: Tag,
    title: busca ? 'Nenhum plano encontrado' : 'Você ainda não tem planos',
    description: busca
      ? `Sem resultados para "${busca}".`
      : 'Crie seu primeiro plano pra começar a lançar pagamentos.',
  } : null

  const columns = [
    {
      label: 'Plano',
      render: (row) => {
        const cls = COLOR_BADGE[row.cor] || COLOR_BADGE.slate
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-3 h-3 rounded-full shrink-0 ${COLOR_DOT[row.cor] || COLOR_DOT.slate}`} />
            <div className="min-w-0">
              <div className="font-bold text-white text-sm truncate">{row.nome_plano}</div>
              <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border mt-0.5 ${cls}`}>
                {row.cor}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      label: 'Variações',
      headerClass: 'hidden md:table-cell w-32 text-center',
      cellClass: 'hidden md:table-cell text-center',
      render: (row) => (
        <span className="text-xs text-gray-300">
          {row.qtd_variacoes
            ? `${row.qtd_variacoes} variaç${row.qtd_variacoes === 1 ? 'ão' : 'ões'}`
            : <span className="text-gray-600">—</span>}
        </span>
      ),
    },
    {
      label: 'Faixa de valor',
      headerClass: 'hidden md:table-cell w-44 text-right',
      cellClass: 'hidden md:table-cell text-right',
      render: (row) => {
        if (!row.qtd_variacoes) return <span className="text-gray-600">—</span>
        if (row.qtd_variacoes === 1 || row.valor_min === row.valor_max) {
          return <span className="font-mono text-sm text-white">{formatCurrency(row.valor_min)}</span>
        }
        return (
          <span className="font-mono text-sm text-white">
            {formatCurrency(row.valor_min)} <span className="text-gray-500">→</span> {formatCurrency(row.valor_max)}
          </span>
        )
      },
    },
    {
      label: 'Status',
      headerClass: 'w-24 text-center',
      cellClass: 'text-center',
      render: (row) => row.ativo
        ? <Badge variant="success" size="sm">Ativo</Badge>
        : <Badge variant="default" size="sm">Inativo</Badge>,
    },
    {
      label: 'Ações',
      headerClass: 'w-20 text-center',
      cellClass: 'text-center',
      render: () => (
        <button
          onClick={(e) => { e.stopPropagation(); setModalOpen(true) }}
          title="Editar plano"
          className="h-7 w-7 inline-flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
        >
          <Edit2 size={12} />
        </button>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Planos"
        subtitle="Catálogo de planos e variações usados nos pagamentos"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
              Novo plano
            </Button>
          </>
        }
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar plano…', icon: Search },
          {
            type: 'select', value: filtroAtivo, onChange: setFiltroAtivo,
            options: [
              { value: '', label: 'Todos' },
              { value: '1', label: 'Apenas ativos' },
              { value: '0', label: 'Apenas inativos' },
            ],
          },
        ]}
        loading={loading}
        empty={empty}
      >
        {!loading && lista.length > 0 && (
          <DataTable
            columns={columns}
            rows={lista}
            rowKey="name"
            onRowClick={() => setModalOpen(true)}
            page={1}
            pageSize={100}
          />
        )}
      </ListPage>

      <PlanosModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        planos={planos}
        onMutate={onMutate}
      />
    </>
  )
}
