import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, X, GripVertical } from 'lucide-react'
import {
  listarRefeicoesProntas, buscarRefeicaoPronta,
  criarRefeicaoPronta, salvarRefeicaoPronta,
  excluirRefeicaoPronta, toggleRefeicaoPronta,
  listarAlimentos,
} from '../../api/dietas'
import useAuthStore from '../../store/authStore'
import {
  Button, FormGroup, Input, Modal, Spinner, EmptyState,
  DataTable, Badge, Autocomplete,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

const fmt = (v, dec = 1) => v != null ? Number(v).toFixed(dec) : '0.0'
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const calcMacros = (alimento, peso) => {
  const ratio = Number(peso) / Number(alimento.ref_weight || 100)
  return {
    protein: +(Number(alimento.protein || 0) * ratio).toFixed(1),
    carbohydrate: +(Number(alimento.carbohydrate || 0) * ratio).toFixed(1),
    lipid: +(Number(alimento.lipid || 0) * ratio).toFixed(1),
    fiber: +(Number(alimento.fiber || 0) * ratio).toFixed(1),
    calories: +(Number(alimento.calories || 0) * ratio).toFixed(0),
  }
}

// ─── Editor de itens da refeição ─────────────────────────────────────────────

function EditorItens({ items, onChange }) {
  const addItem = () => {
    onChange([...items, { __uid: uid(), food: '', food_obj: null, weight: 100, unit: 'g', substitute: 0 }])
  }

  const removeItem = (uid) => onChange(items.filter(it => it.__uid !== uid))

  const updateItem = (uid, field, val) =>
    onChange(items.map(it => it.__uid === uid ? { ...it, [field]: val } : it))

  const handleSelectFood = (uid, alimento) => {
    onChange(items.map(it => {
      if (it.__uid !== uid) return it
      const macros = calcMacros(alimento, it.weight || 100)
      return {
        ...it,
        food: alimento.food || alimento.name,
        food_obj: alimento,
        unit: alimento.unit || 'g',
        ref_weight: alimento.ref_weight || 100,
        food_json: JSON.stringify(alimento),
        ...macros,
      }
    }))
  }

  const handleWeightChange = (uid, peso) => {
    onChange(items.map(it => {
      if (it.__uid !== uid || !it.food_obj) return { ...it, weight: peso }
      const macros = calcMacros(it.food_obj, peso)
      return { ...it, weight: peso, ...macros }
    }))
  }

  const totalKcal = items.reduce((s, it) => s + Number(it.calories || 0), 0)
  const totalProt = items.reduce((s, it) => s + Number(it.protein || 0), 0)
  const totalCarb = items.reduce((s, it) => s + Number(it.carbohydrate || 0), 0)
  const totalLip  = items.reduce((s, it) => s + Number(it.lipid || 0), 0)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Alimentos</p>
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1 text-xs text-[#2563eb] hover:text-red-400 transition-colors"
        >
          <Plus size={12} /> Adicionar
        </button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-6 text-gray-600 text-xs border border-dashed border-[#323238] rounded-lg">
          Nenhum alimento adicionado
        </div>
      )}

      {items.map((item, idx) => (
        <div key={item.__uid} className="bg-[#111113] border border-[#323238] rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <Autocomplete
                value={item.food}
                onChange={(v) => updateItem(item.__uid, 'food', v)}
                onSelect={(al) => handleSelectFood(item.__uid, al)}
                searchFn={async (q) => {
                  if (!q || q.length < 2) return []
                  const { list } = await listarAlimentos({ busca: q, limit: 8 })
                  return list
                }}
                renderItem={(al) => (
                  <div>
                    <p className="text-white text-sm">{al.food || al.name}</p>
                    <p className="text-gray-500 text-xs">{al.calories} kcal / {al.ref_weight}{al.unit}</p>
                  </div>
                )}
                placeholder="Buscar alimento..."
                compact
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                value={item.weight}
                onChange={(e) => handleWeightChange(item.__uid, e.target.value)}
                className="w-16 h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#2563eb]/60 tabular-nums"
              />
              <span className="text-gray-500 text-xs w-4">{item.unit || 'g'}</span>
              <button
                type="button"
                onClick={() => removeItem(item.__uid)}
                className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors ml-1"
              >
                <X size={11} />
              </button>
            </div>
          </div>
          {item.food_obj && (
            <div className="flex gap-3 text-xs text-gray-500 tabular-nums pt-0.5">
              <span><span className="text-orange-400">{fmt(item.calories, 0)}</span> kcal</span>
              <span>P <span className="text-blue-400">{fmt(item.protein)}</span>g</span>
              <span>C <span className="text-yellow-400">{fmt(item.carbohydrate)}</span>g</span>
              <span>L <span className="text-red-400">{fmt(item.lipid)}</span>g</span>
            </div>
          )}
        </div>
      ))}

      {items.length > 0 && (
        <div className="flex gap-4 text-xs border-t border-[#323238] pt-2 mt-1 tabular-nums text-gray-400">
          <span>Total: <span className="text-orange-400 font-semibold">{fmt(totalKcal, 0)} kcal</span></span>
          <span>P <span className="text-blue-400">{fmt(totalProt)}g</span></span>
          <span>C <span className="text-yellow-400">{fmt(totalCarb)}g</span></span>
          <span>L <span className="text-red-400">{fmt(totalLip)}g</span></span>
        </div>
      )}
    </div>
  )
}

// ─── Modal criar / editar ─────────────────────────────────────────────────────

function ModalRefeicao({ refeicao, onSave, onClose }) {
  const { user } = useAuthStore()
  const isEdit = !!refeicao?.name
  const [saving, setSaving] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(isEdit)
  const [erro, setErro] = useState('')
  const [nome, setNome] = useState(refeicao?.full_name || '')
  const [enabled, setEnabled] = useState(refeicao?.enabled ?? 1)
  const [isPublic, setIsPublic] = useState(refeicao?.public ?? 0)
  const [items, setItems] = useState([])

  useEffect(() => {
    if (!isEdit) return
    buscarRefeicaoPronta(refeicao.name).then(detail => {
      const loaded = (detail.table_foods || []).map(item => ({
        ...item,
        __uid: uid(),
        food_obj: item.food_json ? (() => { try { return JSON.parse(item.food_json) } catch { return null } })() : null,
      }))
      setItems(loaded)
      setLoadingDetail(false)
    }).catch(e => { console.error(e); setLoadingDetail(false) })
  }, [isEdit, refeicao?.name])

  const handleSave = async () => {
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (items.length === 0) { setErro('Adicione ao menos um alimento.'); return }
    setSaving(true); setErro('')
    try {
      const table_foods = items.map(({ __uid, food_obj, ...rest }) => {
        const { name: _n, ...item } = rest
        return item
      })
      const payload = {
        full_name: nome.trim(),
        enabled,
        public: isPublic,
        profissional: user,
        table_foods,
      }
      if (isEdit) {
        await salvarRefeicaoPronta(refeicao.name, payload)
      } else {
        await criarRefeicaoPronta(payload)
      }
      onSave()
    } catch (e) {
      console.error(e)
      setErro(e?.response?.data?.exception || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar Refeição Pronta' : 'Nova Refeição Pronta'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-4">
        {erro && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
            {erro}
          </div>
        )}

        <FormGroup label="Nome da Refeição" required>
          <Input value={nome} onChange={setNome} placeholder="Ex: Mingau de Aveia Proteico" />
        </FormGroup>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button type="button" onClick={() => setEnabled(v => v ? 0 : 1)}
              className={`transition-colors ${enabled ? 'text-green-400' : 'text-gray-600'}`}>
              {enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
            <span className="text-sm text-gray-300">Ativa</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button type="button" onClick={() => setIsPublic(v => v ? 0 : 1)}
              className={`transition-colors ${isPublic ? 'text-blue-400' : 'text-gray-600'}`}>
              {isPublic ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
            <span className="text-sm text-gray-300">Pública</span>
          </label>
        </div>

        <div className="border-t border-[#323238] pt-4">
          {loadingDetail ? (
            <div className="flex justify-center py-6">
              <Spinner size="sm" />
            </div>
          ) : (
            <EditorItens items={items} onChange={setItems} />
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function RefeicoesProntasListagem() {
  const [refeicoes, setRefeicoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const debounceRef = useRef(null)
  const PAGE_SIZE = 30

  const carregar = async (opts = {}) => {
    setLoading(true)
    try {
      const { list, hasMore: more } = await listarRefeicoesProntas({
        busca: opts.busca ?? busca,
        enabled: opts.enabled ?? filtroAtivo,
        page: opts.page ?? page,
        limit: PAGE_SIZE,
      })
      setRefeicoes(list)
      setHasMore(more)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      carregar({ busca, enabled: filtroAtivo, page: 1 })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca, filtroAtivo])

  const handleToggle = async (row) => {
    const novo = row.enabled ? 0 : 1
    setRefeicoes(prev => prev.map(r => r.name === row.name ? { ...r, enabled: novo } : r))
    try {
      await toggleRefeicaoPronta(row.name, novo)
    } catch (e) {
      console.error(e)
      setRefeicoes(prev => prev.map(r => r.name === row.name ? { ...r, enabled: row.enabled } : r))
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await excluirRefeicaoPronta(confirmDelete.name)
      setConfirmDelete(null)
      carregar()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.exception || 'Erro ao excluir.')
    } finally {
      setDeleting(false)
    }
  }

  const stats = useMemo(() => {
    const total = refeicoes.length
    const ativas = refeicoes.filter(r => r.enabled).length
    const publicas = refeicoes.filter(r => r.public).length
    return [
      { label: 'Total', value: total, color: 'default' },
      { label: 'Ativas', value: ativas, color: 'success' },
      { label: 'Inativas', value: total - ativas, color: 'danger' },
      { label: 'Públicas', value: publicas, color: 'default' },
    ]
  }, [refeicoes])

  const ativoOpts = [
    { value: '', label: 'Todas' },
    { value: '1', label: 'Ativas' },
    { value: '0', label: 'Inativas' },
  ]

  const columns = [
    {
      label: 'Nome',
      render: (row) => (
        <span className="text-white text-sm font-medium">{row.full_name || row.name}</span>
      ),
    },
    {
      label: 'Status',
      headerClass: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
      render: (row) => (
        <Badge variant={row.enabled ? 'success' : 'default'} size="sm">
          {row.enabled ? 'Ativa' : 'Inativa'}
        </Badge>
      ),
    },
    {
      label: 'Visib.',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => (
        <Badge variant={row.public ? 'info' : 'default'} size="sm">
          {row.public ? 'Pública' : 'Privada'}
        </Badge>
      ),
    },
    {
      label: 'Profissional',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (row) => (
        <span className="text-gray-500 text-xs">{row.profissional || '—'}</span>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleToggle(row)}
            title={row.enabled ? 'Desativar' : 'Ativar'}
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors
              ${row.enabled
                ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
              }`}
          >
            {row.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
          </button>
          <button
            onClick={() => setModal({ refeicao: row })}
            title="Editar"
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() => setConfirmDelete(row)}
            title="Excluir"
            className="h-7 w-7 flex items-center justify-center text-[#2563eb] hover:text-white border border-[#2563eb]/30 hover:bg-[#2563eb] rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Cadastrar Refeições Prontas"
        subtitle="Gerencie suas refeições prontas para uso nas dietas"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModal('novo')}>
              Nova Refeição
            </Button>
          </>
        }
        stats={[]}
        filters={[
          {
            type: 'search',
            value: busca,
            onChange: setBusca,
            placeholder: 'Buscar refeição...',
            icon: Search,
          },
          {
            type: 'select',
            value: filtroAtivo,
            onChange: v => { setFiltroAtivo(v); setPage(1) },
            options: ativoOpts,
            placeholder: 'Status',
          },
        ]}
        loading={loading}
        empty={
          refeicoes.length === 0 && !loading
            ? { title: 'Nenhuma refeição encontrada', description: 'Crie uma nova refeição pronta ou ajuste os filtros.' }
            : null
        }
        pagination={
          refeicoes.length > 0
            ? {
                page,
                pageSize: PAGE_SIZE,
                total: hasMore ? page * PAGE_SIZE + 1 : (page - 1) * PAGE_SIZE + refeicoes.length,
                onChange: (p) => { setPage(p); carregar({ page: p }) },
              }
            : null
        }
      >
        {!loading && refeicoes.length > 0 && (
          <DataTable columns={columns} rows={refeicoes} rowKey="name" />
        )}
      </ListPage>

      {modal === 'novo' && (
        <ModalRefeicao
          refeicao={null}
          onSave={() => { setModal(null); carregar() }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.refeicao && (
        <ModalRefeicao
          refeicao={modal.refeicao}
          onSave={() => { setModal(null); carregar() }}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <Modal
          isOpen
          onClose={() => setConfirmDelete(null)}
          title="Excluir Refeição"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
            </>
          }
        >
          <div className="p-4">
            <p className="text-gray-300 text-sm">
              Excluir <strong className="text-white">{confirmDelete.full_name}</strong>?
            </p>
            <p className="text-gray-500 text-xs mt-2">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}
    </>
  )
}
