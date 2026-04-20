import { useState, useEffect, useRef, useMemo } from 'react'
import { Plus, Edit, Trash2, X, RefreshCw } from 'lucide-react'
import {
  listarExercicios, salvarTreinoExercicio, excluirTreinoExercicio, listarGruposMusculares,
} from '../../api/fichas'
import {
  Button, FormGroup, Input, Select, Modal, EmptyState, DataTable, Badge,
} from '../../components/ui'
import ListPage from '../../components/templates/ListPage'

const normalizar = (s = '') =>
  String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

const PLATAFORMAS = ['YouTube', 'Instagram', 'TikTok']

const INTENSIDADE_OPCOES = [
  { value: '0', label: '0 — Não trabalha' },
  { value: '0.25', label: '0.25 — Muito leve' },
  { value: '0.5', label: '0.5 — Leve' },
  { value: '0.75', label: '0.75 — Moderado' },
  { value: '1', label: '1.0 — Principal' },
  { value: '1.5', label: '1.5 — Muito alto' },
]

// ─── ModalExercicio ───────────────────────────────────────────────────────────

const ModalExercicio = ({ exercicio, grupos, onSave, onClose }) => {
  const isEdit = !!exercicio?.name
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const [nome, setNome] = useState(exercicio?.nome_do_exercicio || '')
  const [grupo, setGrupo] = useState(exercicio?.grupo_muscular || '')
  const [video, setVideo] = useState(exercicio?.video || '')
  const [plataforma, setPlataforma] = useState(exercicio?.['plataforma_do_vídeo'] || 'YouTube')
  const [enabled, setEnabled] = useState(exercicio?.enabled ?? 1)
  const [intensidades, setIntensidades] = useState(() => {
    try {
      const raw = exercicio?.intensidade_json
      return typeof raw === 'string' ? JSON.parse(raw) : (raw || [])
    } catch { return [] }
  })

  const addIntens = () => setIntensidades(prev => [...prev, { grupo_muscular: '', intensidade: '1' }])
  const updIntens = (i, field, val) => setIntensidades(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  const removeIntens = (i) => setIntensidades(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!nome.trim()) { setErro('Nome do exercício é obrigatório.'); return }
    setSaving(true); setErro('')
    try {
      const intens = intensidades.filter(i => i.grupo_muscular && i.intensidade !== '')
      const payload = {
        nome_do_exercicio: nome.trim(),
        grupo_muscular: grupo,
        video,
        'plataforma_do_vídeo': plataforma,
        enabled,
        intensidade_json: JSON.stringify(intens.map(i => ({ grupo_muscular: i.grupo_muscular, intensidade: String(i.intensidade) }))),
        intensidade: intens.map((i, idx) => ({ grupo_muscular: i.grupo_muscular, intensidade: String(i.intensidade), idx: idx + 1 })),
      }
      const resultado = await salvarTreinoExercicio(isEdit ? exercicio.name : null, payload)
      onSave(resultado)
    } catch (e) {
      console.error(e); setErro(e.message || 'Erro ao salvar.')
    } finally { setSaving(false) }
  }

  const grupoOpts = useMemo(() => grupos.map(g => ({ value: g, label: g })), [grupos])

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Editar Exercício' : 'Novo Exercício'}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label="Nome do Exercício" required>
            <Input value={nome} onChange={setNome} placeholder="Ex: Agachamento Livre" />
          </FormGroup>
          <FormGroup label="Grupo Muscular">
            <Select value={grupo} onChange={setGrupo} options={grupoOpts} placeholder="Selecionar..." />
          </FormGroup>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormGroup label="ID do Vídeo">
            <Input value={video} onChange={setVideo} placeholder="Ex: dQw4w9WgXcQ" />
          </FormGroup>
          <FormGroup label="Plataforma">
            <Select value={plataforma} onChange={setPlataforma} options={PLATAFORMAS} />
          </FormGroup>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!enabled} onChange={e => setEnabled(e.target.checked ? 1 : 0)}
            className="accent-[#850000] w-4 h-4" />
          <span className="text-sm text-gray-300">Exercício ativo</span>
        </label>

        <div className="border border-[#323238] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#323238]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Intensidade por Grupo Muscular</span>
            <button onClick={addIntens}
              className="h-6 w-6 flex items-center justify-center bg-[#29292e] text-green-400 hover:bg-green-600 hover:text-white rounded transition-colors">
              <Plus size={11} />
            </button>
          </div>
          {intensidades.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-4">Nenhuma intensidade cadastrada.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 text-[10px] uppercase border-b border-[#323238]">
                  <th className="text-left px-3 py-2">Grupo Muscular</th>
                  <th className="text-left px-3 py-2 w-40">Intensidade</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {intensidades.map((it, i) => (
                  <tr key={i} className="border-b border-[#323238]/50 last:border-0">
                    <td className="px-2 py-1">
                      <select value={it.grupo_muscular} onChange={e => updIntens(i, 'grupo_muscular', e.target.value)}
                        className="w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#850000]/60 appearance-none">
                        <option value="">Selecionar...</option>
                        {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select value={String(it.intensidade)} onChange={e => updIntens(i, 'intensidade', e.target.value)}
                        className="w-full h-8 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-[#850000]/60 appearance-none">
                        {INTENSIDADE_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => removeIntens(i)}
                        className="h-6 w-6 flex items-center justify-center text-red-400 hover:bg-red-600 hover:text-white rounded transition-colors mx-auto">
                        <X size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── GerenciarTreino ──────────────────────────────────────────────────────────

export default function GerenciarTreino() {
  const currentUser = localStorage.getItem('frappe_user') || ''
  const [exercicios, setExercicios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState(null)
  const [deletando, setDeletando] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const debounceRef = useRef(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const [exs, grps] = await Promise.all([
        listarExercicios({ limit: 1000 }),
        listarGruposMusculares(),
      ])
      setExercicios(exs)
      setGrupos(grps)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(() => {
    const q = normalizar(busca)
    return exercicios.filter(e => {
      if (filtroGrupo && e.grupo_muscular !== filtroGrupo) return false
      if (q && !normalizar(e.nome_do_exercicio).includes(q)) return false
      return true
    })
  }, [exercicios, busca, filtroGrupo])

  useEffect(() => { setPage(1) }, [busca, filtroGrupo])

  const handleSave = (resultado) => {
    setExercicios(prev => {
      const idx = prev.findIndex(e => e.name === resultado?.name)
      if (idx >= 0) { const a = [...prev]; a[idx] = resultado; return a }
      return [resultado, ...prev]
    })
    setModalOpen(false)
    setEditando(null)
  }

  const handleDelete = async () => {
    if (!deletando) return
    setDeleting(true)
    try {
      await excluirTreinoExercicio(deletando.name)
      // Recarrega do servidor para confirmar que o delete foi efetivo
      const exs = await listarExercicios({ limit: 1000 })
      setExercicios(exs)
      setDeletando(null)
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir: ' + e.message)
    } finally { setDeleting(false) }
  }

  const grupoOpts = useMemo(() => [
    { value: '', label: 'Todos os grupos' },
    ...grupos.map(g => ({ value: g, label: g })),
  ], [grupos])

  const intensidadeCount = (ex) => {
    try {
      const r = typeof ex.intensidade_json === 'string'
        ? JSON.parse(ex.intensidade_json)
        : (ex.intensidade_json || [])
      return r.length
    } catch { return 0 }
  }

  const columns = [
    {
      label: 'Nome',
      render: (ex) => (
        <div>
          <span className="text-white font-medium text-sm">{ex.nome_do_exercicio}</span>
          <span className="md:hidden text-gray-500 text-xs ml-2">{ex.grupo_muscular}</span>
        </div>
      ),
    },
    {
      label: 'Grupo Muscular',
      headerClass: 'hidden md:table-cell',
      cellClass: 'hidden md:table-cell',
      render: (ex) => ex.grupo_muscular
        ? <span className="text-gray-300 text-xs">{ex.grupo_muscular}</span>
        : <span className="text-gray-600 text-xs italic">—</span>,
    },
    {
      label: 'Intensidades',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (ex) => {
        const n = intensidadeCount(ex)
        return n > 0
          ? <span className="text-xs font-mono text-emerald-400">{n} grupo{n !== 1 ? 's' : ''}</span>
          : <span className="text-gray-600 text-xs">—</span>
      },
    },
    {
      label: 'Status',
      headerClass: 'hidden lg:table-cell',
      cellClass: 'hidden lg:table-cell',
      render: (ex) => (
        <Badge variant={ex.enabled ? 'success' : 'default'} size="sm">
          {ex.enabled ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      label: 'Ações',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (ex) => ex.owner === currentUser ? (
        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => { setEditando(ex); setModalOpen(true) }}
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit size={12} />
          </button>
          <button
            onClick={() => setDeletando(ex)}
            className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ) : (
        <span className="text-[10px] text-gray-600 italic">compartilhado</span>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Gerenciar Exercícios"
        subtitle={`${exercicios.length} exercício${exercicios.length !== 1 ? 's' : ''} cadastrado${exercicios.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={carregar} loading={loading} />
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditando(null); setModalOpen(true) }}>
              Novo Exercício
            </Button>
          </>
        }
        filters={[
          {
            type: 'search',
            value: busca,
            onChange: (v) => { setBusca(v); setPage(1) },
            placeholder: 'Buscar exercício...',
          },
          {
            type: 'select',
            value: filtroGrupo,
            onChange: (v) => { setFiltroGrupo(v); setPage(1) },
            options: grupoOpts,
            placeholder: 'Grupo muscular',
          },
        ]}
        loading={loading}
        empty={
          filtrados.length === 0 && !loading
            ? {
                title: 'Nenhum exercício encontrado',
                description: busca || filtroGrupo
                  ? 'Tente ajustar os filtros.'
                  : 'Clique em "Novo Exercício" para começar.',
              }
            : null
        }
      >
        {!loading && filtrados.length > 0 && (
          <DataTable
            columns={columns}
            rows={filtrados}
            rowKey="name"
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => { setPageSize(s); setPage(1) }}
          />
        )}
      </ListPage>

      {modalOpen && (
        <ModalExercicio
          exercicio={editando}
          grupos={grupos}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditando(null) }}
        />
      )}

      {deletando && (
        <Modal
          isOpen
          onClose={() => setDeletando(null)}
          title="Excluir Exercício"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeletando(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir</Button>
            </>
          }
        >
          <div className="p-4">
            <p className="text-gray-300 text-sm">
              Tem certeza que deseja excluir <strong className="text-white">{deletando.nome_do_exercicio}</strong>?
            </p>
            <p className="text-gray-500 text-xs mt-1">Esta ação não pode ser desfeita.</p>
          </div>
        </Modal>
      )}
    </>
  )
}
