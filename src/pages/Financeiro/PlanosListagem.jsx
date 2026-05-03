import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Edit2, Trash2, Layers, ArrowLeft, Save } from 'lucide-react'
import { Button, Spinner, Badge, DataTable } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import { listarPlanos, buscarPlano, criarPlano, salvarPlano, excluirPlano } from '../../api/planosShapefy'
import { formatCurrency } from './utils'
import { PlanoForm } from './PlanosManager'
import PlanoBadge from '../../components/financeiro/PlanoBadge'

const VARIACAO_VAZIA = {
  duracao_meses: 1,
  rotulo: 'Mensal',
  valor_bruto_a_vista: 0,
  valor_liquido_a_vista: 0,
  valor_bruto_a_prazo: 0,
  valor_liquido_a_prazo: 0,
}

export default function PlanosListagem() {
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')

  // View: 'list' | 'form'
  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState('')

  // Cache de detalhes (variações) por plano — pra calcular faixa de valor
  const [detalhes, setDetalhes] = useState({})

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const ativoParam = filtroAtivo === '' ? null : filtroAtivo === '1'
      const res = await listarPlanos({ search: busca, ativo: ativoParam, limit: 100 })
      setPlanos(res.list || [])
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

  // ─── Form (criar / editar) ──────────────────────────────────────────────────
  const abrirNovo = () => {
    setEditing(null)
    setFormData({
      nome_plano: '',
      cor: 'blue',
      ativo: 1,
      variacoes: [{ ...VARIACAO_VAZIA }],
    })
    setView('form')
  }

  const abrirEditar = async (plano) => {
    const cache = detalhes[plano.name]
    setEditing(plano)
    try {
      const detalhe = cache || await buscarPlano(plano.name)
      setFormData({
        nome_plano: detalhe.nome_plano || '',
        cor: detalhe.cor || 'slate',
        ativo: detalhe.ativo ? 1 : 0,
        variacoes: (detalhe.variacoes || []).map((v) => ({
          name: v.name,
          duracao_meses: v.duracao_meses || 1,
          rotulo: v.rotulo || '',
          valor_bruto_a_vista: v.valor_bruto_a_vista || 0,
          valor_liquido_a_vista: v.valor_liquido_a_vista || 0,
          valor_bruto_a_prazo: v.valor_bruto_a_prazo || 0,
          valor_liquido_a_prazo: v.valor_liquido_a_prazo || 0,
        })),
      })
      if (!detalhe.variacoes?.length) {
        setFormData((f) => ({ ...f, variacoes: [{ ...VARIACAO_VAZIA }] }))
      }
      setView('form')
    } catch (e) {
      alert('Erro ao carregar plano: ' + (e.response?.data?.exception || e.message))
    }
  }

  const voltarParaLista = () => {
    setView('list')
    setEditing(null)
    setFormData(null)
  }

  const salvar = async () => {
    if (!formData?.nome_plano?.trim()) { alert('Informe o nome do plano.'); return }
    if (!formData.variacoes?.length) { alert('Adicione pelo menos uma variação.'); return }
    setSalvando(true)
    try {
      if (editing) await salvarPlano(editing.name, formData)
      else await criarPlano(formData)
      voltarParaLista()
      carregar()
    } catch (e) {
      alert('Erro ao salvar plano: ' + (e.response?.data?.exception || e.message))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (plano) => {
    if (!window.confirm(`Excluir "${plano.nome_plano || plano.name}"?\n\nNão será possível se houver contratos vinculados.`)) return
    setExcluindo(plano.name)
    try {
      await excluirPlano(plano.name)
      carregar()
    } catch (e) {
      alert(e.response?.data?.exception || e.response?.data?.message || e.message)
    } finally {
      setExcluindo('')
    }
  }

  const updateVariacao = (idx, patch) => {
    setFormData((f) => ({
      ...f,
      variacoes: f.variacoes.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }))
  }
  const addVariacao = () => setFormData((f) => ({ ...f, variacoes: [...f.variacoes, { ...VARIACAO_VAZIA }] }))
  const removeVariacao = (idx) => setFormData((f) => ({ ...f, variacoes: f.variacoes.filter((_, i) => i !== idx) }))

  // ─── Lista (com faixa de valor calculada) ──────────────────────────────────
  const lista = useMemo(() =>
    planos.map((p) => {
      const doc = detalhes[p.name]
      const variacoes = doc?.variacoes || []
      const valores = variacoes.map((v) => v.valor_liquido_a_vista || 0).filter(Boolean)
      const valor_min = valores.length ? Math.min(...valores) : 0
      const valor_max = valores.length ? Math.max(...valores) : 0
      return { ...p, qtd_variacoes: variacoes.length, valor_min, valor_max }
    }),
  [planos, detalhes])

  const empty = !loading && lista.length === 0 ? {
    icon: Layers,
    title: busca ? 'Nenhum plano encontrado' : 'Você ainda não tem planos',
    description: busca
      ? `Sem resultados para "${busca}".`
      : 'Crie seu primeiro plano pra começar a lançar pagamentos.',
  } : null

  const columns = [
    {
      label: 'Plano',
      render: (row) => (
        <PlanoBadge nome={row.nome_plano || row.name} cor={row.cor} size="md" />
      ),
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
      headerClass: 'hidden md:table-cell w-56 text-right',
      cellClass: 'hidden md:table-cell text-right whitespace-nowrap',
      render: (row) => {
        if (!row.qtd_variacoes) return <span className="text-gray-600">—</span>
        if (row.qtd_variacoes === 1 || row.valor_min === row.valor_max) {
          return <span className="font-mono text-sm text-white">{formatCurrency(row.valor_min)}</span>
        }
        return (
          <span className="font-mono text-sm text-white whitespace-nowrap">
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
      headerClass: 'w-24 text-center',
      cellClass: 'text-center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => abrirEditar(row)}
            title="Editar"
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={() => excluir(row)}
            disabled={excluindo === row.name}
            title="Excluir"
            className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  if (view === 'form') {
    return (
      <div className="p-4 md:p-8 text-white min-h-screen bg-[#0a0a0a]">
        {/* Header com Voltar destacado */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={voltarParaLista}>
              Voltar
            </Button>
            <div className="min-w-0">
              <h1 className="text-[18px] md:text-xl font-bold tracking-tight truncate">
                {editing ? `Editar: ${editing.nome_plano || editing.name}` : 'Novo plano'}
              </h1>
              <p className="text-gray-400 text-xs md:text-sm mt-0.5">
                {editing ? 'Altere os dados e clique em "Salvar alterações"' : 'Defina nome, cor e variações de duração'}
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" icon={Save} onClick={salvar} loading={salvando}>
            {editing ? 'Salvar alterações' : 'Criar plano'}
          </Button>
        </div>

        <div className="bg-[#29292e] border border-[#323238] rounded-xl">
          <PlanoForm
            formData={formData}
            setFormData={setFormData}
            updateVariacao={updateVariacao}
            addVariacao={addVariacao}
            removeVariacao={removeVariacao}
          />

          {/* Footer com Salvar — pra quando o user já tá lá embaixo */}
          <div className="border-t border-[#323238] px-4 py-3 flex items-center gap-2 justify-end bg-[#1a1a1a]/40">
            <Button variant="ghost" icon={ArrowLeft} onClick={voltarParaLista} disabled={salvando}>
              Voltar
            </Button>
            <Button variant="primary" icon={Save} onClick={salvar} loading={salvando}>
              {editing ? 'Salvar alterações' : 'Criar plano'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ListPage
      title="Planos"
      subtitle="Catálogo de planos e variações usados nos pagamentos"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
          <Button variant="primary" size="sm" icon={Plus} onClick={abrirNovo}>
            Novo plano
          </Button>
        </>
      }
      filters={[
        { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar plano…' },
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
          onRowClick={abrirEditar}
          page={1}
          pageSize={100}
        />
      )}
    </ListPage>
  )
}
