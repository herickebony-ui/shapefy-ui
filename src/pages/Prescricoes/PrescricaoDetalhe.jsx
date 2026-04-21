import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Plus, Trash2, BookmarkPlus, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react'
import { buscarPrescricao, criarPrescricao, salvarPrescricao } from '../../api/prescricoes'
import {
  buscarManipulados, listarManipulados,
  criarManipulado, salvarManipulado, excluirManipulado,
} from '../../api/manipulados'
import { listarAlunos } from '../../api/alunos'
import { Button, FormGroup, Input, Textarea, Autocomplete, Badge, Spinner, Modal } from '../../components/ui'
import DetailPage from '../../components/templates/DetailPage'

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

// ─── Item row compacta ────────────────────────────────────────────────────────

const ItemRow = ({ item, idx, total, onChange, onRemove, onSaveToBank, onMoveUp, onMoveDown, savingToBank }) => (
  <tr className="border-b border-[#323238] last:border-0">
    <td className="pl-2 pr-1 py-1.5 w-8">
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={idx === 0}
          className="h-4 w-5 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20 transition-colors"
        >
          <ChevronUp size={10} />
        </button>
        <span className="text-gray-600 text-[10px] leading-none select-none">{idx + 1}</span>
        <button
          onClick={onMoveDown}
          disabled={idx === total - 1}
          className="h-4 w-5 flex items-center justify-center text-gray-600 hover:text-white disabled:opacity-20 transition-colors"
        >
          <ChevronDown size={10} />
        </button>
      </div>
    </td>
    <td className="px-1 py-1.5">
      <Autocomplete
        compact
        value={item.manipulated || ''}
        onChange={(v) => onChange('manipulated', v)}
        onSelect={(m) => {
          onChange('manipulated', m.full_name || m.name)
          if (m.description) onChange('description', m.description)
        }}
        searchFn={async (q) => buscarManipulados(q)}
        renderItem={(m) => (
          <div>
            <p className="text-sm text-white">{m.full_name || m.name}</p>
            {m.description && <p className="text-xs text-gray-500">{m.description}</p>}
          </div>
        )}
        placeholder="Manipulado..."
        emptyState="Nenhum encontrado"
      />
    </td>
    <td className="px-1 py-1.5">
      <input
        value={item.description || ''}
        onChange={(e) => onChange('description', e.target.value)}
        placeholder="Posologia / descrição..."
        className="w-full h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-brand/60 placeholder-gray-600 transition-colors"
      />
    </td>
    <td className="px-2 py-1.5 w-16">
      <div className="flex items-center gap-1">
        <button
          onClick={onSaveToBank}
          disabled={!item.manipulated || savingToBank}
          title="Salvar no banco"
          className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors disabled:opacity-30"
        >
          {savingToBank
            ? <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
            : <BookmarkPlus size={12} />}
        </button>
        <button onClick={onRemove} title="Remover"
          className="h-7 w-7 flex items-center justify-center text-[#850000] hover:text-white hover:bg-[#850000] border border-[#850000]/30 rounded-lg transition-colors">
          <Trash2 size={12} />
        </button>
      </div>
    </td>
  </tr>
)

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrescricaoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNova = id === 'nova'

  const [loading, setLoading] = useState(!isNova)
  const [saving, setSaving] = useState(false)
  const [showBanco, setShowBanco] = useState(false)
  const [savingToBank, setSavingToBank] = useState(null)

  const [aluno, setAluno] = useState('')
  const [alunoNome, setAlunoNome] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [published, setPublished] = useState(false)
  const [prescriptions, setPrescriptions] = useState([])

  useEffect(() => {
    if (isNova) return
    const carregar = async () => {
      setLoading(true)
      try {
        const data = await buscarPrescricao(decodeURIComponent(id))
        setAluno(data.aluno || '')
        setAlunoNome(data.nome_completo || '')
        setDate(data.date || '')
        setDescription(data.description || '')
        setPublished(!!data.published)
        setPrescriptions((data.prescriptions || []).map(item => ({
          manipulated: item.manipulated || '',
          description: item.description || '',
        })))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    carregar()
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        aluno, nome_completo: alunoNome, profissional: profissionalLogado(),
        date, description, published: published ? 1 : 0, prescriptions,
      }
      if (isNova) {
        const novo = await criarPrescricao(payload)
        navigate(`/prescricoes/${encodeURIComponent(novo.name)}`, { replace: true })
      } else {
        await salvarPrescricao(decodeURIComponent(id), payload)
      }
    } catch (e) { console.error(e); alert('Erro ao salvar prescrição.') }
    finally { setSaving(false) }
  }

  const handleSaveToBank = async (idx) => {
    const item = prescriptions[idx]
    if (!item.manipulated) return
    setSavingToBank(idx)
    try {
      await criarManipulado({ full_name: item.manipulated, description: item.description || '' })
    } catch (e) { console.error(e) }
    finally { setSavingToBank(null) }
  }

  const addItem = () => setPrescriptions(prev => [...prev, { manipulated: '', description: '' }])
  const updateItem = (idx, field, value) =>
    setPrescriptions(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  const removeItem = (idx) => setPrescriptions(prev => prev.filter((_, i) => i !== idx))
  const moveItem = (idx, dir) => setPrescriptions(prev => {
    const next = [...prev]
    const target = idx + dir
    if (target < 0 || target >= next.length) return prev
    ;[next[idx], next[target]] = [next[target], next[idx]]
    return next
  })

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Spinner size="lg" /></div>
  }

  return (
    <>
      <DetailPage
        title={isNova ? 'Nova Prescrição' : (alunoNome || 'Prescrição')}
        subtitle={isNova ? '' : `Data: ${date}`}
        backHref="/prescricoes"
        status={!isNova && (
          <Badge variant={published ? 'success' : 'default'}>
            {published ? 'Ativa' : 'Inativa'}
          </Badge>
        )}
        footer={
          <div className="flex justify-end gap-2 px-4 md:px-8 py-4 border-t border-[#323238] bg-[#0a0a0a]">
            <Button variant="ghost" onClick={() => navigate('/prescricoes')}>Cancelar</Button>
            <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>Salvar</Button>
          </div>
        }
      >
        <div className="px-4 md:px-8 pb-6 space-y-6">
          {/* Dados gerais */}
          <div className="bg-[#29292e] border border-[#323238] rounded-lg p-5 space-y-4">
            <p className="text-white font-semibold text-sm">Dados Gerais</p>
            <FormGroup label="Aluno" required>
              <Autocomplete
                value={alunoNome}
                onChange={setAlunoNome}
                onSelect={(item) => { setAluno(item.name); setAlunoNome(item.nome_completo || item.name) }}
                searchFn={async (q) => { const { list } = await listarAlunos({ search: q, limit: 10 }); return list }}
                renderItem={(item) => (
                  <div>
                    <p className="text-sm text-white">{item.nome_completo || item.name}</p>
                    <p className="text-xs text-gray-500">{item.email || item.name}</p>
                  </div>
                )}
                placeholder="Buscar aluno..."
              />
            </FormGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Data" required>
                <Input type="date" value={date} onChange={setDate} />
              </FormGroup>
              <FormGroup label="Status">
                <div className="flex items-center gap-3 h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
                      className="w-4 h-4 accent-brand" />
                    <span className="text-gray-300 text-sm">Prescrição ativa (visível ao aluno)</span>
                  </label>
                </div>
              </FormGroup>
            </div>
            <FormGroup label="Observações Gerais">
              <Textarea value={description} onChange={setDescription}
                placeholder="Observações para o aluno (opcional)..." rows={3} />
            </FormGroup>
          </div>

          {/* Manipulados — tabela compacta */}
          <div className="bg-[#29292e] border border-[#323238] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#323238]">
              <div>
                <p className="text-white font-semibold text-sm">Prescrições de Manipulados</p>
                <p className="text-gray-600 text-xs mt-0.5">{prescriptions.length} {prescriptions.length === 1 ? 'item' : 'itens'}</p>
              </div>
            </div>

            {prescriptions.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#323238] bg-[#111113]">
                    <th className="pl-3 pr-1 py-2 w-7 text-left text-[10px] text-gray-600">#</th>
                    <th className="px-1 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Manipulado</th>
                    <th className="px-1 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Posologia / Descrição</th>
                    <th className="px-2 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((item, idx) => (
                    <ItemRow
                      key={idx}
                      item={item}
                      idx={idx}
                      total={prescriptions.length}
                      onChange={(field, value) => updateItem(idx, field, value)}
                      onRemove={() => removeItem(idx)}
                      onSaveToBank={() => handleSaveToBank(idx)}
                      onMoveUp={() => moveItem(idx, -1)}
                      onMoveDown={() => moveItem(idx, 1)}
                      savingToBank={savingToBank === idx}
                    />
                  ))}
                </tbody>
              </table>
            )}

            {/* Botão adicionar como linha */}
            <button
              onClick={addItem}
              className="w-full flex items-center gap-2 px-4 py-3 text-gray-600 hover:text-white hover:bg-[#222226] border-t border-[#323238] transition-colors text-sm"
            >
              <Plus size={14} />
              <span>Adicionar item</span>
            </button>
          </div>
        </div>
      </DetailPage>

      {showBanco && <BancoModal onClose={() => setShowBanco(false)} />}
    </>
  )
}
