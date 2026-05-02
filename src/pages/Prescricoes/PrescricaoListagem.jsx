import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Plus, Search, Eye, Trash2, Copy, X, Pill, Database, Edit2, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import { listarPrescricoes, excluirPrescricao, buscarPrescricao, criarPrescricao, togglePrescricao } from '../../api/prescricoes'
import { buscarSmart } from '../../utils/strings'
import {
  listarManipulados, criarManipulado, salvarManipulado, excluirManipulado,
} from '../../api/manipulados'
import { Button, Badge, Modal, FormGroup, Input, Spinner } from '../../components/ui'
import ListPage from '../../components/templates/ListPage'
import DataTable from '../../components/ui/DataTable'

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).split('-')
  return `${day}/${m}/${y}`
}

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

// ─── Modal banco ──────────────────────────────────────────────────────────────

function BancoModal({ onClose }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoDesc, setNovoDesc] = useState('')
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    listarManipulados().then(setLista).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleCriar = async () => {
    if (!novoNome.trim()) return
    setSaving(true)
    try {
      const created = await criarManipulado({ full_name: novoNome.trim(), description: novoDesc.trim() })
      setLista(prev => [...prev, created].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setNovoNome(''); setNovoDesc('')
    } catch (e) { console.error(e); alert('Erro ao criar.') }
    finally { setSaving(false) }
  }

  const startEdit = (item) => { setEditingId(item.name); setEditNome(item.full_name || ''); setEditDesc(item.description || '') }

  const handleSalvarEdit = async (name) => {
    setSaving(true)
    try {
      await salvarManipulado(name, { full_name: editNome.trim(), description: editDesc.trim(), enabled: 1 })
      setLista(prev => prev.map(i => i.name === name ? { ...i, full_name: editNome.trim(), description: editDesc.trim() } : i))
      setEditingId(null)
    } catch (e) { console.error(e); alert('Erro ao salvar.') }
    finally { setSaving(false) }
  }

  const handleExcluir = async (item) => {
    if (!confirm(`Excluir "${item.full_name}"?`)) return
    try {
      await excluirManipulado(item.name)
      setLista(prev => prev.filter(i => i.name !== item.name))
    } catch (e) { console.error(e); alert('Erro ao excluir.') }
  }

  return (
    <Modal
      title="Banco de Manipulados"
      subtitle="Gerencie os compostos disponíveis para prescrição"
      onClose={onClose}
      size="lg"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}
    >
      <div className="p-4 space-y-4">
        <div className="bg-[#222226] border border-[#323238] rounded-lg p-4 space-y-3">
          <p className="text-white text-sm font-semibold">Adicionar novo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormGroup label="Nome do Manipulado" required>
              <Input value={novoNome} onChange={setNovoNome} placeholder="Ex: Creatina" />
            </FormGroup>
            <FormGroup label="Descrição / Dose padrão">
              <Input value={novoDesc} onChange={setNovoDesc} placeholder="Ex: 5g por dose" />
            </FormGroup>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleCriar} loading={saving} disabled={!novoNome.trim()}>
            Salvar no banco
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : lista.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Nenhum manipulado cadastrado.</p>
        ) : (
          <div className="divide-y divide-[#323238] border border-[#323238] rounded-lg overflow-hidden">
            {lista.map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222226] transition-colors">
                {editingId === item.name ? (
                  <>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input value={editNome} onChange={e => setEditNome(e.target.value)}
                        className="h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-sm outline-none focus:border-brand/60" />
                      <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                        className="h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-sm outline-none focus:border-brand/60" />
                    </div>
                    <button onClick={() => handleSalvarEdit(item.name)} disabled={saving}
                      className="h-7 w-7 flex items-center justify-center text-green-400 hover:bg-green-600 hover:text-white border border-green-500/30 rounded-lg transition-colors">
                      <Check size={12} />
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] rounded-lg transition-colors">
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.full_name}</p>
                      {item.description && <p className="text-gray-500 text-xs truncate">{item.description}</p>}
                    </div>
                    <button onClick={() => startEdit(item)} title="Editar"
                      className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => handleExcluir(item)} title="Excluir"
                      className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white hover:bg-[#850000] border border-[#850000]/30 rounded-lg transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function PrescricaoListagem() {
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [queryBusca, setQueryBusca] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const debounceRef = useRef(null)

  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [duplicando, setDuplicando] = useState(null)
  const [showBanco, setShowBanco] = useState(false)

  const carregar = async (reset = true, query = queryBusca) => {
    setLoading(true)
    try {
      const p = reset ? 1 : page + 1
      const { list, hasMore: more } = await listarPrescricoes({ busca: query, page: p })
      const lista = query ? list.filter(p => buscarSmart(p.nome_completo, query)) : list
      setLista(prev => reset ? lista : [...prev, ...lista])
      setHasMore(more)
      if (reset) setPage(1); else setPage(p)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { carregar() }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQueryBusca(busca)
      carregar(true, busca)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [busca])

  const handleExcluir = async (name) => {
    if (!confirm('Excluir esta prescrição?')) return
    try {
      await excluirPrescricao(name)
      await carregar()
    } catch (e) {
      console.error(e)
      alert('Erro ao excluir prescrição.')
    }
  }

  const handlePreview = async (row) => {
    setPreview(row)
    if (!row.prescriptions) {
      setPreviewLoading(true)
      try {
        const full = await buscarPrescricao(row.name)
        setPreview(full)
      } catch (e) { console.error(e) }
      finally { setPreviewLoading(false) }
    }
  }

  const handleToggle = async (row) => {
    const novo = row.published ? 0 : 1
    setLista(prev => prev.map(p => p.name === row.name ? { ...p, published: novo } : p))
    try {
      await togglePrescricao(row.name, novo)
    } catch (e) {
      console.error(e)
      setLista(prev => prev.map(p => p.name === row.name ? { ...p, published: row.published } : p))
    }
  }

  const handleDuplicar = async (row) => {
    setDuplicando(row.name)
    try {
      const full = await buscarPrescricao(row.name)
      const novo = await criarPrescricao({
        aluno: full.aluno,
        nome_completo: full.nome_completo,
        profissional: profissionalLogado(),
        date: new Date().toISOString().split('T')[0],
        description: full.description,
        published: 0,
        prescriptions: (full.prescriptions || []).map(({ manipulated, description, time }) => ({
          manipulated, description, time,
        })),
      })
      navigate(`/prescricoes/${encodeURIComponent(novo.name)}`)
    } catch (e) {
      console.error(e)
      alert('Erro ao duplicar prescrição.')
    } finally {
      setDuplicando(null)
    }
  }

  const columns = [
    { label: 'Aluno', render: (row) => <span className="text-white text-sm font-medium">{row.nome_completo || '—'}</span> },
    { label: 'Data', render: (row) => <span className="text-gray-400 text-sm">{fmtDate(row.date)}</span> },
    { label: 'Descrição', render: (row) => <span className="text-gray-500 text-sm truncate max-w-[200px] block">{row.description || '—'}</span> },
    {
      label: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleToggle(row)}
            title={row.published ? 'Desativar prescrição' : 'Ativar prescrição'}
            className={`h-7 w-7 flex items-center justify-center border rounded-lg transition-colors
              ${row.published
                ? 'text-green-400 border-green-500/30 hover:bg-green-700 hover:border-green-700 hover:text-white'
                : 'text-gray-500 border-[#323238] hover:border-gray-500 hover:text-white'
              }`}
          >
            {row.published ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          </button>
          <span className={`text-xs font-medium ${row.published ? 'text-green-400' : 'text-gray-500'}`}>
            {row.published ? 'Ativa' : 'Inativa'}
          </span>
        </div>
      ),
    },
    {
      label: 'Ações',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handlePreview(row)} title="Preview"
            className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-white border border-[#323238] hover:border-gray-500 rounded-lg transition-colors">
            <Eye size={12} />
          </button>
          <button onClick={() => handleDuplicar(row)} title="Duplicar" disabled={duplicando === row.name}
            className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors disabled:opacity-40">
            {duplicando === row.name
              ? <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
              : <Copy size={12} />}
          </button>
          <button onClick={() => handleExcluir(row.name)} title="Excluir"
            className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white border border-[#850000]/30 hover:bg-[#850000] rounded-lg transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <ListPage
        title="Prescrição Paciente"
        subtitle="Prescrições elaboradas para seus alunos"
        actions={
          <>
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => carregar()} loading={loading} />
            <Button variant="secondary" size="sm" icon={Database} onClick={() => setShowBanco(true)}>
              Banco
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => navigate('/prescricoes/nova')}>
              Nova Prescrição
            </Button>
          </>
        }
        filters={[
          { type: 'search', value: busca, onChange: setBusca, placeholder: 'Buscar por aluno...', icon: Search },
        ]}
        loading={loading && lista.length === 0}
        empty={lista.length === 0 && !loading ? {
          title: 'Nenhuma prescrição encontrada',
          description: 'Crie a primeira prescrição para seus alunos.',
        } : null}
      >
        {!loading && lista.length > 0 && (
          <>
            <DataTable
              columns={columns}
              rows={lista}
              rowKey="name"
              onRowClick={(row) => navigate(`/prescricoes/${encodeURIComponent(row.name)}`)}
            />
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button variant="secondary" size="sm" loading={loading} onClick={() => carregar(false)}>
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </ListPage>

      {showBanco && <BancoModal onClose={() => setShowBanco(false)} />}

      {/* Modal de preview */}
      {preview && (
        <Modal
          title={preview.nome_completo || 'Prescrição'}
          subtitle={fmtDate(preview.date)}
          onClose={() => setPreview(null)}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPreview(null)}>Fechar</Button>
              <Button variant="primary" onClick={() => { navigate(`/prescricoes/${encodeURIComponent(preview.name)}`); setPreview(null) }}>
                Abrir
              </Button>
            </>
          }
        >
          <div className="p-4">
            {previewLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" /></div>
            ) : (preview.prescriptions || []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-gray-600">
                <Pill size={24} />
                <p className="text-sm">Sem itens registrados.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(preview.prescriptions || []).map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-[#323238] last:border-0">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{item.manipulated || item.manipulado}</p>
                      {item.description && <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>}
                    </div>
                    {item.time && (
                      <span className="text-xs text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded shrink-0">{item.time}</span>
                    )}
                  </div>
                ))}
                {preview.description && (
                  <div className="pt-3">
                    <p className="text-gray-500 text-xs uppercase font-semibold mb-1">Observações</p>
                    <p className="text-gray-300 text-sm">{preview.description}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
