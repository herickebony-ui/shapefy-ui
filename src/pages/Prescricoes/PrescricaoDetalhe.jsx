import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Plus, Trash2, BookmarkPlus, Edit2, Check, X, ChevronUp, ChevronDown, Database, Clock } from 'lucide-react'
import { buscarPrescricao, criarPrescricao, salvarPrescricao } from '../../api/prescricoes'
import {
  buscarManipulados, listarManipulados,
  criarManipulado, salvarManipulado, excluirManipulado,
} from '../../api/manipulados'
import {
  buscarMomentosDeUso, listarMomentosDeUso,
  criarMomentoDeUso, salvarMomentoDeUso, excluirMomentoDeUso,
  garantirMomentoDeUso,
} from '../../api/momentosDeUso'
import { criarNotificacaoAluno } from '../../api/notificacoes'
import { listarAlunos } from '../../api/alunos'
import { Button, FormGroup, Input, Select, Textarea, Autocomplete, Badge, Spinner, Modal } from '../../components/ui'
import DetailPage from '../../components/templates/DetailPage'
import DownloadPdfButton from '../../components/DownloadPdfButton'
import NotificarAlunoModal from '../../components/NotificarAlunoModal'
import useErrorModal from '../../hooks/useErrorModal'

const profissionalLogado = () => localStorage.getItem('frappe_user') || ''

const formatarDataBr = (iso) => {
  if (!iso) return ''
  const [y, m, d] = String(iso).split('-')
  return `${d}/${m}/${y}`
}

const OPCOES_DIAS = [
  { value: '', label: '—' },
  { value: '30', label: '30 dias' },
  { value: '60', label: '60 dias' },
  { value: '90', label: '90 dias' },
  { value: '120', label: '120 dias' },
  { value: '180', label: '180 dias' },
]

// ─── Item row compacta ────────────────────────────────────────────────────────

const ItemRow = ({ item, idx, total, onChange, onRemove, onSaveItem, onMoveUp, onMoveDown, savingItem }) => (
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
    <td className="px-1 py-1.5 min-w-[140px]">
      <Autocomplete
        compact
        value={item.momento_de_uso || ''}
        onChange={(v) => onChange('momento_de_uso', v)}
        onSelect={(m) => onChange('momento_de_uso', m.nome_do_momento || m.name)}
        searchFn={async (q) => buscarMomentosDeUso(q)}
        renderItem={(m) => (
          <p className="text-sm text-white">{m.nome_do_momento || m.name}</p>
        )}
        placeholder="Horário de uso..."
        emptyState="Cadastre horários de uso primeiro"
      />
    </td>
    <td className="px-1 py-1.5 min-w-[140px]">
      <Autocomplete
        compact
        value={item.manipulated || ''}
        onChange={(v) => onChange('manipulated', v)}
        onSelect={(m) => {
          onChange('manipulated', m.full_name || m.name)
          if (m.description) onChange('description', m.description)
          if (m.momento_de_uso) onChange('momento_de_uso', m.momento_de_uso)
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
    <td className="px-1 py-1.5 min-w-[180px]">
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
          onClick={onSaveItem}
          disabled={(!item.manipulated && !item.momento_de_uso) || savingItem}
          title="Salvar manipulado e horário no banco"
          className="h-7 w-7 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors disabled:opacity-30"
        >
          {savingItem
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

// ─── Item card mobile ─────────────────────────────────────────────────────────

const ItemCard = ({ item, idx, total, onChange, onRemove, onSaveItem, onMoveUp, onMoveDown, savingItem }) => (
  <div className="px-3 py-3 border-b border-[#323238] last:border-0">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 text-[10px] font-bold tracking-wider uppercase">Item {idx + 1}</span>
        <div className="flex items-center gap-0.5 ml-1">
          <button onClick={onMoveUp} disabled={idx === 0}
            className="h-6 w-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] rounded transition-colors disabled:opacity-30">
            <ChevronUp size={12} />
          </button>
          <button onClick={onMoveDown} disabled={idx === total - 1}
            className="h-6 w-6 flex items-center justify-center text-gray-500 hover:text-white border border-[#323238] rounded transition-colors disabled:opacity-30">
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onSaveItem}
          disabled={(!item.manipulated && !item.momento_de_uso) || savingItem}
          title="Salvar manipulado e horário no banco"
          className="h-9 w-9 flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-600 border border-[#323238] hover:border-blue-600 rounded-lg transition-colors disabled:opacity-30">
          {savingItem ? <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" /> : <BookmarkPlus size={14} />}
        </button>
        <button onClick={onRemove}
          className="h-9 w-9 flex items-center justify-center text-[#850000] hover:text-white hover:bg-[#850000] border border-[#850000]/30 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
    <div className="space-y-2">
      <Autocomplete
        compact
        value={item.momento_de_uso || ''}
        onChange={(v) => onChange('momento_de_uso', v)}
        onSelect={(m) => onChange('momento_de_uso', m.nome_do_momento || m.name)}
        searchFn={async (q) => buscarMomentosDeUso(q)}
        renderItem={(m) => (
          <p className="text-sm text-white">{m.nome_do_momento || m.name}</p>
        )}
        placeholder="Horário de uso..."
        emptyState="Cadastre horários de uso primeiro"
      />
      <Autocomplete
        compact
        value={item.manipulated || ''}
        onChange={(v) => onChange('manipulated', v)}
        onSelect={(m) => {
          onChange('manipulated', m.full_name || m.name)
          if (m.description) onChange('description', m.description)
          if (m.momento_de_uso) onChange('momento_de_uso', m.momento_de_uso)
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
      <textarea
        value={item.description || ''}
        onChange={(e) => onChange('description', e.target.value)}
        placeholder="Posologia / descrição..."
        rows={2}
        className="w-full px-2 py-2 bg-[#29292e] border border-[#323238] text-white rounded text-xs outline-none focus:border-brand/60 placeholder-gray-600 transition-colors resize-none"
      />
    </div>
  </div>
)

// ─── Modal banco ──────────────────────────────────────────────────────────────

function BancoModal({ onClose }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoDesc, setNovoDesc] = useState('')
  const [novoMomento, setNovoMomento] = useState('')
  const [editNome, setEditNome] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editMomento, setEditMomento] = useState('')
  const errorModal = useErrorModal()

  useEffect(() => {
    listarManipulados().then(setLista).catch(e => errorModal.show(e, 'Listar manipulados')).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCriar = async () => {
    if (!novoNome.trim()) return
    setSaving(true)
    try {
      const momentoName = await garantirMomentoDeUso(novoMomento)
      const created = await criarManipulado({
        full_name: novoNome.trim(),
        description: novoDesc.trim(),
        momento_de_uso: momentoName || undefined,
      })
      setLista(prev => [...prev, created].sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '')))
      setNovoNome(''); setNovoDesc(''); setNovoMomento('')
    } catch (e) { errorModal.show(e, 'Criar manipulado') }
    finally { setSaving(false) }
  }

  const startEdit = (item) => {
    setEditingId(item.name)
    setEditNome(item.full_name || '')
    setEditDesc(item.description || '')
    setEditMomento(item.momento_de_uso || '')
  }

  const handleSalvarEdit = async (name) => {
    setSaving(true)
    try {
      const momentoName = await garantirMomentoDeUso(editMomento)
      await salvarManipulado(name, {
        full_name: editNome.trim(),
        description: editDesc.trim(),
        momento_de_uso: momentoName || '',
        enabled: 1,
      })
      setLista(prev => prev.map(i => i.name === name
        ? { ...i, full_name: editNome.trim(), description: editDesc.trim(), momento_de_uso: momentoName }
        : i))
      setEditingId(null)
    } catch (e) { errorModal.show(e, 'Salvar manipulado') }
    finally { setSaving(false) }
  }

  const handleExcluir = async (item) => {
    if (!confirm(`Excluir "${item.full_name}"?`)) return
    try {
      await excluirManipulado(item.name)
      setLista(prev => prev.filter(i => i.name !== item.name))
    } catch (e) { errorModal.show(e, 'Excluir manipulado') }
  }

  return (<>
    {errorModal.element}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormGroup label="Horário de uso padrão">
              <Autocomplete
                value={novoMomento}
                onChange={setNovoMomento}
                onSelect={(m) => setNovoMomento(m.nome_do_momento || m.name)}
                searchFn={async (q) => buscarMomentosDeUso(q)}
                renderItem={(m) => <p className="text-sm text-white">{m.nome_do_momento || m.name}</p>}
                placeholder="Ex: Ao acordar, Pré-treino..."
                emptyState="Será cadastrado ao salvar"
              />
            </FormGroup>
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
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input value={editMomento} onChange={e => setEditMomento(e.target.value)}
                        placeholder="Horário de uso"
                        className="h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-sm outline-none focus:border-brand/60" />
                      <input value={editNome} onChange={e => setEditNome(e.target.value)}
                        placeholder="Nome"
                        className="h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-sm outline-none focus:border-brand/60" />
                      <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                        placeholder="Descrição / dose"
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
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.description && <p className="text-gray-500 text-xs truncate">{item.description}</p>}
                        {item.momento_de_uso && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                            <Clock size={9} />{item.momento_de_uso}
                          </span>
                        )}
                      </div>
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
  </>)
}

// ─── Modal momentos de uso ────────────────────────────────────────────────────

function MomentosModal({ onClose }) {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [editNome, setEditNome] = useState('')
  const errorModal = useErrorModal()

  useEffect(() => {
    listarMomentosDeUso().then(setLista).catch(e => errorModal.show(e, 'Listar momentos de uso')).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCriar = async () => {
    if (!novoNome.trim()) return
    setSaving(true)
    try {
      const created = await criarMomentoDeUso({ nome_do_momento: novoNome.trim() })
      setLista(prev => [...prev, created].sort((a, b) => (a.nome_do_momento || '').localeCompare(b.nome_do_momento || '')))
      setNovoNome('')
    } catch (e) { errorModal.show(e, 'Criar horário de uso') }
    finally { setSaving(false) }
  }

  const startEdit = (item) => {
    setEditingId(item.name)
    setEditNome(item.nome_do_momento || '')
  }

  const handleSalvarEdit = async (name) => {
    setSaving(true)
    try {
      await salvarMomentoDeUso(name, { nome_do_momento: editNome.trim() })
      setLista(prev => prev.map(i => i.name === name
        ? { ...i, nome_do_momento: editNome.trim() }
        : i))
      setEditingId(null)
    } catch (e) { errorModal.show(e, 'Salvar horário de uso') }
    finally { setSaving(false) }
  }

  const handleExcluir = async (item) => {
    if (!confirm(`Excluir "${item.nome_do_momento}"?`)) return
    try {
      await excluirMomentoDeUso(item.name)
      setLista(prev => prev.filter(i => i.name !== item.name))
    } catch (e) { errorModal.show(e, 'Excluir horário de uso') }
  }

  return (<>
    {errorModal.element}
    <Modal
      title="Horários de Uso"
      subtitle="Catálogo de horários do dia para usar nas prescrições (ex: Ao acordar, Pré-treino, Antes de dormir)"
      onClose={onClose}
      size="lg"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}
    >
      <div className="p-4 space-y-4">
        <div className="bg-[#222226] border border-[#323238] rounded-lg p-4 space-y-3">
          <p className="text-white text-sm font-semibold">Adicionar novo</p>
          <FormGroup label="Nome do Horário de Uso" required>
            <Input value={novoNome} onChange={setNovoNome} placeholder="Ex: Ao acordar, Pré-treino, Antes de dormir" />
          </FormGroup>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleCriar} loading={saving} disabled={!novoNome.trim()}>
            Salvar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : lista.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-6">Nenhum horário de uso cadastrado.</p>
        ) : (
          <div className="divide-y divide-[#323238] border border-[#323238] rounded-lg overflow-hidden">
            {lista.map((item) => (
              <div key={item.name} className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222226] transition-colors">
                {editingId === item.name ? (
                  <>
                    <input value={editNome} onChange={e => setEditNome(e.target.value)}
                      className="flex-1 h-7 px-2 bg-[#29292e] border border-[#323238] text-white rounded text-sm outline-none focus:border-brand/60" />
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
                      <p className="text-white text-sm font-medium truncate">{item.nome_do_momento}</p>
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
  </>)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PrescricaoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNova = id === 'nova'

  const [loading, setLoading] = useState(!isNova)
  const [saving, setSaving] = useState(false)
  const [showBanco, setShowBanco] = useState(false)
  const [showMomentos, setShowMomentos] = useState(false)
  const [notificar, setNotificar] = useState(null) // { entityName } | null
  const [savingItem, setSavingItem] = useState(null)
  const errorModal = useErrorModal()

  const [aluno, setAluno] = useState('')
  const [alunoNome, setAlunoNome] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [published, setPublished] = useState(false)
  const [validadeDias, setValidadeDias] = useState('')
  const [aviarPara, setAviarPara] = useState('')
  const [dataFim, setDataFim] = useState('')
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
        setValidadeDias(data.validade_dias || '')
        setAviarPara(data.aviar_para || '')
        setDataFim(data.data_fim || '')
        setPrescriptions((data.prescriptions || []).map(item => ({
          manipulated: item.manipulated || '',
          description: item.description || '',
          momento_de_uso: item.momento_de_uso || '',
        })))
      } catch (e) { errorModal.show(e, 'Carregar prescrição') }
      finally { setLoading(false) }
    }
    carregar()
    // errorModal é objeto novo a cada render — usar como dep cria loop.
    // .show é useCallback estável, ignorar é seguro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNova])

  // Auto-cadastra momentos digitados livremente que ainda não existem no catálogo.
  // Devolve a lista de items com `momento_de_uso` substituído pelo `name` válido.
  const garantirMomentos = async (items) => {
    const valores = [...new Set(items.map(i => (i.momento_de_uso || '').trim()).filter(Boolean))]
    if (!valores.length) return items

    const catalogo = await listarMomentosDeUso()
    const mapa = {}
    catalogo.forEach(m => {
      mapa[m.nome_do_momento] = m.name
      mapa[m.name] = m.name
    })

    for (const valor of valores) {
      if (mapa[valor]) continue
      try {
        const novo = await criarMomentoDeUso({ nome_do_momento: valor, ordem: 0 })
        mapa[valor] = novo?.name || valor
      } catch (e) {
        console.warn(`[momentos] falha ao criar "${valor}"`, e?.response?.data)
        mapa[valor] = valor
      }
    }

    return items.map(i => ({
      ...i,
      momento_de_uso: i.momento_de_uso ? (mapa[i.momento_de_uso] || i.momento_de_uso) : '',
    }))
  }

  // Clicar em Salvar agora só ABRE o modal de notificação. O save real acontece
  // dentro de handleConfirmarSave, gatilhado por Notificar ou Confirmar (agendar).
  // "Não" no modal → cancela tudo (não salva).
  const handleSave = () => {
    if (!aluno) {
      errorModal.show(new Error('Selecione um aluno antes de salvar.'), 'Salvar prescrição')
      return
    }
    setNotificar({})
  }

  const handleConfirmarSave = async (agendado_para) => {
    setSaving(true)
    try {
      const prescriptionsNormalizadas = await garantirMomentos(prescriptions)
      if (prescriptionsNormalizadas !== prescriptions) setPrescriptions(prescriptionsNormalizadas)

      const payload = {
        aluno, nome_completo: alunoNome, profissional: profissionalLogado(),
        date, description, published: published ? 1 : 0,
        validade_dias: validadeDias || null,
        aviar_para: aviarPara || null,
        prescriptions: prescriptionsNormalizadas,
      }
      let entityName
      if (isNova) {
        const novo = await criarPrescricao(payload)
        setDataFim(novo.data_fim || '')
        entityName = novo.name
        navigate(`/prescricoes/${encodeURIComponent(novo.name)}`, { replace: true })
      } else {
        const atualizado = await salvarPrescricao(decodeURIComponent(id), payload)
        setDataFim(atualizado?.data_fim || '')
        entityName = decodeURIComponent(id)
      }
      // agendado_para === false → salvou sem notificar (escolha do profissional)
      if (agendado_para !== false) {
        await criarNotificacaoAluno({
          aluno,
          titulo: 'Sua nova prescrição está disponível!',
          descricao: 'Confira sua nova prescrição no app.',
          url: `/prescricao/${entityName}`,
          agendado_para,
        })
      }
      setNotificar(null)
    } catch (e) { errorModal.show(e, isNova ? 'Criar prescrição' : 'Salvar prescrição') }
    finally { setSaving(false) }
  }

  // Duplicate é silenciado (UX otimista — item já está no catálogo).
  const ehDuplicado = (e) => {
    const status = e?.response?.status
    const exc = e?.response?.data?.exception || ''
    return status === 409 || exc.includes('DuplicateEntryError')
  }

  const handleSaveItem = async (idx) => {
    const item = prescriptions[idx]
    const manipulado = (item.manipulated || '').trim()
    const horario = (item.momento_de_uso || '').trim()
    if (!manipulado && !horario) return

    setSavingItem(idx)
    try {
      // 1) Garante o momento no catálogo (cria se não existir) e pega o name canônico.
      let momentoName = ''
      try {
        momentoName = await garantirMomentoDeUso(horario)
      } catch (e) {
        if (!ehDuplicado(e)) errorModal.show(e, 'Salvar item no catálogo')
      }

      // 2) Se o name mudou (slug diferente do digitado), sincroniza no state.
      if (momentoName && momentoName !== horario) {
        setPrescriptions(prev => prev.map((it, i) => i === idx ? { ...it, momento_de_uso: momentoName } : it))
      }

      // 3) Cria o manipulado vinculado ao momento. Duplicado é silenciado.
      if (manipulado) {
        try {
          await criarManipulado({
            full_name: manipulado,
            description: item.description || '',
            momento_de_uso: momentoName || undefined,
          })
        } catch (e) {
          if (!ehDuplicado(e)) errorModal.show(e, 'Salvar item no catálogo')
        }
      }
    } finally {
      setSavingItem(null)
    }
  }

  const addItem = () => setPrescriptions(prev => [...prev, { manipulated: '', description: '', momento_de_uso: '' }])
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
        actions={
          <>
            <Button variant="secondary" size="sm" icon={Database} onClick={() => setShowBanco(true)}>
              <span className="hidden sm:inline">Banco</span>
            </Button>
            <Button variant="secondary" size="sm" icon={Clock} onClick={() => setShowMomentos(true)}>
              <span className="hidden sm:inline">Horários de Uso</span>
            </Button>
            {!isNova && <DownloadPdfButton entity="prescricao" name={id} />}
          </>
        }
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormGroup label="Data" required>
                <Input type="date" value={date} onChange={setDate} />
              </FormGroup>
              <FormGroup label="Validade" hint={dataFim ? `Válida até ${formatarDataBr(dataFim)}` : 'Calculado automaticamente'}>
                <Select value={validadeDias} onChange={setValidadeDias} options={OPCOES_DIAS} />
              </FormGroup>
              <FormGroup label="Aviar para" hint="Quantidade a manipular">
                <Select value={aviarPara} onChange={setAviarPara} options={OPCOES_DIAS} />
              </FormGroup>
              <FormGroup label="Status">
                <div className="flex items-center gap-3 h-10">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)}
                      className="w-4 h-4 accent-brand" />
                    <span className="text-gray-300 text-sm">Prescrição ativa</span>
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
              <>
                {/* Desktop: tabela */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#323238] bg-[#111113]">
                        <th className="pl-3 pr-1 py-2 w-7 text-left text-[10px] text-gray-600">#</th>
                        <th className="px-1 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Horário de Uso</th>
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
                          onSaveItem={() => handleSaveItem(idx)}
                          onMoveUp={() => moveItem(idx, -1)}
                          onMoveDown={() => moveItem(idx, 1)}
                          savingItem={savingItem === idx}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile: cards */}
                <div className="md:hidden">
                  {prescriptions.map((item, idx) => (
                    <ItemCard
                      key={idx}
                      item={item}
                      idx={idx}
                      total={prescriptions.length}
                      onChange={(field, value) => updateItem(idx, field, value)}
                      onRemove={() => removeItem(idx)}
                      onSaveItem={() => handleSaveItem(idx)}
                      onMoveUp={() => moveItem(idx, -1)}
                      onMoveDown={() => moveItem(idx, 1)}
                      savingItem={savingItem === idx}
                    />
                  ))}
                </div>
              </>
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
      {showMomentos && <MomentosModal onClose={() => setShowMomentos(false)} />}
      <NotificarAlunoModal
        open={!!notificar}
        onClose={() => { if (!saving) setNotificar(null) }}
        onConfirm={handleConfirmarSave}
        loading={saving}
        tipo="prescricao"
        alunoNome={alunoNome}
      />
      {errorModal.element}
    </>
  )
}
