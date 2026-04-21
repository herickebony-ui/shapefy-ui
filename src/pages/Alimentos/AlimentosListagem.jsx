import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, Copy } from 'lucide-react'
import {
  listarAlimentos, buscarAlimento, criarAlimento, salvarAlimento, excluirAlimento,
  toggleAlimento, listarGruposAlimentares, podeExcluir,
} from '../../api/alimentos'
import {
  Button, FormGroup, Input, Select, Modal, Spinner, EmptyState,
  DataTable, Badge,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

const fmt = (v) => v != null ? Number(v).toFixed(1) : '—'

const FORM_VAZIO = {
  food: '', food_group: '', ref_weight: 100, unit: 'g',
  calories: '', protein: '', carbohydrate: '', lipid: '', fiber: '',
  // minerais
  calcium: '', copper: '', iron: '', phosphor: '', magnesium: '',
  potassium: '', selenium: '', sodium: '', zinc: '',
  // vitaminas
  vitamin_a: '', vitamin_b1: '', vitamin_b2: '', vitamin_b3: '', vitamin_b6: '',
  vitamin_b9: '', vitamin_b12: '', vitamin_c: '', vitamin_d: '', vitamin_e: '',
  enabled: 1, public: 0,
}

const n = (v) => v === '' || v == null ? 0 : Number(v)

// ─── Modal criar / editar ─────────────────────────────────────────────────────

function ModalAlimento({ alimento, grupos, onSave, onClose }) {
  const isEdit = !!alimento?.name
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const [form, setForm] = useState(() =>
    alimento ? {
      food: alimento.food || '',
      food_group: alimento.food_group || '',
      ref_weight: alimento.ref_weight ?? 100,
      unit: alimento.unit || 'g',
      calories: alimento.calories ?? '',
      protein: alimento.protein ?? '',
      carbohydrate: alimento.carbohydrate ?? '',
      lipid: alimento.lipid ?? '',
      fiber: alimento.fiber ?? '',
      calcium: alimento.calcium ?? '',
      copper: alimento.copper ?? '',
      iron: alimento.iron ?? '',
      phosphor: alimento.phosphor ?? '',
      magnesium: alimento.magnesium ?? '',
      potassium: alimento.potassium ?? '',
      selenium: alimento.selenium ?? '',
      sodium: alimento.sodium ?? '',
      zinc: alimento.zinc ?? '',
      vitamin_a: alimento.vitamin_a ?? '',
      vitamin_b1: alimento.vitamin_b1 ?? '',
      vitamin_b2: alimento.vitamin_b2 ?? '',
      vitamin_b3: alimento.vitamin_b3 ?? '',
      vitamin_b6: alimento.vitamin_b6 ?? '',
      vitamin_b9: alimento.vitamin_b9 ?? '',
      vitamin_b12: alimento.vitamin_b12 ?? '',
      vitamin_c: alimento.vitamin_c ?? '',
      vitamin_d: alimento.vitamin_d ?? '',
      vitamin_e: alimento.vitamin_e ?? '',
      enabled: alimento.enabled ?? 1,
      public: alimento.public ?? 0,
    } : { ...FORM_VAZIO }
  )

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const grupoOpts = useMemo(() =>
    grupos.map(g => ({ value: g.name, label: g.grupo || g.name })), [grupos])

  const handleSave = async () => {
    if (!form.food.trim()) { setErro('Nome do alimento é obrigatório.'); return }
    if (!form.food_group) { setErro('Grupo alimentar é obrigatório.'); return }
    if (form.calories === '' || form.calories === null) { setErro('Calorias é obrigatório.'); return }
    setSaving(true); setErro('')
    try {
      const payload = {
        food: form.food.trim(), food_group: form.food_group,
        ref_weight: n(form.ref_weight) || 100, unit: form.unit || 'g',
        calories: n(form.calories), protein: n(form.protein),
        carbohydrate: n(form.carbohydrate), lipid: n(form.lipid), fiber: n(form.fiber),
        calcium: n(form.calcium), copper: n(form.copper), iron: n(form.iron),
        phosphor: n(form.phosphor), magnesium: n(form.magnesium),
        potassium: n(form.potassium), selenium: n(form.selenium),
        sodium: n(form.sodium), zinc: n(form.zinc),
        vitamin_a: n(form.vitamin_a), vitamin_b1: n(form.vitamin_b1),
        vitamin_b2: n(form.vitamin_b2), vitamin_b3: n(form.vitamin_b3),
        vitamin_b6: n(form.vitamin_b6), vitamin_b9: n(form.vitamin_b9),
        vitamin_b12: n(form.vitamin_b12), vitamin_c: n(form.vitamin_c),
        vitamin_d: n(form.vitamin_d), vitamin_e: n(form.vitamin_e),
        // unidades fixas
        carbohydrate_unit: 'g', protein_unit: 'g', lipid_unit: 'g', fiber_unit: 'g',
        calcium_unit: 'mg', copper_unit: 'mg', iron_unit: 'mg', phosphor_unit: 'mg',
        magnesium_unit: 'mg', potassium_unit: 'mg', selenium_unit: 'µg',
        sodium_unit: 'mg', zinc_unit: 'mg',
        vitamin_a_unit: 'µg', vitamin_b1_unit: 'mg', vitamin_b2_unit: 'mg',
        vitamin_b3_unit: 'mg', vitamin_b6_unit: 'mg', vitamin_b9_unit: 'µg',
        vitamin_b12_unit: 'µg', vitamin_c_unit: 'mg', vitamin_d_unit: 'µg',
        vitamin_e_unit: 'mg',
        enabled: form.enabled, public: form.public,
      }
      if (isEdit) await salvarAlimento(alimento.name, payload)
      else await criarAlimento(payload)
      onSave()
    } catch (e) {
      console.error(e)
      setErro(e?.response?.data?.exception || 'Erro ao salvar alimento.')
    } finally { setSaving(false) }
  }

  const NumField = ({ label, field, unit }) => (
    <FormGroup label={`${label}${unit ? ` (${unit})` : ''}`}>
      <Input type="number" value={String(form[field] ?? '')}
        onChange={v => set(field, v)} placeholder="0" />
    </FormGroup>
  )

  return (
    <Modal isOpen onClose={onClose}
      title={isEdit ? 'Editar Alimento' : 'Novo Alimento'}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
        </>
      }
    >
      <div className="p-4 space-y-5">
        {erro && (
          <div className="bg-red-900/20 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{erro}</div>
        )}

        {/* Identificação */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Identificação</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormGroup label="Nome do Alimento" required>
                <Input value={form.food} onChange={v => set('food', v)} placeholder="Ex: Frango grelhado" />
              </FormGroup>
            </div>
            <FormGroup label="Grupo Alimentar" required>
              <Select value={form.food_group} onChange={v => set('food_group', v)}
                options={grupoOpts} placeholder="Selecione..." />
            </FormGroup>
            <div className="grid grid-cols-2 gap-2">
              <FormGroup label="Peso ref." hint="g">
                <Input type="number" value={String(form.ref_weight)}
                  onChange={v => set('ref_weight', v)} placeholder="100" />
              </FormGroup>
              <FormGroup label="Unidade">
                <Input value={form.unit} onChange={v => set('unit', v)} placeholder="g" />
              </FormGroup>
            </div>
          </div>
        </div>

        {/* Macronutrientes */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
            Macronutrientes (por {form.ref_weight || 100}{form.unit || 'g'})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <FormGroup label="Kcal" required>
              <Input type="number" value={String(form.calories)} onChange={v => set('calories', v)} placeholder="0" />
            </FormGroup>
            <NumField label="Proteína" field="protein" unit="g" />
            <NumField label="Carboidrato" field="carbohydrate" unit="g" />
            <NumField label="Lipídeo" field="lipid" unit="g" />
            <NumField label="Fibra" field="fiber" unit="g" />
          </div>
        </div>

        {/* Minerais */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Minerais</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <NumField label="Cálcio" field="calcium" unit="mg" />
            <NumField label="Cobre" field="copper" unit="mg" />
            <NumField label="Ferro" field="iron" unit="mg" />
            <NumField label="Fósforo" field="phosphor" unit="mg" />
            <NumField label="Magnésio" field="magnesium" unit="mg" />
            <NumField label="Potássio" field="potassium" unit="mg" />
            <NumField label="Selênio" field="selenium" unit="µg" />
            <NumField label="Sódio" field="sodium" unit="mg" />
            <NumField label="Zinco" field="zinc" unit="mg" />
          </div>
        </div>

        {/* Vitaminas */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Vitaminas</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <NumField label="Vit. A" field="vitamin_a" unit="µg" />
            <NumField label="Vit. B1" field="vitamin_b1" unit="mg" />
            <NumField label="Vit. B2" field="vitamin_b2" unit="mg" />
            <NumField label="Vit. B3" field="vitamin_b3" unit="mg" />
            <NumField label="Vit. B6" field="vitamin_b6" unit="mg" />
            <NumField label="Vit. B9" field="vitamin_b9" unit="µg" />
            <NumField label="Vit. B12" field="vitamin_b12" unit="µg" />
            <NumField label="Vit. C" field="vitamin_c" unit="mg" />
            <NumField label="Vit. D" field="vitamin_d" unit="µg" />
            <NumField label="Vit. E" field="vitamin_e" unit="mg" />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-6 pt-1 border-t border-[#323238]">
          <label className="flex items-center gap-2 cursor-pointer select-none pt-3">
            <button type="button" onClick={() => set('enabled', form.enabled ? 0 : 1)}
              className={`transition-colors ${form.enabled ? 'text-green-400' : 'text-gray-600'}`}>
              {form.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
            <span className="text-sm text-gray-300">Ativo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none pt-3">
            <button type="button" onClick={() => set('public', form.public ? 0 : 1)}
              className={`transition-colors ${form.public ? 'text-blue-400' : 'text-gray-600'}`}>
              {form.public ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            </button>
            <span className="text-sm text-gray-300">Público</span>
          </label>
        </div>
      </div>
    </Modal>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AlimentosListagem() {
  const [alimentos, setAlimentos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [grupo, setGrupo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const debounceRef = useRef(null)

  const carregar = async (opts = {}) => {
    setLoading(true)
    try {
      const { list } = await listarAlimentos({
        busca: opts.busca ?? busca,
        grupo: opts.grupo ?? grupo,
        enabled: opts.enabled ?? filtroAtivo,
      })
      setAlimentos(list)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { listarGruposAlimentares().then(setGrupos).catch(console.error) }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      carregar({ busca, grupo, enabled: filtroAtivo, page: 1 })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca, grupo, filtroAtivo])

  const handleToggle = async (row) => {
    const novoValor = row.enabled ? 0 : 1
    setAlimentos(prev => prev.map(a => a.name === row.name ? { ...a, enabled: novoValor } : a))
    try {
      await toggleAlimento(row.name, novoValor)
    } catch (e) {
      console.error(e)
      setAlimentos(prev => prev.map(a => a.name === row.name ? { ...a, enabled: row.enabled } : a))
    }
  }

  const handleDuplicar = async (row) => {
    try {
      const full = await buscarAlimento(row.name)
      const { name, creation, modified, modified_by, owner, docstatus, idx, ...payload } = full
      await criarAlimento({ ...payload, food: `${full.food} (cópia)`, enabled: 1 })
      carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao duplicar alimento.')
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await excluirAlimento(confirmDelete.name)
      setConfirmDelete(null)
      carregar()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.exception || 'Erro ao excluir.')
    } finally { setDeleting(false) }
  }

  const grupoOpts = useMemo(() => [
    { value: '', label: 'Todos os grupos' },
    ...grupos.map(g => ({ value: g.name, label: g.grupo || g.name })),
  ], [grupos])

  const ativoOpts = [
    { value: '', label: 'Todos' },
    { value: '1', label: 'Ativos' },
    { value: '0', label: 'Inativos' },
  ]

  const columns = [
    {
      label: 'Alimento',
      render: (row) => (
        <div>
          <p className="text-white text-sm font-medium leading-tight">{row.food || row.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{row.food_group || '—'}</p>
        </div>
      ),
    },
    {
      label: 'Kcal',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row) => (
        <span className="text-gray-200 text-sm tabular-nums">
          {fmt(row.calories)}
          <span className="text-gray-600 text-xs ml-0.5">/{row.ref_weight || 100}{row.unit || 'g'}</span>
        </span>
      ),
    },
    {
      label: 'P / C / L',
      headerClass: 'hidden sm:table-cell',
      cellClass: 'hidden sm:table-cell',
      render: (row) => (
        <span className="text-gray-400 text-xs tabular-nums whitespace-nowrap">
          {fmt(row.protein)}g / {fmt(row.carbohydrate)}g / {fmt(row.lipid)}g
        </span>
      ),
    },
    {
      label: 'Status',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (row) => (
        <Badge variant={row.enabled ? 'success' : 'default'} size="sm">
          {row.enabled ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      label: 'Origem',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (row) => (
        <span className={`text-xs font-medium ${podeExcluir(row.owner) ? 'text-blue-400' : 'text-gray-500'}`}>
          {podeExcluir(row.owner) ? 'Meu' : 'Base'}
        </span>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => handleToggle(row)} title={row.enabled ? 'Desativar' : 'Ativar'}
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors
              ${row.enabled
                ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
              }`}
          >
            {row.enabled ? <ToggleRight size={12} /> : <ToggleLeft size={12} />}
          </button>

          {podeExcluir(row.owner) ? (
            <>
              <button onClick={() => setModal({ alimento: row })} title="Editar"
                className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors">
                <Edit size={12} />
              </button>
              <button onClick={() => setConfirmDelete(row)} title="Excluir"
                className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors">
                <Trash2 size={12} />
              </button>
            </>
          ) : (
            <button onClick={() => handleDuplicar(row)} title="Duplicar para editar"
              className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors">
              <Copy size={12} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Cadastrar Alimentos"
        subtitle="Crie, edite e gerencie sua base de alimentos"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModal('novo')}>
              Novo Alimento
            </Button>
          </>
        }
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar alimento...', icon: Search },
          { type: 'select', value: grupo, onChange: v => { setGrupo(v); setPage(1) }, options: grupoOpts },
          { type: 'select', value: filtroAtivo, onChange: v => { setFiltroAtivo(v); setPage(1) }, options: ativoOpts },
        ]}
        loading={loading}
        empty={alimentos.length === 0 && !loading
          ? { title: 'Nenhum alimento encontrado', description: 'Tente ajustar os filtros ou crie um novo alimento.' }
          : null}
      >
        {!loading && alimentos.length > 0 && (
          <DataTable columns={columns} rows={alimentos} rowKey="name"
            page={page} pageSize={30} onPage={setPage} />
        )}
      </ListPage>

      {modal === 'novo' && (
        <ModalAlimento alimento={null} grupos={grupos}
          onSave={() => { setModal(null); carregar() }} onClose={() => setModal(null)} />
      )}
      {modal?.alimento && (
        <ModalAlimento alimento={modal.alimento} grupos={grupos}
          onSave={() => { setModal(null); carregar() }} onClose={() => setModal(null)} />
      )}

      {confirmDelete && (
        <Modal isOpen onClose={() => setConfirmDelete(null)} title="Excluir Alimento" size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
            </>
          }
        >
          <div className="p-4">
            <p className="text-gray-300 text-sm">
              Tem certeza que deseja excluir <strong className="text-white">{confirmDelete.food}</strong>?
            </p>
            <p className="text-gray-500 text-xs mt-2">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}
    </>
  )
}
